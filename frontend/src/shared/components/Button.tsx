import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant
	size?: ButtonSize
	loading?: boolean
	children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
	primary: 'bg-brand-red !text-white hover:bg-brand-red-hover',
	secondary: 'border border-border-subtle bg-surface-cream text-text-main hover:bg-border-subtle/50',
	outline: 'border border-brand-red bg-transparent text-brand-red hover:bg-brand-red/10',
	ghost: 'bg-transparent text-text-main hover:bg-border-subtle/50',
	danger: 'bg-danger !text-white hover:bg-danger-hover',
}

const sizeClasses: Record<ButtonSize, string> = {
	sm: 'min-h-8 gap-2 px-2 py-1 text-xs',
	md: 'min-h-10 gap-2 px-4 py-2 text-sm',
	lg: 'min-h-12 gap-2 px-6 py-3 text-base',
}

export function Button({
	variant = 'primary',
	size = 'md',
	loading = false,
	disabled = false,
	className,
	children,
	type = 'button',
	...props
}: ButtonProps) {
	return (
		<button
			{...props}
			type={type}
			disabled={disabled || loading}
			aria-busy={loading || props['aria-busy']}
			className={[
				'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
				variantClasses[variant],
				sizeClasses[size],
				className,
			].filter(Boolean).join(' ')}
		>
			{loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
			{children}
		</button>
	)
}
