import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ClientsPage from "./pages/clients/ClientsPage";
import ProductsPage from "./pages/products/ProductsPage";
import TransactionsPage from "./pages/transactions/TransactionsPage";
import TransactionCreatePage from "./pages/transactions/TransactionCreatePage";
import LaporanPage from "./pages/reports/LaporanPage";
import AdminTenantsPage from "./pages/admin/AdminTenantsPage";
import TenantConfigurationPage from "./pages/admin/TenantConfigurationPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import RequirePermission from "./routes/RequirePermission";
import RequireOwnTenant from "./routes/RequireOwnTenant";
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
          <Route element={<RequireOwnTenant />}>
            <Route path="/:tenantId/dashboard" element={<DashboardPage />} />
            <Route path="/:tenantId/clients" element={<ClientsPage />} />
            <Route path="/:tenantId/products" element={<ProductsPage />} />
            <Route path="/:tenantId/transactions" element={<TransactionsPage />} />
            <Route path="/:tenantId/transactions/new" element={<TransactionCreatePage />} />
            <Route path="/:tenantId/reports" element={<LaporanPage />} />
          </Route>

          <Route element={<RequirePermission permission="admin.tenants.view" />}>
            <Route path="/admin/tenants" element={<AdminTenantsPage />} />
            <Route path="/admin/tenants/:tenantToken" element={<TenantConfigurationPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}

export default App;
