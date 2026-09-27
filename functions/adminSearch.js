import { getFirestore } from 'firebase-admin/firestore';
const db = getFirestore();
function normalizePhone(phone) {
    return phone.replace(/\D/g, '');
}
function parseProgress(userId, data) {
    if (!data)
        return null;
    return {
        userId,
        currentStamps: typeof data.currentStamps === 'number' ? data.currentStamps : 0,
        rewardPending: data.rewardPending === true,
        totalStampsEarned: typeof data.totalStampsEarned === 'number' ? data.totalStampsEarned : 0,
        totalRewardsRedeemed: typeof data.totalRewardsRedeemed === 'number' ? data.totalRewardsRedeemed : 0,
        lastStampOrderId: typeof data.lastStampOrderId === 'string' ? data.lastStampOrderId : undefined,
    };
}
async function buildUserLookup(uid, data) {
    const progressSnap = await db.collection('loyaltyProgress').doc(uid).get();
    return {
        uid,
        phone: typeof data.phone === 'string' ? data.phone : '',
        barrio: typeof data.barrio === 'string' ? data.barrio : '',
        address: typeof data.address === 'string' ? data.address : '',
        displayName: typeof data.displayName === 'string'
            ? data.displayName
            : typeof data.name === 'string'
                ? data.name
                : '',
        progress: parseProgress(uid, progressSnap.exists ? progressSnap.data() : undefined),
    };
}
export async function searchUsersByPhone(phone) {
    const normalized = normalizePhone(phone);
    if (normalized.length < 7)
        return [];
    const usersSnap = await db.collection('users').get();
    const matches = [];
    for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        const userPhone = typeof data.phone === 'string' ? data.phone : '';
        if (normalizePhone(userPhone) !== normalized)
            continue;
        matches.push(await buildUserLookup(userDoc.id, data));
    }
    return matches;
}
export async function searchUserByUid(uid) {
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists)
        return null;
    return buildUserLookup(uid, snap.data());
}
export async function listUsersWithPendingRewards() {
    const snap = await db.collection('loyaltyProgress').where('rewardPending', '==', true).get();
    const results = [];
    for (const progressDoc of snap.docs) {
        const userSnap = await db.collection('users').doc(progressDoc.id).get();
        if (!userSnap.exists)
            continue;
        results.push(await buildUserLookup(progressDoc.id, userSnap.data()));
    }
    return results;
}
