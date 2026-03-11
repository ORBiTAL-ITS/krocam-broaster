import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { getMessaging, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// DEBUG en producción (Vercel) para verificar que las env vars se inyectan bien.
if (import.meta.env.PROD) {
  // eslint-disable-next-line no-console
  console.log('[firebaseConfig Vercel]', {
    hasApiKey: !!firebaseConfig.apiKey,
    apiKeyLength: String(firebaseConfig.apiKey ?? '').length,
    apiKeyPrefix: String(firebaseConfig.apiKey ?? '').slice(0, 8),
    authDomain: firebaseConfig.authDomain,
  })
}

const app = initializeApp(firebaseConfig)
let analytics: ReturnType<typeof getAnalytics> | null = null
try {
  analytics = getAnalytics(app)
} catch {
  analytics = null
}
const db = getFirestore(app)

// En entornos híbridos (Capacitor iOS/Android) Firebase recomienda initializeAuth
// para evitar cuelgues con el almacenamiento de sesión dentro del WebView.
const auth =
  typeof window !== 'undefined'
    ? initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      })
    : getAuth(app)
const googleProvider = new GoogleAuthProvider()

/** Una sola vez por carga de página; evita que Strict Mode consuma el resultado del redirect. */
const redirectResultPromise = getRedirectResult(auth)

/** Messaging solo en el cliente (navegador); necesario para notificaciones push. */
let messaging: Messaging | null = null
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app)
  } catch {
    messaging = null
  }
}

export { app, analytics, db, auth, googleProvider, redirectResultPromise, messaging }
