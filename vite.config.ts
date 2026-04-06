import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localApiPlugin } from './vite-plugin-local-api'

// https://vite.dev/config/
// base './' para que assets e index carguen bien en Capacitor iOS (rutas relativas)
export default defineConfig(({ mode }) => {
  // Las rutas `api/` cargadas con `ssrLoadModule` leen `process.env`; sin esto, `.env.local`
  // no llega al handler y Firebase puede fallar o quedar colgado sin mensaje claro.
  const fromFiles = loadEnv(mode, process.cwd(), '')
  for (const key of Object.keys(fromFiles)) {
    if (process.env[key] === undefined) {
      process.env[key] = fromFiles[key]
    }
  }

  return {
    base: './',
    plugins: [localApiPlugin(), react(), tailwindcss()],
  }
})
