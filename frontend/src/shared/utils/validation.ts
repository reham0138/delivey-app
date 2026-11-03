import { z } from 'zod'

export const loginSchema = z.object({
	email: z.string().email('Enter a valid email address.'),
	password: z.string().min(6, 'Password must be at least 6 characters.'),
})

export const registerSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters.'),
	email: z.string().email('Enter a valid email address.'),
	password: z.string().min(6, 'Password must be at least 6 characters.'),
	confirmPassword: z.string(),
	role: z.enum(['customer', 'restaurant']),
}).refine((values) => values.password === values.confirmPassword, {
	message: 'Passwords do not match.',
	path: ['confirmPassword'],
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>