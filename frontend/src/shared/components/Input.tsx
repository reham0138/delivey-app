import { useId, type ComponentProps } from 'react'

interface InputProps extends ComponentProps<'input'> {
	label: string
	hint?: string
	error?: string
	wrapperClassName?: string
}

export function Input({
	label,
	hint,
	error,
	required,
	className = '',
	wrapperClassName = '',
	...rest
}: InputProps) {
	const id = useId()
	const hintId = `${id}-hint`
	const errorId = `${id}-error`
	const describedBy = error ? errorId : hint ? hintId : undefined

	return (
		<div className={`flex flex-col gap-1 ${wrapperClassName}`}>
			<label htmlFor={id} className="text-sm font-semibold text-text-main">
				{label}
				{required && <span className="ms-1 text-danger" aria-hidden="true">*</span>}
			</label>
			<input
				id={id}
				required={required}
				aria-invalid={!!error}
				aria-describedby={describedBy}
				className={`rounded-lg border bg-surface-white px-3 py-2 text-text-main
					disabled:cursor-not-allowed disabled:opacity-50
					${error ? 'border-danger' : 'border-border-subtle'} ${className}`}
				{...rest}
			/>
			{error ? (
				<p id={errorId} className="text-sm text-danger">{error}</p>
			) : hint ? (
				<p id={hintId} className="text-sm text-text-slate">{hint}</p>
			) : null}
		</div>
	)
}
