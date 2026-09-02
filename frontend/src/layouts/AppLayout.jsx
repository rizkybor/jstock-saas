import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/clients", label: "Data Klien" },
  { to: "/products", label: "Data Barang" },
  { to: "/transactions", label: "Transaksi" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 200, borderRight: "1px solid #ddd", padding: "1rem" }}>
        <h2>jstock</h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1.5rem" }}>
        <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <span>{user?.name} &middot; {user?.role}</span>
          <button onClick={logout}>Logout</button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
