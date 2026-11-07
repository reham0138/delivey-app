import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../hooks/useLanguage'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="w-full bg-brand-red text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/brand/logo/crown-anchor-delivery-logo-white.png"
              alt="The Crown & Anchor logo"
              className="size-14 shrink-0 object-contain"
            />
            <div>
              <p className="font-semibold">The Crown &amp; Anchor</p>
              <p className="mt-1 text-xs tracking-[0.16em] text-brand-yellow">{t('MORE THAN JUST A DELIVERY APP')}</p>
            </div>
          </div>

          <p className="text-sm text-white/85">
            &copy; {new Date().getFullYear()} The Crown &amp; Anchor
          </p>

          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors hover:bg-white/10 focus-visible:outline-offset-2"
          >
            {t('Back to home')}
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </footer>
  )
}
