import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Printer, RefreshCw, Share2, Star, XCircle } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Modal } from '@/shared/components/Modal'
import { Spinner } from '@/shared/components/Spinner'
import { useAuth } from '@/shared/hooks/useAuth'
import { useCart } from '@/shared/hooks/useCart'
import { useOrder } from '@/shared/hooks/useOrders'
import { orderService } from '@/shared/services/order.service'
import OrderTimeline from './OrderTimeline'

const money = (value: number) => `$${value.toFixed(2)}`
export default function OrderDetailsPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const { order, loading, error, retry } = useOrder(Number(id),user?.id ?? 0)
  const [cancelOpen,setCancelOpen] = useState(false)
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  if (loading) return <div className="flex justify-center py-24"><Spinner label="Loading order..."/></div>
  if (error || !order) return <div className="mx-auto max-w-3xl px-4 py-16"><EmptyState title="Order not found" description={error ?? 'This order may not exist or may belong to another account.'} action={<Button onClick={() => void retry()}>Try again</Button>}/></div>
  const canCancel = order.status === 'pending' || order.status === 'preparing'
  const reorder = () => {
    if (cart.items.length && cart.restaurantId !== order.restaurantId) { setMessage('Your cart contains meals from another restaurant. Clear it before reordering.'); return }
    order.items.forEach(item => cart.addToCart({ menuItemId:item.menuItemId, restaurantId:order.restaurantId, restaurantName:`Restaurant #${order.restaurantId}`, name:item.name, price:item.unitPrice, quantity:1 }))
    navigate('/checkout')
  }
  const cancel = async () => {
    setBusy(true)
    try { await orderService.cancelOrder(order.id,user?.id ?? 0); setCancelOpen(false); setMessage('Order cancelled.'); await retry() }
    catch(reason) { setMessage(reason instanceof Error ? reason.message : 'Unable to cancel this order.') }
    finally { setBusy(false) }
  }
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); setMessage('Copied to clipboard.') } catch { setMessage(value) } }
  const share = async () => { const url = window.location.href; if (navigator.share) { try { await navigator.share({ title:`Order #${order.id}`, url }) } catch { /* dismissed */ } } else await copy(url) }
  return <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <Link to="/orders" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-brand-red"><ArrowLeft size={16}/> All orders</Link>
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-widest text-brand-red">Order tracking</p><h1 className="mt-1 text-3xl font-bold">Order #{order.id}</h1><p className="mt-2 text-sm text-text-slate">Placed {new Date(order.createdAt).toLocaleString()}</p></div><Badge status={order.status}/></header>
    {message && <p role="status" className="mb-4 rounded-lg bg-brand-yellow/20 p-3 text-sm">{message}</p>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="space-y-5">
      <Card><h2 className="mb-5 text-lg font-semibold">Delivery progress</h2><OrderTimeline status={order.status} history={order.statusHistory}/>{order.estimatedDeliveryAt && order.status !== 'delivered' && order.status !== 'cancelled' && <p className="mt-5 rounded-lg bg-brand-yellow/15 p-3 text-sm">Estimated delivery: <b>{new Date(order.estimatedDeliveryAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</b></p>}</Card>
      <Card><h2 className="mb-4 text-lg font-semibold">Items</h2><div className="space-y-4">{order.items.map(item => <div key={item.menuItemId} className="flex justify-between gap-3 text-sm"><div><p className="font-medium">{item.name}</p><p className="text-xs text-text-slate">Quantity: {item.quantity}</p></div><span>{money(item.unitPrice * item.quantity)}</span></div>)}</div></Card>
      <Card><h2 className="mb-4 text-lg font-semibold">Delivery & payment</h2><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-text-slate">Address</dt><dd className="font-medium">{order.deliveryAddress}</dd></div><div><dt className="text-text-slate">Payment</dt><dd className="font-medium capitalize">{order.paymentMethod}{order.paymentStatus === 'simulated' ? ' (demo)' : ''}</dd></div><div><dt className="text-text-slate">Phone</dt><dd className="font-medium">{order.phone}</dd></div><div><dt className="text-text-slate">Notes</dt><dd className="font-medium">{order.notes || '—'}</dd></div></dl></Card>
    </div><aside className="space-y-4 lg:sticky lg:top-6"><Card><h2 className="mb-4 font-semibold">Payment summary</h2><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-text-slate">Subtotal</span><span>{money(order.subtotal)}</span></div><div className="flex justify-between"><span className="text-text-slate">Delivery</span><span>{money(order.deliveryFee)}</span></div>{order.serviceFee !== undefined && <div className="flex justify-between"><span className="text-text-slate">Service fee</span><span>{money(order.serviceFee)}</span></div>}{order.tax !== undefined && <div className="flex justify-between"><span className="text-text-slate">Tax</span><span>{money(order.tax)}</span></div>}{(order.discount ?? 0) > 0 && <div className="flex justify-between"><span>Discount</span><span>-{money(order.discount ?? 0)}</span></div>}{(order.tip ?? 0) > 0 && <div className="flex justify-between"><span>Tip</span><span>{money(order.tip ?? 0)}</span></div>}<div className="flex justify-between border-t border-border-subtle pt-3 text-lg font-bold"><span>Total</span><span>{money(order.total)}</span></div></div></Card>
      {order.status === 'delivered' && <Card><div className="flex items-center gap-2 font-semibold"><Star className="text-brand-yellow"/> Your meal has arrived!</div><p className="mt-2 text-sm text-text-slate">Review forms are not available in the current repository yet.</p></Card>}
      <Button className="w-full" onClick={reorder}><RefreshCw size={16}/> Reorder these meals</Button>
      {canCancel && <Button variant="danger" className="w-full" onClick={() => setCancelOpen(true)}><XCircle size={16}/> Cancel order</Button>}
      <div className="grid grid-cols-3 gap-2"><Button size="sm" variant="outline" onClick={() => void copy(String(order.id))}><Copy size={14}/>Copy ID</Button><Button size="sm" variant="outline" onClick={() => void share()}><Share2 size={14}/>Share</Button><Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={14}/>Print</Button></div>
    </aside></div>
    <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order"><p className="text-sm text-text-slate">Are you sure you want to cancel order #{order.id}? This action cannot be undone.</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setCancelOpen(false)}>Keep order</Button><Button variant="danger" loading={busy} onClick={() => void cancel()}>Confirm cancellation</Button></div></Modal>
  </section>
}
