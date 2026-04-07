import { Capacitor } from '@capacitor/core'

/**
 * URLs del backend `/api/*` separadas por plataforma.
 *
 * **Web / PWA (Firebase Hosting, etc.)**
 * - El hosting de Firebase **solo sirve estáticos**: no existe `/api` en ese dominio. Las serverless están en **Vercel** (`api/` en el repo).
 * - `VITE_WEB_API_ORIGIN` (opcional): fuerza la base de la API si difiere del valor por defecto.
 * - Sin variable en **producción**: se usa `DEFAULT_VERCEL_DEPLOY` → las llamadas van a Vercel, no al dominio de Firebase.
 * - En **desarrollo** (`npm run dev`): mismo origen (`localhost`) para el plugin de Vite que emula `/api` localmente.
 *
 * **Capacitor (iOS / Android)** — sin mezclar con la lógica web
 * - `VITE_NATIVE_API_ORIGIN` → `VITE_API_ORIGIN` → `VITE_SITE_URL` → `DEFAULT_VERCEL_DEPLOY`
 */
const DEFAULT_VERCEL_DEPLOY = 'https://krocam-broaster.vercel.app'

function trimOrigin(raw: string | undefined): string {
  return raw?.replace(/\/$/, '').trim() ?? ''
}

/**
 * Base de la API en el navegador.
 * - Explícita si defines `VITE_WEB_API_ORIGIN`.
 * - Dev: vacío → `getApiUrl` usa `window.location.origin` (plugin local).
 * - Prod: sin explícita → Vercel (la PWA en Firebase no tiene `/api` en el mismo host).
 */
function resolveWebApiBase(): string {
  const explicit = trimOrigin(import.meta.env.VITE_WEB_API_ORIGIN as string | undefined)
  if (explicit) return explicit
  if (import.meta.env.DEV) return ''
  return DEFAULT_VERCEL_DEPLOY
}

/** Base URL solo para WebView nativo; no afecta a la PWA en Firebase. */
function getNativeApiBase(): string {
  const explicitNative = trimOrigin(
    import.meta.env.VITE_NATIVE_API_ORIGIN as string | undefined,
  )
  if (explicitNative) return explicitNative

  const legacyApi = trimOrigin(import.meta.env.VITE_API_ORIGIN as string | undefined)
  if (legacyApi) return legacyApi

  const site = trimOrigin(import.meta.env.VITE_SITE_URL as string | undefined)
  if (site) return site

  return DEFAULT_VERCEL_DEPLOY
}

/**
 * URL absoluta para `fetch` a las rutas serverless (p. ej. `/api/send-broadcast-fcm`).
 */
export function getApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`

  if (Capacitor.isNativePlatform()) {
    return `${getNativeApiBase()}${p}`
  }

  const webBase = resolveWebApiBase()
  if (webBase) {
    return `${webBase}${p}`
  }
  if (typeof window !== 'undefined') {
    return new URL(p, window.location.origin).href
  }
  return p
}

/** Origen efectivo de la API (depuración). En web dev puede ser vacío (mismo origen). */
export function getApiOrigin(): string {
  if (Capacitor.isNativePlatform()) {
    return getNativeApiBase()
  }
  return resolveWebApiBase()
}
