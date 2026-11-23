import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import type { Role } from "@/shared/types/user";
import { getHomePathForRole } from "@/shared/utils/authRedirect";
import { Spinner } from "@/shared/components/Spinner";
import { useLanguage } from "@/shared/hooks/useLanguage";

interface RoleRouteProps {
  allow: Role[];
  /** Optional override for where disallowed roles land (defaults to their role home). */
  denyRedirect?: string;
}

export default function RoleRoute({ allow, denyRedirect }: RoleRouteProps) {
  const { user, isAuthenticated, isSessionLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isSessionLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label={t('Loading...')} />
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={denyRedirect ?? getHomePathForRole(user.role)} replace />;
  }
  return <Outlet />;
}
