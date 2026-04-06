import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Inicialización única para rutas serverless Vercel (misma cuenta que notify-orders).
 */
export function getDb() {
  if (getApps().length === 0) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing')
    initializeApp({ credential: cert(JSON.parse(json) as ServiceAccount) })
  }
  return getFirestore()
}
