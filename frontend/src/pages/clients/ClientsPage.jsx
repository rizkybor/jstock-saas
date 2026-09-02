import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import Can from "../../routes/Can";

const EMPTY_FORM = { company_name: "", pic_name: "", phone: "", email: "" };

export default function ClientsPage() {
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
      const message = err.response?.data?.message ?? "Gagal menambahkan klien.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Nonaktifkan klien ini?")) return;
    await apiClient.delete(`/clients/${id}`);
    await loadClients();
  };

  return (
    <div>
      <h1>Data Klien</h1>

      <Can permission="clients.create">
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <input
            placeholder="Nama Perusahaan"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            required
          />
          <input
            placeholder="Nama PIC"
            value={form.pic_name}
            onChange={(e) => setForm({ ...form, pic_name: e.target.value })}
            required
          />
          <input
            placeholder="Telepon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Tambah Klien"}
          </button>
        </form>
      </Can>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {loading ? (
        <p>Memuat...</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Perusahaan</th>
              <th>PIC</th>
              <th>Telepon</th>
              <th>Email</th>
              <th>Status</th>
              <Can permission="clients.delete">
                <th>Aksi</th>
              </Can>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={6}>Belum ada data klien.</td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.company_name}</td>
                <td>{client.pic_name}</td>
                <td>{client.phone ?? "-"}</td>
                <td>{client.email ?? "-"}</td>
                <td>{client.is_active ? "Aktif" : "Nonaktif"}</td>
                <Can permission="clients.delete">
                  <td>
                    <button onClick={() => handleDelete(client.id)}>Nonaktifkan</button>
                  </td>
                </Can>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
