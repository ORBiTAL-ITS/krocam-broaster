import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  EMPTY_MEMBERSHIP_CONFIG,
  isMembershipConfigComplete,
  normalizePhoneForSearch,
  type LoyaltyProgress,
  type MembershipConfig,
  type UserMembershipLookup,
} from '../types/membership'

const MEMBERSHIP_CONFIG_REF = doc(db, 'config', 'membership')

async function buildUserLookupFromFirestore(
  uid: string,
  data: Record<string, unknown>,
): Promise<UserMembershipLookup> {
  const progress = await getLoyaltyProgress(uid)
  return {
    uid,
    phone: typeof data.phone === 'string' ? data.phone : '',
    barrio: typeof data.barrio === 'string' ? data.barrio : '',
    address: typeof data.address === 'string' ? data.address : '',
    displayName:
      typeof data.displayName === 'string'
        ? data.displayName
        : typeof data.name === 'string'
          ? data.name
          : '',
    progress,
  }
}

async function searchMembershipUsersFromFirestore(params: {
  phone?: string
  uid?: string
  pendingOnly?: boolean
}): Promise<UserMembershipLookup[]> {
  if (params.pendingOnly) {
    const snap = await getDocs(
      query(collection(db, 'loyaltyProgress'), where('rewardPending', '==', true)),
    )
    const results: UserMembershipLookup[] = []
    for (const progressDoc of snap.docs) {
      const userSnap = await getDoc(doc(db, 'users', progressDoc.id))
      if (!userSnap.exists()) continue
      results.push(await buildUserLookupFromFirestore(progressDoc.id, userSnap.data()))
    }
    return results
  }

  if (params.uid) {
    const userSnap = await getDoc(doc(db, 'users', params.uid))
    if (!userSnap.exists()) return []
    return [await buildUserLookupFromFirestore(params.uid, userSnap.data())]
  }

  const phone = params.phone?.trim() ?? ''
  const normalized = normalizePhoneForSearch(phone)
  if (normalized.length < 7) return []

  const usersSnap = await getDocs(collection(db, 'users'))
  const matches: UserMembershipLookup[] = []
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data()
    const userPhone = typeof data.phone === 'string' ? data.phone : ''
    if (normalizePhoneForSearch(userPhone) !== normalized) continue
    matches.push(await buildUserLookupFromFirestore(userDoc.id, data))
  }
  return matches
}

function parseMembershipConfig(data: Record<string, unknown> | undefined): MembershipConfig {
  if (!data) return { ...EMPTY_MEMBERSHIP_CONFIG }
  return {
    enabled: data.enabled === true,
    minOrderValueCop:
      typeof data.minOrderValueCop === 'number' ? Math.max(0, data.minOrderValueCop) : 0,
    stampsRequired:
      typeof data.stampsRequired === 'number' ? Math.max(0, Math.floor(data.stampsRequired)) : 0,
    rewardTitle: typeof data.rewardTitle === 'string' ? data.rewardTitle.trim() : '',
    rewardDescription:
      typeof data.rewardDescription === 'string' ? data.rewardDescription.trim() : '',
    updatedAt: (data.updatedAt as Timestamp | undefined) ?? null,
  }
}

function parseLoyaltyProgress(
  userId: string,
  data: Record<string, unknown> | undefined,
): LoyaltyProgress {
  return {
    userId,
    currentStamps: typeof data?.currentStamps === 'number' ? data.currentStamps : 0,
    rewardPending: data?.rewardPending === true,
    totalStampsEarned: typeof data?.totalStampsEarned === 'number' ? data.totalStampsEarned : 0,
    totalRewardsRedeemed:
      typeof data?.totalRewardsRedeemed === 'number' ? data.totalRewardsRedeemed : 0,
    lastStampOrderId:
      typeof data?.lastStampOrderId === 'string' ? data.lastStampOrderId : undefined,
    lastStampAt: (data?.lastStampAt as Timestamp | undefined) ?? null,
    updatedAt: (data?.updatedAt as Timestamp | undefined) ?? null,
  }
}

export function subscribeMembershipConfig(
  onData: (config: MembershipConfig, isComplete: boolean) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    MEMBERSHIP_CONFIG_REF,
    (snap) => {
      const config = parseMembershipConfig(snap.exists() ? snap.data() : undefined)
      onData(config, isMembershipConfigComplete(config))
    },
    (err) => onError?.(err.message),
  )
}

export async function getMembershipConfig(): Promise<MembershipConfig> {
  const snap = await getDoc(MEMBERSHIP_CONFIG_REF)
  return parseMembershipConfig(snap.exists() ? snap.data() : undefined)
}

export async function saveMembershipConfig(
  config: Omit<MembershipConfig, 'updatedAt'>,
): Promise<void> {
  await setDoc(
    MEMBERSHIP_CONFIG_REF,
    {
      enabled: config.enabled,
      minOrderValueCop: Math.max(0, Math.floor(config.minOrderValueCop)),
      stampsRequired: Math.max(1, Math.floor(config.stampsRequired)),
      rewardTitle: config.rewardTitle.trim(),
      rewardDescription: (config.rewardDescription ?? '').trim(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function subscribeLoyaltyProgress(
  userId: string | null | undefined,
  onData: (progress: LoyaltyProgress | null) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  if (!userId) {
    onData(null)
    return () => undefined
  }
  const ref = doc(db, 'loyaltyProgress', userId)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null)
        return
      }
      onData(parseLoyaltyProgress(userId, snap.data()))
    },
    (err) => onError?.(err.message),
  )
}

export async function getLoyaltyProgress(userId: string): Promise<LoyaltyProgress | null> {
  const snap = await getDoc(doc(db, 'loyaltyProgress', userId))
  if (!snap.exists()) return null
  return parseLoyaltyProgress(userId, snap.data())
}

export async function findUsersByPhone(phone: string): Promise<UserMembershipLookup[]> {
  return searchMembershipUsersFromFirestore({ phone })
}

export async function findUserByUid(uid: string): Promise<UserMembershipLookup | null> {
  const users = await searchMembershipUsersFromFirestore({ uid })
  return users[0] ?? null
}

export async function listUsersWithPendingRewards(): Promise<UserMembershipLookup[]> {
  return searchMembershipUsersFromFirestore({ pendingOnly: true })
}

function sumOrderItems(items: unknown): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((acc: number, item) => {
    if (!item || typeof item !== 'object') return acc
    const { unitPrice, quantity } = item as { unitPrice?: unknown; quantity?: unknown }
    return (
      acc + (typeof unitPrice === 'number' ? unitPrice : 0) * (typeof quantity === 'number' ? quantity : 0)
    )
  }, 0)
}

/** El total guardado debe coincidir con la suma de los ítems para evitar sellos con totales alterados. */
function isOrderTotalValid(data: Record<string, unknown>): boolean {
  const totalPrice = typeof data.totalPrice === 'number' ? data.totalPrice : 0
  return totalPrice > 0 && totalPrice === sumOrderItems(data.items)
}

export type LoyaltyStampResult =
  | { status: 'credited'; currentStamps: number; rewardPending: boolean }
  | { status: 'skipped'; reason: 'program-disabled' | 'below-minimum' | 'already-credited' | 'invalid-order' | 'card-full' }

/**
 * Suma 1 sello al cliente del pedido si el programa está activo y el total alcanza el mínimo.
 * Idempotente: el flag `loyaltyStampCredited` del pedido impide acreditar dos veces.
 */
export async function creditLoyaltyStampForOrder(orderId: string): Promise<LoyaltyStampResult> {
  const config = await getMembershipConfig()
  if (!isMembershipConfigComplete(config)) return { status: 'skipped', reason: 'program-disabled' }

  const orderRef = doc(db, 'orders', orderId)

  return runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists()) return { status: 'skipped', reason: 'invalid-order' } as const
    const order = orderSnap.data()
    if (order.loyaltyStampCredited === true) return { status: 'skipped', reason: 'already-credited' } as const
    const userId = typeof order.userId === 'string' ? order.userId : ''
    if (!userId || !isOrderTotalValid(order)) return { status: 'skipped', reason: 'invalid-order' } as const
    if (order.totalPrice < config.minOrderValueCop) return { status: 'skipped', reason: 'below-minimum' } as const

    const progressRef = doc(db, 'loyaltyProgress', userId)
    const progressSnap = await tx.get(progressRef)
    const prevStamps = progressSnap.exists() ? Number(progressSnap.data().currentStamps) || 0 : 0

    if (prevStamps >= config.stampsRequired) {
      tx.update(orderRef, { loyaltyStampCredited: true, loyaltyStampCreditedAt: serverTimestamp() })
      return { status: 'skipped', reason: 'card-full' } as const
    }

    const nextStamps = prevStamps + 1
    const rewardPending = nextStamps >= config.stampsRequired
    tx.set(
      progressRef,
      {
        userId,
        currentStamps: nextStamps,
        rewardPending,
        totalStampsEarned: increment(1),
        lastStampOrderId: orderId,
        lastStampAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    tx.update(orderRef, { loyaltyStampCredited: true, loyaltyStampCreditedAt: serverTimestamp() })
    return { status: 'credited', currentStamps: nextStamps, rewardPending } as const
  })
}

/** Quita el sello que acreditó el pedido (cancelación o entrega anulada). */
export async function revokeLoyaltyStampForOrder(orderId: string): Promise<boolean> {
  const config = await getMembershipConfig()
  const orderRef = doc(db, 'orders', orderId)

  return runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef)
    if (!orderSnap.exists() || orderSnap.data().loyaltyStampCredited !== true) return false
    const userId = String(orderSnap.data().userId ?? '')

    const progressRef = doc(db, 'loyaltyProgress', userId)
    const progressSnap = await tx.get(progressRef)
    if (progressSnap.exists()) {
      const prev = progressSnap.data()
      const nextStamps = Math.max(0, (Number(prev.currentStamps) || 0) - 1)
      tx.set(
        progressRef,
        {
          currentStamps: nextStamps,
          rewardPending: config.stampsRequired > 0 && nextStamps >= config.stampsRequired,
          totalStampsEarned: Math.max(0, (Number(prev.totalStampsEarned) || 0) - 1),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }
    tx.update(orderRef, { loyaltyStampCredited: false, loyaltyStampCreditedAt: deleteField() })
    return true
  })
}

/** Marca el premio como entregado y reinicia la carta a 0 sellos. */
export async function redeemLoyaltyReward(userId: string): Promise<void> {
  const ref = doc(db, 'loyaltyProgress', userId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists() || snap.data().rewardPending !== true) {
      throw new Error('Este cliente no tiene premio pendiente.')
    }
    tx.set(
      ref,
      {
        currentStamps: 0,
        rewardPending: false,
        totalRewardsRedeemed: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  })
}

export async function resetLoyaltyProgress(userId: string): Promise<void> {
  await setDoc(
    doc(db, 'loyaltyProgress', userId),
    { userId, currentStamps: 0, rewardPending: false, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

/** Recalcula `rewardPending` de todos los clientes cuando cambia la cantidad de sellos requerida. */
export async function recalculateRewardPendingForAll(stampsRequired: number): Promise<void> {
  if (stampsRequired < 1) return
  const snap = await getDocs(collection(db, 'loyaltyProgress'))
  const batch = writeBatch(db)
  snap.docs.forEach((progressDoc) => {
    const currentStamps = Number(progressDoc.data().currentStamps) || 0
    batch.set(
      progressDoc.ref,
      { rewardPending: currentStamps >= stampsRequired, updatedAt: serverTimestamp() },
      { merge: true },
    )
  })
  await batch.commit()
}
