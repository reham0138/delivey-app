import { X, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './Button'
import { useCart } from '../hooks/useCart'
import { useLanguage } from '../hooks/useLanguage'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { t } = useLanguage()
  const cart = useCart()

  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label={t('Close cart')}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/45"
      />
      <aside
        aria-label={t('Your cart ({count})', { count: cart.totalItems })}
        className="fixed inset-y-0 end-0 z-50 flex w-[min(92vw,420px)] flex-col border-s border-border-subtle bg-surface-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="font-semibold text-text-main">
            {t('Your cart ({count})', { count: cart.totalItems })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close cart')}
            className="inline-flex size-9 items-center justify-center rounded-full text-text-main hover:bg-brand-yellow/20"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-text-slate">{t('Your cart is empty')}</p>
            <Link
              to="/meals"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-red px-4 py-2 text-sm font-medium !text-white transition-colors hover:bg-brand-red-hover"
            >
              {t('Browse meals')}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {cart.items.map((item) => (
                <div key={`${item.restaurantId}-${item.menuItemId}`} className="rounded-xl border border-border-subtle p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-main">{t(item.name)}</p>
                      <p className="mt-1 text-sm text-text-slate">
                        {item.price.toFixed(2)} {t('each')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cart.removeFromCart(item.restaurantId, item.menuItemId)}
                      aria-label={`${t('Remove')} ${t(item.name)}`}
                      className="text-text-slate hover:text-brand-red"
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cart.updateQuantity(item.restaurantId, item.menuItemId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label={`${t('Decrease')} ${t(item.name)}`}
                        className="inline-flex size-8 items-center justify-center rounded-full border border-border-subtle disabled:opacity-40"
                      >
                        <Minus aria-hidden="true" size={14} />
                      </button>
                      <span className="w-6 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => cart.updateQuantity(item.restaurantId, item.menuItemId, item.quantity + 1)}
                        aria-label={`${t('Increase')} ${t(item.name)}`}
                        className="inline-flex size-8 items-center justify-center rounded-full border border-border-subtle"
                      >
                        <Plus aria-hidden="true" size={14} />
                      </button>
                    </div>
                    <span className="font-semibold text-text-main">
                      {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-border-subtle p-4">
              <div className="flex justify-between font-semibold text-text-main">
                <span>{t('Subtotal')}</span>
                <span>{cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-brand-red px-4 py-2 text-sm font-medium !text-white transition-colors hover:bg-brand-red-hover"
                >
                  {t('Proceed to checkout')}
                </Link>
                <Button variant="secondary" onClick={cart.clearCart}>
                  {t('Clear cart')}
                </Button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}