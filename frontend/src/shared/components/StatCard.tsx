import type { LucideIcon } from 'lucide-react'
import { Card } from '@/shared/components/Card'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  /** Small line under the value that explains it (never rely on the colour alone). */
  hint?: string
  /** Highlights numbers that need someone's attention. */
  attention?: boolean
}

export function StatCard({ label, value, icon: Icon, hint, attention = false }: StatCardProps) {
  return (
    <Card className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full ${
          attention ? 'bg-brand-red/10 text-brand-red' : 'bg-brand-yellow/20 text-text-main'
        }`}
      >
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-text-slate">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold text-text-main">{value}</p>
        {hint && <p className="mt-1 text-xs text-text-slate">{hint}</p>}
      </div>
    </Card>
  )
}
