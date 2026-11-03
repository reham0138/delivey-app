import { useCallback, useEffect, useMemo, useState } from 'react'
import { Utensils } from 'lucide-react'

import MealCard from '../shared/components/MealCard'
import { Input } from '../shared/components/Input'
import { Select } from '../shared/components/Select'
import { EmptyState } from '../shared/components/EmptyState'
import { Spinner } from '../shared/components/Spinner'
import { Button } from '../shared/components/Button'

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

export default function Meals() {
  const [meals, setMeals] = useState<MenuItem[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const [mealsResponse, restaurantsResponse] = await Promise.all([
        fetch('/mock/menu-items.json'),
        fetch('/mock/restaurants.json'),
      ])

      if (!mealsResponse.ok || !restaurantsResponse.ok) {
        throw new Error('Failed to load meals data.')
      }

      const [mealsData, restaurantsData] = await Promise.all([
        mealsResponse.json() as Promise<MenuItem[]>,
        restaurantsResponse.json() as Promise<Restaurant[]>,
      ])

      setMeals(mealsData)
      setRestaurants(restaurantsData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

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

  const getRestaurantName = (restaurantId: number) => {
    return (
      restaurants.find((restaurant) => restaurant.id === restaurantId)?.name ??
      'Unknown restaurant'
    )
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedRestaurant('all')
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-surface-cream">
        <Spinner size="lg" label="Loading meals..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] bg-surface-cream px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            title="Unable to load meals"
            description={error}
            action={
              <Button onClick={fetchMeals}>
                Try again
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

        <section>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <Utensils size={25} />
            </span>

            <div>
              <h1 className="text-2xl font-bold text-text-main sm:text-3xl">
                Explore Meals
              </h1>

              <p className="mt-1 text-sm text-text-slate">
                Find your favorite meals from our restaurants.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-border-subtle bg-surface-white p-4 sm:grid-cols-2">
          <Input
            label="Search meals"
            placeholder="Search by meal name..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          <Select
            label="Filter by restaurant"
            value={selectedRestaurant}
            onChange={(event) => setSelectedRestaurant(event.target.value)}
          >
            <option value="all">All restaurants</option>

            {availableRestaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </Select>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-text-main">
              Available Meals
            </h2>

            <span className="text-sm text-text-slate">
              {filteredMeals.length} meals found
            </span>
          </div>

          {filteredMeals.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMeals.map((meal) => (
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
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No meals found"
              description="Try changing your search or selecting another restaurant."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          )}
        </section>

      </div>
    </main>
  )
}