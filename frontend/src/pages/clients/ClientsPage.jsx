import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, Card, DataTable, Input, PageHeader } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";

const EMPTY_FORM = { company_name: "", pic_name: "", phone: "", email: "" };

export default function ClientsPage() {
  const { can } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/clients");
      setClients(data.data);
    } catch {
      setError("Gagal memuat data klien.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/clients", form);
      setForm(EMPTY_FORM);
      await loadClients();
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal menambahkan klien.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm("Nonaktifkan klien ini?")) return;
    await apiClient.delete(`/clients/${id}`);
    await loadClients();
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
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Nama Perusahaan"
              name="company_name"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              required
            />
            <Input
              label="Nama PIC"
              name="pic_name"
              value={form.pic_name}
              onChange={(e) => setForm({ ...form, pic_name: e.target.value })}
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
            />
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Tambah Klien"}
              </Button>
            </div>
          </form>
        </Card>
      </Can>

      <div className="mb-4">
        <Alert>{error}</Alert>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Memuat...</p>
      ) : (
        <DataTable
          columns={columns}
          rows={clients}
          rowKey={(row) => row.id}
          emptyMessage="Belum ada data klien."
        />
      )}
    </div>
  );
}
