/**
 * Notificación FCM inmediata al cliente cuando un admin cambia el estado del pedido.
 * POST { orderId } + Authorization: Bearer <ID token del admin>.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuth } from 'firebase-admin/auth'
import { setCors } from '../lib/push-api/cors.js'
import { getDb } from '../lib/push-api/firebase-admin.js'
import { getTokensForUser, sendToTokens } from '../lib/push-api/fcm.js'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Recibido',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
}

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

  let parsed: { orderId?: unknown }
  try {
    parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'JSON inválido.' })
  }
  const orderId = typeof parsed?.orderId === 'string' ? parsed.orderId.trim() : ''
  if (!orderId) {
    return res.status(400).json({ error: 'orderId requerido.' })
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
    const status = String(data?.status ?? 'pendiente')
    const userId = data?.userId
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Pedido sin cliente (userId).' })
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
