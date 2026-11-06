import { useState } from 'react'
import { Store } from 'lucide-react'
import type { Restaurant } from '@/shared/types'

interface RestaurantImageProps {
	restaurant: Pick<Restaurant, 'name' | 'image' | 'cover'>
	alt?: string
	className?: string
	srcOverride?: string
	loading?: 'eager' | 'lazy'
}

export function RestaurantImage({
	restaurant,
	alt = `${restaurant.name} restaurant`,
	className = 'size-full object-cover',
	srcOverride,
	loading,
}: RestaurantImageProps) {
	const [failedSrc, setFailedSrc] = useState('')
	const configuredSrc = srcOverride ?? (restaurant.cover?.trim() || restaurant.image.trim())
	const src = configuredSrc.includes('picsum.photos') ? '' : configuredSrc

	if (!src || failedSrc === src) {
		return (
			<div role="img" aria-label={alt} className={`grid place-items-center bg-gradient-to-br from-brand-yellow/20 via-surface-cream to-brand-red/10 text-brand-red ${className}`}>
				<div className="flex flex-col items-center gap-2 px-4 text-center">
					<Store aria-hidden="true" className="size-12" />
					<span className="max-w-full break-words text-sm font-semibold">{restaurant.name}</span>
				</div>
			</div>
		)
	}

	return (
		<img
			key={src}
			src={src}
			alt={alt}
			loading={loading}
			className={className}
			onError={() => setFailedSrc(src)}
		/>
	)
}