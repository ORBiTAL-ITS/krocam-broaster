// Service worker muy simple para que la app sea instalable como PWA.
// No hace caché agresivo, solo se asegura de estar activo.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  clients.claim()
})

