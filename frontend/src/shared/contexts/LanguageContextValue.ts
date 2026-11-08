import { createContext } from 'react'

export type Language = 'en' | 'ar'

export interface LanguageContextValue {
  language: Language
  direction: 'ltr' | 'rtl'
  toggleLanguage: () => void
  t: (key: string, values?: Record<string, string | number>) => string
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)
