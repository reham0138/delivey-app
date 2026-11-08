import { Check, CheckCheck, CircleX, CookingPot, Timer, Truck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HTMLAttributes } from 'react'
import { useLanguage } from '../hooks/useLanguage'

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: OrderStatus
}

type StatusDetails = {
  className: string
  Icon: LucideIcon
}

const statusDetails: Record<OrderStatus, StatusDetails> = {
  pending: { className: 'bg-brand-yellow/20 text-text-main', Icon: Timer },
  preparing: { className: 'bg-brand-red/10 text-brand-red', Icon: CookingPot },
  ready: { className: 'bg-brand-yellow text-text-main', Icon: Check },
  on_the_way: { className: 'bg-brand-red/10 text-brand-red', Icon: Truck },
  delivered: { className: 'border border-border-subtle bg-surface-cream text-text-main', Icon: CheckCheck },
  cancelled: { className: 'bg-danger/10 text-danger', Icon: CircleX },
}

export function Badge({ status, className, ...props }: BadgeProps) {
  const { t } = useLanguage()
  const { className: statusClassName, Icon } = statusDetails[status]

  return (
    <span
      {...props}
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        statusClassName,
        className,
      ].filter(Boolean).join(' ')}
    >
      <Icon aria-hidden="true" size={14} />
      {t(status)}
    </span>
  )
}
