import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Input } from '@/shared/components/Input'
import { Select } from '@/shared/components/Select'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useOrders } from '@/shared/hooks/useOrders'
import type { OrderStatus } from '@/shared/types'

const money = (value: number) => `$${value.toFixed(2)}`
export default function OrdersPage() {
  const { user } = useAuth()
  const [page,setPage] = useState(1)
  const [status,setStatus] = useState('all')
  const [search,setSearch] = useState('')
  const [from,setFrom] = useState('')
  const [to,setTo] = useState('')
  const { data = [], meta, loading, error, retry } = useOrders(user?.id ?? 0,page,8,{ status, search, from, to })
  const filtered = data
  const counts = useMemo(() => data.reduce<Record<string,number>>((all,order) => { all[order.status] = (all[order.status] ?? 0) + 1; return all },{}),[data])
  return <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><header className="mb-7"><p className="text-sm font-semibold uppercase tracking-widest text-brand-red">Your activity</p><h1 className="mt-1 text-3xl font-bold">My orders</h1><p className="mt-2 text-text-slate">Keep an eye on your deliveries and revisit your favourites.</p></header>
    <Card className="mb-6"><div className="grid gap-4 md:grid-cols-2"><Input label="Search orders" value={search} onChange={event => {setSearch(event.target.value);setPage(1)}} placeholder="Order number or meal name"/><Select label="Filter by status" value={status} onChange={event => {setStatus(event.target.value);setPage(1)}}><option value="all">All statuses</option>{(['pending','preparing','ready','on_the_way','delivered','cancelled'] as OrderStatus[]).map(value => <option key={value} value={value}>{value.replace('_',' ') } {counts[value] ? `(${counts[value]})` : ''}</option>)}</Select><Input label="From date" type="date" value={from} onChange={event => {setFrom(event.target.value);setPage(1)}}/><Input label="To date" type="date" min={from || undefined} value={to} onChange={event => {setTo(event.target.value);setPage(1)}}/></div></Card>
    {loading ? <div className="flex justify-center py-20"><Spinner label="Loading your orders..."/></div> : error ? <Card><EmptyState title="We couldn't load your orders" description={error} action={<Button onClick={() => void retry()}>Try again</Button>}/></Card> : filtered.length === 0 ? <Card><EmptyState title="No matching orders" description="Try changing your filters, or place your first order." action={<Link className="font-semibold text-brand-red underline" to="/meals">Explore meals</Link>}/></Card> : <div className="space-y-4">{filtered.map(order => <Card key={order.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-text-slate">Order #{order.id}</p><h2 className="mt-1 font-semibold">{order.items.map(item => item.name).join(', ')}</h2><p className="mt-1 flex items-center gap-2 text-xs text-text-slate"><CalendarDays size={14}/>{new Date(order.createdAt).toLocaleString()}</p></div><Badge status={order.status}/></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4"><span className="text-sm text-text-slate">{order.items.reduce((sum,item) => sum + item.quantity,0)} items · <b className="text-text-main">{money(order.total)}</b></span><Link to={`/orders/${order.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-red">View details <ChevronRight size={16}/></Link></div></Card>)}</div>}
    {meta && meta.total_pages > 1 && <div className="mt-6 flex items-center justify-between"><span className="text-sm text-text-slate">Page {meta.page} of {meta.total_pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/>Previous</Button><Button variant="outline" size="sm" disabled={page >= meta.total_pages} onClick={() => setPage(value => value + 1)}>Next<ChevronRight size={16}/></Button></div></div>}
    <p className="mt-5 flex items-center gap-2 text-xs text-text-slate"><Search size={14}/> Filters apply to the current page of results.</p>
  </section>
}
