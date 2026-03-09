/**
 * Utilidades para abrir WhatsApp con mensaje prellenado (wa.me).
 * Usa VITE_WHATSAPP_NUMBER (ej: 573001234567, sin +).
 */

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER

/**
 * Abre WhatsApp con un mensaje prellenado.
 * @param message - Texto del mensaje (se codifica para URL)
 * @param phoneNumber - Opcional. Si no se pasa, usa VITE_WHATSAPP_NUMBER
 * @returns true si se abrió, false si falta número configurado
 */
export function openWhatsAppWithMessage(
  message: string,
  phoneNumber?: string,
): boolean {
  const number = phoneNumber || WHATSAPP_NUMBER
  if (!number || typeof number !== 'string') return false

  const clean = number.replace(/\D/g, '')
  if (clean.length < 10) return false

  const to = clean.startsWith('57') ? clean : `57${clean}`
  const url = `https://wa.me/${to}?text=${encodeURIComponent(message)}`
  window.location.href = url
  return true
}
