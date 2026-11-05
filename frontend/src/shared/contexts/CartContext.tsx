import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { CartContextValue, CartItem } from '../types/cart'

export const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'crown-anchor-cart'

function getInitialCart(): CartItem[] {
  try {
    const savedCart = localStorage.getItem(STORAGE_KEY)
    return savedCart ? JSON.parse(savedCart) as CartItem[] : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getInitialCart)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addToCart = useCallback((newItem: CartItem) => {
    let added = false

    setItems((currentItems) => {
      if (
        currentItems.length > 0 &&
        currentItems[0].restaurantId !== newItem.restaurantId
      ) {
        return currentItems
      }

      added = true

      const existingItem = currentItems.find(
        (item) => item.menuItemId === newItem.menuItemId
      )

      if (existingItem) {
        return currentItems.map((item) =>
          item.menuItemId === newItem.menuItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentItems, { ...newItem, quantity: 1 }]
    })

    return added
  }, [])

  const removeFromCart = useCallback((menuItemId: number) => {
    setItems((current) =>
      current.filter((item) => item.menuItemId !== menuItemId)
    )
  }, [])

  const updateQuantity = useCallback(
    (menuItemId: number, quantity: number) => {
      if (quantity < 1) return

      setItems((current) =>
        current.map((item) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity }
            : item
        )
      )
    },
    []
  )

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const value = useMemo<CartContextValue>(() => ({
    items,
    restaurantId: items[0]?.restaurantId ?? null,
    restaurantName: items[0]?.restaurantName ?? null,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    ),
  }), [items, addToCart, removeFromCart, updateQuantity, clearCart])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}