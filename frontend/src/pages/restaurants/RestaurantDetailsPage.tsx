import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, MapPin, Store } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Button } from '../../shared/components/Button'
import { Pagination } from '../../shared/components/Pagination'
import { EmptyState } from '../../shared/components/EmptyState'
import { Input } from '../../shared/components/Input'
import MealCard from '../../shared/components/MealCard'
import { Rating } from '../../shared/components/Rating'
import { RestaurantImage } from '../../shared/components/RestaurantImage'
import { Select } from '../../shared/components/Select'
import { Spinner } from '../../shared/components/Spinner'
import { useCart } from '../../shared/hooks/useCart'
import { useRestaurant } from '../../shared/hooks/useRestaurants'
import type { MenuItem } from '../../shared/types'
import { useLanguage } from '../../shared/hooks/useLanguage'

const ITEMS_PER_PAGE = 8

type MealSort = 'popular' | 'rating' | 'price' | 'name'

export default function RestaurantDetailsPage() {
  const { t, direction } = useLanguage()
  const { id } = useParams()
  const restaurantId = id && /^\d+$/.test(id) ? Number(id) : null
  const { data, loading, error, refetch } = useRestaurant(restaurantId)
  const { addToCart, showCartPrompt } = useCart()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<MealSort>('popular')
  const [currentPage, setCurrentPage] = useState(1)
  const [cartMessage, setCartMessage] = useState('')

  const restaurant = data.restaurant
  const categories = useMemo(
    () => [...new Set(data.meals.map((meal) => meal.category))].sort(),
    [data.meals],
  )

  const filteredMeals = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase()

    return data.meals
      .filter((meal) => {
        const matchesName = meal.name.toLocaleLowerCase().includes(query)
        const matchesCategory =
          selectedCategory === 'all' || meal.category === selectedCategory
        return matchesName && matchesCategory
      })
      .sort((first, second) => {
        if (sortBy === 'rating') return second.rating - first.rating
        if (sortBy === 'price') return first.price - second.price
        if (sortBy === 'name') return first.name.localeCompare(second.name)
        return Number(second.isPopular) - Number(first.isPopular)
      })
  }, [data.meals, searchTerm, selectedCategory, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, sortBy])

  const totalPages = Math.ceil(filteredMeals.length / ITEMS_PER_PAGE)
  const paginatedMeals = filteredMeals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const handleAddToCart = (meal: MenuItem) => {
    setCartMessage('')

    if (!restaurant?.isOpen) {
      setCartMessage(t('This restaurant is currently closed. Please try again later.'))
      return
    }

    addToCart({
      menuItemId: meal.id,
      restaurantId: meal.restaurantId,
      restaurantName: restaurant.name,
      name: meal.name,
      price: meal.price,
      image: meal.image,
      quantity: 1,
    })
    setCartMessage('')
    showCartPrompt()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setSortBy('popular')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface-cream">
        <Spinner size="lg" label={t('Loading restaurant...')} />
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title={t('Unable to load restaurant')}
            description={error}
            action={<Button onClick={() => void refetch()}>{t('Try again')}</Button>}
          />
        </div>
      </main>
    )
  }

  if (!restaurant) {
    return (
      <main className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title={t('Restaurant not found')}
            description={t('This restaurant may no longer be available.')}
            action={<Link className="font-semibold text-brand-red underline" to="/restaurants">{t('Back to restaurants')}</Link>}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Link
          to="/restaurants"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-slate transition-colors hover:text-brand-red"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          {t('Back to restaurants')}
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-white">
          <div className="relative h-52 bg-surface-cream sm:h-72">
            <RestaurantImage
              restaurant={restaurant}
              alt={`${restaurant.name} restaurant cover`}
              className="h-full w-full object-cover"
            />
            <span
              className={`absolute end-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${
                restaurant.isOpen
                  ? 'border border-green-600/20 bg-green-600/10 text-green-700'
                  : 'border border-border-subtle bg-surface-white/95 text-text-slate'
              }`}
            >
              {restaurant.isOpen ? t('Open now') : t('Closed')}
            </span>
          </div>

          <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-brand-red">
                <Store aria-hidden="true" size={17} />
                {t(restaurant.cuisine)}
              </div>
              <h1 className="text-3xl font-bold text-text-main sm:text-4xl">{t(restaurant.name)}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-slate">
                <span className="inline-flex items-center gap-2">
                  <Rating value={restaurant.rating} />
                  <span>{restaurant.reviewsCount ?? 0} {t('reviews')}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 aria-hidden="true" size={16} />
                  {restaurant.deliveryTimeMinutes} {t('min')} {t('delivery')}
                </span>
                {restaurant.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" size={16} />
                    {restaurant.address}
                  </span>
                )}
              </div>
              {restaurant.openingHours && (
                <p className="text-sm text-text-slate">{t('Opening hours')}: {restaurant.openingHours}</p>
              )}
            </div>
            <div className="rounded-xl bg-surface-cream px-5 py-3 text-start">
              <p className="text-xs text-text-slate">{t('Delivery fee')}</p>
              <p className="text-xl font-bold text-brand-red">${restaurant.deliveryFee.toFixed(2)}</p>
              <p className="mt-1 text-xs text-text-slate">{t('Minimum order')} ${restaurant.minOrder.toFixed(2)}</p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-text-main">{t('Menu')}</h2>
              <p className="mt-1 text-sm text-text-slate">{t('Explore what {name} has to offer.', { name: t(restaurant.name) })}</p>
            </div>
            <span className="text-sm text-text-slate">{filteredMeals.length} {t('meals found')}</span>
          </div>

          {cartMessage && (
            <div
              role="alert"
              className="fixed bottom-5 left-5 z-[60] max-w-[min(380px,calc(100vw-2rem))] rounded-xl border border-brand-red/30 bg-surface-white p-4 text-sm text-brand-red shadow-xl"
            >
              {cartMessage}
            </div>
          )}

          <div className="grid gap-4 rounded-xl border border-border-subtle bg-surface-white p-4 sm:grid-cols-3">
            <Input
              label={t('Search meals')}
              type="search"
              placeholder={t('Search this menu...')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <Select
              label={t('Meal category')}
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">{t('All categories')}</option>
              {categories.map((category) => <option key={category} value={category}>{t(category)}</option>)}
            </Select>
            <Select
              label={t('Sort meals')}
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as MealSort)}
            >
              <option value="popular">{t('Popular first')}</option>
              <option value="rating">{t('Top rated')}</option>
              <option value="price">{t('Price: low to high')}</option>
              <option value="name">{t('Name (A–Z)')}</option>
            </Select>
          </div>

          {filteredMeals.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    name={meal.name}
                    description={meal.description}
                    price={meal.price}
                    image={meal.image}
                    category={meal.category}
                    rating={meal.rating}
                    reviewsCount={meal.reviewsCount}
                    preparationTimeMinutes={meal.preparationTimeMinutes}
                    restaurantName={restaurant.name}
                    isPopular={meal.isPopular}
                    onOrder={() => handleAddToCart(meal)}
                  />
                ))}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </>
          ) : (
            <EmptyState
              title={t(data.meals.length === 0 ? 'No meals yet' : 'No meals found')}
              description={t(data.meals.length === 0 ? 'This restaurant has not added any meals to its menu yet.' : 'Try changing your search or category filter.')}
              action={data.meals.length === 0 ? undefined : <Button variant="outline" onClick={clearFilters}>{t('Clear filters')}</Button>}
            />
          )}
        </section>
      </div>
    </main>
  )
}
