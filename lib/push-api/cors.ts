import type { VercelRequest, VercelResponse } from '@vercel/node'

/** Orígenes fijos; en Vercel se suman automáticamente la URL del despliegue (preview/producción). */
const STATIC_ALLOWED = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://krocam-broaster.vercel.app',
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
  return [...new Set(out)]
}

let cached: string[] | null = null
function allowedOrigins(): string[] {
  cached ??= collectAllowedOrigins()
  return cached
}

/** WebView de Capacitor a veces manda localhost con puerto u Origin distinto. */
function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins().includes(origin)) return true
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(origin)) return true
  if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) return true
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
