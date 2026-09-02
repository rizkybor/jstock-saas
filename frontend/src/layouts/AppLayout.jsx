import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Can from "../routes/Can";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", permission: "dashboard.view" },
  { to: "/clients", label: "Data Klien", permission: "clients.view" },
  { to: "/products", label: "Data Barang", permission: "products.view" },
  { to: "/transactions", label: "Transaksi", permission: "transactions.view" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      {menuOpen && (
        <button
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-lg font-bold text-ink">
            j<span className="text-primary">stock</span>
          </span>
          <button
            aria-label="Tutup menu"
            className="text-ink-muted lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Can permission={item.permission} key={item.to}>
              <Link
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === item.to
                    ? "bg-primary-soft text-primary-ink"
                    : "text-ink-muted hover:bg-surface-2"
                }`}
              >
                {item.label}
              </Link>
            </Can>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:px-6">
          <button
            aria-label="Buka menu"
            className="text-ink lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-ink-muted">
              {user?.name} &middot; {user?.role}
            </span>
            <button onClick={logout} className="font-semibold text-primary-ink hover:underline">
              Logout
            </button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
