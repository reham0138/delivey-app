import Footer from '../components/Footer'
import NavBar from '../components/NavBar'

export default function MainLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <NavBar />
      </header>
      <Footer />
    </div>
  )
}
