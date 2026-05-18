import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'

/** Barra inferior de tabs: apps nativas y web en viewport estrecho. */
export function useShowBottomTabs(): boolean {
  const isNative = Capacitor.isNativePlatform()
  const [isSmallWeb, setIsSmallWeb] = useState(
    () => !isNative && typeof window !== 'undefined' && window.innerWidth < 768,
  )

  useEffect(() => {
    if (isNative || typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsSmallWeb(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [isNative])

  return isNative || isSmallWeb
}
