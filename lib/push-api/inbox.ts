import { FieldValue } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'

export type InboxKind = 'new_order' | 'order_status' | 'broadcast'

export type InboxWrite = {
  title: string
  body: string
  kind: InboxKind
  orderId?: string | null
  status?: string | null
}

export async function saveInboxNotification(
  db: Firestore,
  userId: string,
  data: InboxWrite,
): Promise<void> {
  await db
    .collection('users')
    .doc(userId)
    .collection('inbox')
    .add({
      title: data.title,
      body: data.body,
      kind: data.kind,
      orderId: data.orderId ?? null,
      status: data.status ?? null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })
}

/** Una notificación por admin (mismo contenido que el push). */
export async function saveInboxForUserIds(
  db: Firestore,
  userIds: string[],
  data: InboxWrite,
): Promise<void> {
  if (userIds.length === 0) return
  const chunkSize = 400
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const batch = db.batch()
    for (const uid of userIds.slice(i, i + chunkSize)) {
      const ref = db.collection('users').doc(uid).collection('inbox').doc()
      batch.set(ref, {
        title: data.title,
        body: data.body,
        kind: data.kind,
        orderId: data.orderId ?? null,
        status: data.status ?? null,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
    await batch.commit()
  }
}
