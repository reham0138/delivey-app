import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	label?: string
	hint?: ReactNode
	error?: ReactNode
	wrapperClassName?: string
}

export function Select({
	label,
	hint,
	error,
	id,
	className,
	wrapperClassName,
	children,
	disabled,
	required,
	...props
}: SelectProps) {
	const generatedId = useId()
	const selectId = id ?? generatedId
	const hintId = hint ? `${selectId}-hint` : undefined
	const errorId = error ? `${selectId}-error` : undefined
	const describedBy = [props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined

	return (
		<div className={['grid gap-2', wrapperClassName].filter(Boolean).join(' ')}>
			{label && (
				<label htmlFor={selectId} className="text-sm font-medium text-text-main">
					{label}
					{required && <span aria-hidden="true" className="ms-1 text-danger">*</span>}
				</label>
			)}
			<div className="relative">
				<select
					{...props}
					id={selectId}
					disabled={disabled}
					required={required}
					aria-invalid={error ? true : props['aria-invalid']}
					aria-describedby={describedBy}
					className={[
						'min-h-10 w-full appearance-none rounded-lg border bg-surface-white py-2 ps-3 pe-10 text-start text-sm text-text-main',
						error ? 'border-danger' : 'border-border-subtle',
						'disabled:cursor-not-allowed disabled:bg-surface-cream disabled:opacity-60',
						className,
					].filter(Boolean).join(' ')}
				>
					{children}
				</select>
				<ChevronDown
					aria-hidden="true"
					className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-text-slate"
				/>
			</div>
			{hint && !error && <p id={hintId} className="text-sm text-text-slate">{hint}</p>}
			{error && <p id={errorId} className="text-sm text-danger">{error}</p>}
		</div>
	)
}
