/**
 * Notificación inmediata FCM a todos los admins cuando un cliente confirma un pedido.
 * POST { orderId } + Authorization: Bearer <Firebase ID token del cliente>.
 * El userId del pedido debe coincidir con el token (evita abusos).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { setCors } from '../lib/push-api/cors.js'
import { getDb } from '../lib/push-api/firebase-admin.js'
import { getAdminTokens, getAdminUserIds, sendToTokens } from '../lib/push-api/fcm.js'
import { saveInboxForUserIds } from '../lib/push-api/inbox.js'

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
    const orderRef = db.collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) {
      return res.status(404).json({ error: 'Pedido no encontrado.' })
    }
    const data = orderSnap.data()
    if (data?.userId !== decoded.uid) {
      return res.status(403).json({ error: 'No autorizado.' })
    }
    if (data?.fcm_new_order_sent_at) {
      return res.status(200).json({ ok: true, skipped: true })
    }

    const totalPrice = Number(data?.totalPrice ?? 0)
    const adminTokens = await getAdminTokens(db)
    const totalFormatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(totalPrice)
    const title = 'Nuevo pedido'
    const message = `Pedido #${orderId.slice(-6)}. Total: ${totalFormatted}.`
    await sendToTokens(adminTokens, title, message, {
      type: 'new_order',
      orderId,
    })
    const adminIds = await getAdminUserIds(db)
    await saveInboxForUserIds(db, adminIds, {
      title,
      body: message,
      kind: 'new_order',
      orderId,
    })
    await orderRef.update({ fcm_new_order_sent_at: FieldValue.serverTimestamp() })

    return res.status(200).json({
      ok: true,
      sent: adminTokens.length > 0,
      adminDevices: adminTokens.length,
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
