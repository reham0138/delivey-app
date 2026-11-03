import type { HTMLAttributes } from 'react'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
	label?: string
	size?: SpinnerSize
}

const sizeClasses: Record<SpinnerSize, string> = {
	sm: 'size-4 border-[3px]',
	md: 'size-6 border-2',
	lg: 'size-8 border-[3px]',
}

export function Spinner({ label = 'Loading', size = 'md', className, ...props }: SpinnerProps) {
	return (
		<span
			{...props}
			role="status"
			aria-label={label}
			aria-live="polite"
			className={['inline-flex items-center gap-2 text-sm text-text-slate', className].filter(Boolean).join(' ')}
		>
			<span
				aria-hidden="true"
				className={[
					'inline-block shrink-0 animate-spin rounded-full border-border-subtle border-t-brand-red motion-reduce:animate-none',
					sizeClasses[size],
				].join(' ')}
			/>
			<span>{label}</span>
		</span>
	)
}
