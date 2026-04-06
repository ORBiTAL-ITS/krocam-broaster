/**
 * Registro de notificaciones push (FCM).
 * Web: Service Worker + Firebase JS. Android/iOS (Capacitor): plugin nativo @capacitor-firebase/messaging.
 * Guarda el token en Firestore para que Cloud Functions envíe notificaciones.
 */

import {
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging'
import { doc, setDoc, arrayUnion } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { messaging, db } from '../firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

/**
 * Registra el dispositivo para recibir notificaciones push y guarda el token en Firestore.
 * En app nativa (Android/iOS) usa el plugin FCM; en navegador usa el Service Worker.
 */
export async function registerPushNotifications(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  if (Capacitor.isNativePlatform()) {
    return registerPushNative(userId)
  }

  return registerPushWeb(userId)
}

async function registerPushNative(userId: string): Promise<boolean> {
  try {
    const supported = await FirebaseMessaging.isSupported()
    if (!supported?.isSupported) return false

    const perm = await FirebaseMessaging.checkPermissions()
    if (perm.receive === 'denied') return false
    if (perm.receive === 'prompt') {
      const after = await FirebaseMessaging.requestPermissions()
      if (after.receive !== 'granted') return false
    }

    const { token } = await FirebaseMessaging.getToken()
    if (!token?.trim()) return false

    const userRef = doc(db, 'users', userId)
    await setDoc(
      userRef,
      { fcmTokens: arrayUnion(token) },
      { merge: true },
    )
    return true
  } catch {
    return false
  }
}

/** Espera a que el SW de FCM esté activo (PWA móvil a veces tarda tras install/skipWaiting). */
async function getActiveFcmServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  await reg.update().catch(() => {})
  await navigator.serviceWorker.ready

  if (!reg.active) {
    for (let i = 0; i < 40 && !reg.active; i++) {
      await new Promise<void>(r => {
        setTimeout(r, 100)
      })
    }
  }

  return reg
}

async function registerPushWeb(userId: string): Promise<boolean> {
  if (!VAPID_KEY?.trim() || !messaging) return false

  const supported = await isSupported()
  if (!supported) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const swRegistration = await getActiveFcmServiceWorkerRegistration()

    let token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })
    if (!token) {
      await new Promise<void>(r => {
        setTimeout(r, 400)
      })
      token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      })
    }
    if (!token) return false

    const userRef = doc(db, 'users', userId)
    await setDoc(
      userRef,
      { fcmTokens: arrayUnion(token) },
      { merge: true },
    )
    return true
  } catch {
    return false
  }
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (Capacitor.isNativePlatform()) return true
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Solo web: con la app en primer plano FCM no pasa por el service worker; muestra notificación local.
 * No usar en Capacitor (iOS/Android nativo) — allí el plugin FCM ya gestiona el sistema.
 */
export function subscribeWebForegroundPush(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (Capacitor.isNativePlatform()) return () => {}
  if (!messaging) return () => {}

  return onMessage(messaging, (payload: MessagePayload) => {
    const title = payload.notification?.title ?? 'KROCAM'
    const body = payload.notification?.body ?? ''
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (!title && !body) return
    try {
      new Notification(title, {
        body,
        icon: '/Logo.png',
        tag:
          typeof payload.data?.orderId === 'string'
            ? payload.data.orderId
            : 'krocam-foreground',
      })
    } catch {
      /* Algunos WebViews / Safari pueden rechazar Notification aquí */
    }
  })
}
