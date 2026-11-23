export interface CartItem {
  menuItemId: string
  restaurantId: string
  restaurantName: string
  name: string
  price: number
  image?: string | null
  quantity: number
}

export interface CartContextValue {
  items: CartItem[]
  restaurantId: string | null
  restaurantName: string | null
  addToCart: (item: CartItem) => boolean
  removeFromCart: (restaurantId: string, menuItemId: string) => void
  updateQuantity: (restaurantId: string, menuItemId: string, quantity: number) => void
  clearCart: () => void
  isCartPromptOpen: boolean
  showCartPrompt: () => void
  closeCartPrompt: () => void
  totalItems: number
  subtotal: number
}