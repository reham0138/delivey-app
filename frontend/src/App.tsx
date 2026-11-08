import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Preview from './pages/Preview'
import HomePage from './pages/HomePage'
import Meals from './pages/Meals'
import RestaurantsPage from './pages/restaurants/RestaurantsPage'
import RestaurantDetailsPage from './pages/restaurants/RestaurantDetailsPage'
import MainLayout from './shared/layouts/MainLayout'
import AuthLayout from '@/shared/layouts/AuthLayout'
import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ProtectedRoute from '@/shared/components/ProtectedRoute'
import { Spinner } from '@/shared/components/Spinner'
import { useLanguage } from '@/shared/hooks/useLanguage'

const CheckoutPage = lazy(() => import('@/pages/checkout/CheckoutPage'))
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage'))
const OrderDetailsPage = lazy(() => import('@/pages/orders/OrderDetailsPage'))
const OrderConfirmationPage = lazy(() => import('@/pages/orders/OrderConfirmationPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))

function LoadingFallback({ label }: { label: string }) {
  const { t } = useLanguage()
  return <div className="flex justify-center py-24"><Spinner label={t(label)} /></div>
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="meals" element={<Meals />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/:id" element={<RestaurantDetailsPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<Suspense fallback={<LoadingFallback label="Loading checkout..." />}><CheckoutPage /></Suspense>} />
            <Route path="orders" element={<Suspense fallback={<LoadingFallback label="Loading orders..." />}><OrdersPage /></Suspense>} />
            <Route path="orders/:id/confirmation" element={<Suspense fallback={<LoadingFallback label="Loading confirmation..." />}><OrderConfirmationPage /></Suspense>} />
            <Route path="orders/:id" element={<Suspense fallback={<LoadingFallback label="Loading order..." />}><OrderDetailsPage /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<LoadingFallback label="Loading profile..." />}><ProfilePage /></Suspense>} />
          </Route>
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
        <Route path="/preview" element={<Preview />} />
      </Routes>
    </Router>
  )
}
export default App
