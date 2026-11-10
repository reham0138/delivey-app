import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import type { Role } from "@/shared/types/user";
import { getHomePathForRole } from "@/shared/utils/authRedirect";

interface RoleRouteProps {
  allow: Role[];
}

export default function RoleRoute({ allow }: RoleRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }
  return <Outlet />;
}
