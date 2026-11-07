import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, Store } from 'lucide-react'

import { Button } from '../../shared/components/Button'
import { Pagination } from '../../shared/components/Pagination'
import { EmptyState } from '../../shared/components/EmptyState'
import { Input } from '../../shared/components/Input'
import { Select } from '../../shared/components/Select'
import { Spinner } from '../../shared/components/Spinner'
import { useRestaurants } from '../../shared/hooks/useRestaurants'
import RestaurantCard from './RestaurantCard'
import { useLanguage } from '../../shared/hooks/useLanguage'

const ITEMS_PER_PAGE = 8

type RestaurantSort = 'rating' | 'delivery' | 'name'

export default function RestaurantsPage() {
  const { t } = useLanguage()
  const { data: restaurants, loading, error, refetch } = useRestaurants()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState('all')
  const [minimumRating, setMinimumRating] = useState('all')
  const [openOnly, setOpenOnly] = useState(false)
  const [sortBy, setSortBy] = useState<RestaurantSort>('rating')
  const [currentPage, setCurrentPage] = useState(1)

  const cuisines = useMemo(
    () => [...new Set(restaurants.map((restaurant) => restaurant.cuisine))].sort(),
    [restaurants],
  )

  const filteredRestaurants = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase()

    return restaurants
      .filter((restaurant) => {
        const matchesSearch =
          restaurant.name.toLocaleLowerCase().includes(query) ||
          restaurant.cuisine.toLocaleLowerCase().includes(query)
        const matchesCuisine =
          selectedCuisine === 'all' || restaurant.cuisine === selectedCuisine
        const matchesRating =
          minimumRating === 'all' || restaurant.rating >= Number(minimumRating)
        const matchesOpen = !openOnly || restaurant.isOpen

        return matchesSearch && matchesCuisine && matchesRating && matchesOpen
      })
      .sort((first, second) => {
        if (sortBy === 'delivery') {
          return first.deliveryTimeMinutes - second.deliveryTimeMinutes
        }
        if (sortBy === 'name') {
          return first.name.localeCompare(second.name)
        }
        return second.rating - first.rating
      })
  }, [restaurants, searchTerm, selectedCuisine, minimumRating, openOnly, sortBy])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCuisine, minimumRating, openOnly, sortBy])

  const totalPages = Math.ceil(filteredRestaurants.length / ITEMS_PER_PAGE)
  const paginatedRestaurants = filteredRestaurants.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCuisine('all')
    setMinimumRating('all')
    setOpenOnly(false)
    setSortBy('rating')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface-cream">
        <Spinner size="lg" label={t("Loading restaurants...")} />
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title={t('Unable to load restaurants')}
            description={t(error)}
            action={<Button onClick={() => void refetch()}>{t('Try again')}</Button>}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface-cream px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <Store aria-hidden="true" size={25} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-text-main sm:text-3xl">
                {t('Explore Restaurants')}
              </h1>
              <p className="mt-1 text-sm text-text-slate">
                {t('Discover local kitchens and find your next favorite meal.')}
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-text-slate">
            {filteredRestaurants.length} {t('restaurants found')}
          </span>
        </section>

        <section className="grid gap-4 rounded-xl border border-border-subtle bg-surface-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
          label={t('Search restaurants')}
            type="search"
          placeholder={t('Name or cuisine...')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select
            label={t('Cuisine')}
            value={selectedCuisine}
            onChange={(event) => setSelectedCuisine(event.target.value)}
          >
            <option value="all">{t('All cuisines')}</option>
            {cuisines.map((cuisine) => (
              <option key={cuisine} value={cuisine}>{t(cuisine)}</option>
            ))}
          </Select>
          <Select
            label={t('Minimum rating')}
            value={minimumRating}
            onChange={(event) => setMinimumRating(event.target.value)}
          >
            <option value="all">{t('Any rating')}</option>
            <option value="4">{t('4.0 and above')}</option>
            <option value="4.5">{t('4.5 and above')}</option>
          </Select>
          <Select
            label={t('Sort by')}
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as RestaurantSort)}
          >
            <option value="rating">{t('Top rated')}</option>
            <option value="delivery">{t('Fastest delivery')}</option>
            <option value="name">{t('Name (A–Z)')}</option>
          </Select>
          <label className="flex items-center gap-2 text-sm font-medium text-text-main sm:col-span-2 lg:col-span-4">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(event) => setOpenOnly(event.target.checked)}
              className="size-4 accent-brand-red"
            />
            <SlidersHorizontal aria-hidden="true" size={16} className="text-text-slate" />
            {t('Show open restaurants only')}
          </label>
        </section>

        {filteredRestaurants.length > 0 ? (
          <>
            <section
              aria-label={t("Restaurants")}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {paginatedRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </section>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            <p className="text-center text-sm text-text-slate">
              {t('Showing')} {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredRestaurants.length)} {t('of')} {filteredRestaurants.length} {t('restaurants found')}
            </p>
          </>
        ) : (
          <EmptyState
            title={t('No restaurants found')}
            description={t('Try a different name or adjust your filters to see more restaurants.')}
            action={<Button variant="outline" onClick={clearFilters}>{t('Clear filters')}</Button>}
          />
        )}
      </div>
    </main>
  )
}
