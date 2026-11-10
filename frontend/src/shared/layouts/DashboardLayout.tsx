import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Spinner } from '@/shared/components/Spinner'
import { useTheme } from '@/shared/contexts/ThemeContext'
import { useAuth } from '@/shared/hooks/useAuth'
import { useLanguage } from '@/shared/hooks/useLanguage'
import type { Role } from '@/shared/types/user'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navByRole: Record<Exclude<Role, 'customer'>, NavItem[]> = {
  restaurant: [{ to: '/dashboard/restaurant', label: 'Overview', icon: LayoutDashboard, end: true }],
  admin: [{ to: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard, end: true }],
}

export default function DashboardLayout() {
  const { user, role, logout } = useAuth()
  const { t, language, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  if (!user || !role || role === 'customer') return null

  const sidebar = (
    <nav aria-label={t('Dashboard navigation')} className="flex h-full flex-col gap-1 p-4">
      <Link to="/" className="mb-4 flex items-center gap-3 rounded-lg" aria-label={t('The Crown & Anchor home')}>
        <img
          src={theme === 'dark' ? '/brand/logo/crown-anchor-delivery-logo-white.png' : '/brand/logo/crown-anchor-delivery-logo-black.png'}
          alt=""
          className="size-10 shrink-0 object-contain"
        />
        <span className="truncate font-semibold text-brand-red">The Crown &amp; Anchor</span>
      </Link>
      {navByRole[role].map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setIsOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
              isActive ? 'bg-brand-red/10 text-brand-red' : 'text-text-main hover:bg-brand-yellow/20'
            }`
          }
        >
          <Icon aria-hidden="true" size={18} />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  )

  const iconButton =
    'inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-surface-cream text-text-main transition-colors hover:border-brand-yellow hover:bg-brand-yellow/20'

  return (
    <div className="min-h-screen bg-surface-cream text-text-main lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-e border-border-subtle bg-surface-white lg:block">{sidebar}</aside>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label={t('Close navigation menu')}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/45 lg:hidden"
          />
          <aside className="fixed inset-y-0 start-0 z-50 w-64 bg-surface-white shadow-2xl lg:hidden">{sidebar}</aside>
        </>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border-subtle bg-surface-white px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={t(isOpen ? 'Close navigation menu' : 'Open navigation menu')}
            aria-expanded={isOpen}
            className={`${iconButton} lg:hidden`}
          >
            {isOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
          <p className="min-w-0 flex-1 truncate text-sm text-text-slate">
            {t('Signed in as')} <span className="font-semibold text-text-main">{user.name}</span>
          </p>
          <button type="button" onClick={toggleLanguage} className={`${iconButton} px-2 text-xs font-bold`}>
            {language === 'en' ? 'عربي' : 'EN'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className={iconButton}
          >
            {theme === 'dark' ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
          </button>
          <button type="button" onClick={() => void logout()} aria-label={t('Log out')} className={iconButton}>
            <LogOut aria-hidden="true" size={18} />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Suspense fallback={<div className="flex justify-center py-24"><Spinner label={t('Loading...')} /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}