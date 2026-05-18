/** Modelo de menú en Firestore y en la UI. */

export interface MenuCombo {
  id: string
  title: string
  description: string
  /** Precio en pesos COP (entero). */
  priceCop: number
  sortOrder: number
  active: boolean
}

export interface MenuCategory {
  id: string
  title: string
  sortOrder: number
  heroImageBase64: string | null
  heroImageAlt: string
  active: boolean
  combos: MenuCombo[]
}

/** Texto de precio para la UI (ej. 14.000). */
export function formatPriceCop(value: number): string {
  return value.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

/** Parsea precio legacy string o número. */
export function parsePriceCop(value: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : 0
}
