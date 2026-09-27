import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'

const db = getFirestore()

export interface MembershipConfigData {
  enabled: boolean
  minOrderValueCop: number
  stampsRequired: number
  rewardTitle: string
}

export async function getMembershipConfig(): Promise<MembershipConfigData | null> {
  const snap = await db.collection('config').doc('membership').get()
  if (!snap.exists) return null
  const data = snap.data()
  if (!data || data.enabled !== true) return null
  const minOrderValueCop =
    typeof data.minOrderValueCop === 'number' ? data.minOrderValueCop : 0
  const stampsRequired = typeof data.stampsRequired === 'number' ? data.stampsRequired : 0
  const rewardTitle = typeof data.rewardTitle === 'string' ? data.rewardTitle.trim() : ''
  if (minOrderValueCop <= 0 || stampsRequired < 1 || rewardTitle.length === 0) return null
  return { enabled: true, minOrderValueCop, stampsRequired, rewardTitle }
}

function sumItemsTotal(items: unknown): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((acc, item) => {
    if (!item || typeof item !== 'object') return acc
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0
    return acc + unitPrice * quantity
  }, 0)
}

export function isOrderTotalValid(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false
  const totalPrice = typeof data.totalPrice === 'number' ? data.totalPrice : 0
  const itemsTotal = sumItemsTotal(data.items)
  return totalPrice > 0 && itemsTotal > 0 && totalPrice === itemsTotal
}

export async function creditLoyaltyStamp(
  orderId: string,
  userId: string,
  totalPrice: number,
): Promise<{ credited: boolean; currentStamps: number; rewardPending: boolean; rewardTitle: string } | null> {
  const config = await getMembershipConfig()
  if (!config) return null
  if (totalPrice < config.minOrderValueCop) return null

  const orderRef = db.collection('orders').doc(orderId)
  const progressRef = db.collection('loyaltyProgress').doc(userId)

  let result: { credited: boolean; currentStamps: number; rewardPending: boolean; rewardTitle: string } | null =
    null

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists) return
    const orderData = orderSnap.data()
    if (orderData?.loyaltyStampCredited === true) return
    if (!isOrderTotalValid(orderData)) return

    const orderTotal = typeof orderData?.totalPrice === 'number' ? orderData.totalPrice : 0
    if (orderTotal < config.minOrderValueCop) return

    const progressSnap = await tx.get(progressRef)
    const prev = progressSnap.exists ? progressSnap.data() : {}
    const prevStamps = typeof prev?.currentStamps === 'number' ? prev.currentStamps : 0
    if (prevStamps >= config.stampsRequired) {
      tx.update(orderRef, {
        loyaltyStampCredited: true,
        loyaltyStampCreditedAt: FieldValue.serverTimestamp(),
      })
      result = {
        credited: false,
        currentStamps: prevStamps,
        rewardPending: true,
        rewardTitle: config.rewardTitle,
      }
      return
    }

    const nextStamps = Math.min(prevStamps + 1, config.stampsRequired)
    const rewardPending = nextStamps >= config.stampsRequired

    tx.set(
      progressRef,
      {
        userId,
        currentStamps: nextStamps,
        rewardPending,
        totalStampsEarned: FieldValue.increment(1),
        lastStampOrderId: orderId,
        lastStampAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    tx.update(orderRef, {
      loyaltyStampCredited: true,
      loyaltyStampCreditedAt: FieldValue.serverTimestamp(),
    })

    result = {
      credited: true,
      currentStamps: nextStamps,
      rewardPending,
      rewardTitle: config.rewardTitle,
    }
  })

  return result
}

export async function revokeLoyaltyStamp(
  orderId: string,
  userId: string,
): Promise<{ revoked: boolean; currentStamps: number; rewardPending: boolean } | null> {
  const config = await getMembershipConfig()
  const stampsRequired = config?.stampsRequired ?? 5

  const orderRef = db.collection('orders').doc(orderId)
  const progressRef = db.collection('loyaltyProgress').doc(userId)

  let result: { revoked: boolean; currentStamps: number; rewardPending: boolean } | null = null

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists) return
    const orderData = orderSnap.data()
    if (orderData?.loyaltyStampCredited !== true) {
      result = { revoked: false, currentStamps: 0, rewardPending: false }
      return
    }

    const progressSnap = await tx.get(progressRef)
    const prev = progressSnap.exists ? progressSnap.data() : {}
    const prevStamps = typeof prev?.currentStamps === 'number' ? prev.currentStamps : 0
    const prevEarned = typeof prev?.totalStampsEarned === 'number' ? prev.totalStampsEarned : 0
    const nextStamps = Math.max(0, prevStamps - 1)
    const rewardPending = nextStamps >= stampsRequired

    if (progressSnap.exists) {
      tx.set(
        progressRef,
        {
          currentStamps: nextStamps,
          rewardPending,
          totalStampsEarned: Math.max(0, prevEarned - 1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }

    tx.update(orderRef, {
      loyaltyStampCredited: false,
      loyaltyStampCreditedAt: FieldValue.delete(),
    })

    result = { revoked: true, currentStamps: nextStamps, rewardPending }
  })

  return result
}

export async function redeemRewardForUser(userId: string): Promise<void> {
  const ref = db.collection('loyaltyProgress').doc(userId)
  const snap = await ref.get()
  if (!snap.exists || snap.data()?.rewardPending !== true) {
    throw new Error('Este cliente no tiene premio pendiente.')
  }
  await ref.set(
    {
      currentStamps: 0,
      rewardPending: false,
      totalRewardsRedeemed: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

export async function resetProgressForUser(userId: string): Promise<void> {
  await db.collection('loyaltyProgress').doc(userId).set(
    {
      userId,
      currentStamps: 0,
      rewardPending: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

export async function recalculateRewardPendingForAll(): Promise<void> {
  const config = await getMembershipConfig()
  if (!config) return
  const snap = await db.collection('loyaltyProgress').get()
  const batch = db.batch()
  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const currentStamps = typeof data.currentStamps === 'number' ? data.currentStamps : 0
    batch.set(
      docSnap.ref,
      {
        rewardPending: currentStamps >= config.stampsRequired,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    )
  }
  await batch.commit()
}
