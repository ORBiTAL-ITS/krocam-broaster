export type ReviewTargetType = 'business' | 'category' | 'combo'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface Review {
  id: string
  userId: string
  authorLabel: string
  targetType: ReviewTargetType
  categoryId: string | null
  comboId: string | null
  rating: number
  text: string
  status: ReviewStatus
  createdAt: Date | null
}

export function reviewTargetLabel(
  review: Pick<Review, 'targetType' | 'categoryId' | 'comboId'>,
  ctx?: { categoryTitle?: string; comboTitle?: string },
): string {
  if (review.targetType === 'business') return 'KROCAM'
  if (review.targetType === 'category') {
    return ctx?.categoryTitle ?? review.categoryId ?? 'Categoría'
  }
  const combo = ctx?.comboTitle ?? review.comboId ?? 'Combo'
  const cat = ctx?.categoryTitle ?? review.categoryId ?? ''
  return cat ? `${combo} · ${cat}` : combo
}

/** Resuelve títulos de categoría/combo desde el menú cargado. */
export function resolveReviewContext(
  review: Pick<Review, 'targetType' | 'categoryId' | 'comboId'>,
  sections: Array<{
    id: string
    title: string
    combos: Array<{ id: string; title: string }>
  }>,
): { categoryTitle?: string; comboTitle?: string } {
  if (review.targetType === 'business') return {}
  const cat = sections.find((s) => s.id === review.categoryId)
  const combo = cat?.combos.find((c) => c.id === review.comboId)
  return {
    categoryTitle: cat?.title,
    comboTitle: combo?.title,
  }
}
