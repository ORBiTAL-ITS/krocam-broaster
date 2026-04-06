import { auth } from '../firebase'
import { getApiOrigin } from '../config/apiOrigin'

/** FCM al cliente tras cambiar estado del pedido (admin). */
export async function notifyCustomerOrderStatus(orderId: string): Promise<void> {
  const user = auth.currentUser
  if (!user) return
  const idToken = await user.getIdToken()
  const res = await fetch(`${getApiOrigin()}/api/notify-order-status-fcm`, {
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
