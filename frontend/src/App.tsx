import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import MainLayout from './shared/layouts/MainLayout'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<MainLayout />} />
      </Routes>
    </Router>
  )
}

export default App
