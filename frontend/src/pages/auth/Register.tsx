import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { useAuth } from '@/shared/hooks/useAuth'
import { getHomePathForRole } from '@/shared/utils/authRedirect'
import { registerSchema, type RegisterFormValues } from '@/shared/utils/validation'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function Register() {
	const { isAuthenticated, role, register: registerAccount } = useAuth()
	const { t } = useLanguage()
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<RegisterFormValues>({
		resolver: zodResolver(registerSchema),
		mode: 'onSubmit',
		defaultValues: { role: 'customer' },
	})

	if (isAuthenticated) {
		return <Navigate to={getHomePathForRole(role ?? 'customer')} replace />
	}

	const onSubmit = async (values: RegisterFormValues) => {
		try {
			await registerAccount({
				name: values.name,
				email: values.email,
				password: values.password,
				role: values.role,
			})
		} catch (error) {
			setError('root.serverError', {
				message: error instanceof Error ? error.message : t('Something went wrong. Please try again.'),
			})
		}
	}

	return (
		<section className="space-y-5">
			<header className="space-y-1">
				<h1 className="text-2xl font-semibold text-text-main">{t('Create your account')}</h1>
				<p className="text-sm text-text-slate">{t('Join The Crown & Anchor.')}</p>
			</header>
			<form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
				<Input label={t('Name')} autoComplete="name" {...register('name')} error={errors.name?.message ? t(errors.name.message) : undefined} />
				<Input label={t('Email address')} type="email" autoComplete="email" {...register('email')} error={errors.email?.message ? t(errors.email.message) : undefined} />
				<Input label={t('Password')} type="password" autoComplete="new-password" {...register('password')} error={errors.password?.message ? t(errors.password.message) : undefined} />
				<Input label={t('Confirm password')} type="password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message ? t(errors.confirmPassword.message) : undefined} />
				<fieldset className="space-y-2">
					<legend className="text-sm font-semibold text-text-main">{t('Sign up as')}</legend>
					<div className="grid grid-cols-2 gap-3">
						<label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-sm text-text-main has-[:checked]:border-brand-red">
							<input type="radio" value="customer" className="accent-brand-red" {...register('role')} />
							{t('Customer')}
						</label>
						<label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border-subtle bg-surface-white px-3 py-2 text-sm text-text-main has-[:checked]:border-brand-red">
							<input type="radio" value="restaurant" className="accent-brand-red" {...register('role')} />
							{t('Restaurant')}
						</label>
					</div>
					{errors.role?.message && <p className="text-sm text-danger">{t('Please choose an account type.')}</p>}
				</fieldset>
				{errors.root?.serverError?.message && (
					<p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
						{errors.root.serverError.message}
					</p>
				)}
				<Button type="submit" loading={isSubmitting} className="w-full">
					{t('Create account')}
				</Button>
			</form>
			<p className="text-center text-sm text-text-slate">
				<Link to="/login" className="font-medium text-brand-red underline underline-offset-4">
					{t('Already have an account? Sign in')}
				</Link>
			</p>
		</section>
	)
}