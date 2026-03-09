export interface ComboItem {
  id: number
  title: string
  price: string
  description: string
  /** Marca si el combo es destacado / mejor venta */
  featured?: boolean
}
