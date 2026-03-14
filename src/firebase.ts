import { Capacitor } from '@capacitor/core'
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
// En web usamos getAuth() para soportar signInWithRedirect/getRedirectResult sin auth/argument-error.
const auth =
  typeof window !== 'undefined'
    ? Capacitor.isNativePlatform()
      ? initializeAuth(app, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        })
      : getAuth(app)
    : getAuth(app)
const googleProvider = new GoogleAuthProvider()

/** Una sola vez por carga de página; evita que Strict Mode consuma el resultado del redirect. Solo en web (en mobile se usa SocialLogin). */
const redirectResultPromise = Capacitor.isNativePlatform()
  ? Promise.resolve(null)
  : getRedirectResult(auth)

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
