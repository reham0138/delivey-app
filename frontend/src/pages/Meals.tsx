
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
import { searchMealsSemantically } from '../shared/services/semanticSearch.service'

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
  // mealIds is null when the semantic search API could not be reached
  const [semanticSearch, setSemanticSearch] = useState<{
    key: string
    mealIds: number[] | null
  }>({ key: '', mealIds: null })

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

  const trimmedSearch = searchTerm.trim()
  const searchKey = `${selectedRestaurant}:${trimmedSearch}`

  const restaurantMeals = useMemo(
    () =>
      availableMeals.filter(
        (meal) =>
          selectedRestaurant === 'all' ||
          meal.restaurantId === Number(selectedRestaurant)
      ),
    [availableMeals, selectedRestaurant]
  )

  useEffect(() => {
    if (!trimmedSearch) return

    const controller = new AbortController()

    const timer = window.setTimeout(async () => {
      try {
        const searchItems = restaurantMeals.map((meal) => ({
          ...meal,
          localizedName: t(meal.name) !== meal.name ? t(meal.name) : undefined,
          localizedCategory:
            t(meal.category) !== meal.category ? t(meal.category) : undefined,
        }))

        const results = await searchMealsSemantically(
          trimmedSearch,
          searchItems,
          controller.signal
        )

        setSemanticSearch({
          key: searchKey,
          mealIds: results.map((result) => result.item.id),
        })
      } catch (err) {
        if (controller.signal.aborted) return

        console.error('Semantic meal search failed:', err)
        setSemanticSearch({ key: searchKey, mealIds: null })
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [trimmedSearch, searchKey, restaurantMeals, t])

  const hasSemanticResponse =
    trimmedSearch !== '' && semanticSearch.key === searchKey
  const isSearching = trimmedSearch !== '' && !hasSemanticResponse
  const semanticSearchFailed =
    hasSemanticResponse && semanticSearch.mealIds === null

  // Name matches come first; semantic matches follow once the API responds
  const filteredMeals = useMemo(() => {
    if (!trimmedSearch) return restaurantMeals

    const term = trimmedSearch.toLowerCase()
    const nameMatches = restaurantMeals.filter(
      (meal) =>
        meal.name.toLowerCase().includes(term) ||
        t(meal.name).toLowerCase().includes(term)
    )

    if (semanticSearch.key !== searchKey || !semanticSearch.mealIds) {
      return nameMatches
    }

    const nameMatchIds = new Set(nameMatches.map((meal) => meal.id))
    const mealsById = new Map(restaurantMeals.map((meal) => [meal.id, meal]))

    const semanticMatches = semanticSearch.mealIds
      .filter((id) => !nameMatchIds.has(id))
      .map((id) => mealsById.get(id))
      .filter((meal): meal is MenuItem => meal !== undefined)

    return [...nameMatches, ...semanticMatches]
  }, [restaurantMeals, trimmedSearch, searchKey, semanticSearch, t])

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
          placeholder={t('Search by name, ingredient, or craving...')}
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

          {semanticSearchFailed && (
            <p className="text-sm text-brand-red sm:col-span-2">
              {t('Smart search is unavailable. Showing name matches instead.')}
            </p>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-text-main">
              {t('Available Meals')}
            </h2>

            <span className="text-sm text-text-slate">
              {isSearching
                ? t('Searching...')
                : `${filteredMeals.length} ${t('meals found')}`}
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
