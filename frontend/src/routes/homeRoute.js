/** Where a user lands right after login, or when hitting an unknown URL. */
export function homeRouteFor(user) {
  if (user?.role === "super_admin") return "/admin/tenants";
  if (user?.tenant_id) return `/${user.tenant_id}/dashboard`;
  return "/login";
}
