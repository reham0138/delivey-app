import { Button } from '@/shared/components/Button'
import { useLanguage } from '@/shared/hooks/useLanguage'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const { t } = useLanguage()
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-text-main"
    >
      <span>{t(message)}</span>
      <Button size="sm" variant="secondary" onClick={onDismiss}>
        {t('Dismiss')}
      </Button>
    </div>
  )
}