/**
 * Cloud Functions: notificaciones push (FCM).
 * - Callable sendBroadcastNotification: solo admins; mensaje a todos los tokens en users.*.fcmTokens.
 * - Pedido nuevo → admins.
 * - Cambio de estado del pedido → cliente del pedido.
 */

import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as functionsV1 from 'firebase-functions/v1'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { initializeApp } from 'firebase-admin/app'

initializeApp()
const db = getFirestore()
const messaging = getMessaging()

const CALLABLE_REGION = 'us-central1'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Recibido',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
}

async function getTokensForUser(uid: string): Promise<string[]> {
  const userSnap = await db.collection('users').doc(uid).get()
  const raw = userSnap.data()?.fcmTokens
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: string[] = []
  for (const t of raw) {
    if (typeof t === 'string' && t.trim().length > 0) out.push(t.trim())
  }
  return [...new Set(out)]
}

/** Todos los tokens FCM registrados en perfiles de usuario (Android, iOS y web). */
async function getAllUserFcmTokens(): Promise<string[]> {
  const usersSnap = await db.collection('users').get()
  const tokens: string[] = []
  for (const doc of usersSnap.docs) {
    const list = doc.data()?.fcmTokens
    if (!Array.isArray(list)) continue
    for (const t of list) {
      if (typeof t === 'string' && t.trim().length > 0) tokens.push(t.trim())
    }
  }
  return [...new Set(tokens)]
}

/** Todos los tokens FCM de usuarios con role === 'admin' en Firestore. */
async function getAdminTokens(): Promise<string[]> {
  const usersSnap = await db.collection('users').where('role', '==', 'admin').get()
  const tokens: string[] = []
  for (const doc of usersSnap.docs) {
    const list = doc.data()?.fcmTokens
    if (!Array.isArray(list)) continue
    for (const t of list) {
      if (typeof t === 'string' && t.trim().length > 0) tokens.push(t.trim())
    }
  }
  return [...new Set(tokens)]
}

const FCM_MULTICAST_LIMIT = 500

function sendToTokens(
  tokenList: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  if (tokenList.length === 0) return Promise.resolve()
  const dataPayload = data ?? {}
  const chunks: string[][] = []
  for (let i = 0; i < tokenList.length; i += FCM_MULTICAST_LIMIT) {
    chunks.push(tokenList.slice(i, i + FCM_MULTICAST_LIMIT))
  }
  return Promise.all(
    chunks.map((tokens) =>
      messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: dataPayload,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
        webpush: {
          notification: { title, body },
          headers: {
            Urgency: 'high',
            TTL: '86400',
          },
        },
      }),
    ),
  ).then(() => undefined)
}

async function sendMulticastCountResults(
  tokenList: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ successCount: number; failureCount: number }> {
  if (tokenList.length === 0) return { successCount: 0, failureCount: 0 }
  let successCount = 0
  let failureCount = 0
  for (let i = 0; i < tokenList.length; i += FCM_MULTICAST_LIMIT) {
    const tokens = tokenList.slice(i, i + FCM_MULTICAST_LIMIT)
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
      webpush: {
        notification: { title, body },
        headers: {
          Urgency: 'high',
          TTL: '86400',
        },
      },
    })
    successCount += res.successCount
    failureCount += res.failureCount
  }
  return { successCount, failureCount }
}

/**
 * Solo admins: notificación masiva FCM. Callable en 1.ª gen. (GCF clásico) para que
 * la URL `us-central1-PROJECT.cloudfunctions.net/...` y CORS/OPTIONS funcionen con el SDK web.
 */
export const sendBroadcastNotification = functionsV1
  .region(CALLABLE_REGION)
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
      throw new functionsV1.https.HttpsError('unauthenticated', 'Debes iniciar sesión.')
    }
    const adminSnap = await db.collection('users').doc(context.auth.uid).get()
    if (adminSnap.data()?.role !== 'admin') {
      throw new functionsV1.https.HttpsError(
        'permission-denied',
        'Solo administradores pueden enviar notificaciones masivas.',
      )
    }
    const rawTitle = data?.title
    const rawBody = data?.body
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
    const body = typeof rawBody === 'string' ? rawBody.trim() : ''
    if (title.length < 1 || title.length > 120) {
      throw new functionsV1.https.HttpsError(
        'invalid-argument',
        'El título debe tener entre 1 y 120 caracteres.',
      )
    }
    if (body.length < 1 || body.length > 500) {
      throw new functionsV1.https.HttpsError(
        'invalid-argument',
        'El mensaje debe tener entre 1 y 500 caracteres.',
      )
    }
    const tokens = await getAllUserFcmTokens()
    if (tokens.length === 0) {
      return {
        successCount: 0,
        failureCount: 0,
        message: 'No hay dispositivos registrados para notificaciones.',
      }
    }
    const payload: Record<string, string> = { type: 'broadcast' }
    const { successCount, failureCount } = await sendMulticastCountResults(tokens, title, body, payload)
    return {
      successCount,
      failureCount,
      message:
        failureCount > 0
          ? `Enviado a ${successCount} dispositivos; ${failureCount} fallaron (tokens inválidos o expirados).`
          : `Enviado a ${successCount} dispositivo(s).`,
    }
  })

export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
  const snap = event.data
  if (!snap?.exists) return
  const data = snap.data()
  const totalPrice = data?.totalPrice ?? 0
  const totalFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPrice)
  const orderIdShort = event.params.orderId.slice(-6)
  const title = 'Nuevo pedido'
  const body = `Pedido #${orderIdShort}. Total: ${totalFormatted}.`
  const payload = { type: 'new_order', orderId: event.params.orderId }
  const adminTokens = await getAdminTokens()
  await sendToTokens(adminTokens, title, body, payload)
})

export const onOrderUpdated = onDocumentUpdated('orders/{orderId}', async (event) => {
  const change = event.data
  if (!change?.after?.exists) return
  const before = change.before.data()
  const after = change.after.data()
  const statusBefore = before?.status ?? ''
  const statusAfter = after?.status ?? ''
  if (statusBefore === statusAfter) return
  const userId = after?.userId
  if (!userId) return
  const label = STATUS_LABELS[statusAfter] ?? statusAfter
  const title = 'Estado de tu pedido'
  const body = `${label}.`
  const payload = {
    type: 'order_status',
    orderId: event.params.orderId,
    status: statusAfter,
  }
  const clientTokens = await getTokensForUser(userId)
  await sendToTokens(clientTokens, title, body, payload)
})
