/**
 * Cloud Functions: notificaciones push cuando se crea o actualiza un pedido.
 * Textos alineados con api/notify-orders.ts (WhatsApp): template nuevo_pedido y estado_pedido.
 * - Pedido nuevo → solo admins (nuevo_pedido). Cambio de estado → solo cliente (estado_pedido).
 */
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp } from 'firebase-admin/app';
initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const STATUS_LABELS = {
    pendiente: 'Recibido',
    en_preparacion: 'En preparación',
    despachado: 'Despachado',
    entregado: 'Entregado',
};
async function getTokensForUser(uid) {
    const userSnap = await db.collection('users').doc(uid).get();
    const raw = userSnap.data()?.fcmTokens;
    if (!Array.isArray(raw) || raw.length === 0)
        return [];
    const out = [];
    for (const t of raw) {
        if (typeof t === 'string' && t.trim().length > 0)
            out.push(t.trim());
    }
    return [...new Set(out)];
}
/** Todos los tokens FCM de usuarios con role === 'admin' en Firestore. */
async function getAdminTokens() {
    const usersSnap = await db.collection('users').where('role', '==', 'admin').get();
    const tokens = [];
    for (const doc of usersSnap.docs) {
        const list = doc.data()?.fcmTokens;
        if (!Array.isArray(list))
            continue;
        for (const t of list) {
            if (typeof t === 'string' && t.trim().length > 0)
                tokens.push(t.trim());
        }
    }
    return [...new Set(tokens)];
}
const FCM_MULTICAST_LIMIT = 500;
function sendToTokens(tokenList, title, body, data) {
    if (tokenList.length === 0)
        return Promise.resolve();
    const dataPayload = data ?? {};
    const chunks = [];
    for (let i = 0; i < tokenList.length; i += FCM_MULTICAST_LIMIT) {
        chunks.push(tokenList.slice(i, i + FCM_MULTICAST_LIMIT));
    }
    return Promise.all(chunks.map((tokens) => messaging.sendEachForMulticast({
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
    }))).then(() => undefined);
}
export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
    const snap = event.data;
    if (!snap?.exists)
        return;
    const data = snap.data();
    const totalPrice = data?.totalPrice ?? 0;
    const totalFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPrice);
    const orderIdShort = event.params.orderId.slice(-6);
    const title = 'Nuevo pedido';
    const body = `Pedido #${orderIdShort}. Total: ${totalFormatted}.`;
    const payload = { type: 'new_order', orderId: event.params.orderId };
    const adminTokens = await getAdminTokens();
    await sendToTokens(adminTokens, title, body, payload);
});
export const onOrderUpdated = onDocumentUpdated('orders/{orderId}', async (event) => {
    const change = event.data;
    if (!change?.after?.exists)
        return;
    const before = change.before.data();
    const after = change.after.data();
    const statusBefore = before?.status ?? '';
    const statusAfter = after?.status ?? '';
    if (statusBefore === statusAfter)
        return;
    const userId = after?.userId;
    if (!userId)
        return;
    const label = STATUS_LABELS[statusAfter] ?? statusAfter;
    const title = 'Estado de tu pedido';
    const body = `${label}.`;
    const payload = {
        type: 'order_status',
        orderId: event.params.orderId,
        status: statusAfter,
    };
    const clientTokens = await getTokensForUser(userId);
    await sendToTokens(clientTokens, title, body, payload);
});
