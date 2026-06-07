export interface DeliveryProfileFields {
  phone: string
  barrio: string
  address: string
  notes: string
}

export function deliveryProfileStorageKey(uid: string): string {
  return `krocam_profile_form_${uid}`
}

export function readStoredDeliveryProfile(
  uid: string,
): Partial<DeliveryProfileFields> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(deliveryProfileStorageKey(uid))
    if (!raw) return {}
    return JSON.parse(raw) as Partial<DeliveryProfileFields>
  } catch {
    return {}
  }
}

export function writeStoredDeliveryProfile(
  uid: string,
  fields: Partial<DeliveryProfileFields>,
): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      deliveryProfileStorageKey(uid),
      JSON.stringify({
        phone: fields.phone ?? '',
        barrio: fields.barrio ?? '',
        address: fields.address ?? '',
        notes: fields.notes ?? '',
      }),
    )
  } catch {
    // Storage no disponible (modo privado, etc.)
  }
}

export function mergeDeliveryProfileFields(
  stored: Partial<DeliveryProfileFields>,
  firebase: Partial<DeliveryProfileFields> | null | undefined,
): DeliveryProfileFields {
  const fb = firebase ?? {}
  return {
    phone: stored.phone?.trim() || fb.phone?.trim() || '',
    barrio: stored.barrio?.trim() || fb.barrio?.trim() || '',
    address: stored.address?.trim() || fb.address?.trim() || '',
    notes: stored.notes?.trim() || fb.notes?.trim() || '',
  }
}
