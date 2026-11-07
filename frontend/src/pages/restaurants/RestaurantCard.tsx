import { Clock3, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Card } from '../../shared/components/Card'
import { Rating } from '../../shared/components/Rating'
import { RestaurantImage } from '../../shared/components/RestaurantImage'
import type { Restaurant } from '../../shared/types'
import { useLanguage } from '../../shared/hooks/useLanguage'

interface RestaurantCardProps {
  restaurant: Restaurant
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { t } = useLanguage()

  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      aria-label={t('View {name} restaurant', { name: t(restaurant.name) })}
      className="group block h-full rounded-xl focus-visible:outline-offset-4"
    >
      <Card
        padding="none"
        className="flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-cream">
          <RestaurantImage
            restaurant={restaurant}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span
            className={`absolute end-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
              restaurant.isOpen
                ? 'border border-green-600/20 bg-green-600/10 text-green-700'
                : 'border border-border-subtle bg-surface-white/95 text-text-slate'
            }`}
          >
            {restaurant.isOpen ? t('Open now') : t('Closed')}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h2 className="truncate text-lg font-semibold text-text-main group-hover:text-brand-red">
              {restaurant.name}
            </h2>
            <p className="mt-1 text-sm text-text-slate">{t(restaurant.cuisine)}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <Rating value={restaurant.rating} />
              <span className="text-xs text-text-slate">
                ({restaurant.reviewsCount ?? 0})
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-sm text-text-slate">
              <Clock3 aria-hidden="true" size={15} />
              {restaurant.deliveryTimeMinutes} {t('min')}
            </span>
          </div>

          <p className="mt-auto flex items-center gap-1 truncate text-xs text-text-slate">
            <MapPin aria-hidden="true" size={14} />
            {restaurant.address}
          </p>
        </div>
      </Card>
    </Link>
  )
}
