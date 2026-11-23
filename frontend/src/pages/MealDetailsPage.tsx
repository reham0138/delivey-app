import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Clock3,
  MapPin,
  Minus,
  Plus,
  ShoppingCart,
  Store,
  Utensils,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '../shared/components/Button'
import { Card } from '../shared/components/Card'
import { EmptyState } from '../shared/components/EmptyState'
import { Rating } from '../shared/components/Rating'
import { ReviewList } from '../shared/components/ReviewList'
import { Spinner } from '../shared/components/Spinner'
import { useCart } from '../shared/hooks/useCart'
import { useLanguage } from '../shared/hooks/useLanguage'
import { useMealReviews } from '../shared/hooks/useMealReviews'
import { useMeal } from '../shared/hooks/useRestaurants'

export default function MealDetailsPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const mealId = id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null
  const { data, loading, error, refetch } = useMeal(mealId)
  const {
    reviews,
    isLoading: reviewsLoading,
    error: reviewsError,
    reload: reloadReviews,
  } = useMealReviews(mealId)
  const { addToCart, showCartPrompt } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [cartMessage, setCartMessage] = useState('')

  const meal = data.meal
  const restaurant = data.restaurant

  useEffect(() => {
    setQuantity(1)
    setCartMessage('')
  }, [mealId])

  const averageRating = useMemo(
    () =>
      reviews.length
        ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
        : 0,
    [reviews],
  )
  const canOrder = Boolean(
    meal?.isAvailable && restaurant?.isActive && restaurant.isOpen,
  )

  const handleAddToCart = () => {
    if (!meal || !restaurant) return

    setCartMessage('')
    if (!canOrder) {
      setCartMessage(t('This meal is currently unavailable.'))
      return
    }

    addToCart({
      menuItemId: meal.id,
      restaurantId: meal.restaurantId,
      restaurantName: restaurant.name,
      name: meal.name,
      price: meal.price,
      image: meal.image,
      quantity,
    })
    showCartPrompt()
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface-cream">
        <Spinner size="lg" label={t('Loading meal...')} />
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title={t('Unable to load meal')}
            description={t(error)}
            action={<Button onClick={() => void refetch()}>{t('Try again')}</Button>}
          />
        </div>
      </main>
    )
  }

  if (!meal) {
    return (
      <main className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title={t('Meal not found')}
            description={t('This meal may no longer be available.')}
            action={
              <Link className="font-semibold text-brand-red underline" to="/meals">
                {t('Back to meals')}
              </Link>
            }
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link
          to="/meals"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-slate transition-colors hover:text-brand-red"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          {t('Back to meals')}
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-white">
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="relative aspect-[4/3] bg-surface-cream md:aspect-auto md:min-h-[340px]">
              {meal.image ? (
                <img
                  src={meal.image}
                  alt={t(meal.name)}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-text-slate">
                  <Utensils size={48} />
                </div>
              )}

              <div className="absolute start-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-yellow px-3 py-1 text-xs font-semibold text-text-main">
                  {t(meal.category)}
                </span>
                {meal.isPopular && (
                  <span className="rounded-full bg-brand-red px-3 py-1 text-xs font-semibold text-white">
                    {t('Popular')}
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    meal.isAvailable
                      ? 'border border-green-600/20 bg-green-600/10 text-green-700'
                      : 'border border-border-subtle bg-surface-white/95 text-text-slate'
                  }`}
                >
                  {meal.isAvailable ? t('Available') : t('Unavailable')}
                </span>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div>
                <h1 className="text-3xl font-bold text-text-main sm:text-4xl">
                  {t(meal.name)}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-slate">
                  {restaurant ? (
                    <Link
                      to={`/restaurants/${restaurant.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-brand-red hover:underline"
                    >
                      <Store aria-hidden="true" size={16} />
                      {t(restaurant.name)}
                    </Link>
                  ) : (
                    <span>{t('Unknown restaurant')}</span>
                  )}
                  {restaurant && (
                    <span
                      className={
                        restaurant.isOpen
                          ? 'font-medium text-green-700'
                          : 'font-medium text-text-slate'
                      }
                    >
                      {restaurant.isOpen ? t('Open now') : t('Closed')}
                    </span>
                  )}
                  {restaurant && !restaurant.isActive && (
                    <span className="font-medium text-brand-red">
                      {t('Unavailable')}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm leading-6 text-text-slate">{t(meal.description)}</p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-slate">
                <span className="inline-flex items-center gap-2">
                  {averageRating > 0 ? (
                    <Rating value={Number(averageRating.toFixed(1))} />
                  ) : (
                    <span>{t('No ratings yet')}</span>
                  )}
                  <span>
                    {reviews.length} {t('reviews')}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 aria-hidden="true" size={16} />
                  {meal.preparationTimeMinutes} {t('min')}
                </span>
                <span className="text-lg font-bold text-brand-red">
                  ${meal.price.toFixed(2)}
                </span>
              </div>

              {cartMessage && (
                <p
                  role="alert"
                  className="rounded-lg border border-brand-red/30 bg-brand-red/5 px-3 py-2 text-sm text-brand-red"
                >
                  {cartMessage}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-xl border border-border-subtle">
                  <button
                    type="button"
                    aria-label={t('Decrease quantity of {name}', {
                      name: t(meal.name),
                    })}
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    className="flex size-10 items-center justify-center rounded-s-xl text-text-main transition-colors hover:bg-surface-cream disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus aria-hidden="true" size={16} />
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-10 text-center text-sm font-semibold text-text-main"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={t('Increase quantity of {name}', {
                      name: t(meal.name),
                    })}
                    onClick={() => setQuantity((current) => current + 1)}
                    className="flex size-10 items-center justify-center rounded-e-xl text-text-main transition-colors hover:bg-surface-cream"
                  >
                    <Plus aria-hidden="true" size={16} />
                  </button>
                </div>

                <Button variant="primary" onClick={handleAddToCart} disabled={!canOrder}>
                  <ShoppingCart size={18} />
                  {t('Add to cart')}
                </Button>
              </div>

              {!canOrder && (
                <p className="text-sm text-text-slate">
                  {t('This meal is currently unavailable.')}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Card className="space-y-5">
            <h2 className="text-xl font-bold text-text-main">{t('Meal details')}</h2>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-text-slate">{t('Availability')}</span>
                <span className="font-semibold text-text-main">
                  {meal.isAvailable ? t('Available') : t('Unavailable')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-text-slate">{t('Category')}</span>
                <span className="font-semibold text-text-main">{t(meal.category)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-text-slate">{t('Preparation time')}</span>
                <span className="font-semibold text-text-main">
                  {meal.preparationTimeMinutes} {t('min')}
                </span>
              </div>
            </div>

            {meal.ingredients.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-main">{t('Ingredients')}</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {meal.ingredients.map((ingredient) => (
                    <li
                      key={ingredient}
                      className="rounded-full bg-surface-cream px-3 py-1 text-xs text-text-main"
                    >
                      {t(ingredient)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meal.nutrition && (
              <div>
                <h3 className="text-sm font-semibold text-text-main">{t('Nutrition')}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-text-slate">{t('Calories')}</p>
                    <p className="font-semibold text-text-main">{meal.nutrition.calories}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-slate">{t('Protein')}</p>
                    <p className="font-semibold text-text-main">{meal.nutrition.protein}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-slate">{t('Carbs')}</p>
                    <p className="font-semibold text-text-main">{meal.nutrition.carbs}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-slate">{t('Fat')}</p>
                    <p className="font-semibold text-text-main">{meal.nutrition.fat}g</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xl font-bold text-text-main">{t('Restaurant')}</h2>
            {restaurant ? (
              <div className="space-y-3 text-sm">
                <Link
                  to={`/restaurants/${restaurant.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-brand-red hover:underline"
                >
                  <Store aria-hidden="true" size={16} />
                  {t(restaurant.name)}
                </Link>
                <p className="text-text-slate">{t(restaurant.cuisine)}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-text-slate">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 aria-hidden="true" size={15} />
                    {restaurant.deliveryTimeMinutes} {t('min')} {t('delivery')}
                  </span>
                  <span>{t('Delivery fee')} ${restaurant.deliveryFee.toFixed(2)}</span>
                </div>
                {restaurant.address && (
                  <p className="inline-flex items-center gap-1 text-text-slate">
                    <MapPin aria-hidden="true" size={15} />
                    {restaurant.address}
                  </p>
                )}
                {restaurant.openingHours && (
                  <p className="text-text-slate">
                    {t('Opening hours')}: {restaurant.openingHours}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-slate">{t('Unknown restaurant')}</p>
            )}
          </Card>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-text-main">{t('Customer Reviews')}</h2>
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner label={t('Loading reviews...')} />
            </div>
          ) : reviewsError ? (
            <EmptyState
              title={t("We couldn't load reviews")}
              description={t(reviewsError)}
              action={<Button onClick={() => void reloadReviews()}>{t('Try again')}</Button>}
            />
          ) : (
            <ReviewList reviews={reviews} />
          )}
        </section>
      </div>
    </main>
  )
}
