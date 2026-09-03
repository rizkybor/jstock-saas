import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ClientsPage from "./pages/clients/ClientsPage";
import ProductsPage from "./pages/products/ProductsPage";
import ProductScanPage from "./pages/products/ProductScanPage";
import TransactionsPage from "./pages/transactions/TransactionsPage";
import TransactionCreatePage from "./pages/transactions/TransactionCreatePage";
import TransactionScanPage from "./pages/transactions/TransactionScanPage";
import LaporanPage from "./pages/reports/LaporanPage";
import WarehouseLocationsPage from "./pages/warehouse/WarehouseLocationsPage";
import WarehouseItemsPage from "./pages/warehouse/WarehouseItemsPage";
import WarehouseStockPage from "./pages/warehouse/WarehouseStockPage";
import WarehousePurchaseOrdersPage from "./pages/warehouse/WarehousePurchaseOrdersPage";
import WarehouseStockOpnamePage from "./pages/warehouse/WarehouseStockOpnamePage";
import CompanyProfilePage from "./pages/settings/CompanyProfilePage";
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

      {/* Barcode scan destinations render standalone, outside AppLayout and
          outside auth entirely — a scanned label is opened by whoever has
          the physical item (e.g. a courier with no jstock account), not
          just a logged-in tenant user, so these hit public, unauthenticated
          API endpoints (see PublicScanController on the backend) instead of
          RequireOwnTenant/ProtectedRoute. */}
      <Route path="/:tenantId/products/scan/:uniqueId" element={<ProductScanPage />} />
      <Route path="/:tenantId/transactions/scan/:trxNumber" element={<TransactionScanPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RequireOwnTenant />}>
            <Route path="/:tenantId/dashboard" element={<DashboardPage />} />
            <Route path="/:tenantId/clients" element={<ClientsPage />} />
            <Route path="/:tenantId/products" element={<ProductsPage />} />
            <Route path="/:tenantId/transactions" element={<TransactionsPage />} />
            <Route path="/:tenantId/transactions/new" element={<TransactionCreatePage />} />
            <Route path="/:tenantId/reports" element={<LaporanPage />} />

            <Route path="/:tenantId/warehouse/locations" element={<WarehouseLocationsPage />} />
            <Route path="/:tenantId/warehouse/items" element={<WarehouseItemsPage />} />
            <Route path="/:tenantId/warehouse/stock" element={<WarehouseStockPage />} />
            <Route path="/:tenantId/warehouse/purchase-orders" element={<WarehousePurchaseOrdersPage />} />
            <Route path="/:tenantId/warehouse/stock-opname" element={<WarehouseStockOpnamePage />} />

            <Route path="/:tenantId/settings/company" element={<CompanyProfilePage />} />
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
