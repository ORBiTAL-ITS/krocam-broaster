import type { Timestamp } from 'firebase/firestore'

export interface MembershipConfig {
  enabled: boolean
  minOrderValueCop: number
  stampsRequired: number
  rewardTitle: string
  rewardDescription?: string
  updatedAt?: Timestamp | null
}

export interface LoyaltyProgress {
  userId: string
  currentStamps: number
  rewardPending: boolean
  totalStampsEarned: number
  totalRewardsRedeemed: number
  lastStampOrderId?: string
  lastStampAt?: Timestamp | null
  updatedAt?: Timestamp | null
}

export interface UserMembershipLookup {
  uid: string
  phone: string
  barrio: string
  address: string
  displayName: string
  progress: LoyaltyProgress | null
}

export const EMPTY_MEMBERSHIP_CONFIG: MembershipConfig = {
  enabled: false,
  minOrderValueCop: 0,
  stampsRequired: 0,
  rewardTitle: '',
  rewardDescription: '',
}

export function isMembershipConfigComplete(config: MembershipConfig | null | undefined): boolean {
  if (!config) return false
  return (
    config.enabled === true &&
    config.minOrderValueCop > 0 &&
    config.stampsRequired >= 1 &&
    config.rewardTitle.trim().length > 0
  )
}

export function normalizePhoneForSearch(phone: string): string {
  return phone.replace(/\D/g, '')
}
