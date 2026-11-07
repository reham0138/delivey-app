
import { Clock3, ShoppingCart, Utensils } from 'lucide-react'

import { Card } from './Card'
import { Rating } from './Rating'
import { Button } from './Button'
import { useLanguage } from '../hooks/useLanguage'

interface MealCardProps {
  name: string
  description: string
  price: number
  image?: string | null
  category: string
  rating: number
  reviewsCount: number
  preparationTimeMinutes: number
  restaurantName: string
  isPopular: boolean
  onOrder: () => void
}

export default function MealCard({
  name,
  description,
  price,
  image,
  category,
  rating,
  reviewsCount,
  preparationTimeMinutes,
  restaurantName,
  isPopular,
  onOrder,
}: MealCardProps) {
  const { t } = useLanguage()

  return (
    <Card
      padding="none"
      className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-cream">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-slate">
            <Utensils size={40} />
          </div>
        )}

        {isPopular && (
          <span className="absolute start-3 top-3 rounded-full bg-brand-yellow px-3 py-1 text-xs font-semibold text-text-main">
            {t('Popular')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-main">{t(name)}</h3>

          <span className="shrink-0 font-bold text-brand-red">
            ${price.toFixed(2)}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-text-slate">
          {t(description)}
        </p>

        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-brand-yellow/20 px-2 py-1 text-xs text-text-main">
            {t(category)}
          </span>

          <div className="flex items-center gap-1 text-xs text-text-slate">
            <Clock3 size={14} />
            {preparationTimeMinutes} {t('min')}
          </div>
        </div>

        <div className="mt-auto border-t border-border-subtle pt-3">
          <p className="mb-2 text-sm font-medium text-text-main">
            {t(restaurantName)}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {rating > 0 ? (
              <Rating value={rating} />
            ) : (
              <span className="text-xs text-text-slate">
                {t('No ratings yet')}
              </span>
            )}

            <span className="text-xs text-text-slate">
              {reviewsCount} {t('reviews')}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          className="mt-2 w-full"
          onClick={onOrder}
        >
          <ShoppingCart size={18} />
          {t('Order')}
        </Button>
      </div>
    </Card>
  )
}
