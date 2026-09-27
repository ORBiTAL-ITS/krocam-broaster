import type { Timestamp } from 'firebase/firestore'

export const ORDER_STATUSES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'despachado', label: 'Despachado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
] as const

export type OrderStatusValue = (typeof ORDER_STATUSES)[number]['value']

export const ACTIVE_ORDER_STATUSES: OrderStatusValue[] = [
  'pendiente',
  'en_preparacion',
  'despachado',
]

export interface OrderItem {
  id: string
  name: string
  section: string
  unitPrice: number
  quantity: number
}

export interface OrderDoc {
  id: string
  userId: string
  items: OrderItem[]
  totalPrice: number
  delivery: { phone: string; barrio: string; address: string; notes: string }
  coords: { lat: number; lng: number } | null
  status: OrderStatusValue | string
  createdAt: Timestamp | null
  loyaltyStampCredited?: boolean
  loyaltyStampCreditedAt?: Timestamp | null
  cancelledAt?: Timestamp | null
  cancelReason?: string
}

export function isOrderStatusValue(value: string): value is OrderStatusValue {
  return ORDER_STATUSES.some((s) => s.value === value)
}

export function canCancelOrder(status: string): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status as OrderStatusValue)
}
