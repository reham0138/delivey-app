import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	Clock3,
	ImagePlus,
	MapPin,
	PencilLine,
	Phone,
	Star,
	Utensils,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/components/Button'
import { Card } from '@/shared/components/Card'
import { EmptyState } from '@/shared/components/EmptyState'
import { Input } from '@/shared/components/Input'
import { RestaurantImage } from '@/shared/components/RestaurantImage'
import { Spinner } from '@/shared/components/Spinner'
import { useRestaurants } from '@/shared/hooks/useRestaurants'
import type { Restaurant, RestaurantProfileChanges } from '@/shared/types'
import { formatCurrency } from '@/shared/utils/format'
import { restaurantProfileSchema, type RestaurantProfileFormValues } from '@/shared/utils/validation'
import { restaurantService } from '@/shared/services/restaurant.service'
import { useLanguage } from '@/shared/hooks/useLanguage'

interface RestaurantProfileProps {
	ownerId: number
}

export default function RestaurantProfile({ ownerId }: RestaurantProfileProps) {
	const { t } = useLanguage()
	const { data, loading, error, refetch } = useRestaurants(ownerId)
	const restaurant = data.find((item) => item.ownerId === ownerId) ?? null

	if (loading) {
		return <div className="flex justify-center py-24"><Spinner label={t("Loading restaurant profile...")} /></div>
	}

	if (error) {
		return (
			<section className="mx-auto w-full max-w-4xl px-4 py-12">
				<Card className="rounded-2xl">
					<EmptyState
						title={t("We couldn't load your restaurant profile")}
						description={error}
						action={<Button onClick={() => void refetch()}>{t("Try again")}</Button>}
					/>
				</Card>
			</section>
		)
	}

	if (!restaurant) {
		return (
			<section className="mx-auto w-full max-w-4xl px-4 py-12">
				<Card className="rounded-2xl">
					<EmptyState
						title={t("No restaurant is linked to this account")}
						description={t("There isn’t a restaurant profile associated with your signed-in account yet.")}
					/>
				</Card>
			</section>
		)
	}

	return <RestaurantProfileContent key={restaurant.id} initialRestaurant={restaurant} ownerId={ownerId} />
}

function RestaurantProfileContent({
	initialRestaurant,
	ownerId,
}: {
	initialRestaurant: Restaurant
	ownerId: number
}) {
	const { t } = useLanguage()
	const [restaurant, setRestaurant] = useState(initialRestaurant)
	const [isEditing, setIsEditing] = useState(false)
	const [saved, setSaved] = useState(false)
	const [selectedImage, setSelectedImage] = useState<string | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [imageError, setImageError] = useState('')
	const [isProcessingImage, setIsProcessingImage] = useState(false)
	const imageInputRef = useRef<HTMLInputElement>(null)
	const previewUrlRef = useRef<string | null>(null)
	const imageRequestRef = useRef(0)
	const {
		register,
		handleSubmit,
		reset,
		setError,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<RestaurantProfileFormValues>({
		resolver: zodResolver(restaurantProfileSchema),
		defaultValues: toFormValues(initialRestaurant),
		mode: 'onSubmit',
	})

	useEffect(() => () => {
		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
	}, [])

	const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ''
		if (!file) return

		const extension = file.name.split('.').pop()?.toLowerCase()
		const validExtensions = ['jpg', 'jpeg', 'png', 'webp']
		const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
		if (!extension || !validExtensions.includes(extension) || (file.type && !validMimeTypes.includes(file.type.toLowerCase()))) {
			setImageError(t('Choose a JPG, JPEG, PNG, or WEBP image.'))
			return
		}
		if (file.size > 3 * 1024 * 1024) {
			setImageError(t('The image must be 3 MB or smaller.'))
			return
		}

		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
		const requestId = imageRequestRef.current + 1
		imageRequestRef.current = requestId
		const nextPreviewUrl = URL.createObjectURL(file)
		previewUrlRef.current = nextPreviewUrl
		setPreviewUrl(nextPreviewUrl)
		setImageError('')
		setIsProcessingImage(true)

		try {
			const dataUrl = await encodeImageForStorage(file)
			if (imageRequestRef.current !== requestId) return
			setSelectedImage(dataUrl)
			URL.revokeObjectURL(nextPreviewUrl)
			previewUrlRef.current = null
			setPreviewUrl(null)
		} catch {
			if (imageRequestRef.current !== requestId) return
			URL.revokeObjectURL(nextPreviewUrl)
			previewUrlRef.current = null
			setPreviewUrl(null)
			setImageError(t('This image could not be prepared for local storage. Try another image.'))
		} finally {
			if (imageRequestRef.current === requestId) setIsProcessingImage(false)
		}
	}

	const onSubmit = async (values: RestaurantProfileFormValues) => {
		const changes: RestaurantProfileChanges = {
			name: values.name,
			cuisine: values.cuisine,
			address: values.address,
			phone: values.phone,
			deliveryTimeMinutes: values.deliveryTimeMinutes,
			deliveryFee: values.deliveryFee,
			minOrder: values.minOrder,
			image: restaurant.image,
			openingHours: values.openingHours ?? '',
			...(selectedImage ? { cover: selectedImage } : {}),
		}

		try {
			const updatedRestaurant = await restaurantService.updateOwnedByOwnerId(ownerId, changes)
			setRestaurant(updatedRestaurant)
			reset(toFormValues(updatedRestaurant))
			setSelectedImage(null)
			setImageError('')
			setSaved(true)
			setIsEditing(false)
		} catch (submitError) {
			setError('root.serverError', {
				message: submitError instanceof Error
					? submitError.message
					: t('Something went wrong. Please try again.'),
			})
		}
	}

	const cancelEditing = () => {
		imageRequestRef.current += 1
		if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
		previewUrlRef.current = null
		setPreviewUrl(null)
		setSelectedImage(null)
		setImageError('')
		setIsProcessingImage(false)
		reset(toFormValues(restaurant))
		setSaved(false)
		setIsEditing(false)
	}

	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
			<header className="mb-6 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-xs font-semibold tracking-[0.16em] text-brand-red">{t('RESTAURANT PROFILE')}</p>
					<h1 className="mt-1 text-3xl font-semibold text-text-main">{t('Your restaurant')}</h1>
					<p className="mt-1 text-sm text-text-slate">{t('Keep the details guests see accurate and welcoming.')}</p>
				</div>
				{!isEditing && (
					<Button variant="outline" onClick={() => setIsEditing(true)}>
						<PencilLine aria-hidden="true" size={17} />
						Edit profile
					</Button>
				)}
			</header>

			{saved && !isEditing && (
				<p role="status" className="mb-4 rounded-lg bg-brand-yellow/20 px-4 py-3 text-sm text-text-main">
					{t('Your restaurant profile was saved.')}
				</p>
			)}

			<div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-white shadow-sm">
				<div className="relative isolate flex min-h-72 items-end overflow-hidden p-5 sm:min-h-96 sm:p-8 lg:min-h-[26rem]">
					<RestaurantImage
						restaurant={restaurant}
						className="absolute inset-0 size-full object-cover transition-transform duration-700 hover:scale-[1.03]"
					/>
					<div aria-hidden="true" className="absolute inset-0 -z-0 bg-gradient-to-r from-brand-red/90 via-brand-red/50 to-brand-red/5" />
					<div className="relative z-10 max-w-2xl text-white">
						<p className="inline-flex items-center gap-2 rounded-full border border-surface-white/30 bg-surface-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
							<span className={`size-2 rounded-full ${restaurant.isOpen ? 'bg-brand-yellow' : 'bg-surface-white/70'}`} />
							{restaurant.isOpen ? t('Open now') : t('Closed')}
						</p>
						<h2 className="mt-4 break-words text-3xl font-semibold sm:text-5xl">{restaurant.name}</h2>
						<p className="mt-2 flex items-center gap-2 text-sm text-surface-white/90 sm:text-base">
							<Utensils aria-hidden="true" size={17} />
							{t(restaurant.cuisine)}
						</p>
						{restaurant.rating > 0 && (
							<p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
								<Star aria-hidden="true" className="size-4 fill-brand-yellow text-brand-yellow" />
								<span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
								{restaurant.reviewsCount !== undefined && (
									<span className="text-surface-white/80">{restaurant.reviewsCount} {t("reviews")}</span>
								)}
							</p>
						)}
					</div>
				</div>

				<div className="grid gap-3 border-t border-border-subtle bg-surface-white p-4 sm:grid-cols-3 sm:p-5">
					<ProfileMetric icon={<Clock3 aria-hidden="true" size={17} />} label={t("Delivery time")} value={t('{minutes} min', { minutes: restaurant.deliveryTimeMinutes })} />
					<ProfileMetric icon={<span aria-hidden="true" className="text-sm font-semibold">$</span>} label={t("Delivery fee")} value={formatCurrency(restaurant.deliveryFee)} />
					<ProfileMetric icon={<span aria-hidden="true" className="text-sm font-semibold">$</span>} label={t("Minimum order")} value={formatCurrency(restaurant.minOrder)} />
				</div>
			</div>

			{isEditing ? (
				<Card className="mt-6 rounded-2xl" padding="lg">
					<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 className="text-xl font-semibold text-text-main">{t('Edit restaurant details')}</h2>
							<p className="mt-1 text-sm text-text-slate">{t('Changes update your restaurant profile and public listing.')}</p>
						</div>
					</div>
					<form noValidate className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
						<div className="grid gap-4 sm:grid-cols-2">
							<Input label={t("Restaurant name")} autoComplete="organization" {...register('name')} error={errors.name?.message ? t(errors.name.message) : undefined} />
							<Input label={t("Cuisine")} autoComplete="off" {...register('cuisine')} error={errors.cuisine?.message ? t(errors.cuisine.message) : undefined} />
							<Input label={t("Address")} autoComplete="street-address" wrapperClassName="sm:col-span-2" {...register('address')} error={errors.address?.message ? t(errors.address.message) : undefined} />
							<Input label={t("Phone number")} type="tel" autoComplete="tel" {...register('phone')} error={errors.phone?.message ? t(errors.phone.message) : undefined} />
							<Input label={t("Delivery time (minutes)")} type="number" min="1" step="1" {...register('deliveryTimeMinutes', { valueAsNumber: true })} error={errors.deliveryTimeMinutes?.message ? t(errors.deliveryTimeMinutes.message) : undefined} />
							<Input label={t("Delivery fee")} type="number" min="0" step="0.01" {...register('deliveryFee', { valueAsNumber: true })} error={errors.deliveryFee?.message ? t(errors.deliveryFee.message) : undefined} />
							<Input label={t("Minimum order")} type="number" min="0" step="0.01" {...register('minOrder', { valueAsNumber: true })} error={errors.minOrder?.message ? t(errors.minOrder.message) : undefined} />
							<Input label={t("Opening hours")} autoComplete="off" hint={t("Optional; enter the hours as shown to guests.")} wrapperClassName="sm:col-span-2" {...register('openingHours')} error={errors.openingHours?.message ? t(errors.openingHours.message) : undefined} />
						</div>
						<div className="space-y-3">
							<div>
								<h3 className="text-sm font-semibold text-text-main">{t('Restaurant cover image')}</h3>
								<p id="restaurant-image-help" className="mt-1 text-sm text-text-slate">{t('JPG, JPEG, PNG, or WEBP. Maximum file size: 3 MB.')}</p>
							</div>
							<div className="grid gap-4 rounded-xl border border-border-subtle bg-surface-cream p-3 sm:grid-cols-[minmax(0,1.15fr)_minmax(14rem,0.85fr)] sm:items-center sm:p-4">
								<div className="aspect-[16/9] overflow-hidden rounded-lg border border-border-subtle bg-surface-white">
									<RestaurantImage
										restaurant={restaurant}
										srcOverride={previewUrl ?? selectedImage ?? undefined}
										alt={`${restaurant.name} cover preview`}
										className="size-full object-cover"
									/>
								</div>
								<div className="space-y-3">
									<p className="text-sm text-text-slate">{selectedImage || previewUrl ? t('Your new image is ready to save.') : t('Choose a cover image that represents your restaurant.')}</p>
									<input
										ref={imageInputRef}
										id="restaurant-cover-upload"
										type="file"
										accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
										className="sr-only"
										aria-label={t("Choose restaurant cover image")}
										aria-describedby="restaurant-image-help"
										onChange={(event) => void handleImageSelection(event)}
									/>
									<Button
										type="button"
										variant="outline"
										disabled={isProcessingImage || isSubmitting}
										onClick={() => imageInputRef.current?.click()}
									>
										<ImagePlus aria-hidden="true" size={17} />
										{selectedImage || previewUrl || restaurant.cover ? t('Replace image') : t('Choose image')}
									</Button>
									{isProcessingImage && <p role="status" className="text-sm text-text-slate">{t("Preparing image preview…")}</p>}
									{imageError && <p role="alert" className="text-sm text-danger">{imageError}</p>}
								</div>
							</div>
						</div>
						{errors.root?.serverError?.message && (
							<p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
								{errors.root.serverError.message}
							</p>
						)}
						<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
							<Button type="button" variant="ghost" disabled={isSubmitting} onClick={cancelEditing}>{t("Cancel")}</Button>
							<Button type="submit" loading={isSubmitting} disabled={(!isDirty && !selectedImage) || isProcessingImage}>{t('Save changes')}</Button>
						</div>
					</form>
				</Card>
			) : (
				<div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
					<Card className="rounded-2xl" padding="lg">
						<h2 className="text-lg font-semibold text-text-main">{t('About')}</h2>
						<dl className="mt-5 space-y-5">
							<ProfileDetail icon={<MapPin aria-hidden="true" size={18} />} label={t("Address")} value={restaurant.address} />
							<ProfileDetail icon={<Phone aria-hidden="true" size={18} />} label={t("Phone")} value={restaurant.phone} />
							<ProfileDetail icon={<Clock3 aria-hidden="true" size={18} />} label={t("Opening hours")} value={restaurant.openingHours?.trim() || t('Hours not provided')} muted={!restaurant.openingHours?.trim()} />
						</dl>
					</Card>
					<Card className="rounded-2xl bg-surface-cream" padding="lg">
						<p className="text-xs font-semibold tracking-[0.14em] text-text-slate">{t('GUEST SNAPSHOT')}</p>
						<p className="mt-3 text-2xl font-semibold text-text-main">{restaurant.rating > 0 ? restaurant.rating.toFixed(1) : t('New')}</p>
						<p className="mt-1 text-sm text-text-slate">
							{restaurant.rating > 0
								? `${restaurant.reviewsCount ?? t('Review count unavailable')} ${t('reviews from menu items')}`
								: t('No rating yet')}
						</p>
						<div className="mt-5 border-t border-border-subtle pt-4">
							<p className="text-sm font-medium text-text-main">{t('Profile photo')}</p>
							<p className="mt-1 text-sm text-text-slate">{restaurant.cover ? t('Custom cover image saved') : t('Using the restaurant image')}</p>
						</div>
					</Card>
				</div>
			)}
		</section>
	)
}

function toFormValues(restaurant: Restaurant): RestaurantProfileFormValues {
	return {
		name: restaurant.name,
		cuisine: restaurant.cuisine,
		address: restaurant.address,
		phone: restaurant.phone,
		deliveryTimeMinutes: restaurant.deliveryTimeMinutes,
		deliveryFee: restaurant.deliveryFee,
		minOrder: restaurant.minOrder,
		openingHours: restaurant.openingHours ?? '',
	}
}

async function encodeImageForStorage(file: File): Promise<string> {
	const bitmap = await createImageBitmap(file)
	try {
		let maxDimension = 1800
		for (let resizeAttempt = 0; resizeAttempt < 6; resizeAttempt += 1) {
			const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
			const canvas = document.createElement('canvas')
			canvas.width = Math.max(1, Math.round(bitmap.width * scale))
			canvas.height = Math.max(1, Math.round(bitmap.height * scale))
			const context = canvas.getContext('2d')
			if (!context) throw new Error('Image processing is unavailable.')
			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

			for (const quality of [0.86, 0.74, 0.62, 0.5]) {
				const dataUrl = canvas.toDataURL('image/webp', quality)
				if (dataUrl.length <= 2_400_000) return dataUrl
			}
			maxDimension = Math.round(maxDimension * 0.75)
		}
		throw new Error('The image is too large to store locally.')
	} finally {
		bitmap.close()
	}
}

function ProfileMetric({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode
	label: string
	value: string
}) {
	return (
		<div className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-cream px-4 py-3">
			<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-red">{icon}</span>
			<span className="min-w-0">
				<span className="block text-xs text-text-slate">{label}</span>
				<span className="block truncate text-sm font-semibold text-text-main">{value}</span>
			</span>
		</div>
	)
}

function ProfileDetail({
	icon,
	label,
	value,
	muted = false,
}: {
	icon: React.ReactNode
	label: string
	value: string
	muted?: boolean
}) {
	return (
		<div className="flex items-start gap-3">
			<span className="mt-0.5 text-brand-red">{icon}</span>
			<div className="min-w-0">
				<dt className="text-xs text-text-slate">{label}</dt>
				<dd className={`mt-1 break-words text-sm ${muted ? 'text-text-slate' : 'text-text-main'}`}>{value}</dd>
			</div>
		</div>
	)
}