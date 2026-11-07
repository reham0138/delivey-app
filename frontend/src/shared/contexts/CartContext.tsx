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
  const [isCartPromptOpen, setIsCartPromptOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addToCart = useCallback((newItem: CartItem) => {
    if (
      items.length > 0 &&
      items[0].restaurantId !== newItem.restaurantId
    ) {
      return false
    }

    const existingItem = items.find(
      (item) => item.menuItemId === newItem.menuItemId
    )

    if (existingItem) {
      setItems(items.map((item) =>
        item.menuItemId === newItem.menuItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setItems([...items, { ...newItem, quantity: 1 }])
    }

    return true
  }, [items])

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
    setIsCartPromptOpen(false)
  }, [])

  const showCartPrompt = useCallback(() => {
    setIsCartPromptOpen(true)
  }, [])

  const closeCartPrompt = useCallback(() => {
    setIsCartPromptOpen(false)
  }, [])

  const value = useMemo<CartContextValue>(() => ({
    items,
    restaurantId: items[0]?.restaurantId ?? null,
    restaurantName: items[0]?.restaurantName ?? null,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    isCartPromptOpen,
    showCartPrompt,
    closeCartPrompt,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    ),
  }), [items, addToCart, removeFromCart, updateQuantity, clearCart, isCartPromptOpen, showCartPrompt, closeCartPrompt])

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}