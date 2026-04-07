import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Orígenes fijos; en Vercel se suman automáticamente la URL del despliegue (preview/producción). */
const STATIC_ALLOWED = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://krocam-broaster.vercel.app',
  // PWA en Firebase Hosting (estáticos; la API sigue en Vercel)
  'https://krocam-9a82c.web.app',
  'https://krocam-9a82c.firebaseapp.com',
  // Capacitor/Ionic WebView (fetch al API en Vercel es cross-origin)
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
]

function pushOrigin(out: string[], v: string | undefined) {
  if (!v) return
  out.push(v.startsWith('http') ? v : `https://${v}`)
}

function collectAllowedOrigins(): string[] {
  const out = [...STATIC_ALLOWED]
  pushOrigin(out, process.env.VERCEL_URL)
  pushOrigin(out, process.env.VERCEL_BRANCH_URL)
  pushOrigin(out, process.env.VERCEL_PROJECT_PRODUCTION_URL)
  const extra = process.env.CORS_EXTRA_ORIGINS?.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean) ?? []
  for (const e of extra) {
    pushOrigin(out, e)
  }
  return [...new Set(out)]
}

let cached: string[] | null = null
function allowedOrigins(): string[] {
  cached ??= collectAllowedOrigins()
  return cached
}

/**
 * Orígenes permitidos para CORS. Incluye patrones amplios porque:
 * - El cliente que confirma un pedido llama a `/api/notify-new-order-fcm` desde su dominio (p. ej. Firebase Hosting
 *   o dominio propio). Si el Origin no está permitido, el navegador bloquea la respuesta y los admins no reciben push.
 * - La ruta sigue exigiendo `Authorization: Bearer` válido y `userId` del pedido = token.
 */
function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins().includes(origin)) return true
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(origin)) return true
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) return true
  // Cualquier subdominio de Firebase Hosting por defecto
  if (/^https:\/\/[a-z0-9-]+\.web\.app$/i.test(origin)) return true
  if (/^https:\/\/[a-z0-9-]+\.firebaseapp\.com$/i.test(origin)) return true
  // Previews y apps en subdominio vercel.app
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true
  return false
}

export function setCors(
  res: VercelResponse,
  req: VercelRequest,
  opts: { allowHeaders: string; methods?: string },
) {
  const origin = req.headers.origin
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', opts.methods ?? 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', opts.allowHeaders)
}
