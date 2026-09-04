// Every module the platform has, and the nav items it contributes — each
// item's `menu` key matches that module's entry in Module::MENU_CATALOG on
// the backend, so Super Admin's per-tenant menu toggle (Konfigurasi Tenant
// > Modul) controls exactly these links. A tenant only sees a module's
// items if `user.modules` includes that module key. Shared between
// AppLayout (sidebar) and homeRoute (post-login/unknown-URL redirect) so
// both agree on what a tenant with a given module can actually reach.
export const MODULE_NAV_ITEMS = {
  "inventory-gas-kalibrasi": (tenantId) => [
    { to: `/${tenantId}/dashboard`, label: "Dashboard", permission: "dashboard.view", menu: "dashboard" },
    { to: `/${tenantId}/clients`, label: "Data Klien", permission: "clients.view", menu: "clients" },
    { to: `/${tenantId}/products`, label: "Data Barang", permission: "products.view", menu: "products" },
    { to: `/${tenantId}/transactions`, label: "Transaksi", permission: "transactions.view", menu: "transactions" },
    { to: `/${tenantId}/reports`, label: "Laporan", permission: "reports.view", menu: "reports" },
  ],
  "warehouse-general": (tenantId) => [
    { to: `/${tenantId}/warehouse/dashboard`, label: "Dashboard", permission: "warehouse-dashboard.view", menu: "dashboard" },
    { to: `/${tenantId}/warehouse/locations`, label: "Gudang & Rak", permission: "warehouse-locations.view", menu: "locations" },
    { to: `/${tenantId}/warehouse/items`, label: "Data Barang Gudang", permission: "warehouse-items.view", menu: "items" },
    { to: `/${tenantId}/warehouse/stock`, label: "Stok Masuk & Keluar", permission: "warehouse-stock.view", menu: "stock" },
    {
      to: `/${tenantId}/warehouse/purchase-orders`,
      label: "Purchase Order",
      permission: "warehouse-purchase-orders.view",
      menu: "purchase-orders",
    },
    { to: `/${tenantId}/warehouse/stock-opname`, label: "Stock Opname", permission: "warehouse-stock.view", menu: "stock-opname" },
  ],
};

// Core/platform-level nav items — not tied to any module, so they show up
// for a tenant regardless of which module(s) it has (gated only by
// permission, not by a module's menu-enabled setting).
export const CORE_NAV_ITEMS = (tenantId) => [
  { to: `/${tenantId}/settings/company`, label: "Profil Perusahaan", permission: "tenant.view" },
];
