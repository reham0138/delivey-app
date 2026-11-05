export interface CartItem {
  menuItemId: number
  restaurantId: number
  restaurantName: string
  name: string
  price: number
  image?: string | null
  quantity: number
}

export interface CartContextValue {
  items: CartItem[]
  restaurantId: number | null
  restaurantName: string | null
  addToCart: (item: CartItem) => boolean
  removeFromCart: (menuItemId: number) => void
  updateQuantity: (menuItemId: number, quantity: number) => void
  clearCart: () => void
  totalItems: number
  subtotal: number
}