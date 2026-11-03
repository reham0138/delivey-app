import { Outlet } from 'react-router-dom'

import Footer from '../components/Footer'
import NavBar from '../components/NavBar'

export default function MainLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavBar />
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}