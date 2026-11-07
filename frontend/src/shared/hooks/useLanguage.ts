import { useContext } from 'react'

import { LanguageContext } from '../contexts/LanguageContextValue'

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
