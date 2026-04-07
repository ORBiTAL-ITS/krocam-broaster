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
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: 'already_notified_for_this_status',
        detail:
          'Este pedido ya tiene fcm_last_status igual a este estado; no se reenvía push ni bandeja.',
      })
    }

    const label = STATUS_LABELS[status] ?? status
    const title = 'Estado de tu pedido'
    const body =
      status === 'despachado'
        ? 'Tu pedido fue despachado y va en camino. ¡Gracias por tu compra!'
        : `${label}.`

    const clientTokens = await getTokensForUser(db, userId)

    let inboxWritten = false
    let inboxError: string | undefined
    try {
      await saveInboxNotification(db, userId, {
        title,
        body,
        kind: 'order_status',
        orderId,
        status,
      })
      inboxWritten = true
    } catch (inboxErr) {
      inboxError = inboxErr instanceof Error ? inboxErr.message : String(inboxErr)
      console.error('[notify-order-status-fcm] inbox', inboxErr)
    }

    await sendToTokens(clientTokens, title, body, {
      type: 'order_status',
      orderId,
      status,
      // Redundancia en data: en algunos WebViews/PWA el mensaje en primer plano lee mejor con data.*
      title,
      body,
    })

    // Marcar solo si hubo push o bandeja: si ambos fallan, el admin puede reintentar el mismo estado.
    if (clientTokens.length > 0 || inboxWritten) {
      await orderRef.update({ fcm_last_status: status })
    }

    const noFcmTokens = clientTokens.length === 0

    return res.status(200).json({
      ok: true,
      skipped: false,
      sent: !noFcmTokens,
      devices: clientTokens.length,
      inboxWritten,
      inboxError: inboxError ?? null,
      /** Últimos 6 del userId del pedido (para comprobar en Firestore que coincide con el cliente). */
      orderUserIdSuffix: userId.length > 6 ? userId.slice(-6) : userId,
      hint: noFcmTokens
        ? 'Sin token FCM en users/{uid}/fcmTokens para ese cliente: no llegará push hasta que abra la app, inicie sesión y acepte notificaciones (o use la bandeja si inboxWritten es true).'
        : !inboxWritten
          ? 'Push enviado pero la bandeja no se guardó; revisa inboxError y logs del servidor.'
          : null,
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
