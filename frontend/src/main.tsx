import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './shared/contexts/ThemeContext'
import { AuthProvider } from '@/shared/contexts/AuthContext'
import './App.css'
import App from './App'
import { CartProvider } from './shared/contexts/CartContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
        <App />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
