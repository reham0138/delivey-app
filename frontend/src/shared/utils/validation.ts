import { z } from 'zod'

export const loginSchema = z.object({
	email: z.email('Enter a valid email address.'),
	password: z.string().min(6, 'Password must be at least 6 characters.'),
})

export const registerSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters.'),
	email: z.email('Enter a valid email address.'),
	password: z.string().min(6, 'Password must be at least 6 characters.'),
	confirmPassword: z.string(),
	role: z.enum(['customer', 'restaurant']),
}).refine((values) => values.password === values.confirmPassword, {
	message: 'Passwords do not match.',
	path: ['confirmPassword'],
})

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().optional().refine((value) => value === undefined || value === '' || isValidPhone(value), {
    message: 'Enter a valid phone number.',
  }),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ProfileFormValues = z.infer<typeof profileSchema>
export function isValidPhone(value: string): boolean {
  return /^\+?[0-9\s()-]{8,18}$/.test(value.trim())
}
export function isValidAddress(value: string): boolean {
  return value.trim().length >= 8
}
export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alternate = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (alternate) { digit *= 2; if (digit > 9) digit -= 9 }
    sum += digit
    alternate = !alternate
  }
  return sum % 10 === 0
}
export function isValidCardExpiry(value: string): boolean {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[2])
  const month = Number(match[1])
  const now = new Date()
  return year > now.getFullYear() % 100 || (year === now.getFullYear() % 100 && month >= now.getMonth() + 1)
}
export function isValidCvc(value: string): boolean {
  return /^\d{3,4}$/.test(value)
}
