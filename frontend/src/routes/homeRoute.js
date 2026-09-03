import { MODULE_NAV_ITEMS } from "../utils/moduleNav";

/**
 * Where a user lands right after login, or when hitting an unknown URL —
 * the first nav item of the first module the tenant actually has, so a
 * Warehouse General-only tenant doesn't get redirected into the Inventory
 * Gas Kalibrasi dashboard (a route their module gate blocks).
 */
export function homeRouteFor(user) {
  if (user?.role === "super_admin") return "/admin/tenants";
  if (!user?.tenant_token) return "/login";

  const moduleKey = Object.keys(MODULE_NAV_ITEMS).find((key) => user.modules?.includes(key));
  const firstItem = moduleKey ? MODULE_NAV_ITEMS[moduleKey](user.tenant_token)[0] : null;

  return firstItem?.to ?? `/${user.tenant_token}/dashboard`;
}
