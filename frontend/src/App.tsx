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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="meals" element={<Meals />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/:id" element={<RestaurantDetailsPage />} />
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
