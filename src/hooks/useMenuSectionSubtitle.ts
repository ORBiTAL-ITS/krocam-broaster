import { useEffect, useState } from 'react'
import { subscribeMenuSectionSubtitle } from '../services/appConfig'

/** Texto común de las categorías de la carta, en tiempo real desde Firestore. */
export function useMenuSectionSubtitle(): string {
  const [subtitle, setSubtitle] = useState('')

  useEffect(() => subscribeMenuSectionSubtitle(setSubtitle), [])

  return subtitle
}
