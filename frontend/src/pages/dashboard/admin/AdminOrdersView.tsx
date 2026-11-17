import { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/pages/dashboard/components/ConfirmDialog'
import { DataTable } from '@/pages/dashboard/components/DataTable'
import type { Column } from '@/pages/dashboard/components/DataTable'
import { ErrorBanner } from '@/pages/dashboard/components/ErrorBanner'
import { SearchField } from '@/pages/dashboard/components/SearchField'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Pagination } from '@/shared/components/Pagination'
import { Select } from '@/shared/components/Select'
import { useAdminAction } from '@/shared/hooks/useAdminAction'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { adminService } from '@/shared/services/admin.service'
import type { AdminOrderRow } from '@/shared/services/admin.service'
import type { OrderStatus } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'
import { formatDateTime } from '@/shared/utils/format'

const PAGE_SIZE = 8
const ORDER_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled']
type StatusFilter = OrderStatus | 'all'

function matchesQuery(order: AdminOrderRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return !needle || [
    String(order.id),
    order.customerName,
    order.restaurantName,
    ...order.items.map((item) => item.name),
  ].some((value) => value.toLowerCase().includes(needle))
}

interface AdminOrdersViewProps {
  orders: AdminOrderRow[]
  onChanged: () => void
}

export function AdminOrdersView({ orders, onChanged }: AdminOrdersViewProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<AdminOrderRow | null>(null)
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          (status === 'all' || order.status === status) &&
          matchesQuery(order, query),
      ),
    [orders, status, query],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }
  const clearFilters = () => {
    setQuery('')
    setStatus('all')
    setPage(1)
  }

  const confirmDelete = async () => {
    if (!target) return
    await run(target.id, () => adminService.deleteOrder(target.id))
    setTarget(null)
  }

  const columns: Column<AdminOrderRow>[] = [
    {
      key: 'id',
      header: t('Order no.'),
      rowHeader: true,
      cell: (order) => `#${order.id}`,
    },
    { key: 'customer', header: t('Customer'), cell: (order) => order.customerName },
    {
      key: 'restaurant',
      header: t('Restaurant'),
      cell: (order) => t(order.restaurantName),
    },
    {
      key: 'items',
      header: t('Items'),
      className: 'max-w-xs whitespace-normal break-words',
      cell: (order) => order.items.map((item) => `${item.quantity}× ${t(item.name)}`).join(', '),
    },
    {
      key: 'status',
      header: t('Status'),
      cell: (order) => (
        <StatusPill
          tone={order.status === 'delivered' ? 'good' : order.status === 'cancelled' ? 'bad' : 'neutral'}
        >
          {t(order.status)}
        </StatusPill>
      ),
    },
    { key: 'total', header: t('Total'), cell: (order) => formatCurrency(order.total) },
    { key: 'placed', header: t('Placed'), cell: (order) => formatDateTime(order.createdAt) },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (order) => (
        <Button
          size="sm"
          variant="danger"
          disabled={busyKey === order.id}
          onClick={() => setTarget(order)}
        >
          {t('Delete order')}
        </Button>
      ),
    },
  ]

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="min-w-60 flex-1"
          label={t('Search orders')}
          placeholder={t('Search by order, customer or restaurant')}
          value={query}
          onChange={changeFilter(setQuery)}
        />
        <Select
          aria-label={t('Filter by status')}
          value={status}
          onChange={(event) => changeFilter(setStatus)(event.target.value as StatusFilter)}
        >
          <option value="all">{t('All statuses')}</option>
          {ORDER_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Orders')}: {filtered.length}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {filtered.length === 0 ? (
        <EmptyState
          title={t('No orders match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Orders')} columns={columns} rows={pageRows} getRowKey={(order) => order.id} />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={target !== null}
        title={t('Delete this order?')}
        message={t('This permanently removes the order from order history.')}
        confirmLabel={t('Delete order')}
        busy={target !== null && busyKey === target.id}
        destructive
        onConfirm={() => void confirmDelete()}
        onClose={() => setTarget(null)}
      />
    </Card>
  )
}
