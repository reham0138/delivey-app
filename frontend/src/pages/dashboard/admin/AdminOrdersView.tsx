import { useMemo, useState, type FormEvent } from 'react'
import { DataTable } from '@/pages/dashboard/components/DataTable'
import type { Column } from '@/pages/dashboard/components/DataTable'
import { ErrorBanner } from '@/pages/dashboard/components/ErrorBanner'
import { SearchField } from '@/pages/dashboard/components/SearchField'
import { StatusPill } from '@/pages/dashboard/components/StatusPill'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Modal } from '@/shared/components/Modal'
import { Pagination } from '@/shared/components/Pagination'
import { Select } from '@/shared/components/Select'
import { ApiError } from '@/shared/api/client'
import { useAdminAction } from '@/shared/hooks/useAdminAction'
import { useLanguage } from '@/shared/hooks/useLanguage'
import { adminOrdersService } from '@/shared/services/adminOrders.service'
import type { AdminOrdersListQuery, RestaurantOption } from '@/shared/services/adminOrders.service'
import type { Order, OrderStatus, PaginatedResponse } from '@/shared/types'
import { formatCurrency, formatDateTime } from '@/shared/utils/format'
import { orderNumber } from '@/shared/utils/orderNumber'

const ORDER_STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'on_the_way', 'delivered', 'cancelled']
const FINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled']

interface AdminOrdersViewProps {
  orders: Order[]
  meta: PaginatedResponse<Order>['meta']
  restaurants: RestaurantOption[]
  query: AdminOrdersListQuery
  onQueryChange: (query: AdminOrdersListQuery) => void
  /** Called after every change so the list reloads. */
  onChanged: () => void
}

export function AdminOrdersView({ orders, meta, restaurants, query, onQueryChange, onChanged }: AdminOrdersViewProps) {
  const { t } = useLanguage()
  const [target, setTarget] = useState<Order | null>(null)
  const [reason, setReason] = useState('')
  const { run, busyKey, error, clearError } = useAdminAction(onChanged)

  const restaurantsById = useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant.name])),
    [restaurants],
  )

  const clearFilters = () => {
    onQueryChange({ page: 1, limit: query.limit })
  }

  const cancelOrder = (order: Order, cancellationReason: string) =>
    run(order.id, () =>
      adminOrdersService.cancelOrder(order.id, cancellationReason).catch((failure: unknown) => {
        if (failure instanceof ApiError) {
          if (failure.code === 'ORDER_NOT_CANCELLABLE') throw new Error(t('This order can no longer be cancelled.'))
          if (failure.code === 'NOT_FOUND') throw new Error(t('Order not found.'))
          if (failure.code === 'VALIDATION_ERROR') throw new Error(t('Please check your order details and try again.'))
        }
        throw failure
      }),
    )

  const submitCancellation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!target || !reason.trim()) return
    if (await cancelOrder(target, reason.trim())) {
      setTarget(null)
      setReason('')
    }
  }

  const openCancel = (order: Order) => {
    setTarget(order)
    setReason('')
  }

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: t('Order no.'),
      rowHeader: true,
      cell: (order) => `#${orderNumber(order.id)}`,
    },
    { key: 'customer', header: t('Customer'), cell: (order) => order.customerName },
    {
      key: 'restaurant',
      header: t('Restaurant'),
      cell: (order) => restaurantsById.get(order.restaurantId) ?? '—',
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
      cell: (order) =>
        FINAL_STATUSES.includes(order.status) ? null : (
          <Button
            size="sm"
            variant="outline"
            disabled={busyKey === order.id}
            onClick={() => openCancel(order)}
          >
            {t('Cancel order')}
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
          value={query.search ?? ''}
          onChange={(search) => onQueryChange({ ...query, search: search || undefined, page: 1 })}
        />
        <Select
          aria-label={t('Filter by status')}
          value={query.status ?? 'all'}
          onChange={(event) =>
            onQueryChange({
              ...query,
              status: event.target.value === 'all' ? undefined : (event.target.value as OrderStatus),
              page: 1,
            })
          }
        >
          <option value="all">{t('All statuses')}</option>
          {ORDER_STATUSES.map((value) => <option key={value} value={value}>{t(value)}</option>)}
        </Select>
        <Select
          aria-label={t('Filter by restaurant')}
          value={query.restaurantId ?? 'all'}
          onChange={(event) =>
            onQueryChange({
              ...query,
              restaurantId: event.target.value === 'all' ? undefined : event.target.value,
              page: 1,
            })
          }
        >
          <option value="all">{t('All restaurants')}</option>
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>{t(restaurant.name)}</option>
          ))}
        </Select>
      </div>

      <p className="text-sm text-text-slate" aria-live="polite">
        {t('Orders')}: {meta.total}
      </p>

      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      {orders.length === 0 ? (
        <EmptyState
          title={t('No orders match your filters')}
          description={t('Try a different search or clear the filters.')}
          action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
        />
      ) : (
        <>
          <DataTable caption={t('Orders')} columns={columns} rows={orders} getRowKey={(order) => order.id} />
          <Pagination
            currentPage={query.page}
            totalPages={meta.total_pages}
            onPageChange={(page) => onQueryChange({ ...query, page })}
          />
        </>
      )}

      <Modal
        open={target !== null}
        onClose={() => {
          setTarget(null)
          setReason('')
        }}
        title={t('Cancel order')}
      >
        <form className="space-y-4" onSubmit={(event) => void submitCancellation(event)}>
          <p className="text-sm text-text-slate">
            {t('Order #{id}', { id: target ? orderNumber(target.id) : '' })} · {target?.customerName}
          </p>
          <label className="grid gap-2 text-sm font-semibold text-text-main">
            {t('Cancellation reason')}
            <textarea
              className="min-h-24 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 font-normal text-text-main"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={busyKey === target?.id} onClick={() => setTarget(null)}>
              {t('Keep order')}
            </Button>
            <Button type="submit" variant="danger" loading={busyKey === target?.id} disabled={!reason.trim()}>
              {t('Confirm cancellation')}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  )
}
