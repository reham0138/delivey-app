import { X } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'
import { useEffect, useId, useRef } from 'react'
import type { DialogHTMLAttributes, ReactNode } from 'react'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose' | 'title' | 'children'> {
	open: boolean
	onClose: () => void
	title: string
	children: ReactNode
	size?: ModalSize
	contentClassName?: string
}

const sizeClasses: Record<ModalSize, string> = {
	sm: 'max-w-sm',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-4xl',
}

export function Modal({
	open,
	onClose,
	title,
	children,
	size = 'md',
	className,
	contentClassName,
	...props
}: ModalProps) {
  const { t } = useLanguage()
	const dialogRef = useRef<HTMLDialogElement>(null)
	const titleId = useId()

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) return

		if (open && !dialog.open) dialog.showModal()
		if (!open && dialog.open) dialog.close()

		return () => {
			if (dialog.open) dialog.close()
		}
	}, [open])

	return (
		<dialog
			{...props}
			ref={dialogRef}
			aria-labelledby={titleId}
			className={[
				'fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] bg-transparent p-0 text-text-main backdrop:bg-text-main/50',
				sizeClasses[size],
				className,
			].filter(Boolean).join(' ')}
			onCancel={(event) => {
				event.preventDefault()
				onClose()
			}}
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose()
			}}
		>
			<div className={[
				'max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-border-subtle bg-surface-white p-4 sm:p-6',
				contentClassName,
			].filter(Boolean).join(' ')}>
				<div className="mb-4 flex items-start justify-between gap-4">
					<h2 id={titleId} className="text-lg font-semibold text-text-main">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label={t("Close dialog")}
						className="-me-2 -mt-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-text-slate transition-colors hover:bg-border-subtle/50 hover:text-text-main"
					>
						<X aria-hidden="true" size={20} />
					</button>
				</div>
				{children}
			</div>
		</dialog>
	)
}
