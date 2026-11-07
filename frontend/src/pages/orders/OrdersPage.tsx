import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Search } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { Button } from '@/shared/components/Button'
import { Pagination } from '@/shared/components/Pagination'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useOrders } from '@/shared/hooks/useOrders'
import { formatCurrency, formatDateTime } from '@/shared/utils/format'
import type { OrderStatus } from '@/shared/types'
import { useLanguage } from '@/shared/hooks/useLanguage'

const money = (value: number) => formatCurrency(value)

export default function OrdersPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { data = [], meta, loading, error, retry } = useOrders(user?.id ?? 0, page, 8, { status, search, from, to })
  const counts = useMemo(
    () => data.reduce<Record<string, number>>((all, order) => {
      all[order.status] = (all[order.status] ?? 0) + 1
      return all
    }, {}),
    [data],
  )

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-red">{t('Your activity')}</p>
        <h1 className="mt-1 text-3xl font-bold">{t('My orders')}</h1>
        <p className="mt-2 text-text-slate">{t('Keep an eye on your deliveries and revisit your favourites.')}</p>
      </header>

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label={t('Search orders')} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder={t('Order number or meal name')} />
          <Select label={t('Filter by status')} value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
            <option value="all">{t('All statuses')}</option>
            {(['pending', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled'] as OrderStatus[]).map(value => (
              <option key={value} value={value}>{t(value)} {counts[value] ? `(${counts[value]})` : ''}</option>
            ))}
          </Select>
          <Input label={t('From date')} type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1) }} />
          <Input label={t('To date')} type="date" min={from || undefined} value={to} onChange={event => { setTo(event.target.value); setPage(1) }} />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label={t('Loading your orders...')} /></div>
      ) : error ? (
        <Card>
          <EmptyState title={t("We couldn't load your orders")} description={t(error)} action={<Button onClick={() => void retry()}>{t('Try again')}</Button>} />
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title={t('No matching orders')}
            description={t('Try changing your filters, or place your first order.')}
            action={<Link className="font-semibold text-brand-red underline" to="/meals">{t('Explore meals')}</Link>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map(order => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-slate">{t('Order #{id}', { id: order.id })}</p>
                  <h2 className="mt-1 font-semibold">{order.items.map(item => t(item.name)).join(', ')}</h2>
                  <p className="mt-1 flex items-center gap-2 text-xs text-text-slate"><CalendarDays size={14} />{formatDateTime(order.createdAt)}</p>
                </div>
                <Badge status={order.status} />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
                <span className="text-sm text-text-slate">
                  {t('items count', { count: order.items.reduce((sum, item) => sum + item.quantity, 0) })} · <b className="text-text-main">{money(order.total)}</b>
                </span>
                <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-red">
                  {t('View details')} <ChevronRight size={16} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {meta && <Pagination currentPage={page} totalPages={meta.total_pages} onPageChange={setPage} />}
      <p className="mt-5 flex items-center gap-2 text-xs text-text-slate"><Search size={14} /> {t('Filters apply to the current page of results.')}</p>
    </section>
  )
}
