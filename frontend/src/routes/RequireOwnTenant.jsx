import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeRouteFor } from "./homeRoute";

/**
 * Guards every /:tenantId/* route. The backend never trusts this segment
 * for authorization (tenant scoping always comes from the bearer token,
 * per BelongsToTenant) — this is purely a UX guard so a stale bookmark,
 * a typo, or Super Admin poking at a tenant URL lands somewhere sane
 * instead of a confusing empty page.
 *
 * The segment itself is the encrypted tenant token (see backend
 * App\Support\TenantToken) — the frontend never has the key to decrypt
 * it, so this just compares token strings, never raw ids.
 */
export default function RequireOwnTenant() {
  const { user } = useAuth();
  const { tenantId } = useParams();

  if (!user?.tenant_token || user.tenant_token !== tenantId) {
    return <Navigate to={homeRouteFor(user)} replace />;
  }

  return <Outlet />;
}
