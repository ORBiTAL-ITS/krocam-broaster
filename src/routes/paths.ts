/** Rutas de la app (web + Capacitor). */
export const ROUTES = {
  HOME: '/',
  MENU_EDIT: '/menu/editar',
  LOGIN: '/login',
  ORDERS: '/pedidos',
  NOTIFICATIONS: '/notificaciones',
  ACCOUNT: '/cuenta',
  ADMIN_ORDERS: '/admin/pedidos',
  ADMIN_REVIEWS: '/admin/reseñas',
  PRIVACY: '/privacy-policy',
  TERMS: '/terms',
  CONTACT: '/contact',
  ABOUT: '/about',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function safeRedirectPath(path: string | null | undefined): string {
  if (path && path.startsWith('/') && !path.startsWith('//')) {
    return path
  }
  return ROUTES.HOME
}

export function loginPath(redirectTo: string = ROUTES.HOME): string {
  const safe = safeRedirectPath(redirectTo)
  return `${ROUTES.LOGIN}?redirect=${encodeURIComponent(safe)}`
}

export function loginRedirectFromSearch(search: string): string {
  const raw = new URLSearchParams(search).get('redirect')
  return safeRedirectPath(raw)
}
