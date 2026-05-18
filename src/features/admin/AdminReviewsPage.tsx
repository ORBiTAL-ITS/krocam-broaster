/**
 * Moderación de reseñas: aprobar o rechazar pendientes.
 */

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { StarRating } from '../../components/reviews/StarRating'
import { ROUTES } from '../../routes/paths'
import {
  setReviewStatus,
  subscribePendingReviews,
} from '../../services/reviewsService'
import { reviewTargetLabel, type Review } from '../../types/review'

export default function AdminReviewsPage() {
  const history = useHistory()
  const [pending, setPending] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribePendingReviews(
      (list) => {
        setPending(list)
        setLoading(false)
      },
      (err) => {
        setMessage(err)
        setLoading(false)
      },
    )
    return () => unsub()
  }, [])

  const moderate = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id)
    setMessage(null)
    try {
      await setReviewStatus(id, status)
      setMessage(status === 'approved' ? 'Reseña aprobada.' : 'Reseña rechazada.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al actualizar.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="krocam-toolbar">
          <IonButton
            slot="start"
            fill="clear"
            color="light"
            onClick={() => history.push(ROUTES.ADMIN_ORDERS)}
          >
            Volver
          </IonButton>
          <IonTitle className="krocam-font-title text-white">Reseñas pendientes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding carta-content">
        <div className="max-w-2xl mx-auto py-4">
          <p className="text-gray-600 text-sm mb-4">
            Las reseñas aprobadas se muestran en la carta. Las rechazadas no se publican.
          </p>
          {message && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-4">
              {message}
            </p>
          )}
          {loading ? (
            <div className="flex justify-center py-12">
              <IonSpinner />
            </div>
          ) : pending.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No hay reseñas pendientes.</p>
          ) : (
            <ul className="space-y-4">
              {pending.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <StarRating value={r.rating} size="sm" />
                    <span className="text-[10px] uppercase text-gray-400 tracking-wide">
                      {reviewTargetLabel(r)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-2">— {r.authorLabel}</p>
                  <div className="flex gap-2 mt-4">
                    <IonButton
                      size="small"
                      color="success"
                      disabled={busyId === r.id}
                      onClick={() => void moderate(r.id, 'approved')}
                    >
                      <IonIcon icon={checkmarkCircleOutline} slot="start" />
                      Aprobar
                    </IonButton>
                    <IonButton
                      size="small"
                      color="medium"
                      fill="outline"
                      disabled={busyId === r.id}
                      onClick={() => void moderate(r.id, 'rejected')}
                    >
                      <IonIcon icon={closeCircleOutline} slot="start" />
                      Rechazar
                    </IonButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}
