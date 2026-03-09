/**
 * Cloud Functions: notificaciones push cuando se crea o actualiza un pedido.
 * - Nuevo pedido → notificar a admins
 * - Cambio de estado → notificar al cliente
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
    const tokens = userSnap.data()?.fcmTokens;
    if (!Array.isArray(tokens) || tokens.length === 0)
        return [];
    return tokens;
}
async function getAdminTokens() {
    const usersSnap = await db.collection('users').where('role', '==', 'admin').get();
    const tokens = [];
    for (const doc of usersSnap.docs) {
        const list = doc.data()?.fcmTokens;
        if (Array.isArray(list))
            tokens.push(...list);
    }
    return [...new Set(tokens)];
}
function sendToTokens(tokenList, title, body, data) {
    if (tokenList.length === 0)
        return Promise.resolve();
    return messaging.sendEachForMulticast({
        tokens: tokenList,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
    });
}
export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
    const snap = event.data;
    if (!snap?.exists)
        return;
    const data = snap.data();
    const totalPrice = data?.totalPrice ?? 0;
    const totalFormatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPrice);
    const tokens = await getAdminTokens();
    await sendToTokens(tokens, 'Nuevo pedido', `Total: ${totalFormatted}. Revisa el panel de administración.`, { type: 'new_order', orderId: event.params.orderId });
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
    const tokens = await getTokensForUser(userId);
    const label = STATUS_LABELS[statusAfter] ?? statusAfter;
    await sendToTokens(tokens, 'Estado de tu pedido', `Tu pedido está: ${label}.`, { type: 'order_status', orderId: event.params.orderId, status: statusAfter });
});
