/**
 * Utilidades para abrir WhatsApp con mensaje prellenado.
 * Web: window.location.href (navegación directa).
 * Android: Browser.open (Chrome Custom Tabs) para salir del WebView.
 */

import { Capacitor } from '@capacitor/core'

function buildWhatsAppUrl(message: string, phoneNumber?: string): string | null {
  const number = phoneNumber
  if (!number || typeof number !== 'string') return null

  const clean = number.replace(/\D/g, '')
  if (clean.length < 10) return null

  const to = clean.startsWith('57') ? clean : `57${clean}`
  return `https://wa.me/${to}?text=${encodeURIComponent(message)}`
}

/**
 * Abre WhatsApp con un mensaje prellenado.
 * Web: navegación directa. Android: Chrome Custom Tabs (o fallback a navegación).
 */
export function openWhatsAppWithMessage(
  message: string,
  phoneNumber?: string,
): boolean {
  const url = buildWhatsAppUrl(message, phoneNumber)
  if (!url) return false

  if (Capacitor.isNativePlatform()) {
    import('@capacitor/browser').then(({ Browser }) => {
      Browser.open({ url }).catch(() => {
        const a = document.createElement('a')
        a.href = url
        a.target = '_blank'
        a.rel = 'noopener'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      })
    }).catch(() => {
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    })
  } else {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) window.location.href = url
  }
  return true
}
