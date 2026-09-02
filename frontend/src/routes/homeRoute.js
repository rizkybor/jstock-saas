/** Where a user lands right after login, or when hitting an unknown URL. */
export function homeRouteFor(user) {
  return user?.role === "super_admin" ? "/admin/tenants" : "/dashboard";
}
