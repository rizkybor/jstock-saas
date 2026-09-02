import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, DataTable, PageHeader, Pagination, StatTile } from "../../components/ui";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const loadTenants = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/admin/tenants", { params: { page } });
      setTenants(data.data);
      setMeta(data.meta);
    } catch {
      setError("Gagal memuat data tenant.");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await apiClient.get("/admin/stats");
      setStats(data.data);
    } catch {
      // Non-fatal: the tenant table below still works without the summary tiles.
    }
  };

  useEffect(() => {
    loadTenants(1);
    loadStats();
  }, []);

  const toggleStatus = async (tenant) => {
    const action = tenant.status === "suspended" ? "activate" : "suspend";
    const confirmMessage =
      action === "suspend"
        ? `Suspend tenant "${tenant.name}"? Semua user di tenant ini tidak akan bisa login.`
        : `Aktifkan kembali tenant "${tenant.name}"?`;
    if (!confirm(confirmMessage)) return;

    setError(null);
    try {
      await apiClient.patch(`/admin/tenants/${tenant.id}/${action}`);
      await Promise.all([loadTenants(meta.current_page), loadStats()]);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memperbarui status tenant.");
    }
  };

  const columns = [
    { key: "name", header: "Nama Perusahaan" },
    { key: "slug", header: "Slug", render: (row) => <span className="font-mono text-xs">{row.slug}</span> },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status}>{row.status}</Badge> },
    { key: "users_count", header: "Jumlah User" },
    { key: "plan", header: "Plan", render: (row) => row.plan ?? "-" },
    {
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <Button
          variant={row.status === "suspended" ? "primary" : "danger"}
          size="sm"
          onClick={() => toggleStatus(row)}
        >
          {row.status === "suspended" ? "Aktifkan" : "Suspend"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Kelola Tenant" description="Panel platform Super Admin — memantau dan mengelola seluruh tenant jstock." />

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Total Tenant" value={stats.total_tenants} />
          <StatTile label="Aktif" value={stats.active_tenants} />
          <StatTile label="Trial" value={stats.trial_tenants} />
          <StatTile label="Suspended" value={stats.suspended_tenants} />
          <StatTile label="Total User" value={stats.total_users} />
          <StatTile label="Total Transaksi" value={stats.total_transactions} />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={tenants}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada tenant terdaftar."
            startIndex={(meta.current_page - 1) * 10}
          />
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            onPageChange={loadTenants}
          />
        </>
      )}
    </div>
  );
}
