import { useEffect, useState } from 'react'
import { MENU_SECTIONS } from '../data/menuSections'
import type { MenuCategory } from '../types/menu'
import { parsePriceCop } from '../types/menu'
import { subscribeMenu, type MenuLoadState } from '../services/menuService'

function staticFallbackSections(): MenuCategory[] {
  return MENU_SECTIONS.map((sec, index) => ({
    id: sec.id,
    title: sec.title,
    sortOrder: index,
    heroImageBase64: null,
    heroImageAlt: sec.heroImageAlt,
    active: true,
    combos: sec.combos.map((c, ci) => ({
      id: String(c.id),
      title: c.title,
      description: c.description,
      priceCop: parsePriceCop(c.price),
      sortOrder: ci,
      active: true,
    })),
  }))
}

export interface UseMenuResult {
  sections: MenuCategory[]
  getHeroSrc: (category: MenuCategory) => string
  loading: boolean
  error: string | null
  source: 'firestore' | 'fallback' | 'static'
}

export function useMenu(includeInactive = false): UseMenuResult {
  const [sections, setSections] = useState<MenuCategory[]>(staticFallbackSections())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'firestore' | 'fallback' | 'static'>('static')

  useEffect(() => {
    const fallback = staticFallbackSections()
    const unsub = subscribeMenu(
      (state: MenuLoadState) => {
        if (state.status === 'loading') {
          setLoading(true)
          return
        }
        if (state.status === 'ready') {
          setSections(state.sections)
          setSource(state.source)
          setError(null)
          setLoading(false)
          return
        }
        setSections(fallback)
        setSource('fallback')
        setError(state.message === 'empty' ? null : state.message)
        setLoading(false)
      },
      { includeInactive },
    )
    return () => unsub()
  }, [includeInactive])

  const getHeroSrc = (category: MenuCategory): string => {
    if (category.heroImageBase64) return category.heroImageBase64
    const staticSec = MENU_SECTIONS.find((s) => s.id === category.id)
    return staticSec?.heroImageSrc ?? ''
  }

  return { sections, getHeroSrc, loading, error, source }
}

export { formatPriceCop } from '../types/menu'
