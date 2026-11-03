import type { HTMLAttributes, ReactNode } from 'react'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode
	padding?: CardPadding
}

const paddingClasses: Record<CardPadding, string> = {
	none: 'p-0',
	sm: 'p-3',
	md: 'p-4',
	lg: 'p-6',
}

export function Card({ children, padding = 'md', className, ...props }: CardProps) {
	return (
		<div
			{...props}
			className={[
				'rounded-lg border border-border-subtle bg-surface-white',
				paddingClasses[padding],
				className,
			].filter(Boolean).join(' ')}
		>
			{children}
		</div>
	)
}
