import { EmptyState } from '@/shared/components/EmptyState'
import { useAuth } from '@/shared/hooks/useAuth'
import CustomerProfile from '@/pages/profile/CustomerProfile'

export default function ProfilePage() {
	const { user } = useAuth()

	if (!user) return null
	if (user.role === 'restaurant') {
		return (
			<section className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
				<EmptyState title="Restaurant profile is coming soon" description="Restaurant profile details will be available here soon." />
			</section>
		)
	}

	return <CustomerProfile user={user} />
}