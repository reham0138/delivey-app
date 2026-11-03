import { Inbox } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
	title: string
	description: ReactNode
	action?: ReactNode
}

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
	return (
		<div
			{...props}
			className={[
				'flex flex-col items-center gap-3 px-4 py-8 text-center',
				className,
			].filter(Boolean).join(' ')}
		>
			<span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-red">
				<Inbox size={24} />
			</span>
			<h2 className="text-lg font-semibold text-text-main">{title}</h2>
			<div className="max-w-prose text-sm text-text-slate">{description}</div>
			{action && <div className="mt-1">{action}</div>}
		</div>
	)
}
