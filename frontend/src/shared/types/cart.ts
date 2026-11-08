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
  removeFromCart: (restaurantId: number, menuItemId: number) => void
  updateQuantity: (restaurantId: number, menuItemId: number, quantity: number) => void
  clearCart: () => void
  isCartPromptOpen: boolean
  showCartPrompt: () => void
  closeCartPrompt: () => void
  totalItems: number
  subtotal: number
}