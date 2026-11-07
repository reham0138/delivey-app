
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Utensils, ShoppingCart } from 'lucide-react'

import MealCard from '../shared/components/MealCard'
import { Input } from '../shared/components/Input'
import { Select } from '../shared/components/Select'
import { EmptyState } from '../shared/components/EmptyState'
import { Spinner } from '../shared/components/Spinner'
import { Button } from '../shared/components/Button'
import { Pagination } from '../shared/components/Pagination'
import { useCart } from '../shared/hooks/useCart'
import { useLanguage } from '../shared/hooks/useLanguage'

interface MenuItem {
  id: number
  restaurantId: number
  name: string
  description: string
  price: number
  category: string
  image?: string | null
  isAvailable: boolean
  preparationTimeMinutes: number
  rating: number
  reviewsCount: number
  isPopular: boolean
}

interface Restaurant {
  id: number
  name: string
  isOpen: boolean
  isActive: boolean
}

const ITEMS_PER_PAGE = 8

export default function Meals() {
  const { t } = useLanguage()
  const [meals, setMeals] = useState<MenuItem[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const {
    addToCart,
    totalItems,
    showCartPrompt,
  } = useCart()

  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [mealsResponse, restaurantsResponse] = await Promise.all([
        fetch('/mock/menu-items.json'),
        fetch('/mock/restaurants.json'),
      ])

      if (!mealsResponse.ok || !restaurantsResponse.ok) {
        throw new Error(t('Failed to load meals data.'))
      }

      const [mealsData, restaurantsData] = await Promise.all([
        mealsResponse.json() as Promise<MenuItem[]>,
        restaurantsResponse.json() as Promise<Restaurant[]>,
      ])

      setMeals(mealsData)
      setRestaurants(restaurantsData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('Something went wrong.')
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  const availableMeals = useMemo(() => {
    const availableRestaurantIds = new Set(
      restaurants
        .filter((restaurant) => restaurant.isActive && restaurant.isOpen)
        .map((restaurant) => restaurant.id)
    )

    return meals.filter(
      (meal) =>
        meal.isAvailable &&
        availableRestaurantIds.has(meal.restaurantId)
    )
  }, [meals, restaurants])

  const availableRestaurants = useMemo(() => {
    const restaurantIds = new Set(
      availableMeals.map((meal) => meal.restaurantId)
    )

    return restaurants.filter((restaurant) =>
      restaurantIds.has(restaurant.id)
    )
  }, [availableMeals, restaurants])

  const filteredMeals = useMemo(() => {
    return availableMeals.filter((meal) => {
      const matchesName = meal.name
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase())

      const matchesRestaurant =
        selectedRestaurant === 'all' ||
        meal.restaurantId === Number(selectedRestaurant)

      return matchesName && matchesRestaurant
    })
  }, [availableMeals, searchTerm, selectedRestaurant])

  // Reset to the first page whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRestaurant])

  // Calculate pagination values
  const totalPages = Math.ceil(filteredMeals.length / ITEMS_PER_PAGE)

  const paginatedMeals = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE

    return filteredMeals.slice(startIndex, endIndex)
  }, [filteredMeals, currentPage])

  const getRestaurantName = (restaurantId: number) => {
    return (
      restaurants.find((restaurant) => restaurant.id === restaurantId)?.name ??
      t('Unknown restaurant')
    )
  }

  const handleAddToCart = (meal: MenuItem) => {
    const restaurantName = getRestaurantName(meal.restaurantId)

    addToCart({
      menuItemId: meal.id,
      restaurantId: meal.restaurantId,
      restaurantName,
      name: meal.name,
      price: meal.price,
      image: meal.image,
      quantity: 1,
    })
    showCartPrompt()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedRestaurant('all')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface-cream">
        <Spinner size="lg" label={t('Loading meals...')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title={t('Unable to load meals')}
            description={t(error)}
            action={
              <Button onClick={fetchMeals}>
                {t('Try again')}
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-surface-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <Utensils size={25} />
            </span>

            <div>
              <h1 className="text-2xl font-bold text-text-main sm:text-3xl">
                {t('Explore Meals')}
              </h1>

              <p className="mt-1 text-sm text-text-slate">
                {t('Find your favorite meals from our restaurants.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm font-medium text-text-main">
            <ShoppingCart size={20} className="text-brand-red" />
            <span>{totalItems} {t('items in cart')}</span>
          </div>
        </section>



        <section className="grid gap-4 rounded-xl border border-border-subtle bg-surface-white p-4 sm:grid-cols-2">
          <Input
          label={t('Search meals')}
          placeholder={t('Search by meal name...')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <Select
            label={t('Filter by restaurant')}
            value={selectedRestaurant}
            onChange={(event) => setSelectedRestaurant(event.target.value)}
          >
            <option value="all">{t('All restaurants')}</option>

            {availableRestaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {t(restaurant.name)}
              </option>
            ))}
          </Select>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-text-main">
              {t('Available Meals')}
            </h2>

            <span className="text-sm text-text-slate">
              {filteredMeals.length} {t('meals found')}
            </span>
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
                    restaurantName={getRestaurantName(meal.restaurantId)}
                    isPopular={meal.isPopular}
                    onOrder={() => handleAddToCart(meal)}
                  />
                ))}
              </div>

              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

              <p className="text-center text-sm text-text-slate">
                {t('Showing')}{' '}
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                {' - '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredMeals.length)}
                {' '}{t('of')}{' '}
                {filteredMeals.length} {t('meals found')}
              </p>
            </>
          ) : (
            <EmptyState
              title={t('No meals found')}
              description={t('Try changing your search or selecting another restaurant.')}
              action={
                <Button variant="outline" onClick={clearFilters}>
                  {t('Clear filters')}
                </Button>
              }
            />
          )}
        </section>

      </div>
    </main>
  )
}
