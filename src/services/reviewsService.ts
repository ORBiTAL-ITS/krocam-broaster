import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '../firebase'
import type { Review, ReviewStatus, ReviewTargetType } from '../types/review'

const COL = 'reviews'

function mapReview(id: string, data: Record<string, unknown>): Review {
  const ts = data.createdAt as Timestamp | undefined
  return {
    id,
    userId: String(data.userId ?? ''),
    authorLabel: String(data.authorLabel ?? 'Cliente'),
    targetType: (data.targetType as ReviewTargetType) ?? 'business',
    categoryId: data.categoryId != null ? String(data.categoryId) : null,
    comboId: data.comboId != null ? String(data.comboId) : null,
    rating: typeof data.rating === 'number' ? data.rating : Number(data.rating) || 0,
    text: String(data.text ?? ''),
    status: (data.status as ReviewStatus) ?? 'pending',
    createdAt: ts?.toDate?.() ?? null,
  }
}

export function formatAuthorLabel(user: User): string {
  const name = user.displayName?.trim() || user.email?.split('@')[0] || ''
  if (!name) return 'Cliente KROCAM'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]
  const first = parts[0]
  const initial = parts[1]?.[0]?.toUpperCase()
  return initial ? `${first} ${initial}.` : first
}

export interface CreateReviewInput {
  targetType: ReviewTargetType
  categoryId?: string | null
  comboId?: string | null
  rating: number
  text: string
}

export async function createReview(user: User, input: CreateReviewInput): Promise<void> {
  const text = input.text.trim()
  if (text.length < 10) throw new Error('El comentario debe tener al menos 10 caracteres.')
  if (input.rating < 1 || input.rating > 5) throw new Error('Elige una calificación de 1 a 5 estrellas.')

  await addDoc(collection(db, COL), {
    userId: user.uid,
    authorLabel: formatAuthorLabel(user),
    targetType: input.targetType,
    categoryId: input.targetType === 'business' ? null : input.categoryId ?? null,
    comboId: input.targetType === 'combo' ? input.comboId ?? null : null,
    rating: input.rating,
    text,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function setReviewStatus(
  reviewId: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  await updateDoc(doc(db, COL, reviewId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

/** Reseñas aprobadas (público). */
export function subscribeApprovedReviews(
  onChange: (reviews: Review[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => mapReview(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => onError?.(err.message),
  )
}

/** Cola de moderación (admin). */
export function subscribePendingReviews(
  onChange: (reviews: Review[]) => void,
  onError?: (message: string) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => mapReview(d.id, d.data() as Record<string, unknown>)))
    },
    (err) => onError?.(err.message),
  )
}

export function filterReviewsForContext(
  reviews: Review[],
  ctx: {
    categoryId?: string
    comboId?: string
  },
): Review[] {
  return reviews.filter((r) => {
    if (r.targetType === 'business') return true
    if (r.targetType === 'category' && ctx.categoryId) {
      return r.categoryId === ctx.categoryId
    }
    if (r.targetType === 'combo' && ctx.categoryId) {
      if (ctx.comboId) {
        return r.categoryId === ctx.categoryId && r.comboId === ctx.comboId
      }
      return r.categoryId === ctx.categoryId
    }
    return false
  })
}

export function averageRating(reviews: Review[]): number | null {
  if (reviews.length === 0) return null
  const sum = reviews.reduce((a, r) => a + r.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}
