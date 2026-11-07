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
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null)
  const movedRef = useRef(false)

  useEffect(() => {
    if (!cart.isCartPromptOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cart.closeCartPrompt()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [cart.isCartPromptOpen, cart.closeCartPrompt])

  useEffect(() => {
    cart.closeCartPrompt()
    setPosition({ x: 0, y: 0 })
  }, [location.pathname, cart.closeCartPrompt])

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragRef.current) return
      const dx = event.clientX - dragRef.current.pointerX
      const dy = event.clientY - dragRef.current.pointerY
      if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true
      setPosition({
        x: Math.max(-window.innerWidth + 300, Math.min(0, dragRef.current.x + dx)),
        y: Math.max(-window.innerHeight + 220, Math.min(0, dragRef.current.y + dy)),
      })
    }
    const stop = () => { dragRef.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
  }, [])

  if (!cart.isCartPromptOpen || cart.totalItems === 0) return null

  return (
    <section
      aria-label={t('Open checkout')}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      className="fixed bottom-5 right-5 z-[70] w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border-subtle bg-surface-white shadow-2xl animate-[profile-fade-up_250ms_ease-out_both] transition-[box-shadow] hover:shadow-2xl"
    >
      <div
        onPointerDown={(event) => {
          event.preventDefault()
          movedRef.current = false
          dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, x: position.x, y: position.y }
        }}
        className="flex cursor-grab items-center justify-between gap-3 border-b border-border-subtle bg-surface-cream px-4 py-2 active:cursor-grabbing"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-text-slate">
          <GripVertical size={16} /> {t('Your order is ready')}
        </span>
        <button
          type="button"
          aria-label={t('Close cart')}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={cart.closeCartPrompt}
          className="inline-flex size-7 items-center justify-center rounded-full text-text-slate hover:bg-brand-red/10 hover:text-brand-red"
        >
          <X size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => navigate('/checkout')}
        className="flex w-full flex-col items-center gap-3 px-5 py-5 text-center transition-colors hover:bg-brand-red/5"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
          <ShoppingCart size={23} />
        </span>
        <span>
          <span className="block font-semibold text-text-main">{t('Your cart ({count})', { count: cart.totalItems })}</span>
          <span className="mt-1 block text-sm text-text-slate">{cart.subtotal.toFixed(2)} · {t('Tap to continue to checkout')}</span>
        </span>
        <span className="w-full rounded-xl bg-brand-red px-4 py-2.5 text-sm font-semibold !text-white">{t('Checkout')}</span>
      </button>
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