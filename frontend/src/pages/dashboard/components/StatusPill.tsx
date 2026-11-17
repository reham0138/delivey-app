import { CircleAlert, CircleCheck, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

export type PillTone = 'good' | 'bad' | 'neutral'

// Every pill has an icon and text, so colour is never the only signal.
const TONES = {
  good: { className: 'border border-border-subtle bg-surface-cream text-text-main', Icon: CircleCheck },
  bad: { className: 'bg-danger/10 text-danger', Icon: CircleAlert },
  neutral: { className: 'bg-brand-yellow/20 text-text-main', Icon: Minus },
}

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const { className, Icon } = TONES[tone]
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <Icon aria-hidden="true" size={14} />
      {children}
    </span>
  )
}