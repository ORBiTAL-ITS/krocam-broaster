import { Capacitor } from '@capacitor/core'

/**
 * Origen del backend serverless en Vercel (sin barra final).
 *
 * - **Navegador** en el mismo dominio que el deploy: cadena vacía → `fetch('/api/...')` es mismo host.
 *   En local, Vite no ejecuta `api/`: usa `npm run dev:vercel` (misma URL para app y API) o dos terminales
 *   (`dev:vercel` + `npm run dev`; Vite proxifica `/api` a `VITE_API_PROXY_TARGET`, por defecto :3000).
 * **Android / iOS (Capacitor):** el bundle no sirve `/api`, hay que usar la URL pública del deploy.
 *
 * Prioridad: `VITE_API_ORIGIN` → `VITE_SITE_URL` → en nativo el deploy por defecto del proyecto.
 */
const DEFAULT_VERCEL_DEPLOY = 'https://krocam-broaster.vercel.app'

export function getApiOrigin(): string {
  const fromEnv =
    (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, '').trim() ||
    (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '').trim()
  if (fromEnv) return fromEnv
  if (Capacitor.isNativePlatform()) {
    return DEFAULT_VERCEL_DEPLOY
  }
  return ''
}
