import Footer from '../components/Footer'
import NavBar from '../components/NavBar'
import HomePage from '../../pages/HomePage'

export default function MainLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavBar />
      </header>
      <HomePage />
      <Footer />
    </div>
  )
}
