import { auth } from '../firebase'
import { getApiUrl } from '../config/apiOrigin'

type NotifyStatusPayload = {
  ok?: boolean
  skipped?: boolean
  detail?: string
  sent?: boolean
  inboxWritten?: boolean
  inboxError?: string | null
  hint?: string | null
  error?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** FCM al cliente tras cambiar estado del pedido (admin). `status` debe ser el nuevo estado guardado en Firestore. */
export async function notifyCustomerOrderStatus(
  orderId: string,
  status: string,
): Promise<void> {
  const user = auth.currentUser
  if (!user) return

  const url = getApiUrl('/api/notify-order-status-fcm')
  const body = JSON.stringify({ orderId, status })
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
      const text = await res.text()
      let payload: NotifyStatusPayload = {}
      try {
        payload = text ? (JSON.parse(text) as NotifyStatusPayload) : {}
      } catch {
        /* cuerpo no JSON */
      }
      if (!res.ok) {
        throw new Error(
          (typeof payload.error === 'string' && payload.error) ||
            text ||
            `HTTP ${res.status}`,
        )
      }
      if (payload.skipped === true) {
        console.warn('[notifyCustomerOrderStatus] omitido (ya notificado):', payload.detail)
        return
      }
      const inboxOk = payload.inboxWritten === true
      const sentOk = payload.sent === true
      if (!inboxOk && !sentOk) {
        const parts = [payload.inboxError, payload.hint].filter(
          (x): x is string => typeof x === 'string' && x.trim().length > 0,
        )
        throw new Error(
          parts.join(' ') ||
            'No hubo push (sin tokens FCM) ni se guardó la bandeja. El cliente debe abrir la app y aceptar notificaciones.',
        )
      }
      return
    } catch (e) {
      lastErr = e
      if (attempt < 2) await sleep(600 * (attempt + 1))
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}
