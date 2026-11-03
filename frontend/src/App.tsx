import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Preview from './pages/Preview'
import MainLayout from './shared/layouts/MainLayout'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/preview" element={<Preview />} />
        
      </Routes>
    </Router>
  )
}

export default App
