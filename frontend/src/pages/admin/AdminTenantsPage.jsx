import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Modal, PageHeader, Pagination, StatTile } from "../../components/ui";

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [moduleTenant, setModuleTenant] = useState(null);
  const [moduleList, setModuleList] = useState([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState(null);

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

  const openModules = async (tenant) => {
    setModuleTenant(tenant);
    setModuleError(null);
    setModuleLoading(true);
    try {
      const { data } = await apiClient.get(`/admin/tenants/${tenant.id}/modules`);
      setModuleList(data.data);
    } catch {
      setModuleError("Gagal memuat modul tenant ini.");
    } finally {
      setModuleLoading(false);
    }
  };

  const closeModules = () => {
    setModuleTenant(null);
    setModuleList([]);
  };

  const toggleModule = async (module) => {
    setModuleError(null);
    try {
      if (module.enabled) {
        await apiClient.delete(`/admin/tenants/${moduleTenant.id}/modules/${module.id}`);
      } else {
        await apiClient.post(`/admin/tenants/${moduleTenant.id}/modules/${module.id}`);
      }
      setModuleList((list) => list.map((m) => (m.id === module.id ? { ...m, enabled: !m.enabled } : m)));
      await loadTenants(meta.current_page);
    } catch (err) {
      setModuleError(err.response?.data?.message ?? "Gagal memperbarui modul.");
    }
  };

  const columns = [
    { key: "name", header: "Nama Perusahaan" },
    { key: "slug", header: "Slug", render: (row) => <CodeChip>{row.slug}</CodeChip> },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status}>{row.status}</Badge> },
    { key: "users_count", header: "Jumlah User" },
    { key: "plan", header: "Plan", render: (row) => row.plan ?? "-" },
    {
      key: "modules",
      header: "Modul Aktif",
      render: (row) =>
        row.modules?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {row.modules.map((m) => (
              <Badge key={m.id} status="active">
                {m.name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-ink-faint">Belum ada modul</span>
        ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openModules(row)}>
            Kelola Modul
          </Button>
          <Button
            variant={row.status === "suspended" ? "primary" : "danger"}
            size="sm"
            onClick={() => toggleStatus(row)}
          >
            {row.status === "suspended" ? "Aktifkan" : "Suspend"}
          </Button>
        </div>
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

      {moduleTenant && (
        <Modal
          title="Kelola Modul"
          description={`Tentukan modul sistem yang aktif untuk "${moduleTenant.name}". Modul baru bisa ditambahkan di sini setelah fitur/proses bisnisnya selesai dibangun.`}
          onClose={closeModules}
        >
          {moduleError && (
            <div className="mb-3">
              <Alert>{moduleError}</Alert>
            </div>
          )}

          {moduleLoading ? (
            <p className="text-sm text-ink-muted">Memuat...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {moduleList.map((module) => (
                <label
                  key={module.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={module.enabled}
                    onChange={() => toggleModule(module)}
                    className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                  />
                  <div>
                    <div className="text-sm font-semibold text-ink">{module.name}</div>
                    {module.description && <div className="text-xs text-ink-muted">{module.description}</div>}
                  </div>
                </label>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button variant="secondary" onClick={closeModules}>
              Tutup
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
