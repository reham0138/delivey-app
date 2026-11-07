import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ShoppingCart, X, GripVertical } from 'lucide-react'
import { useCart } from '../hooks/useCart'
import { useLanguage } from '../hooks/useLanguage'

import Footer from '../components/Footer'
import NavBar from '../components/NavBar'

function FloatingCartPrompt() {
  const { t } = useLanguage()
  const cart = useCart()
  const location = useLocation()
  const navigate = useNavigate()
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null)
  const movedRef = useRef(false)

  useEffect(() => {
    if (!cart.isCartPromptOpen) return
    if (!position) {
      setPosition({
        x: Math.max(8, window.innerWidth - 300),
        y: Math.max(8, window.innerHeight - 270),
      })
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cart.closeCartPrompt()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [cart.isCartPromptOpen, cart.closeCartPrompt, position])

  useEffect(() => {
    cart.closeCartPrompt()
    setPosition(null)
  }, [location.pathname, cart.closeCartPrompt])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragRef.current) return
      const dx = event.clientX - dragRef.current.pointerX
      const dy = event.clientY - dragRef.current.pointerY
      if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true
      setPosition({
        x: Math.max(8, Math.min(window.innerWidth - 288, dragRef.current.x + dx)),
        y: Math.max(8, Math.min(window.innerHeight - 270, dragRef.current.y + dy)),
      })
    }
    const stop = () => { dragRef.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  if (!cart.isCartPromptOpen || cart.totalItems === 0) return null

  return (
    <section
      aria-label={t('Open checkout')}
      onClick={() => {
        if (movedRef.current) {
          movedRef.current = false
          return
        }
        navigate('/checkout')
      }}
      style={position
        ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' }
        : { right: 20, bottom: 20 }}
      className="fixed bottom-5 right-5 z-[70] cursor-pointer w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border-subtle bg-surface-white shadow-2xl animate-[profile-fade-up_250ms_ease-out_both] transition-[box-shadow] hover:shadow-2xl"
    >
      <div
        onPointerDown={(event) => {
          event.preventDefault()
          movedRef.current = false
          dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: position?.x ?? Math.max(8, window.innerWidth - 300), y: position?.y ?? Math.max(8, window.innerHeight - 270) }
        }}
        className="flex touch-none select-none cursor-grab items-center justify-between gap-3 border-b border-border-subtle bg-surface-cream px-4 py-2 active:cursor-grabbing"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-text-slate">
          <GripVertical size={16} /> {t('Your order is ready')}
        </span>
        <button
          type="button"
          aria-label={t('Close cart')}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => { event.stopPropagation(); cart.closeCartPrompt() }}
          className="inline-flex size-7 items-center justify-center rounded-full text-text-slate hover:bg-brand-red/10 hover:text-brand-red"
        >
          <X size={16} />
        </button>
      </div>
      <div className="px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-text-main">
            <ShoppingCart size={17} className="text-brand-red" />
            {t('Your cart ({count})', { count: cart.totalItems })}
          </span>
          <span className="text-sm font-bold text-brand-red">{cart.subtotal.toFixed(2)}</span>
        </div>
        <div className="max-h-24 space-y-2 overflow-y-auto">
          {cart.items.map((item) => (
            <div key={`${item.restaurantId}-${item.menuItemId}`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-surface-cream px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-text-slate">{t(item.restaurantName)}</p>
                <p className="truncate text-xs font-semibold text-text-main">{t(item.name)}</p>
                <p className="text-[11px] text-text-slate">{item.quantity} × {item.price.toFixed(2)}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-text-main">{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate('/checkout')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold !text-white transition-colors hover:bg-brand-red/90"
        >
          {t('Checkout')} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}

export default function MainLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavBar />
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <FloatingCartPrompt />
      <Footer />
    </div>
  )
}