export interface OrderTotalsInput {
  subtotal: number; deliveryFee: number; discount?: number; tip?: number
}
export interface OrderTotals {
  subtotal: number; deliveryFee: number; serviceFee: number; tax: number; discount: number; tip: number; total: number
}
export function calculateOrderTotals(input: OrderTotalsInput): OrderTotals {
  const serviceFee = Number((input.subtotal * 0.05).toFixed(2))
  const tax = Number((input.subtotal * 0.1).toFixed(2))
  const discount = input.discount ?? 0
  const tip = input.tip ?? 0
  return { subtotal: input.subtotal, deliveryFee: input.deliveryFee, serviceFee, tax, discount, tip, total: Number((input.subtotal + input.deliveryFee + serviceFee + tax - discount + tip).toFixed(2)) }
}
