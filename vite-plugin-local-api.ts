import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setCors } from './lib/push-api/cors.js'

const API_FILES: Record<string, string> = {
  '/api/send-broadcast-fcm': 'api/send-broadcast-fcm.ts',
  '/api/notify-orders': 'api/notify-orders.ts',
  '/api/notify-new-order-fcm': 'api/notify-new-order-fcm.ts',
}

const CORS_BY_PATH: Record<string, { allowHeaders: string; methods: string }> = {
  '/api/send-broadcast-fcm': {
    allowHeaders: 'Content-Type, Authorization',
    methods: 'POST, OPTIONS',
  },
  '/api/notify-orders': {
    allowHeaders: 'Content-Type, x-cron-secret',
    methods: 'GET, POST, OPTIONS',
  },
  '/api/notify-new-order-fcm': {
    allowHeaders: 'Content-Type, Authorization',
    methods: 'POST, OPTIONS',
  },
}

function augmentResponse(res: ServerResponse): VercelResponse {
  const v = res as VercelResponse
  if (!v.status) {
    v.status = function status(this: VercelResponse, code: number) {
      this.statusCode = code
      return this
    }
  }
  if (!v.json) {
    v.json = function json(this: VercelResponse, body: unknown) {
      if (!this.headersSent) {
        this.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      this.end(JSON.stringify(body))
      return this
    }
  }
  if (!v.send) {
    v.send = function send(this: VercelResponse, body: unknown) {
      if (typeof body === 'object' && body !== null) {
        return this.json(body)
      }
      this.end(String(body))
      return this
    }
  }
  return v
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk as Buffer))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return undefined
  const ct = req.headers['content-type'] ?? ''
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return raw
    }
  }
  return raw
}

async function toVercelRequest(req: IncomingMessage, url: string): Promise<VercelRequest> {
  const u = new URL(url, 'http://vite.local')
  const query: VercelRequest['query'] = {}
  u.searchParams.forEach((v, k) => {
    const cur = query[k]
    if (cur === undefined) query[k] = v
    else if (Array.isArray(cur)) cur.push(v)
    else query[k] = [cur, v]
  })

  let body: unknown
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    body = await readBody(req)
  }

  const vreq = req as VercelRequest
  vreq.query = query
  vreq.cookies = {}
  vreq.body = body
  return vreq
}

function registerLocalApi(vite: ViteDevServer): void {
  vite.middlewares.use(async (req, res, next) => {
    const rawUrl = req.url
    if (!rawUrl?.startsWith('/api/')) {
      next()
      return
    }

    const pathname = new URL(rawUrl, 'http://vite.local').pathname
    const file = API_FILES[pathname]
    if (!file) {
      next()
      return
    }

    if (req.method === 'OPTIONS') {
      const cors = CORS_BY_PATH[pathname]
      if (cors) {
        const vRes = augmentResponse(res)
        setCors(vRes, req as VercelRequest, cors)
        vRes.status(204).end()
        return
      }
    }

    try {
      const id = path.resolve(vite.config.root, file)
      const mod = (await vite.ssrLoadModule(id)) as { default: (a: VercelRequest, b: VercelResponse) => void | Promise<void> }
      const handler = mod.default
      const vReq = await toVercelRequest(req, rawUrl)
      const vRes = augmentResponse(res)
      await handler(vReq, vRes)
    } catch (e) {
      console.error('[local-api]', e)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ error: 'Error interno del servidor de desarrollo (api).' }))
      }
    }
  })
}

/** En `npm run dev`, ejecuta las rutas `api/*.ts` en el mismo servidor que Vite (sin `vercel dev`). */
export function localApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api',
    enforce: 'pre',
    configureServer(vite) {
      registerLocalApi(vite)
    },
  }
}
