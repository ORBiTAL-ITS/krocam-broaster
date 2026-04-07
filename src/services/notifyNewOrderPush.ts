import { auth } from '../firebase'
import { getApiUrl } from '../config/apiOrigin'

/**
 * Dispara FCM a todos los admins con rol en Firestore (misma lógica que el cron).
 * No bloquea el flujo del pedido si falla la red.
 */
export async function notifyAdminsNewOrder(orderId: string): Promise<void> {
  const user = auth.currentUser
  if (!user) return
  const idToken = await user.getIdToken()
  const res = await fetch(getApiUrl('/api/notify-new-order-fcm'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
}
