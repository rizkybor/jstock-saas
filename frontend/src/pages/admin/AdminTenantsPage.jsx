import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import {
  Alert,
  Badge,
  Button,
  CodeChip,
  DataTable,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Skeleton,
  StatTile,
} from "../../components/ui";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_TENANT_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  owner_name: "",
  owner_email: "",
  owner_password: "",
};

const CREATE_RULES = [
  { name: "name", label: "Nama Perusahaan", required: true },
  { name: "email", label: "Email Perusahaan", type: "email" },
  { name: "owner_name", label: "Nama Owner", required: true },
  { name: "owner_email", label: "Email Owner", required: true, type: "email" },
  { name: "owner_password", label: "Password Owner", required: true },
];

const EDIT_RULES = [
  { name: "name", label: "Nama Perusahaan", required: true },
  { name: "email", label: "Email Perusahaan", type: "email" },
];

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [catalogModules, setCatalogModules] = useState([]);

  const [moduleTenant, setModuleTenant] = useState(null);
  const [moduleList, setModuleList] = useState([]);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState(null);

  const [formMode, setFormMode] = useState(null); // "create" | "edit" | null
  const [editingTenant, setEditingTenant] = useState(null);
  const [form, setForm] = useState(EMPTY_TENANT_FORM);
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);
  const [formError, setFormError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusBusyToken, setStatusBusyToken] = useState(null);
  const [moduleBusyId, setModuleBusyId] = useState(null);

  const loadTenants = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/admin/tenants", { params: { page } });
      setTenants(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data tenant.");
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

  const loadCatalogModules = async () => {
    try {
      const { data } = await apiClient.get("/admin/modules");
      setCatalogModules(data.data);
    } catch {
      // Non-fatal: the create-tenant form just shows no module checkboxes.
    }
  };

  useEffect(() => {
    loadTenants(1);
    loadStats();
    loadCatalogModules();
  }, []);

  const toggleStatus = async (tenant) => {
    const action = tenant.status === "suspended" ? "activate" : "suspend";
    const confirmMessage =
      action === "suspend"
        ? `Suspend tenant "${tenant.name}"? Semua user di tenant ini tidak akan bisa login.`
        : `Aktifkan kembali tenant "${tenant.name}"?`;
    if (!confirm(confirmMessage)) return;

    setError(null);
    setStatusBusyToken(tenant.token);
    try {
      await apiClient.patch(`/admin/tenants/${tenant.token}/${action}`);
      await Promise.all([loadTenants(meta.current_page), loadStats()]);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memperbarui status tenant.");
    } finally {
      setStatusBusyToken(null);
    }
  };

  const openModules = async (tenant) => {
    setModuleTenant(tenant);
    setModuleError(null);
    setModuleLoading(true);
    try {
      const { data } = await apiClient.get(`/admin/tenants/${tenant.token}/modules`);
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
    setModuleBusyId(module.id);
    try {
      if (module.enabled) {
        await apiClient.delete(`/admin/tenants/${moduleTenant.token}/modules/${module.id}`);
      } else {
        await apiClient.post(`/admin/tenants/${moduleTenant.token}/modules/${module.id}`);
      }
      setModuleList((list) => list.map((m) => (m.id === module.id ? { ...m, enabled: !m.enabled } : m)));
      await loadTenants(meta.current_page);
    } catch (err) {
      setModuleError(err.response?.data?.message ?? "Gagal memperbarui modul.");
    } finally {
      setModuleBusyId(null);
    }
  };

  const openCreate = () => {
    setForm(EMPTY_TENANT_FORM);
    setSelectedModuleIds([]);
    setFieldErrors({});
    setFormError(null);
    setFormMode("create");
  };

  const openEdit = (tenant) => {
    setEditingTenant(tenant);
    setForm({
      name: tenant.name ?? "",
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      address: tenant.address ?? "",
      owner_name: "",
      owner_email: "",
      owner_password: "",
    });
    setFieldErrors({});
    setFormError(null);
    setFormMode("edit");
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingTenant(null);
  };

  const toggleSelectedModule = (moduleId) => {
    setSelectedModuleIds((ids) => (ids.includes(moduleId) ? ids.filter((id) => id !== moduleId) : [...ids, moduleId]));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const rules = formMode === "create" ? CREATE_RULES : EDIT_RULES;
    const errors = validate(form, rules);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      if (formMode === "create") {
        await apiClient.post("/admin/tenants", { ...form, module_ids: selectedModuleIds });
      } else {
        await apiClient.put(`/admin/tenants/${editingTenant.token}`, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
        });
      }
      closeForm();
      await Promise.all([loadTenants(meta.current_page), loadStats()]);
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Gagal menyimpan tenant.");
    } finally {
      setSubmitting(false);
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openModules(row)}>
            Kelola Modul
          </Button>
          <Button
            variant={row.status === "suspended" ? "primary" : "danger"}
            size="sm"
            loading={statusBusyToken === row.token}
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
      <PageHeader
        title="Kelola Tenant"
        description="Panel platform Super Admin — memantau dan mengelola seluruh tenant jstock."
        action={<Button onClick={openCreate}>+ Tambah Tenant</Button>}
      />

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

      <DataTable
        columns={columns}
        rows={tenants}
        rowKey={(row) => row.token}
        emptyMessage="Belum ada tenant terdaftar."
        startIndex={(meta.current_page - 1) * 10}
        loading={loading}
      />
      {!loading && (
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          onPageChange={loadTenants}
        />
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
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {moduleList.map((module) => (
                <label
                  key={module.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-surface-2 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                >
                  <input
                    type="checkbox"
                    checked={module.enabled}
                    disabled={moduleBusyId === module.id}
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

      {formMode && (
        <Modal
          title={formMode === "create" ? "Tambah Tenant Baru" : `Edit Tenant — ${editingTenant?.name}`}
          description={
            formMode === "create"
              ? "Buat tenant baru beserta akun Owner-nya, dan pilih modul yang langsung aktif."
              : "Perbarui profil perusahaan tenant ini."
          }
          onClose={closeForm}
          width="560px"
        >
          <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Perusahaan"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Email Perusahaan"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={fieldErrors.email}
              />
              <Input
                label="Telepon"
                name="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <Input
              label="Alamat"
              name="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            {formMode === "create" && (
              <>
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-sm font-semibold text-ink">Akun Owner</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Nama Owner"
                      name="owner_name"
                      value={form.owner_name}
                      onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                      error={fieldErrors.owner_name}
                      required
                    />
                    <Input
                      label="Email Owner"
                      name="owner_email"
                      type="email"
                      value={form.owner_email}
                      onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
                      error={fieldErrors.owner_email}
                      required
                    />
                  </div>
                  <div className="mt-4">
                    <Input
                      label="Password Owner"
                      name="owner_password"
                      type="password"
                      hint="Minimal 8 karakter"
                      value={form.owner_password}
                      onChange={(e) => setForm({ ...form, owner_password: e.target.value })}
                      error={fieldErrors.owner_password}
                      required
                    />
                  </div>
                </div>

                {catalogModules.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="mb-3 text-sm font-semibold text-ink">Modul Aktif</p>
                    <div className="flex flex-col gap-2">
                      {catalogModules.map((module) => (
                        <label
                          key={module.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-surface-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedModuleIds.includes(module.id)}
                            onChange={() => toggleSelectedModule(module.id)}
                            className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                          />
                          <div>
                            <div className="text-sm font-semibold text-ink">{module.name}</div>
                            {module.description && (
                              <div className="text-xs text-ink-muted">{module.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {formError && <Alert>{formError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : formMode === "create" ? "Buat Tenant" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
