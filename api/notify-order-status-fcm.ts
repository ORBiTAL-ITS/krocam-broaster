/**
 * Notificación FCM inmediata al cliente cuando un admin cambia el estado del pedido.
 * POST { orderId, status } + Authorization: Bearer <ID token del admin>.
 * El `status` debe coincidir con lo que el admin acaba de guardar (evita lecturas obsoletas en móvil).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuth } from 'firebase-admin/auth'
import { setCors } from '../lib/push-api/cors.js'
import { getDb } from '../lib/push-api/firebase-admin.js'
import { getTokensForUser, sendToTokens } from '../lib/push-api/fcm.js'
import { saveInboxNotification } from '../lib/push-api/inbox.js'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Recibido',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
}

const ALLOWED_STATUS = new Set(Object.keys(STATUS_LABELS))

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res, req, {
    allowHeaders: 'Content-Type, Authorization',
    methods: 'POST, OPTIONS',
  })
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const match = authHeader?.match(/^Bearer\s+(.+)$/i)
  const idToken = match?.[1]
  if (!idToken) {
    return res.status(401).json({ error: 'Falta Authorization: Bearer <token>.' })
  }

  let parsed: { orderId?: unknown; status?: unknown }
  try {
    parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'JSON inválido.' })
  }
  const orderId = typeof parsed?.orderId === 'string' ? parsed.orderId.trim() : ''
  const statusFromClient = typeof parsed?.status === 'string' ? parsed.status.trim() : ''
  if (!orderId) {
    return res.status(400).json({ error: 'orderId requerido.' })
  }
  if (statusFromClient && !ALLOWED_STATUS.has(statusFromClient)) {
    return res.status(400).json({ error: 'status inválido.' })
  }

  try {
    const db = getDb()
    const authAdmin = getAuth()
    const decoded = await authAdmin.verifyIdToken(idToken)
    const adminSnap = await db.collection('users').doc(decoded.uid).get()
    if (adminSnap.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores.' })
    }

    const orderRef = db.collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Pedido no encontrado.' })
    }
    const data = orderSnap.data()
    const userId = data?.userId
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Pedido sin cliente (userId).' })
    }

    const fsStatus = String(data?.status ?? 'pendiente')
    const status =
      statusFromClient && ALLOWED_STATUS.has(statusFromClient)
        ? statusFromClient
        : ALLOWED_STATUS.has(fsStatus)
          ? fsStatus
          : ''
    if (!status) {
      return res.status(400).json({ error: 'status inválido o faltante.' })
    }

    if (fsStatus !== status) {
      console.warn('[notify-order-status-fcm] status Firestore distinto al del cliente', {
        orderId,
        firestore: fsStatus,
        client: status,
      })
    }

    if (data?.fcm_last_status === status) {
      return res.status(200).json({ ok: true, skipped: true })
    }

    const label = STATUS_LABELS[status] ?? status
    const title = 'Estado de tu pedido'
    const body =
      status === 'despachado'
        ? 'Tu pedido fue despachado y va en camino. ¡Gracias por tu compra!'
        : `${label}.`

    const clientTokens = await getTokensForUser(db, userId)
    await sendToTokens(clientTokens, title, body, {
      type: 'order_status',
      orderId,
      status,
    })
    await orderRef.update({ fcm_last_status: status })

    try {
      await saveInboxNotification(db, userId, {
        title,
        body,
        kind: 'order_status',
        orderId,
        status,
      })
    } catch (inboxErr) {
      console.error('[notify-order-status-fcm] inbox (FCM ya enviado)', inboxErr)
    }

    return res.status(200).json({
      ok: true,
      sent: clientTokens.length > 0,
      devices: clientTokens.length,
    })
  } catch (e) {
    const err = e as { code?: string }
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      return res.status(401).json({ error: 'Sesión inválida o expirada.' })
    }
    console.error(e)
    return res.status(500).json({ error: String(e) })
  }
}
