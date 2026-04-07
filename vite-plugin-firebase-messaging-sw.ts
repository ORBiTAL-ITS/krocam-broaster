import { readFileSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import type { Plugin } from 'vite'

/**
 * Genera `firebase-messaging-sw.js` con la misma `firebaseConfig` que `src/firebase.ts` (VITE_*).
 * El SW en `public/` con valores fijos rompe PWA si el .env cambia y el cliente y el SW quedan en proyectos distintos.
 */
export function firebaseMessagingSwPlugin(): Plugin {
  /** Mismas claves que lee el cliente (incl. VITE_FIREBASE_* desde .env*) */
  let viteEnv: Record<string, string> = {}
  let firebaseJsVersion = '12.10.0'

  function readFirebaseVersion(root: string): void {
    try {
      const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
        dependencies?: { firebase?: string }
      }
      const v = pkg.dependencies?.firebase?.replace(/^[\^~]/, '').trim()
      if (v) firebaseJsVersion = v
    } catch {
      /* package.json siempre existe en el repo */
    }
  }

  function buildSwSource(env: Record<string, string>): string {
    const firebaseConfig = {
      apiKey: env.VITE_FIREBASE_API_KEY ?? '',
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: env.VITE_FIREBASE_APP_ID ?? '',
    }
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
      return `/* Faltan VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID o VITE_FIREBASE_APP_ID en .env */
throw new Error('[firebase-messaging-sw] Config incompleta: revisa VITE_FIREBASE_*');`
    }

    const cfg = JSON.stringify(firebaseConfig, null, 2)
    return `/* eslint-disable no-restricted-globals */
/* Generado por vite-plugin-firebase-messaging-sw — no editar a mano */
importScripts('https://www.gstatic.com/firebasejs/${firebaseJsVersion}/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/${firebaseJsVersion}/firebase-messaging-compat.js')

const firebaseConfig = ${cfg}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

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
    icon: '/Logo.png',
    badge: '/Logo.png',
    tag: payload.data?.tag ?? 'order',
    data: payload.data ?? {},
  }
  self.registration.showNotification(title, options)
})
`
  }

  return {
    name: 'firebase-messaging-sw',
    enforce: 'pre',
    configResolved(config) {
      readFirebaseVersion(config.root)
      const fromFiles = loadEnv(config.mode, config.root, '')
      const fromProcess: Record<string, string> = {}
      for (const [k, v] of Object.entries(process.env)) {
        if (k.startsWith('VITE_') && typeof v === 'string' && v.length > 0) {
          fromProcess[k] = v
        }
      }
      viteEnv = { ...fromFiles, ...fromProcess }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''
        if (pathname !== '/firebase-messaging-sw.js') {
          next()
          return
        }
        const body = buildSwSource(viteEnv)
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.end(body)
      })
    },
    generateBundle() {
      const source = buildSwSource(viteEnv)
      this.emitFile({
        type: 'asset',
        fileName: 'firebase-messaging-sw.js',
        source,
      })
    },
  }
}
