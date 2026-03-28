/* eslint-disable no-restricted-globals */
/**
 * Service worker para notificaciones push (FCM).
 * Reemplaza firebaseConfig con los valores de tu proyecto (Firebase Console > Configuración del proyecto).
 * La clave VAPID se genera en Firebase Console > Cloud Messaging > Certificados de push web.
 */
// Misma versión mayor que `firebase` en package.json (evita fallos de push en móvil / PWA).
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: 'AIzaSyDxV9ZUb9U_53vFx7qvfoj_JdvhF30YssA',
  authDomain: 'krocam-9a82c.firebaseapp.com',
  projectId: 'krocam-9a82c',
  storageBucket: 'krocam-9a82c.firebasestorage.app',
  messagingSenderId: '35468558844',
  appId: '1:35468558844:web:fe5fce75319549a1b2b279',
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

// Misma lógica que el antiguo sw.js: activación rápida para PWA instalable y push.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? 'KROCAM'
  const options = {
    body: payload.notification?.body ?? payload.data?.body ?? '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.data?.tag ?? 'order',
    data: payload.data ?? {},
  }
  self.registration.showNotification(title, options)
})
