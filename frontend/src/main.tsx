import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './shared/contexts/ThemeContext'
import { AuthProvider } from '@/shared/contexts/AuthContext'
import './App.css'
import App from './App'
import { CartProvider } from './shared/contexts/CartContext'
import { LanguageProvider } from './shared/contexts/LanguageContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
)
