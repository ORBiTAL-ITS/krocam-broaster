import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base './' para que assets e index carguen bien en Capacitor iOS (rutas relativas)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  /** `vercel dev` sirve `/api` en este origen (por defecto puerto 3000). */
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000'

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
