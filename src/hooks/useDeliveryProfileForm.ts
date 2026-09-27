import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface UseDeliveryProfileFormOptions {
  /** Si false, no carga ni persiste (p. ej. modal cerrado). */
  active?: boolean
}

/**
 * Formulario de datos de entrega sincronizado solo con `users/{uid}` en Firestore.
 */
export function useDeliveryProfileForm({
  active = true,
}: UseDeliveryProfileFormOptions = {}) {
  const { user, profile, profileLoading, saveProfile } = useAuth()
  const [phone, setPhoneState] = useState('')
  const [barrio, setBarrioState] = useState('')
  const [address, setAddressState] = useState('')
  const [notes, setNotesState] = useState('')
  const [edited, setEdited] = useState(false)
  const [syncedKey, setSyncedKey] = useState<string | null>(null)
  const firebaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const profileKey =
    active && user?.uid && !profileLoading
      ? JSON.stringify([
          user.uid,
          profile?.phone ?? '',
          profile?.barrio ?? '',
          profile?.address ?? '',
          profile?.notes ?? '',
        ])
      : null

  const applyProfile = useCallback(() => {
    setPhoneState(profile?.phone ?? '')
    setBarrioState(profile?.barrio ?? '')
    setAddressState(profile?.address ?? '')
    setNotesState(profile?.notes ?? '')
    setEdited(false)
  }, [profile])

  // Mientras el usuario no edite, el formulario refleja lo último que llegó de Firestore.
  if (profileKey !== syncedKey && (profileKey === null || !edited)) {
    setSyncedKey(profileKey)
    if (profileKey === null) {
      setEdited(false)
    } else {
      applyProfile()
    }
  }

  const setPhone = useCallback((value: string) => {
    setEdited(true)
    setPhoneState(value)
  }, [])

  const setBarrio = useCallback((value: string) => {
    setEdited(true)
    setBarrioState(value)
  }, [])

  const setAddress = useCallback((value: string) => {
    setEdited(true)
    setAddressState(value)
  }, [])

  const setNotes = useCallback((value: string) => {
    setEdited(true)
    setNotesState(value)
  }, [])

  useEffect(() => {
    if (!active || !user?.uid || !edited) return
    if (!phone.trim() || !barrio.trim() || !address.trim()) return

    if (firebaseTimerRef.current) clearTimeout(firebaseTimerRef.current)
    firebaseTimerRef.current = setTimeout(() => {
      void saveProfile({
        phone: phone.trim(),
        barrio: barrio.trim(),
        address: address.trim(),
        notes: notes.trim(),
      }).catch(() => {})
    }, 600)
  }, [phone, barrio, address, notes, edited, active, user?.uid, saveProfile])

  useEffect(() => {
    return () => {
      if (firebaseTimerRef.current) clearTimeout(firebaseTimerRef.current)
    }
  }, [])

  const refreshFromProfile = useCallback(() => {
    applyProfile()
    setSyncedKey(profileKey)
  }, [applyProfile, profileKey])

  return {
    phone,
    barrio,
    address,
    notes,
    setPhone,
    setBarrio,
    setAddress,
    setNotes,
    refreshFromProfile,
  }
}
