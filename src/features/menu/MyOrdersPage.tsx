/**
 * MyOrdersPage: el cliente ve sus pedidos en tiempo real y el estado (pendiente, en preparación, despachado, entregado).
 * Destaca cuando el pedido está "despachado" (va en camino).
 */

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToolbar,
} from '@ionic/react'
import {
  carOutline,
  checkmarkCircleOutline,
  logoWhatsapp,
  timeOutline,
} from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { openWhatsAppWithMessage } from '../../services/whatsappDeepLink'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Recibido',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string; icon: string }
> = {
  pendiente: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    icon: 'text-amber-600',
  },
  en_preparacion: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: 'text-orange-600',
  },
  despachado: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
  entregado: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
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
  status: string
  createdAt: Timestamp | null
}

interface MyOrdersPageProps {
  onClose: () => void
}

export default function MyOrdersPage({ onClose }: MyOrdersPageProps) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<OrderDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
    )
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: OrderDoc[] = snap.docs
          .map((d) => {
            const data = d.data()
            return {
              id: d.id,
              userId: data.userId ?? '',
              items: data.items ?? [],
              totalPrice: data.totalPrice ?? 0,
              status: data.status ?? 'pendiente',
              createdAt: data.createdAt ?? null,
            }
          })
          .filter((o) => o.status !== 'entregado')
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0
          const tb = b.createdAt?.toMillis?.() ?? 0
          return tb - ta
        })
        setOrders(list)
        setLoading(false)
      },
      () => {
        setError('No se pudieron cargar tus pedidos.')
        setOrders([])
        setLoading(false)
      },
    )
    return () => unsubscribe()
  }, [user?.uid])

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

  const formatDate = (ts: Timestamp | null) => {
    if (!ts) return '—'
    const d = ts.toDate?.() ?? new Date()
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar flex items-center justify-between px-4">
          <p className="krocam-font-title text-lg font-bold text-white">
            Mis pedidos
          </p>
          <IonButton fill="clear" color="light" onClick={onClose}>
            Volver a la carta
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding carta-content">
        <div className="max-w-2xl mx-auto py-4">
          <p className="text-gray-400 text-sm mb-4">
            Aquí ves el estado de tus pedidos en tiempo real.
          </p>

          {loading && (
            <div className="flex justify-center py-12">
              <IonSpinner />
            </div>
          )}
          {error && (
            <p className="text-(--krocam-red) text-sm py-4">{error}</p>
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <p className="text-gray-500 text-sm">
                Aún no tienes pedidos. Agrega productos al carrito y confirma tu pedido.
              </p>
              <IonButton fill="solid" className="mt-4 rounded-xl" onClick={onClose}>
                Ver carta
              </IonButton>
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <ul className="space-y-4">
              {orders.map((order) => {
                const style = getStatusStyle(order.status)
                const isDespachado = order.status === 'despachado'
                const isEntregado = order.status === 'entregado'
                return (
                  <li
                    key={order.id}
                    className={`rounded-2xl border-2 bg-white shadow-md overflow-hidden ${style.border} ${
                      isDespachado ? 'ring-2 ring-blue-300 ring-offset-2' : ''
                    }`}
                  >
                    {isDespachado && (
                      <div className="bg-blue-500 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" aria-hidden>🚚</span>
                          <span className="krocam-font-title font-bold text-sm">
                            ¡Tu pedido va en camino!
                          </span>
                        </div>
                        <IonButton
                          size="small"
                          fill="solid"
                          color="light"
                          className="rounded-xl font-semibold"
                          onClick={() => {
                            const msg = `¡Hola! Mi pedido #${order.id.slice(-6)} está despachado. ¿Llegó ya o hay novedades?`
                            openWhatsAppWithMessage(msg)
                          }}
                        >
                          <IonIcon icon={logoWhatsapp} slot="start" />
                          Contactar por WhatsApp
                        </IonButton>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </span>
                        <span className="krocam-font-title font-bold text-(--krocam-black)">
                          {formatCurrency(order.totalPrice)}
                        </span>
                      </div>
                      <div
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 ${style.bg} ${style.text} ${style.border}`}
                      >
                        {isEntregado ? (
                          <IonIcon icon={checkmarkCircleOutline} className="text-lg" />
                        ) : isDespachado ? (
                          <IonIcon icon={carOutline} className="text-lg" />
                        ) : (
                          <IonIcon icon={timeOutline} className="text-lg" />
                        )}
                        <span className="font-semibold text-sm">
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          Resumen
                        </p>
                        <ul className="text-sm text-gray-700 space-y-0.5">
                          {order.items.slice(0, 4).map((item, i) => (
                            <li key={i}>
                              {item.quantity}× {item.name}
                            </li>
                          ))}
                          {order.items.length > 4 && (
                            <li className="text-gray-500">
                              +{order.items.length - 4} más
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}
