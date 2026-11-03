import type { Role } from '@/shared/types/user'

// README targets are customer '/', restaurant '/dashboard/restaurant', admin '/dashboard/admin'; switch when those pages exist.
export function getHomePathForRole(role: Role): string {
	switch (role) {
		case 'customer':
		case 'restaurant':
		case 'admin':
			return '/meals'
	}
}