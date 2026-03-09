/**
 * AdminPage: panel admin con Pedidos (lista) y Resumen (estadísticas del día + gráfica por día).
 * Solo accesible si el usuario tiene role === 'admin' en Firestore.
 */

import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToast,
  IonToolbar,
} from '@ionic/react'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../../firebase'

export const ORDER_STATUSES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'despachado', label: 'Despachado' },
  { value: 'entregado', label: 'Entregado' },
] as const

export type OrderStatusValue = (typeof ORDER_STATUSES)[number]['value']

const STATUS_STYLES: Record<
  string,
  { headerBg: string; headerText: string; border: string; badge: string }
> = {
  pendiente: {
    headerBg: 'bg-amber-500',
    headerText: 'text-white',
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  en_preparacion: {
    headerBg: 'bg-orange-500',
    headerText: 'text-white',
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  despachado: {
    headerBg: 'bg-blue-500',
    headerText: 'text-white',
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  entregado: {
    headerBg: 'bg-emerald-600',
    headerText: 'text-white',
    border: 'border-l-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pendiente
}

interface OrderItem {
  id: string
  name: string
  section: string
  unitPrice: number
  quantity: number
}

interface OrderDoc {
  id: string
  userId: string
  items: OrderItem[]
  totalPrice: number
  delivery: { phone: string; barrio: string; address: string; notes: string }
  coords: { lat: number; lng: number } | null
  status: string
  createdAt: Timestamp | null
}

interface AdminPageProps {
  onClose: () => void
}

type AdminTab = 'pedidos' | 'resumen' | 'historial'

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default function AdminPage({ onClose }: AdminPageProps) {
  const [tab, setTab] = useState<AdminTab>('pedidos')
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastOpen, setToastOpen] = useState(false)
  const [historyDate, setHistoryDate] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: OrderDoc[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            userId: data.userId ?? '',
            items: data.items ?? [],
            totalPrice: data.totalPrice ?? 0,
            delivery: data.delivery ?? { phone: '', barrio: '', address: '', notes: '' },
            coords: data.coords ?? null,
            status: data.status ?? 'pendiente',
            createdAt: data.createdAt ?? null,
          }
        })
        list.sort((a, b) => {
          const aDelivered = a.status === 'entregado'
          const bDelivered = b.status === 'entregado'
          if (aDelivered && !bDelivered) return 1
          if (!aDelivered && bDelivered) return -1
          const ta = a.createdAt?.toMillis?.() ?? 0
          const tb = b.createdAt?.toMillis?.() ?? 0
          return ta - tb
        })
        setOrders(list)
        setLoading(false)
      },
      () => {
        setError('No se pudieron cargar los pedidos.')
        setOrders([])
        setLoading(false)
      },
    )
    return () => unsubscribe()
  }, [])

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

  const formatDate = (ts: Timestamp | null) => {
    if (!ts) return '—'
    const d = ts.toDate?.() ?? new Date()
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId)
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      import('../../services/notifyWhatsApp').then((m) => m.triggerNotifyOrders())
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      )
      setToastMessage('Estado actualizado.')
      setToastOpen(true)
    } catch {
      setToastMessage('No se pudo actualizar el estado.')
      setToastOpen(true)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const today = startOfDay(new Date())
  const ordersToday = orders.filter((o) => {
    const t = o.createdAt?.toMillis?.()
    if (!t) return false
    const orderDate = startOfDay(new Date(t))
    return orderDate.getTime() === today.getTime()
  })
  const totalToday = ordersToday.reduce((sum, o) => sum + o.totalPrice, 0)

  const last7Days: { date: Date; key: string; total: number; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = formatDayKey(d)
    const dayOrders = orders.filter((o) => {
      const t = o.createdAt?.toMillis?.()
      if (!t) return false
      return formatDayKey(new Date(t)) === key
    })
    last7Days.push({
      date: d,
      key,
      total: dayOrders.reduce((s, o) => s + o.totalPrice, 0),
      count: dayOrders.length,
    })
  }
  const maxTotal = Math.max(1, ...last7Days.map((d) => d.total))

  const pendingOrders = orders.filter((o) => o.status !== 'entregado')
  const deliveredOrders = orders.filter((o) => o.status === 'entregado')
  const todayKey = formatDayKey(today)
  const historyFiltered = deliveredOrders.filter((o) => {
    const t = o.createdAt?.toMillis?.()
    if (!t) return false
    const orderDayKey = formatDayKey(new Date(t))
    return orderDayKey === (historyDate || todayKey)
  })

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar flex items-center justify-between px-4">
          <p className="krocam-font-title text-lg font-bold text-white">
            Panel admin
          </p>
          <IonButton fill="clear" color="light" onClick={onClose}>
            Volver a la carta
          </IonButton>
        </IonToolbar>
        <div className="px-4 pb-3 pt-1 bg-(--krocam-black)">
          <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">
            Sección
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('pedidos')}
              className={`krocam-font-title krocam-category-chip shrink-0 text-sm font-semibold border transition-all ${
                tab === 'pedidos'
                  ? 'bg-(--krocam-yellow) text-gray-900 border-transparent shadow-md'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              Pedidos
            </button>
            <button
              type="button"
              onClick={() => setTab('resumen')}
              className={`krocam-font-title krocam-category-chip shrink-0 text-sm font-semibold border transition-all ${
                tab === 'resumen'
                  ? 'bg-(--krocam-yellow) text-gray-900 border-transparent shadow-md'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              Resumen
            </button>
            <button
              type="button"
              onClick={() => setTab('historial')}
              className={`krocam-font-title krocam-category-chip shrink-0 text-sm font-semibold border transition-all ${
                tab === 'historial'
                  ? 'bg-(--krocam-yellow) text-gray-900 border-transparent shadow-md'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              Historial entregados
            </button>
          </div>
        </div>
      </IonHeader>
      <IonContent className="ion-padding carta-content">
        <div className="max-w-3xl mx-auto py-4">
          {loading && (
            <div className="flex justify-center py-8">
              <IonSpinner />
            </div>
          )}
          {error && (
            <p className="text-(--krocam-red) text-sm py-4">
              {error}
            </p>
          )}

          {!loading && tab === 'pedidos' && (
            <>
              {pendingOrders.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">
                  No hay pedidos pendientes. Los entregados están en Historial.
                </p>
              ) : (
                <ul className="space-y-5">
                  {pendingOrders.map((order) => {
                    const style = getStatusStyle(order.status)
                    const currentIndex = ORDER_STATUSES.findIndex(
                      (s) => s.value === (order.status as OrderStatusValue),
                    )
                    return (
                      <li
                        key={order.id}
                        className={`rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden border-l-4 ${style.border}`}
                      >
                        <div
                          className={`flex items-center justify-between px-4 py-3 ${style.headerBg} ${style.headerText}`}
                        >
                          <span className="text-sm font-medium opacity-90">
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="krocam-font-title text-lg font-bold">
                            {formatCurrency(order.totalPrice)}
                          </span>
                        </div>
                        <div className="p-4 space-y-4">
                          {order.coords && (
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 pt-2 pb-1">
                                Ubicación de entrega
                              </p>
                              <div className="relative aspect-2/1 min-h-[120px]">
                                <iframe
                                  title="Ubicación del pedido"
                                  src={`https://www.google.com/maps?q=${order.coords.lat},${order.coords.lng}&z=16&output=embed`}
                                  className="absolute inset-0 w-full h-full border-0"
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                />
                              </div>
                              <div className="p-2 flex justify-end">
                                <IonButton
                                  size="small"
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${order.coords.lat},${order.coords.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-sm"
                                >
                                  Cómo llegar (Google Maps)
                                </IonButton>
                              </div>
                            </div>
                          )}

                          <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Cliente — datos para entregar
                            </p>
                            <div className="space-y-1.5 text-sm">
                              <p className="flex items-center gap-2">
                                <span className="text-gray-500 shrink-0">Teléfono:</span>
                                <a
                                  href={`tel:${order.delivery.phone.replace(/\s/g, '')}`}
                                  className="font-semibold text-blue-600 underline"
                                >
                                  {order.delivery.phone}
                                </a>
                              </p>
                              <p>
                                <span className="text-gray-500">Barrio:</span>{' '}
                                <span className="font-medium text-gray-800">{order.delivery.barrio}</span>
                              </p>
                              <p>
                                <span className="text-gray-500">Dirección:</span>{' '}
                                <span className="font-medium text-gray-800">{order.delivery.address}</span>
                              </p>
                              {order.delivery.notes && (
                                <p className="text-gray-600 italic">
                                  <span className="text-gray-500 not-italic">Referencias:</span>{' '}
                                  {order.delivery.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado del pedido
                            </span>
                            <div
                              className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 ${style.badge}`}
                            >
                              <IonSelect
                                value={order.status}
                                disabled={updatingOrderId === order.id}
                                onIonChange={(e) =>
                                  handleStatusChange(order.id, e.detail.value as OrderStatusValue)
                                }
                                interface="action-sheet"
                                className="min-w-[140px] font-semibold text-sm [--padding-start:0] [--padding-end:0]"
                              >
                                {ORDER_STATUSES.map((s, idx) => (
                                  <IonSelectOption
                                    key={s.value}
                                    value={s.value}
                                    disabled={idx < currentIndex}
                                  >
                                    {s.label}
                                  </IonSelectOption>
                                ))}
                              </IonSelect>
                              {updatingOrderId === order.id && (
                                <IonSpinner name="crescent" className="scale-75 shrink-0" />
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Detalle del pedido
                            </p>
                            <ul className="space-y-1 text-sm text-gray-800">
                              {order.items.map((item, i) => (
                                <li key={i} className="flex justify-between gap-2">
                                  <span>
                                    {item.quantity}× {item.name}
                                  </span>
                                  <span className="font-medium text-(--krocam-red) shrink-0">
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {!loading && tab === 'resumen' && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="krocam-font-title text-lg font-bold text-gray-900 mb-3">
                  Hoy
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </p>
                    <p className="text-2xl font-bold text-(--krocam-black)">
                      {ordersToday.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Total vendido
                    </p>
                    <p className="text-2xl font-bold text-(--krocam-red)">
                      {formatCurrency(totalToday)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="krocam-font-title text-lg font-bold text-gray-900 mb-3">
                  Ventas por día (últimos 7 días)
                </h2>
                <div className="flex items-end gap-2 h-40">
                  {last7Days.map((day) => (
                    <div
                      key={day.key}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-[10px] text-gray-500 font-medium">
                        {day.total > 0 ? formatCurrency(day.total) : '—'}
                      </span>
                      <div
                        className="w-full rounded-t bg-(--krocam-yellow) min-h-[4px] transition-all"
                        style={{
                          height: `${Math.max(4, (day.total / maxTotal) * 100)}%`,
                        }}
                        title={`${day.date.toLocaleDateString('es-CO')}: ${formatCurrency(day.total)} (${day.count} pedidos)`}
                      />
                      <span className="text-[10px] text-gray-600">
                        {day.date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {!loading && tab === 'historial' && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="krocam-font-title text-lg font-bold text-gray-900">
                      Historial de entregados
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Filtra por fecha para ver únicamente los pedidos entregados ese día.
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <label
                      htmlFor="admin-history-date"
                      className="block text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Fecha
                    </label>
                    <input
                      type="date"
                      id="admin-history-date"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                      className="text-sm rounded-xl border border-gray-300 px-3 py-1.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-(--krocam-yellow)"
                    />
                    {historyDate && (
                      <button
                        type="button"
                        className="block text-[11px] text-blue-600 hover:underline ml-auto"
                        onClick={() => setHistoryDate('')}
                      >
                        Limpiar filtro
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {historyFiltered.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">
                  No hay pedidos entregados para la fecha seleccionada.
                </p>
              ) : (
                <ul className="space-y-5">
                  {historyFiltered.map((order) => {
                    const style = getStatusStyle(order.status)
                    return (
                      <li
                        key={order.id}
                        className={`rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden border-l-4 ${style.border}`}
                      >
                        <div
                          className={`flex items-center justify-between px-4 py-3 ${style.headerBg} ${style.headerText}`}
                        >
                          <span className="text-sm font-medium opacity-90">
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="krocam-font-title text-lg font-bold">
                            {formatCurrency(order.totalPrice)}
                          </span>
                        </div>
                        <div className="p-4 space-y-4">
                          {order.coords && (
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-3 pt-2 pb-1">
                                Ubicación de entrega
                              </p>
                              <div className="relative aspect-2/1 min-h-[120px]">
                                <iframe
                                  title="Ubicación del pedido"
                                  src={`https://www.google.com/maps?q=${order.coords.lat},${order.coords.lng}&z=16&output=embed`}
                                  className="absolute inset-0 w-full h-full border-0"
                                  loading="lazy"
                                  referrerPolicy="no-referrer-when-downgrade"
                                />
                              </div>
                              <div className="p-2 flex justify-end">
                                <IonButton
                                  size="small"
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${order.coords.lat},${order.coords.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-sm"
                                >
                                  Cómo llegar (Google Maps)
                                </IonButton>
                              </div>
                            </div>
                          )}

                          <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Cliente — datos para entregar
                            </p>
                            <div className="space-y-1.5 text-sm">
                              <p className="flex items-center gap-2">
                                <span className="text-gray-500 shrink-0">Teléfono:</span>
                                <a
                                  href={`tel:${order.delivery.phone.replace(/\s/g, '')}`}
                                  className="font-semibold text-blue-600 underline"
                                >
                                  {order.delivery.phone}
                                </a>
                              </p>
                              <p>
                                <span className="text-gray-500">Barrio:</span>{' '}
                                <span className="font-medium text-gray-800">{order.delivery.barrio}</span>
                              </p>
                              <p>
                                <span className="text-gray-500">Dirección:</span>{' '}
                                <span className="font-medium text-gray-800">{order.delivery.address}</span>
                              </p>
                              {order.delivery.notes && (
                                <p className="text-gray-600 italic">
                                  <span className="text-gray-500 not-italic">Referencias:</span>{' '}
                                  {order.delivery.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Detalle del pedido
                            </p>
                            <ul className="space-y-1 text-sm text-gray-800">
                              {order.items.map((item, i) => (
                                <li key={i} className="flex justify-between gap-2">
                                  <span>
                                    {item.quantity}× {item.name}
                                  </span>
                                  <span className="font-medium text-(--krocam-red) shrink-0">
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
        <IonToast
          isOpen={toastOpen}
          message={toastMessage}
          duration={2000}
          position="top"
          onDidDismiss={() => setToastOpen(false)}
        />
      </IonContent>
    </IonPage>
  )
}
