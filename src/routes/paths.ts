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

export function loginPath(redirectTo: string = ROUTES.HOME): string {
  const safe =
    redirectTo.startsWith('/') && !redirectTo.startsWith('//')
      ? redirectTo
      : ROUTES.HOME
  return `${ROUTES.LOGIN}?redirect=${encodeURIComponent(safe)}`
}
