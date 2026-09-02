import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import Can from "../../routes/Can";

const EMPTY_FORM = { name: "", unit_cost: "", quantity: "", additional_cost: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/products");
      setProducts(data.data);
    } catch {
      setError("Gagal memuat data barang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/products", form);
      setForm(EMPTY_FORM);
      await loadProducts();
    } catch (err) {
      const message = err.response?.data?.message ?? "Gagal menambahkan barang.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Data Barang</h1>

      <Can permission="products.create">
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: ".5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <input
            placeholder="Nama Barang (mis. 8AL 25PPM H2S/100PPM CO)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ minWidth: 260 }}
            required
          />
          <input
            type="number"
            placeholder="Unit Cost"
            value={form.unit_cost}
            onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Qty"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Biaya Tambahan (opsional)"
            value={form.additional_cost}
            onChange={(e) => setForm({ ...form, additional_cost: e.target.value })}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Tambah Barang"}
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
              <th>Nama Barang</th>
              <th>LOT/Batch</th>
              <th>Unit Cost</th>
              <th>Grand Total Cost</th>
              <th>COGS/unit</th>
              <th>Stok</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6}>Belum ada data barang.</td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.lot_batch}</td>
                <td>{product.unit_cost.toLocaleString("id-ID")}</td>
                <td>{product.grand_total_cost.toLocaleString("id-ID")}</td>
                <td>{product.cogs.toLocaleString("id-ID")}</td>
                <td>{product.stock_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
