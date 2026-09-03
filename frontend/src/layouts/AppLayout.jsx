import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Can from "../routes/Can";

// The one module the platform has today — each nav item's `menu` key
// matches Module::MENU_CATALOG on the backend, so Super Admin's per-tenant
// menu toggle (Konfigurasi Tenant > Modul) controls exactly these links.
const MODULE_KEY = "inventory-gas-kalibrasi";

const tenantNavItems = (tenantId) => [
  { to: `/${tenantId}/dashboard`, label: "Dashboard", permission: "dashboard.view", menu: "dashboard" },
  { to: `/${tenantId}/clients`, label: "Data Klien", permission: "clients.view", menu: "clients" },
  { to: `/${tenantId}/products`, label: "Data Barang", permission: "products.view", menu: "products" },
  { to: `/${tenantId}/transactions`, label: "Transaksi", permission: "transactions.view", menu: "transactions" },
  { to: `/${tenantId}/reports`, label: "Laporan", permission: "reports.view", menu: "reports" },
];

// Super Admin operates at platform level only — it never sees tenant
// business data (clients/products/transactions belong to a tenant, and
// admin's null tenant_id would otherwise mean "every tenant at once").
const PLATFORM_NAV_ITEMS = [{ to: "/admin/tenants", label: "Kelola Tenant", permission: "admin.tenants.view" }];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasModule = user?.modules?.includes(MODULE_KEY);
  const navItems =
    user?.role === "super_admin"
      ? PLATFORM_NAV_ITEMS
      : tenantNavItems(user?.tenant_token).filter((item) => hasModule && user?.menus?.[item.menu] !== false);
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-bg lg:flex lg:h-screen lg:overflow-hidden">
      {menuOpen && (
        <button
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 cursor-pointer bg-black/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-59 shrink-0 flex-col border-r border-border bg-surface p-3 pt-5 transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="h-6.5 w-6.5 rounded-[7px] bg-brand-mark" />
            <span className="text-lg font-bold tracking-[-0.25px] text-ink">jstock</span>
          </div>
          <button
            aria-label="Tutup menu"
            className="cursor-pointer text-ink-muted lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {user?.role !== "super_admin" && navItems.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink-muted">Belum ada modul aktif untuk perusahaan Anda.</p>
          )}
          {navItems.map((item) => (
            <Can permission={item.permission} key={item.to}>
              <Link
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`cursor-pointer rounded-[5px] border-l-[3px] px-3 py-2.5 text-[15px] font-medium transition-colors ${
                  location.pathname === item.to
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-transparent text-ink hover:bg-surface-2"
                }`}
              >
                {item.label}
              </Link>
            </Can>
          ))}
        </nav>

        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{user?.name}</div>
              <div className="truncate text-xs text-ink-faint capitalize">Role: {user?.role}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1.5 w-full cursor-pointer rounded-lg border border-border bg-surface py-2 text-sm font-medium text-ink hover:bg-surface-2"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <button aria-label="Buka menu" className="cursor-pointer text-ink" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
          <span className="text-sm font-semibold text-ink">jstock</span>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
