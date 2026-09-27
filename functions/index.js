/**
 * Cloud Functions: notificaciones push (FCM) y programa de membresía (sellos).
 */
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as functionsV1 from 'firebase-functions/v1';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp } from 'firebase-admin/app';
import { creditLoyaltyStamp, getMembershipConfig, recalculateRewardPendingForAll, redeemRewardForUser, resetProgressForUser, revokeLoyaltyStamp, } from './loyalty.js';
import { listUsersWithPendingRewards as listPendingRewardUsers, searchUserByUid, searchUsersByPhone, } from './adminSearch.js';
initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const CALLABLE_REGION = 'us-central1';
const STATUS_LABELS = {
    pendiente: 'Recibido',
    en_preparacion: 'En preparación',
    despachado: 'Despachado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
};
async function assertAdmin(uid) {
    const adminSnap = await db.collection('users').doc(uid).get();
    if (adminSnap.data()?.role !== 'admin') {
        throw new functionsV1.https.HttpsError('permission-denied', 'Solo administradores pueden realizar esta acción.');
    }
}
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
async function getAllUserFcmTokens() {
    const usersSnap = await db.collection('users').get();
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
async function sendMulticastCountResults(tokenList, title, body, data) {
    if (tokenList.length === 0)
        return { successCount: 0, failureCount: 0 };
    let successCount = 0;
    let failureCount = 0;
    for (let i = 0; i < tokenList.length; i += FCM_MULTICAST_LIMIT) {
        const tokens = tokenList.slice(i, i + FCM_MULTICAST_LIMIT);
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
        });
        successCount += res.successCount;
        failureCount += res.failureCount;
    }
    return { successCount, failureCount };
}
export const sendBroadcastNotification = functionsV1
    .region(CALLABLE_REGION)
    .runWith({ timeoutSeconds: 300, memory: '512MB' })
    .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functionsV1.https.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    await assertAdmin(context.auth.uid);
    const rawTitle = data?.title;
    const rawBody = data?.body;
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    const body = typeof rawBody === 'string' ? rawBody.trim() : '';
    if (title.length < 1 || title.length > 120) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'El título debe tener entre 1 y 120 caracteres.');
    }
    if (body.length < 1 || body.length > 500) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'El mensaje debe tener entre 1 y 500 caracteres.');
    }
    const tokens = await getAllUserFcmTokens();
    if (tokens.length === 0) {
        return {
            successCount: 0,
            failureCount: 0,
            message: 'No hay dispositivos registrados para notificaciones.',
        };
    }
    const payload = { type: 'broadcast' };
    const { successCount, failureCount } = await sendMulticastCountResults(tokens, title, body, payload);
    return {
        successCount,
        failureCount,
        message: failureCount > 0
            ? `Enviado a ${successCount} dispositivos; ${failureCount} fallaron (tokens inválidos o expirados).`
            : `Enviado a ${successCount} dispositivo(s).`,
    };
});
export const redeemLoyaltyReward = functionsV1
    .region(CALLABLE_REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functionsV1.https.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    await assertAdmin(context.auth.uid);
    const userId = typeof data?.userId === 'string' ? data.userId.trim() : '';
    if (!userId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'Falta userId.');
    }
    await redeemRewardForUser(userId);
    return { message: 'Premio canjeado y progreso reiniciado.' };
});
export const resetLoyaltyProgress = functionsV1
    .region(CALLABLE_REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functionsV1.https.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    await assertAdmin(context.auth.uid);
    const userId = typeof data?.userId === 'string' ? data.userId.trim() : '';
    if (!userId) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'Falta userId.');
    }
    await resetProgressForUser(userId);
    return { message: 'Progreso de membresía restablecido.' };
});
/** Búsqueda de clientes para membresía (Admin SDK; no depende de list en reglas del cliente). */
export const searchMembershipUsers = functionsV1
    .region(CALLABLE_REGION)
    .https.onCall(async (data, context) => {
    if (!context.auth?.uid) {
        throw new functionsV1.https.HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }
    await assertAdmin(context.auth.uid);
    if (data?.pendingOnly === true) {
        const users = await listPendingRewardUsers();
        return { users };
    }
    const uid = typeof data?.uid === 'string' ? data.uid.trim() : '';
    if (uid) {
        const user = await searchUserByUid(uid);
        return { users: user ? [user] : [] };
    }
    const phone = typeof data?.phone === 'string' ? data.phone.trim() : '';
    if (!phone) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'Indica teléfono, UID o pendingOnly.');
    }
    const users = await searchUsersByPhone(phone);
    return { users };
});
export const onMembershipConfigUpdated = onDocumentUpdated('config/membership', async () => {
    await recalculateRewardPendingForAll();
});
export const onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
    const snap = event.data;
    if (!snap?.exists)
        return;
    const data = snap.data();
    const totalPrice = data?.totalPrice ?? 0;
    const totalFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(totalPrice);
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
    if (!userId || typeof userId !== 'string')
        return;
    const orderId = event.params.orderId;
    const totalPrice = typeof after?.totalPrice === 'number' ? after.totalPrice : 0;
    const config = await getMembershipConfig();
    if (statusAfter === 'entregado' && statusBefore !== 'entregado') {
        const stampResult = await creditLoyaltyStamp(orderId, userId, totalPrice);
        if (stampResult?.credited) {
            const clientTokens = await getTokensForUser(userId);
            if (stampResult.rewardPending) {
                await sendToTokens(clientTokens, '¡Premio de membresía listo!', `Completaste tu tarjeta. Tienes ${stampResult.rewardTitle} disponible.`, { type: 'loyalty_reward_ready', orderId });
            }
            else {
                const required = config?.stampsRequired ?? stampResult.currentStamps;
                await sendToTokens(clientTokens, '¡Ganaste un sello!', `Llevas ${stampResult.currentStamps} de ${required} sellos.`, { type: 'loyalty_stamp', orderId });
            }
        }
    }
    if (statusAfter === 'cancelado' && statusBefore !== 'cancelado') {
        const revokeResult = await revokeLoyaltyStamp(orderId, userId);
        const clientTokens = await getTokensForUser(userId);
        await sendToTokens(clientTokens, 'Pedido cancelado', 'Tu pedido fue cancelado por el negocio. Si tienes dudas, contáctanos.', { type: 'order_status', orderId, status: statusAfter });
        if (revokeResult?.revoked) {
            await sendToTokens(clientTokens, 'Membresía actualizada', 'Tu progreso de membresía fue actualizado por un ajuste en tu pedido.', { type: 'loyalty_revoked', orderId });
        }
        return;
    }
    const label = STATUS_LABELS[statusAfter] ?? statusAfter;
    const title = 'Estado de tu pedido';
    const body = statusAfter === 'despachado'
        ? 'Tu pedido fue despachado y va en camino. ¡Gracias por tu compra!'
        : `${label}.`;
    const payload = {
        type: 'order_status',
        orderId,
        status: statusAfter,
    };
    const clientTokens = await getTokensForUser(userId);
    await sendToTokens(clientTokens, title, body, payload);
});
