import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localApiPlugin } from './vite-plugin-local-api'

// https://vite.dev/config/
// base './' para que assets e index carguen bien en Capacitor iOS (rutas relativas)
export default defineConfig({
  base: './',
  plugins: [localApiPlugin(), react(), tailwindcss()],
})
