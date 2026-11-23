import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { Spinner } from '@/shared/components/Spinner'
import { useLanguage } from '@/shared/hooks/useLanguage'

export default function ProtectedRoute() {
  const { isAuthenticated, isSessionLoading } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()

  // Wait for the startup session check so protected pages never flash.
  if (isSessionLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t('Loading...')} />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
