import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  mergeDeliveryProfileFields,
  readStoredDeliveryProfile,
  writeStoredDeliveryProfile,
} from '../services/deliveryProfileStorage'

interface UseDeliveryProfileFormOptions {
  /** Si false, no carga ni persiste (p. ej. modal cerrado). */
  active?: boolean
}

export function useDeliveryProfileForm({
  active = true,
}: UseDeliveryProfileFormOptions = {}) {
  const { user, profile, profileLoading, saveProfile } = useAuth()
  const [phone, setPhoneState] = useState('')
  const [barrio, setBarrioState] = useState('')
  const [address, setAddressState] = useState('')
  const [notes, setNotesState] = useState('')
  const initializedRef = useRef(false)
  const profileSyncedRef = useRef(false)
  const userEditedRef = useRef(false)
  const skipPersistRef = useRef(false)
  const firebaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setPhone = useCallback((value: string) => {
    userEditedRef.current = true
    setPhoneState(value)
  }, [])

  const setBarrio = useCallback((value: string) => {
    userEditedRef.current = true
    setBarrioState(value)
  }, [])

  const setAddress = useCallback((value: string) => {
    userEditedRef.current = true
    setAddressState(value)
  }, [])

  const setNotes = useCallback((value: string) => {
    userEditedRef.current = true
    setNotesState(value)
  }, [])

  useEffect(() => {
    if (!active) {
      initializedRef.current = false
      profileSyncedRef.current = false
      userEditedRef.current = false
    }
  }, [active])

  useEffect(() => {
    if (!active || !user?.uid || initializedRef.current) return

    const stored = readStoredDeliveryProfile(user.uid)
    const merged = mergeDeliveryProfileFields(
      stored,
      profileLoading ? undefined : profile,
    )

    skipPersistRef.current = true
    setPhoneState(merged.phone)
    setBarrioState(merged.barrio)
    setAddressState(merged.address)
    setNotesState(merged.notes)
    skipPersistRef.current = false
    initializedRef.current = true
  }, [active, user?.uid, profile, profileLoading])

  useEffect(() => {
    if (!active || !user?.uid || !initializedRef.current || profileLoading) return
    if (!profile || profileSyncedRef.current || userEditedRef.current) return

    skipPersistRef.current = true
    setPhoneState((prev) => prev.trim() || profile.phone || '')
    setBarrioState((prev) => prev.trim() || profile.barrio || '')
    setAddressState((prev) => prev.trim() || profile.address || '')
    setNotesState((prev) => prev.trim() || profile.notes || '')
    skipPersistRef.current = false
    profileSyncedRef.current = true
  }, [active, user?.uid, profile, profileLoading])

  const persistFields = useCallback(
    (fields: { phone: string; barrio: string; address: string; notes: string }) => {
      if (!user?.uid) return

      writeStoredDeliveryProfile(user.uid, fields)

      const complete =
        fields.phone.trim() && fields.barrio.trim() && fields.address.trim()
      if (!complete) return

      if (firebaseTimerRef.current) clearTimeout(firebaseTimerRef.current)
      firebaseTimerRef.current = setTimeout(() => {
        void saveProfile({
          phone: fields.phone.trim(),
          barrio: fields.barrio.trim(),
          address: fields.address.trim(),
          notes: fields.notes.trim(),
        }).catch(() => {})
      }, 600)
    },
    [user?.uid, saveProfile],
  )

  useEffect(() => {
    if (!active || !user?.uid || !initializedRef.current || skipPersistRef.current) {
      return
    }
    persistFields({ phone, barrio, address, notes })
  }, [phone, barrio, address, notes, active, user?.uid, persistFields])

  const refreshFromStorage = useCallback(() => {
    if (!user?.uid) return

    const stored = readStoredDeliveryProfile(user.uid)
    const merged = mergeDeliveryProfileFields(stored, profile)

    skipPersistRef.current = true
    setPhoneState(merged.phone)
    setBarrioState(merged.barrio)
    setAddressState(merged.address)
    setNotesState(merged.notes)
    skipPersistRef.current = false
    userEditedRef.current = false
    profileSyncedRef.current = true
  }, [user?.uid, profile])

  useEffect(() => {
    return () => {
      if (firebaseTimerRef.current) clearTimeout(firebaseTimerRef.current)
    }
  }, [])

  return {
    phone,
    barrio,
    address,
    notes,
    setPhone,
    setBarrio,
    setAddress,
    setNotes,
    refreshFromStorage,
  }
}
