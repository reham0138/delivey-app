import { useAuth } from '@/shared/hooks/useAuth'
import CustomerProfile from '@/pages/profile/CustomerProfile'
import RestaurantProfile from '@/pages/profile/RestaurantProfile'
import { Navigate } from 'react-router-dom'

export default function ProfilePage() {
	const { user } = useAuth()

	if (!user) return null
	if (user.role === 'restaurant') return <RestaurantProfile ownerId={user.id} />
	if (user.role === 'admin') return <Navigate to="/" replace />

	return <CustomerProfile user={user} />
}