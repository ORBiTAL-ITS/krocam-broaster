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
  browserPopupRedirectResolver,
} from 'firebase/auth'
import { getMessaging, type Messaging } from 'firebase/messaging'
import { Capacitor } from '@capacitor/core'

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
// Usamos initializeAuth también en web, pero diferenciando entre:
// - iOS nativo: solo indexedDBLocalPersistence, sin popupRedirectResolver (evita cuelgues).
// - Resto (web puro y Android): indexedDBLocalPersistence + browserLocalPersistence
//   + popupRedirectResolver (comportamiento original que ya funcionaba).
const isBrowser = typeof window !== 'undefined'
const isNative = Capacitor.isNativePlatform?.() ?? false
const platform = isNative ? Capacitor.getPlatform() : undefined
const isNativeIOS = isNative && platform === 'ios'

const auth =
  isBrowser
    ? initializeAuth(
        app,
        isNativeIOS
          ? {
              persistence: [indexedDBLocalPersistence],
            }
          : {
              persistence: [indexedDBLocalPersistence, browserLocalPersistence],
              popupRedirectResolver: browserPopupRedirectResolver,
            }
      )
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
