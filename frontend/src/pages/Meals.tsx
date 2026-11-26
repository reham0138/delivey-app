
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
import { useCategories } from '../shared/hooks/useCategories'
import { useLanguage } from '../shared/hooks/useLanguage'
import { menuItemService } from '../shared/services/menuItem.service'
import { restaurantService } from '../shared/services/restaurant.service'
import { searchMealsSemantically, SEMANTIC_SEARCH_ENABLED } from '../shared/services/semanticSearch.service'
import { getArabicTranslation } from '../shared/contexts/LanguageContext'
import type { MenuItem, PaginatedResponse, Restaurant } from '../shared/types'

const ITEMS_PER_PAGE = 8
type MealSort = 'popular' | 'rating' | 'price' | 'name'

export default function Meals() {
  const { t } = useLanguage()
  const [meals, setMeals] = useState<MenuItem[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<MenuItem>['meta']>()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<MealSort>('popular')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restaurantsError, setRestaurantsError] = useState('')
  const [cartMessage, setCartMessage] = useState('')
  const categories = useCategories()
  const trimmedSearch = searchTerm.trim()
  const searchKey = `${currentPage}:${selectedRestaurant}:${selectedCategory}:${sortBy}:${trimmedSearch}`
  const [semanticSearch, setSemanticSearch] = useState<{
    key: string
    mealIds: string[] | null
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
      const result = await menuItemService.getAll({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: trimmedSearch || undefined,
        restaurantId: selectedRestaurant === 'all' ? undefined : selectedRestaurant,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        openOnly: true,
        sort: sortBy === 'price' ? 'price_asc' : sortBy,
      })
      setMeals(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('Something went wrong.')
      )
    } finally {
      setLoading(false)
    }
  }, [currentPage, trimmedSearch, selectedRestaurant, selectedCategory, sortBy, t])

  useEffect(() => {
    void fetchMeals()
  }, [fetchMeals])

  const fetchRestaurants = useCallback(async () => {
    try {
      setRestaurantsError('')
      const result = await restaurantService.getAll({
        page: 1,
        limit: 50,
        isOpen: true,
        sort: 'name',
      })
      setRestaurants(result.data)
    } catch (err) {
      setRestaurantsError(err instanceof Error ? err.message : t('Something went wrong.'))
    }
  }, [t])

  useEffect(() => {
    void fetchRestaurants()
  }, [fetchRestaurants])

  useEffect(() => {
    if (!SEMANTIC_SEARCH_ENABLED || !trimmedSearch || meals.length === 0) {
      setSemanticSearch({ key: searchKey, mealIds: [] })
      return
    }

    const controller = new AbortController()

    const timer = window.setTimeout(async () => {
      try {
        const searchItems = meals.map((meal) => ({
          ...meal,
          localizedName: getArabicTranslation(meal.name),
          localizedCategory: getArabicTranslation(meal.category),
        }))

        const results = await searchMealsSemantically(
          trimmedSearch,
          searchItems,
          controller.signal
        )

        setSemanticSearch({
          key: searchKey,
          mealIds: results.map((result) => String(result.item.id)),
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
  }, [trimmedSearch, searchKey, meals])

  const hasSemanticResponse =
    trimmedSearch !== '' && semanticSearch.key === searchKey
  const isSearching = trimmedSearch !== '' && !hasSemanticResponse
  const semanticSearchFailed = hasSemanticResponse && semanticSearch.mealIds === null

  const displayedMeals = useMemo(() => {
    if (!trimmedSearch || semanticSearch.key !== searchKey || !semanticSearch.mealIds) {
      return meals
    }

    const mealsById = new Map(meals.map((meal) => [String(meal.id), meal]))
    const orderedIds = semanticSearch.mealIds.map(String)
    const ordered = orderedIds
      .map((id) => mealsById.get(id))
      .filter((meal): meal is MenuItem => meal !== undefined)
    const included = new Set(ordered.map((meal) => String(meal.id)))
    return [...ordered, ...meals.filter((meal) => !included.has(String(meal.id)))]
  }, [meals, trimmedSearch, searchKey, semanticSearch])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedRestaurant, selectedCategory, sortBy])

  const getRestaurantName = (restaurantId: string) => {
    return (
      restaurants.find((restaurant) => restaurant.id === restaurantId)?.name ??
      t('Unknown restaurant')
    )
  }

  const handleAddToCart = (meal: MenuItem) => {
    const restaurantName = getRestaurantName(meal.restaurantId)
    const restaurant = restaurants.find((item) => item.id === meal.restaurantId)
    if (!meal.isAvailable || !restaurant?.isActive || !restaurant.isOpen) {
      setCartMessage(t('This meal is currently unavailable.'))
      return
    }

    setCartMessage('')
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
    setSelectedCategory('all')
    setSortBy('popular')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface-cream">
        <Spinner size="lg" label={t('Loading meals...')} />
      </div>
    )
  }

  if (error || restaurantsError || categories.error) {
    return (
      <div className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title={t('Unable to load meals')}
            description={t(error || restaurantsError || categories.error)}
            action={
              <Button onClick={() => void Promise.all([fetchMeals(), fetchRestaurants(), categories.refetch()])}>
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



        <section className="grid gap-4 rounded-xl border border-border-subtle bg-surface-white p-4 sm:grid-cols-2 lg:grid-cols-4">
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

            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {t(restaurant.name)}
              </option>
            ))}
          </Select>
          <Select
            label={t('Meal category')}
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
          >
            <option value="all">{t('All categories')}</option>
            {categories.data.map((category) => (
              <option key={category.id} value={category.name}>{t(category.name)}</option>
            ))}
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
                : `${meta?.total ?? 0} ${t('meals found')}`}
            </span>
          </div>

          {cartMessage && (
            <p role="alert" className="text-sm text-brand-red">{cartMessage}</p>
          )}

          {displayedMeals.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayedMeals.map((meal) => (
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
                    detailsTo={`/meals/${meal.id}`}
                    onOrder={() => handleAddToCart(meal)}
                  />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={meta?.total_pages ?? 1}
                onPageChange={setCurrentPage}
              />

              <p className="text-center text-sm text-text-slate">
                {t('Showing')}{' '}
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                {' - '}
                {Math.min(currentPage * ITEMS_PER_PAGE, meta?.total ?? 0)}
                {' '}{t('of')}{' '}
                {meta?.total ?? 0} {t('meals found')}
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
