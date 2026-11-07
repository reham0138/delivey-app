import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Lock, Mail, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { Input } from '@/shared/components/Input'
import { useAuth } from '@/shared/hooks/useAuth'
import type { User } from '@/shared/types/user'
import { profileSchema, type ProfileFormValues } from '@/shared/utils/validation'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function CustomerProfile({ user }: { user: User }) {
	const { t } = useLanguage()
	const { updateProfile } = useAuth()
	const [saved, setSaved] = useState(false)
	const {
		register,
		handleSubmit,
		reset,
		setError,
		formState: { errors, isDirty, isSubmitting },
	} = useForm<ProfileFormValues>({
		resolver: zodResolver(profileSchema),
		defaultValues: { name: user.name, phone: user.phone ?? '' },
		mode: 'onSubmit',
	})

	const initials = user.name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => Array.from(word)[0] ?? '')
		.join('')
		.toLocaleUpperCase() || '?'

	const onSubmit = async (values: ProfileFormValues) => {
		try {
			await updateProfile({ name: values.name, phone: values.phone ? values.phone : undefined })
			reset(values)
			setSaved(true)
		} catch (error) {
			setError('root.serverError', {
				message: error instanceof Error ? error.message : t('Something went wrong. Please try again.'),
			})
		}
	}

	const resetSavedValues = () => {
		reset({ name: user.name, phone: user.phone ?? '' })
		setSaved(false)
	}

	return (
		<section className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
			<header className="mb-7">
				<p className="text-xs tracking-[0.16em] text-text-slate">{t('YOUR ACCOUNT')}</p>
				<h1 className="mt-1 text-3xl font-semibold text-text-main">{t('Profile')}</h1>
				<p className="mt-2 text-text-slate">{t('Manage the details associated with your account.')}</p>
			</header>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
				<Card className="profile-fade-up border-border-subtle bg-gradient-to-br from-brand-yellow/15 via-surface-white to-brand-red/5 text-center" padding="lg">
					<div className="mx-auto flex size-24 items-center justify-center rounded-full bg-brand-yellow/20 text-3xl font-semibold text-brand-red ring-4 ring-brand-yellow/30" aria-hidden="true">
						{initials}
					</div>
					<p className="mt-5 break-words text-lg font-semibold text-text-main">{user.name}</p>
					<p className="mx-auto mt-2 w-fit rounded-full border border-border-subtle bg-surface-cream px-3 py-1 text-xs capitalize text-text-slate">
						{t(user.role === 'customer' ? 'Customer' : user.role === 'restaurant' ? 'Restaurant' : 'Admin')}
					</p>
					<div className="mt-6 space-y-3 text-left">
						<div className="flex min-w-0 items-start gap-3 text-sm text-text-main">
							<Mail aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-red" />
							<span className="min-w-0 break-all">{user.email}</span>
						</div>
						<div className="flex min-w-0 items-start gap-3 text-sm text-text-main">
							<Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-red" />
							<span className={user.phone ? 'min-w-0 break-words' : 'min-w-0 break-words text-text-slate'}>
								{user.phone || t('No phone added yet')}
							</span>
						</div>
					</div>
				</Card>

				<Card className="profile-fade-up-delayed" padding="lg">
					<header>
						<h2 className="text-xl font-semibold text-text-main">{t('Personal details')}</h2>
						<p className="mt-1 text-sm text-text-slate">{t('Keep your contact information up to date.')}</p>
					</header>
					<form noValidate className="mt-5 space-y-5" onSubmit={handleSubmit(onSubmit)}>
						<Input label={t("Full name")} autoComplete="name" {...register('name')} error={errors.name?.message ? t(errors.name.message) : undefined} />
						<Input label={t("Phone number")} type="tel" autoComplete="tel" hint={t("Optional")} {...register('phone')} error={errors.phone?.message ? t(errors.phone.message) : undefined} />
						<div className="space-y-1">
							<Input label={t("Email address")} type="email" autoComplete="email" value={user.email} disabled className="w-full min-w-0 truncate" />
							<p className="flex items-center gap-1.5 text-sm text-text-slate">
								<Lock aria-hidden="true" className="size-3.5 shrink-0" />
								{t('Your email cannot be changed')}
							</p>
						</div>
						{errors.root?.serverError?.message && (
							<p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
								{errors.root.serverError.message}
							</p>
						)}
						{saved && !isDirty && (
							<p role="status" className="flex items-center gap-2 rounded-lg bg-brand-yellow/15 px-3 py-2 text-sm text-text-main">
								<Check aria-hidden="true" className="size-4 shrink-0 text-brand-red" />
								{t('Your changes were saved.')}
							</p>
						)}
						<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
							<Button type="submit" loading={isSubmitting} disabled={!isDirty}>
								{t('Save changes')}
							</Button>
							<Button type="button" variant="ghost" onClick={resetSavedValues}>
								{t('Reset')}
							</Button>
						</div>
					</form>
				</Card>
			</div>
		</section>
	)
}