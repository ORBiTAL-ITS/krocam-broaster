/**
 * Registro de notificaciones push (FCM).
 * Web: Service Worker + Firebase JS. Android (Capacitor): plugin nativo @capacitor-firebase/messaging.
 * Guarda el token en Firestore para que Cloud Functions envíe notificaciones.
 */

import { getToken, isSupported } from 'firebase/messaging'
import { doc, setDoc, arrayUnion } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { messaging, db } from '../firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

/**
 * Registra el dispositivo para recibir notificaciones push y guarda el token en Firestore.
 * En Android (app nativa) usa el plugin FCM; en navegador usa el Service Worker.
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

async function registerPushWeb(userId: string): Promise<boolean> {
  if (!VAPID_KEY?.trim() || !messaging) return false

  const supported = await isSupported()
  if (!supported) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    let registration = navigator.serviceWorker.controller
    if (!registration) {
      registration = (await navigator.serviceWorker.register('/firebase-messaging-sw.js')).active ?? null
      if (!registration) await navigator.serviceWorker.ready
    }
    const swRegistration = await navigator.serviceWorker.ready

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })
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
