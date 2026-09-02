import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ClientsPage from "./pages/clients/ClientsPage";
import ProductsPage from "./pages/products/ProductsPage";
import TransactionsPage from "./pages/transactions/TransactionsPage";
import AdminTenantsPage from "./pages/admin/AdminTenantsPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import RequirePermission from "./routes/RequirePermission";
import { homeRouteFor } from "./routes/homeRoute";
import { useAuth } from "./context/AuthContext";

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={homeRouteFor(user)} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />

          <Route element={<RequirePermission permission="admin.tenants.view" />}>
            <Route path="/admin/tenants" element={<AdminTenantsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}

export default App;
