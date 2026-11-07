import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { useAuth } from '@/shared/hooks/useAuth'
import { getHomePathForRole } from '@/shared/utils/authRedirect'
import { loginSchema, type LoginFormValues } from '@/shared/utils/validation'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function Login() {
	const { isAuthenticated, role, login } = useAuth()
	const { t } = useLanguage()
	const location = useLocation()
	const returnTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		mode: 'onSubmit',
	})

	if (isAuthenticated) {
		return <Navigate to={returnTo?.startsWith('/') ? returnTo : getHomePathForRole(role ?? 'customer')} replace />
	}

	const onSubmit = async (values: LoginFormValues) => {
		try {
			await login(values)
		} catch (error) {
			setError('root.serverError', {
				message: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
			})
		}
	}

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<h1 className="text-2xl font-semibold text-text-main">{t('Sign in')}</h1>
				<p className="text-sm text-text-slate">{t('Welcome back. Sign in to your account.')}</p>
			</header>
			<form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
				<Input
					label={t('Email address')}
					type="email"
					autoComplete="email"
					{...register('email')}
					error={errors.email?.message}
				/>
				<Input
					label={t('Password')}
					type="password"
					autoComplete="current-password"
					{...register('password')}
					error={errors.password?.message}
				/>
				{errors.root?.serverError?.message && (
					<p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
						{errors.root.serverError.message}
					</p>
				)}
				<Button type="submit" loading={isSubmitting} className="w-full">
					{t('Sign in')}
				</Button>
			</form>
			<p className="text-center text-sm text-text-slate">
				<Link to="/register" className="font-medium text-brand-red underline underline-offset-4">
					{t("Don't have an account? Create one")}
				</Link>
			</p>
			<p className="rounded-lg border border-border-subtle bg-surface-cream px-3 py-2 text-xs text-text-slate">
				{t('Demo account: admin@test.com / 123456')}
			</p>
		</section>
	)
}