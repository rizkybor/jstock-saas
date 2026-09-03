import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeRouteFor } from "./homeRoute";

/**
 * Guards every /:tenantId/* route. The backend never trusts this segment
 * for authorization (tenant scoping always comes from the bearer token,
 * per BelongsToTenant) — this is purely a UX guard so a stale bookmark,
 * a typo, or Super Admin poking at a tenant URL lands somewhere sane
 * instead of a confusing empty page.
 */
export default function RequireOwnTenant() {
  const { user } = useAuth();
  const { tenantId } = useParams();

  if (!user?.tenant_id || String(user.tenant_id) !== tenantId) {
    return <Navigate to={homeRouteFor(user)} replace />;
  }

  return <Outlet />;
}
