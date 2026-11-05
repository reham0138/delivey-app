import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, MapPin, Package, Truck } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useOrder } from '@/shared/hooks/useOrders'
const money = (value:number) => `$${value.toFixed(2)}`
export default function OrderConfirmationPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { order, loading, error, retry } = useOrder(Number(id),user?.id ?? 0)
  if (loading) return <div className="flex justify-center py-24"><Spinner label="Loading confirmation..."/></div>
  if (error || !order) return <div className="mx-auto max-w-2xl px-4 py-16"><EmptyState title="Confirmation unavailable" description={error ?? 'We could not find this order.'} action={<Button onClick={() => void retry()}>Try again</Button>}/></div>
  return <section className="mx-auto max-w-2xl px-4 py-12"><Card className="text-center"><span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 text-green-700"><CheckCircle2 size={34}/></span><p className="mt-5 text-sm font-semibold uppercase tracking-widest text-brand-red">Order confirmed</p><h1 className="mt-2 text-3xl font-bold">Thanks, {order.customerName.split(' ')[0]}!</h1><p className="mt-2 text-text-slate">Your order has been received and the restaurant is getting ready.</p><div className="my-6 flex flex-wrap items-center justify-center gap-3"><Badge status={order.status}/><span className="text-sm text-text-slate">Order #{order.id}</span></div><div className="space-y-3 rounded-xl bg-surface-cream p-4 text-start"><div className="flex justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-text-slate"><Package size={16}/> {order.items.length} item types</span><b>{money(order.total)}</b></div><div className="flex items-start gap-2 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-brand-red"/><span>{order.deliveryAddress}</span></div><div className="flex justify-between text-sm"><span className="text-text-slate">Payment</span><span className="font-medium capitalize">{order.paymentMethod}{order.paymentStatus === 'simulated' ? ' · demo' : ''}</span></div>{order.estimatedDeliveryAt && <div className="flex justify-between text-sm"><span className="text-text-slate">Estimated delivery</span><span className="font-medium">{new Date(order.estimatedDeliveryAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</span></div>}</div><Link to={`/orders/${order.id}`} className="mt-6 block"><Button className="w-full"><Truck size={17}/> Track your order</Button></Link><Link to="/orders" className="mt-4 inline-block text-sm font-semibold text-brand-red underline">View all orders</Link></Card></section>
}
