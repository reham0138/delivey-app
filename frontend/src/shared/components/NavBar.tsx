import { Moon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function NavBar() {
  const { theme, toggleTheme } = useTheme()
  const nextThemeLabel = theme === 'dark' ? 'light' : 'dark'

  return (
    <header className="border-b border-border-subtle bg-surface-white">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-offset-4"
          aria-label="The Crown & Anchor home"
        >
          <img
            src={theme === 'dark' ? '/brand/logo/crown-anchor-delivery-logo-white.png' : '/brand/logo/crown-anchor-delivery-logo-black.png'}
            alt=""
            className="size-12 shrink-0 object-contain"
          />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-brand-red">The Crown &amp; Anchor</span>
            <span className="hidden text-xs tracking-[0.16em] text-text-slate sm:block">MORE THAN JUST A DELIVERY APP</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-3 sm:gap-5">
          <a href="#categories" className="hidden text-sm font-medium text-text-main transition-colors hover:text-brand-red sm:inline-flex">Explore</a>
          <a href="#how-it-works" className="hidden text-sm font-medium text-text-main transition-colors hover:text-brand-red sm:inline-flex">How it works</a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextThemeLabel} mode`}
            title={`Switch to ${nextThemeLabel} mode`}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-surface-cream text-text-main transition-colors hover:border-brand-yellow hover:bg-brand-yellow/20"
          >
            {theme === 'dark' ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
          </button>
        </nav>
      </div>
    </header>
  )
}
