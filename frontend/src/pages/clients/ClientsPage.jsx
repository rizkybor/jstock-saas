import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, ConfirmDialog, DataTable, Input, Modal, PageHeader, Pagination, Select } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_FORM = { company_name: "", pic_name: "", pic_position: "", phone: "", email: "" };

const VALIDATION_RULES = [
  { name: "company_name", label: "Nama Perusahaan", required: true },
  { name: "pic_name", label: "Nama PIC", required: true },
  { name: "email", label: "Email", type: "email" },
];

export default function ClientsPage() {
  const { can } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [statusBusyId, setStatusBusyId] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formMode, setFormMode] = useState(null); // "create" | "edit" | null
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadClients = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/clients", {
        params: { page, q: search || undefined, status: statusFilter || undefined },
      });
      setClients(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data klien.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadClients(1);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setFormMode("create");
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({
      company_name: client.company_name ?? "",
      pic_name: client.pic_name ?? "",
      pic_position: client.pic_position ?? "",
      phone: client.phone ?? "",
      email: client.email ?? "",
    });
    setFieldErrors({});
    setFormError(null);
    setFormMode("edit");
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingClient(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const errors = validate(form, VALIDATION_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      if (formMode === "create") {
        await apiClient.post("/clients", form);
      } else {
        await apiClient.put(`/clients/${editingClient.id}`, form);
      }
      closeForm();
      await loadClients(formMode === "create" ? 1 : meta.current_page);
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Gagal menyimpan data klien.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    const client = confirmToggle;
    const activating = !client.is_active;

    setStatusBusyId(client.id);
    try {
      if (activating) {
        await apiClient.put(`/clients/${client.id}`, { is_active: true });
      } else {
        await apiClient.delete(`/clients/${client.id}`);
      }
      setConfirmToggle(null);
      await loadClients(meta.current_page);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memperbarui status klien.");
    } finally {
      setStatusBusyId(null);
    }
  };

  const columns = [
    { key: "company_name", header: "Perusahaan" },
    { key: "pic_name", header: "PIC", render: (row) => (row.pic_position ? `${row.pic_name} — ${row.pic_position}` : row.pic_name) },
    { key: "phone", header: "Telepon", render: (row) => row.phone ?? "-" },
    { key: "email", header: "Email", render: (row) => row.email ?? "-" },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge status={row.is_active ? "active" : "inactive"}>{row.is_active ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ];

  if (can("clients.update") || can("clients.delete")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Can permission="clients.update">
            <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
              Edit
            </Button>
          </Can>
          <Can permission="clients.delete">
            <Button
              variant={row.is_active ? "danger" : "success"}
              size="sm"
              loading={statusBusyId === row.id}
              onClick={() => setConfirmToggle(row)}
            >
              {row.is_active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </Can>
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Data Klien"
        description="Kelola data perusahaan klien dan kontak PIC."
        action={
          <Can permission="clients.create">
            <Button onClick={openCreate}>+ Tambah Klien</Button>
          </Can>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleFilterSubmit} className="mb-4 flex flex-wrap gap-3">
        <Input
          type="search"
          placeholder="Cari nama perusahaan / PIC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={clients}
        rowKey={(row) => row.id}
        emptyMessage="Belum ada data klien."
        startIndex={(meta.current_page - 1) * 10}
        loading={loading}
      />
      {!loading && (
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          onPageChange={loadClients}
        />
      )}

      {formMode && (
        <Modal
          title={formMode === "create" ? "Tambah Klien Baru" : `Edit Klien — ${editingClient?.company_name}`}
          description="Data perusahaan klien dan kontak PIC."
          onClose={closeForm}
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Perusahaan"
              name="company_name"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              error={fieldErrors.company_name}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nama PIC"
                name="pic_name"
                value={form.pic_name}
                onChange={(e) => setForm({ ...form, pic_name: e.target.value })}
                error={fieldErrors.pic_name}
                required
              />
              <Input
                label="Jabatan"
                name="pic_position"
                placeholder="mis. QA Manager"
                value={form.pic_position}
                onChange={(e) => setForm({ ...form, pic_position: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Telepon"
                name="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={fieldErrors.email}
              />
            </div>

            {formError && <Alert>{formError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : formMode === "create" ? "Tambah Klien" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirmToggle && (
        <ConfirmDialog
          title={confirmToggle.is_active ? "Nonaktifkan Klien" : "Aktifkan Klien"}
          description={`${confirmToggle.is_active ? "Nonaktifkan" : "Aktifkan"} klien "${confirmToggle.company_name}"?`}
          confirmLabel={confirmToggle.is_active ? "Nonaktifkan" : "Aktifkan"}
          variant={confirmToggle.is_active ? "danger" : "success"}
          loading={statusBusyId === confirmToggle.id}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirmToggle(null)}
        />
      )}
    </div>
  );
}
