import type { OrderStatus, OrderStatusHistoryEntry } from '@/shared/types'
import { Badge } from '@/shared/components/Badge'
import { formatDateTime } from '@/shared/utils/format'
const steps: OrderStatus[] = ['pending','preparing','ready','on_the_way','delivered']
export default function OrderTimeline({ status, history }: { status: OrderStatus; history: OrderStatusHistoryEntry[] }) {
  if (status === 'cancelled') return <div className="rounded-xl border border-danger/30 bg-danger/10 p-4"><Badge status="cancelled"/><p className="mt-2 text-sm text-text-slate">This order was cancelled.</p></div>
  const current = steps.indexOf(status)
  return <ol className="space-y-4" aria-label="Order progress">{steps.map((step,index) => {
    const entry = history.find(item => item.status === step)
    const done = index <= current
    return <li key={step} className="flex items-start gap-3"><span className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-brand-red text-white' : 'border border-border-subtle text-text-slate'}`}>{done ? '✓' : index + 1}</span><div className="min-w-0 flex-1"><p className={`font-semibold capitalize ${done ? 'text-text-main' : 'text-text-slate'}`}>{step.replace('_',' ')}</p>{entry && <p className="text-xs text-text-slate">{formatDateTime(entry.at)}</p>}</div>{index === current && <Badge status={status}/>}</li>
  })}</ol>
}
