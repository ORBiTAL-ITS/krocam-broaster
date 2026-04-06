import { getMessaging } from 'firebase-admin/messaging'
import type { Firestore } from 'firebase-admin/firestore'

const FCM_MULTICAST_LIMIT = 500

export async function getTokensForUser(db: Firestore, uid: string): Promise<string[]> {
  const userSnap = await db.collection('users').doc(uid).get()
  const raw = userSnap.data()?.fcmTokens
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: string[] = []
  for (const t of raw) {
    if (typeof t === 'string' && t.trim().length > 0) out.push(t.trim())
  }
  return [...new Set(out)]
}

export async function getAllUserFcmTokens(db: Firestore): Promise<string[]> {
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

export async function getAdminTokens(db: Firestore): Promise<string[]> {
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

export async function getAdminUserIds(db: Firestore): Promise<string[]> {
  const usersSnap = await db.collection('users').where('role', '==', 'admin').get()
  return usersSnap.docs.map((d) => d.id)
}

/** Usuarios con al menos un token FCM (para bandeja alineada con broadcast). */
export async function getUserIdsWithFcmTokens(db: Firestore): Promise<string[]> {
  const usersSnap = await db.collection('users').get()
  const ids: string[] = []
  for (const doc of usersSnap.docs) {
    const list = doc.data()?.fcmTokens
    if (!Array.isArray(list)) continue
    if (list.some((t) => typeof t === 'string' && t.trim().length > 0)) {
      ids.push(doc.id)
    }
  }
  return ids
}

function sendToTokens(
  tokenList: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  const messaging = getMessaging()
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

export async function sendMulticastCountResults(
  tokenList: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ successCount: number; failureCount: number }> {
  const messaging = getMessaging()
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

export { sendToTokens }
