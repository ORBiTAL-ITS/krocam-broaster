/**
 * Dispara la API de notificaciones por WhatsApp (Vercel) para enviar
 * inmediatamente al admin (pedido nuevo) o al cliente (cambio de estado).
 * Se llama desde el frontend tras crear o actualizar pedidos.
 */
export function triggerNotifyOrders(): void {
  const url = import.meta.env.VITE_NOTIFY_API_URL
  const secret = import.meta.env.VITE_NOTIFY_CRON_SECRET
  if (!url || !secret) return

  const finalUrl = `${url}${url.includes('?') ? '&' : '?'}secret=${encodeURIComponent(secret)}`
  fetch(finalUrl).catch(() => {})
}
