/**
 * Reseñas aprobadas + botón para dejar reseña (web y móvil).
 */

import { IonButton, IonSpinner } from '@ionic/react'
import { useEffect, useMemo, useState } from 'react'
import type { Review, ReviewTargetType } from '../../types/review'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import type { MenuCategory } from '../../types/menu'
import { resolveReviewContext, reviewTargetLabel } from '../../types/review'
import {
  averageRating,
  createReview,
  filterReviewsForContext,
  subscribeApprovedReviews,
} from '../../services/reviewsService'
import { loginPath, ROUTES } from '../../routes/paths'
import { LeaveReviewModal } from './LeaveReviewModal'
import { StarRating } from './StarRating'

interface ReviewsSectionProps {
  variant?: 'light' | 'dark'
  sections: MenuCategory[]
  currentSection: MenuCategory | null
  className?: string
}

export function ReviewsSection({
  variant = 'light',
  sections,
  currentSection,
  className = '',
}: ReviewsSectionProps) {
  const history = useHistory()
  const { user } = useAuth()
  const { canPostReview } = usePermissions()
  const [allApproved, setAllApproved] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeApprovedReviews(
      (list) => {
        setAllApproved(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [])

  const visible = useMemo(
    () =>
      filterReviewsForContext(allApproved, {
        categoryId: currentSection?.id,
        comboId: undefined,
      }),
    [allApproved, currentSection?.id],
  )

  const avg = averageRating(visible)
  const isDark = variant === 'dark'

  const handleSubmit = async (data: {
    targetType: ReviewTargetType
    categoryId: string | null
    comboId: string | null
    rating: number
    text: string
  }) => {
    if (!user) {
      history.push(loginPath(ROUTES.HOME))
      return
    }
    await createReview(user, data)
    setToast('¡Gracias! Tu reseña está pendiente de aprobación.')
  }

  return (
    <section
      className={`max-w-5xl mx-auto px-2 py-10 ${className}`}
      aria-labelledby="reviews-section-title"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h2
            id="reviews-section-title"
            className={`krocam-font-title text-xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            Lo que dicen nuestros clientes
          </h2>
          {avg != null && (
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Promedio {avg} / 5 · {visible.length} reseña
              {visible.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {canPostReview ? (
          <IonButton
            className="krocam-font-title krocam-btn-primary font-semibold shrink-0"
            onClick={() => setModalOpen(true)}
          >
            Deja tu reseña
          </IonButton>
        ) : (
          <IonButton
            fill="outline"
            className="shrink-0"
            onClick={() => history.push(loginPath(ROUTES.HOME))}
          >
            Inicia sesión para reseñar
          </IonButton>
        )}
      </div>

      {toast && (
        <p
          className={`text-sm mb-4 rounded-lg px-3 py-2 ${
            isDark ? 'bg-white/10 text-(--krocam-yellow)' : 'bg-amber-50 text-amber-900'
          }`}
        >
          {toast}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <IonSpinner />
        </div>
      ) : visible.length === 0 ? (
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Aún no hay reseñas publicadas. ¡Sé el primero en dejar la tuya!
        </p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.slice(0, 12).map((r) => (
            <blockquote
              key={r.id}
              className={`rounded-2xl border p-4 text-left ${
                isDark
                  ? 'border-white/10 bg-white/5'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <StarRating value={r.rating} size="sm" label={`${r.rating} estrellas`} />
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    isDark ? 'text-gray-400' : 'text-gray-400'
                  }`}
                >
                  {reviewTargetLabel(r, resolveReviewContext(r, sections))}
                </span>
              </div>
              <p
                className={`text-sm mt-2 leading-relaxed ${
                  isDark ? 'text-gray-200' : 'text-gray-700'
                }`}
              >
                &ldquo;{r.text}&rdquo;
              </p>
              <footer
                className={`mt-3 text-xs font-semibold ${
                  isDark ? 'text-(--krocam-yellow)' : 'text-(--krocam-red)'
                }`}
              >
                — {r.authorLabel}
              </footer>
            </blockquote>
          ))}
        </div>
      )}

      <LeaveReviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        sections={sections}
        defaultCategoryId={currentSection?.id}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
