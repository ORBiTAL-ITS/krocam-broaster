import { auth } from '../firebase'
import { getApiUrl } from '../config/apiOrigin'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Dispara FCM a todos los admins con rol en Firestore (misma lógica que el cron).
 * Reintenta ante fallos de red/CORS intermitentes. No bloquea el flujo del pedido si tras reintentos sigue fallando.
 */
export async function notifyAdminsNewOrder(orderId: string): Promise<void> {
  const user = auth.currentUser
  if (!user) return

  const url = getApiUrl('/api/notify-new-order-fcm')
  const body = JSON.stringify({ orderId })
  let lastErr: unknown

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const idToken = await user.getIdToken(attempt > 0)
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      return
    } catch (e) {
      lastErr = e
      if (attempt < 2) await sleep(600 * (attempt + 1))
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}
