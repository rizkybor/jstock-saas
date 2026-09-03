import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, Card, DataTable, Input, PageHeader, Pagination } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_FORM = { company_name: "", pic_name: "", phone: "", email: "" };

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
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const loadClients = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/clients", { params: { page } });
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
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = validate(form, VALIDATION_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await apiClient.post("/clients", form);
      setForm(EMPTY_FORM);
      setFieldErrors({});
      await loadClients(1);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal menambahkan klien.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Nonaktifkan klien ini?")) return;
    await apiClient.delete(`/clients/${id}`);
    await loadClients(meta.current_page);
  };

  const columns = [
    { key: "company_name", header: "Perusahaan" },
    { key: "pic_name", header: "PIC" },
    { key: "phone", header: "Telepon", render: (row) => row.phone ?? "-" },
    { key: "email", header: "Email", render: (row) => row.email ?? "-" },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge status={row.is_active ? "active" : "inactive"}>{row.is_active ? "Aktif" : "Nonaktif"}</Badge>,
    },
  ];

  if (can("clients.delete")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <Button variant="danger" size="sm" onClick={() => handleDeactivate(row.id)}>
          Nonaktifkan
        </Button>
      ),
    });
  }

  return (
    <div>
      <PageHeader title="Data Klien" description="Kelola data perusahaan klien dan kontak PIC." />

      <Can permission="clients.create">
        <Card title="Tambah Klien Baru" className="mb-6">
          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Nama Perusahaan"
              name="company_name"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              error={fieldErrors.company_name}
              required
            />
            <Input
              label="Nama PIC"
              name="pic_name"
              value={form.pic_name}
              onChange={(e) => setForm({ ...form, pic_name: e.target.value })}
              error={fieldErrors.pic_name}
              required
            />
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
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Tambah Klien"}
              </Button>
            </div>
          </form>
        </Card>
      </Can>

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
            rows={clients}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada data klien."
            startIndex={(meta.current_page - 1) * 10}
          />
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            onPageChange={loadClients}
          />
        </>
      )}
    </div>
  );
}
