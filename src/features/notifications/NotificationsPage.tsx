/**
 * Bandeja de notificaciones persistidas en Firestore (users/{uid}/inbox).
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
import { chevronBackOutline, notificationsOutline } from 'ionicons/icons'
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'

export interface InboxDoc {
  id: string
  title: string
  body: string
  kind: string
  orderId: string | null
  status: string | null
  read: boolean
  createdAt: Timestamp | null
}

interface NotificationsPageProps {
  onClose: () => void
}

export default function NotificationsPage({ onClose }: NotificationsPageProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<InboxDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, 'users', user.uid, 'inbox'),
      orderBy('createdAt', 'desc'),
      limit(100),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => {
            const x = d.data()
            return {
              id: d.id,
              title: String(x.title ?? ''),
              body: String(x.body ?? ''),
              kind: String(x.kind ?? ''),
              orderId: x.orderId != null ? String(x.orderId) : null,
              status: x.status != null ? String(x.status) : null,
              read: Boolean(x.read),
              createdAt: (x.createdAt as Timestamp | undefined) ?? null,
            }
          }),
        )
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [user])

  const markRead = (id: string) => {
    if (!user) return
    return updateDoc(doc(db, 'users', user.uid, 'inbox', id), { read: true })
  }

  const markAllRead = async () => {
    await Promise.all(items.filter((i) => !i.read).map((it) => markRead(it.id)))
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar px-2">
          <IonButton slot="start" fill="clear" color="light" onClick={onClose}>
            <IonIcon icon={chevronBackOutline} slot="start" />
            Volver
          </IonButton>
          <p className="krocam-font-title text-lg font-bold text-white absolute left-1/2 -translate-x-1/2 pointer-events-none">
            Notificaciones
          </p>
          {items.some((i) => !i.read) && (
            <IonButton slot="end" size="small" fill="clear" color="light" onClick={() => void markAllRead()}>
              Marcar leídas
            </IonButton>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {loading ? (
          <div className="flex justify-center py-12">
            <IonSpinner name="crescent" color="warning" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <IonIcon icon={notificationsOutline} className="text-4xl mb-2 opacity-50" />
            <p>No hay notificaciones guardadas.</p>
          </div>
        ) : (
          <ul className="space-y-2 max-w-lg mx-auto pb-8">
            {items.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    it.read
                      ? 'border-white/10 bg-white/5'
                      : 'border-(--krocam-yellow)/40 bg-(--krocam-yellow)/10'
                  }`}
                  onClick={() => {
                    if (!it.read) void markRead(it.id)
                  }}
                >
                  <p className="font-semibold text-white text-sm">{it.title}</p>
                  <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{it.body}</p>
                  <p className="text-gray-500 text-xs mt-2">
                    {it.createdAt?.toDate?.().toLocaleString?.('es-CO') ?? '—'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </IonContent>
    </IonPage>
  )
}
