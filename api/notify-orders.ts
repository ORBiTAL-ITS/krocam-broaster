/**
 * API serverless para notificaciones por WhatsApp y push FCM (sin Cloud Functions de pago).
 * Llamar desde cron-job.org cada 5–10 min con ?secret=NOTIFY_CRON_SECRET
 *
 * Env en Vercel:
 * - FIREBASE_SERVICE_ACCOUNT_JSON (JSON completo de la cuenta de servicio)
 * - WHATSAPP_ACCESS_TOKEN (token de Meta)
 * - WHATSAPP_PHONE_NUMBER_ID
 * - NOTIFY_CRON_SECRET
 *
 * FCM: pedidos recientes → admins; cambio de estado → cliente (campos fcm_* evitan duplicados).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue } from 'firebase-admin/firestore'
import { setCors } from '../lib/push-api/cors.js'
import { getDb } from '../lib/push-api/firebase-admin.js'
import { getAdminTokens, getTokensForUser, sendToTokens } from '../lib/push-api/fcm.js'

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Recibido',
  en_preparacion: 'En preparación',
  despachado: 'Despachado',
  entregado: 'Entregado',
}

async function sendWhatsAppTemplate(
  toPhone: string,
  templateName: string,
  bodyParams: string[],
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) {
    console.error('[WhatsApp] Token o Phone Number ID faltantes')
    return { ok: false, error: 'missing_token_or_phone_id' }
  }
  const phone = toPhone.replace(/\D/g, '')
  const to = phone.startsWith('57') ? phone : `57${phone}`
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es' },
          components: [{ type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) }],
        },
      }),
    },
  )
  const body = await res.text()
  if (!res.ok) {
    console.error(`[WhatsApp] Error ${res.status} para ${to}, template=${templateName}:`, body)
    return { ok: false, error: body }
  }
  return { ok: true }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res, req, { allowHeaders: 'Content-Type, x-cron-secret' })
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const secret = process.env.NOTIFY_CRON_SECRET
  const given = (req.query.secret as string) || req.headers['x-cron-secret']
  if (!secret || given !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const db = getDb()
    const now = Date.now()
    const lastMinutes = 10
    const since = new Date(now - lastMinutes * 60 * 1000)

    const ordersSnap = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get()

    let newOrderCount = 0
    let statusCount = 0
    let fcmNewOrderCount = 0
    let fcmStatusCount = 0
    const debug: string[] = []

    for (const docSnap of ordersSnap.docs) {
      const data = docSnap.data()
      const createdAt = data?.createdAt?.toMillis?.() ?? 0
      const updatedAt = data?.updatedAt?.toMillis?.() ?? createdAt
      const orderId = docSnap.id
      const status = data?.status ?? 'pendiente'
      const totalPrice = data?.totalPrice ?? 0
      const userId = data?.userId ?? ''

      if (createdAt >= since.getTime() && !data?.whatsapp_new_order_sent_at) {
        const adminSnap = await db.collection('users').where('role', '==', 'admin').get()
        const totalFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPrice)
        const adminsWithPhone = adminSnap.docs.filter((u) => u.data()?.phone)
        debug.push(`Pedido ${orderId.slice(-6)}: ${adminsWithPhone.length} admins con teléfono`)
        for (const u of adminSnap.docs) {
          const phone = u.data()?.phone
          if (phone) {
            const result = await sendWhatsAppTemplate(
              phone,
              'nuevo_pedido',
              [`Pedido #${orderId.slice(-6)}`, totalFormatted],
            )
            if (result.ok) newOrderCount++
            else debug.push(`Admin ${phone}: ${result.error}`)
          }
        }
        await docSnap.ref.update({ whatsapp_new_order_sent_at: FieldValue.serverTimestamp() })
      }

      if (createdAt >= since.getTime() && !data?.fcm_new_order_sent_at) {
        const adminTokens = await getAdminTokens(db)
        const totalFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPrice)
        const title = 'Nuevo pedido'
        const body = `Pedido #${orderId.slice(-6)}. Total: ${totalFormatted}.`
        await sendToTokens(adminTokens, title, body, {
          type: 'new_order',
          orderId,
        })
        fcmNewOrderCount++
        await docSnap.ref.update({ fcm_new_order_sent_at: FieldValue.serverTimestamp() })
      }

      if (updatedAt >= since.getTime() && data?.whatsapp_last_status !== status && userId) {
        const userSnap = await db.collection('users').doc(userId).get()
        const phone = userSnap.data()?.phone
        const label = STATUS_LABELS[status] ?? status
        if (phone) {
          const result = await sendWhatsAppTemplate(phone, 'estado_pedido', [label])
          if (result.ok) statusCount++
          else debug.push(`Cliente ${phone} (${label}): ${result.error}`)
        } else debug.push(`Cliente ${userId}: sin teléfono en Firestore`)
        await docSnap.ref.update({ whatsapp_last_status: status })
      }

      if (updatedAt >= since.getTime() && data?.fcm_last_status !== status && userId) {
        const label = STATUS_LABELS[status] ?? status
        const title = 'Estado de tu pedido'
        const body = `${label}.`
        const clientTokens = await getTokensForUser(db, userId)
        await sendToTokens(clientTokens, title, body, {
          type: 'order_status',
          orderId,
          status,
        })
        fcmStatusCount++
        await docSnap.ref.update({ fcm_last_status: status })
      }
    }

    return res.status(200).json({
      ok: true,
      new_orders_notified: newOrderCount,
      status_updates_sent: statusCount,
      fcm_new_orders: fcmNewOrderCount,
      fcm_status_updates: fcmStatusCount,
      debug: debug.length > 0 ? debug : undefined,
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: String(e) })
  }
}
