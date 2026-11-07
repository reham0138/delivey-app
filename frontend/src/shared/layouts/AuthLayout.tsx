import { Link, Outlet } from 'react-router-dom'
import { Card } from '@/shared/components/Card'
import { useTheme } from '@/shared/contexts/ThemeContext'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function AuthLayout() {
	const { theme } = useTheme()
	const { t } = useLanguage()

	return (
		<main className="flex min-h-screen items-center justify-center bg-surface-cream px-4 py-10 sm:px-6">
			<div className="w-full max-w-md">
				<Link to="/" className="mb-6 flex items-center justify-center gap-3 text-center">
					<img
						src={
							theme === 'dark'
								? '/brand/logo/crown-anchor-delivery-logo-white.png'
								: '/brand/logo/crown-anchor-delivery-logo-black.png'
						}
						alt=""
						className="size-12 shrink-0 object-contain"
					/>
					<span className="font-semibold text-brand-red">The Crown &amp; Anchor</span>
				</Link>
				<Card padding="lg">
					<Outlet />
				</Card>
				<p className="mt-5 text-center text-sm text-text-slate">
					<Link to="/" className="underline underline-offset-4 hover:text-text-main">
						{t('Back to home')}
					</Link>
				</p>
			</div>
		</main>
	)
}