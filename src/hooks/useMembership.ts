import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  subscribeLoyaltyProgress,
  subscribeMembershipConfig,
} from '../services/membershipService'
import type { LoyaltyProgress, MembershipConfig } from '../types/membership'
import { EMPTY_MEMBERSHIP_CONFIG } from '../types/membership'

export function useMembership() {
  const { user } = useAuth()
  const [config, setConfig] = useState<MembershipConfig>(EMPTY_MEMBERSHIP_CONFIG)
  const [configComplete, setConfigComplete] = useState(false)
  const [progress, setProgress] = useState<LoyaltyProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubConfig = subscribeMembershipConfig(
      (nextConfig, isComplete) => {
        setConfig(nextConfig)
        setConfigComplete(isComplete)
        setLoading(false)
      },
      (message) => {
        setError(message)
        setLoading(false)
      },
    )
    return () => unsubConfig()
  }, [])

  useEffect(() => {
    if (!user?.uid) {
      setProgress(null)
      return
    }
    const unsubProgress = subscribeLoyaltyProgress(
      user.uid,
      (nextProgress) => setProgress(nextProgress),
      (message) => setError(message),
    )
    return () => unsubProgress()
  }, [user?.uid])

  const isProgramVisible = configComplete

  const stampHintForTotal = useMemo(() => {
    if (!isProgramVisible) return null
    return (totalPrice: number) => {
      if (totalPrice >= config.minOrderValueCop) {
        return 'Este pedido sumará 1 sello al entregarse.'
      }
      const missing = config.minOrderValueCop - totalPrice
      return `Faltan $${missing.toLocaleString('es-CO')} para sumar sello de membresía.`
    }
  }, [config.minOrderValueCop, isProgramVisible])

  return {
    config,
    configComplete,
    progress,
    loading,
    error,
    isProgramVisible,
    currentStamps: progress?.currentStamps ?? 0,
    rewardPending: progress?.rewardPending ?? false,
    stampHintForTotal,
  }
}
