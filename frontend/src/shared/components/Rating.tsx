import { Star } from 'lucide-react'
import type { HTMLAttributes } from 'react'

export interface RatingProps extends HTMLAttributes<HTMLDivElement> {
	value: number
	max?: number
}

export function Rating({ value, max = 5, className, ...props }: RatingProps) {
	const boundedValue = Math.min(Math.max(value, 0), max)
	const formattedValue = Number.isInteger(boundedValue) ? String(boundedValue) : boundedValue.toFixed(1)

	return (
		<div
			{...props}
			role="img"
			aria-label={`${formattedValue} out of ${max}`}
			className={['inline-flex items-center gap-2 text-sm text-text-main', className].filter(Boolean).join(' ')}
		>
			<span aria-hidden="true" className="inline-flex items-center gap-1">
				{Array.from({ length: max }, (_, index) => {
					const fill = Math.min(Math.max(boundedValue - index, 0), 1)
					return (
						<span key={index} className="relative inline-flex size-4">
							<Star aria-hidden="true" size={16} fill="none" className="absolute inset-0 text-border-subtle" />
							{fill >= 1 && (
								<Star aria-hidden="true" size={16} fill="currentColor" className="absolute inset-0 text-brand-yellow" />
							)}
							{fill >= 0.5 && fill < 1 && (
								<span className="absolute inset-y-0 start-0 w-1/2 overflow-hidden">
									<Star aria-hidden="true" size={16} fill="currentColor" className="max-w-none text-brand-yellow" />
								</span>
							)}
						</span>
					)
				})}
			</span>
			<span>{formattedValue} out of {max}</span>
		</div>
	)
}
