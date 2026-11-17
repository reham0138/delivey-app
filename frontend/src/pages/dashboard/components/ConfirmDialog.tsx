import type { ReactNode } from 'react'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { useLanguage } from '@/shared/hooks/useLanguage'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  /** True while the action is being saved. */
  busy: boolean
  /** Red button for actions that are hard to undo (delete). */
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel, busy, destructive = false, onConfirm, onClose }: ConfirmDialogProps) {
  const { t } = useLanguage()
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-6">
        <div className="text-sm text-text-main">{message}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}