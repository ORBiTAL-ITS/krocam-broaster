import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
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

function getCallableFunctions() {
  return getFunctions(undefined, 'us-central1')
}

async function callSearchMembershipUsers(
  params: { phone?: string; uid?: string; pendingOnly?: boolean },
): Promise<UserMembershipLookup[]> {
  try {
    const fn = httpsCallable<
      { phone?: string; uid?: string; pendingOnly?: boolean },
      { users: UserMembershipLookup[] }
    >(getCallableFunctions(), 'searchMembershipUsers')
    const res = await fn(params)
    return Array.isArray(res.data?.users) ? res.data.users : []
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : ''
    if (code === 'functions/not-found' || code === 'not-found') {
      return searchMembershipUsersFromFirestore(params)
    }
    throw err
  }
}

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
  return callSearchMembershipUsers({ phone })
}

export async function findUserByUid(uid: string): Promise<UserMembershipLookup | null> {
  const users = await callSearchMembershipUsers({ uid })
  return users[0] ?? null
}

export async function listUsersWithPendingRewards(): Promise<UserMembershipLookup[]> {
  return callSearchMembershipUsers({ pendingOnly: true })
}

export async function redeemLoyaltyReward(userId: string): Promise<void> {
  const fn = httpsCallable<{ userId: string }, { message: string }>(
    getCallableFunctions(),
    'redeemLoyaltyReward',
  )
  await fn({ userId })
}

export async function resetLoyaltyProgress(userId: string): Promise<void> {
  const fn = httpsCallable<{ userId: string }, { message: string }>(
    getCallableFunctions(),
    'resetLoyaltyProgress',
  )
  await fn({ userId })
}
