/**
 * CartContext: estado global del carrito para la carta KROCAM.
 * Maneja items, cantidades y totales.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  section: string
  unitPrice: number
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeOne: (id: string) => void
  removeAllOfItem: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (!existing) {
        return [...prev, { ...item, quantity: 1 }]
      }
      return prev.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
      )
    })
  }

  const removeOne = (id: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id)
      if (!existing) return prev
      if (existing.quantity <= 1) {
        return prev.filter((i) => i.id !== id)
      }
      return prev.map((i) =>
        i.id === id ? { ...i, quantity: i.quantity - 1 } : i,
      )
    })
  }

  const removeAllOfItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const clear = () => setItems([])

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
    const totalPrice = items.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0,
    )

    return {
      items,
      totalItems,
      totalPrice,
      addItem,
      removeOne,
      removeAllOfItem,
      clear,
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart debe usarse dentro de CartProvider')
  }
  return ctx
}

