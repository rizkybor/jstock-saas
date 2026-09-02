import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route-level guard: redirects to /dashboard if the current user lacks
 * the given permission. The API enforces this too — this just avoids
 * flashing a page the user can't actually use.
 */
export default function RequirePermission({ permission }) {
  const { can } = useAuth();

  if (!can(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
