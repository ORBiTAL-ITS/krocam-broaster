/**
 * Envío masivo FCM (sustituto gratuito del callable sendBroadcastNotification en Cloud Functions).
 * POST JSON { title, body } + header Authorization: Bearer <Firebase ID token>.
 * Verifica que el usuario sea admin en Firestore (misma lógica que la función callable).
 *
 * Env en Vercel: FIREBASE_SERVICE_ACCOUNT_JSON (ya usado en notify-orders).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuth } from 'firebase-admin/auth'
import { setCors } from '../lib/push-api/cors'
import { getDb } from '../lib/push-api/firebase-admin'
import { getAllUserFcmTokens, sendMulticastCountResults } from '../lib/push-api/fcm'

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

  let body: { title?: unknown; body?: unknown }
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'JSON inválido.' })
  }

  const rawTitle = body?.title
  const rawMessage = body?.body
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
  const messageBody = typeof rawMessage === 'string' ? rawMessage.trim() : ''
  if (title.length < 1 || title.length > 120) {
    return res.status(400).json({ error: 'El título debe tener entre 1 y 120 caracteres.' })
  }
  if (messageBody.length < 1 || messageBody.length > 500) {
    return res.status(400).json({ error: 'El mensaje debe tener entre 1 y 500 caracteres.' })
  }

  try {
    const db = getDb()
    const auth = getAuth()
    const decoded = await auth.verifyIdToken(idToken)
    const adminSnap = await db.collection('users').doc(decoded.uid).get()
    if (adminSnap.data()?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden enviar notificaciones masivas.' })
    }

    const tokens = await getAllUserFcmTokens(db)
    if (tokens.length === 0) {
      return res.status(200).json({
        successCount: 0,
        failureCount: 0,
        message: 'No hay dispositivos registrados para notificaciones.',
      })
    }

    const payload: Record<string, string> = { type: 'broadcast' }
    const { successCount, failureCount } = await sendMulticastCountResults(
      tokens,
      title,
      messageBody,
      payload,
    )

    return res.status(200).json({
      successCount,
      failureCount,
      message:
        failureCount > 0
          ? `Enviado a ${successCount} dispositivos; ${failureCount} fallaron (tokens inválidos o expirados).`
          : `Enviado a ${successCount} dispositivo(s).`,
    })
  } catch (e) {
    const err = e as { code?: string; message?: string }
    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error') {
      return res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' })
    }
    console.error(e)
    return res.status(500).json({ error: String(e) })
  }
}
