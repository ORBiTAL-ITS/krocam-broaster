import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base './' para que assets e index carguen bien en Capacitor iOS (rutas relativas)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
