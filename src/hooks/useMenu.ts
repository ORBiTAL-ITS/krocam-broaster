import { useEffect, useState } from 'react'
import { MENU_SECTIONS } from '../data/menuSections'
import type { MenuCategory } from '../types/menu'
import { subscribeMenu, type MenuLoadState } from '../services/menuService'

export interface UseMenuResult {
  sections: MenuCategory[]
  getHeroSrc: (category: MenuCategory) => string
  loading: boolean
  error: string | null
  source: 'firestore' | 'empty'
}

/** Menú en tiempo real desde Firestore; sin datos locales de respaldo. */
export function useMenu(includeInactive = false): UseMenuResult {
  const [sections, setSections] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'firestore' | 'empty'>('empty')

  useEffect(() => {
    const unsub = subscribeMenu(
      (state: MenuLoadState) => {
        if (state.status === 'loading') {
          setLoading(true)
          return
        }
        if (state.status === 'ready') {
          setSections(state.sections)
          setSource('firestore')
          setError(null)
          setLoading(false)
          return
        }
        setSections([])
        setSource('empty')
        setError(state.message === 'empty' ? null : state.message)
        setLoading(false)
      },
      { includeInactive },
    )
    return () => unsub()
  }, [includeInactive])

  const getHeroSrc = (category: MenuCategory): string => {
    if (category.heroImageBase64) return category.heroImageBase64
    const bundledImage = MENU_SECTIONS.find((s) => s.id === category.id)
    return bundledImage?.heroImageSrc ?? ''
  }

  return { sections, getHeroSrc, loading, error, source }
}

export { formatPriceCop } from '../types/menu'
