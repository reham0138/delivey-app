import { useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal, Store } from 'lucide-react'

import { Button } from '../../shared/components/Button'
import { EmptyState } from '../../shared/components/EmptyState'
import { Input } from '../../shared/components/Input'
import { Select } from '../../shared/components/Select'
import { Spinner } from '../../shared/components/Spinner'
import { useRestaurants } from '../../shared/hooks/useRestaurants'
import RestaurantCard from './RestaurantCard'

const ITEMS_PER_PAGE = 8

type RestaurantSort = 'rating' | 'delivery' | 'name'

export default function RestaurantsPage() {
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
        <Spinner size="lg" label="Loading restaurants..." />
      </div>
    )
  }

  if (error) {
    return (
      <main className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title="Unable to load restaurants"
            description={error}
            action={<Button onClick={() => void refetch()}>Try again</Button>}
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
                Explore Restaurants
              </h1>
              <p className="mt-1 text-sm text-text-slate">
                Discover local kitchens and find your next favorite meal.
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-text-slate">
            {filteredRestaurants.length} restaurants found
          </span>
        </section>

        <section className="grid gap-4 rounded-xl border border-border-subtle bg-surface-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search restaurants"
            type="search"
            placeholder="Name or cuisine..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <Select
            label="Cuisine"
            value={selectedCuisine}
            onChange={(event) => setSelectedCuisine(event.target.value)}
          >
            <option value="all">All cuisines</option>
            {cuisines.map((cuisine) => (
              <option key={cuisine} value={cuisine}>{cuisine}</option>
            ))}
          </Select>
          <Select
            label="Minimum rating"
            value={minimumRating}
            onChange={(event) => setMinimumRating(event.target.value)}
          >
            <option value="all">Any rating</option>
            <option value="4">4.0 and above</option>
            <option value="4.5">4.5 and above</option>
          </Select>
          <Select
            label="Sort by"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as RestaurantSort)}
          >
            <option value="rating">Top rated</option>
            <option value="delivery">Fastest delivery</option>
            <option value="name">Name (A–Z)</option>
          </Select>
          <label className="flex items-center gap-2 text-sm font-medium text-text-main sm:col-span-2 lg:col-span-4">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(event) => setOpenOnly(event.target.checked)}
              className="size-4 accent-brand-red"
            />
            <SlidersHorizontal aria-hidden="true" size={16} className="text-text-slate" />
            Show open restaurants only
          </label>
        </section>

        {filteredRestaurants.length > 0 ? (
          <>
            <section
              aria-label="Restaurants"
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {paginatedRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </section>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <Button
                  key={page}
                  size="sm"
                  variant={currentPage === page ? 'primary' : 'outline'}
                  aria-current={currentPage === page ? 'page' : undefined}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
              </Button>
            </div>
            <p className="text-center text-sm text-text-slate">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredRestaurants.length)} of {filteredRestaurants.length} restaurants
            </p>
          </>
        ) : (
          <EmptyState
            title="No restaurants found"
            description="Try a different name or adjust your filters to see more restaurants."
            action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
          />
        )}
      </div>
    </main>
  )
}
