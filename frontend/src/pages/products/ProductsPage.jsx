import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Button, Card, DataTable, Input, PageHeader } from "../../components/ui";
import Can from "../../routes/Can";

const EMPTY_FORM = { name: "", unit_cost: "", quantity: "", additional_cost: "" };

const formatCurrency = (value) => `Rp ${value.toLocaleString("id-ID")}`;

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
      setError(err.response?.data?.message ?? "Gagal menambahkan barang.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "name", header: "Nama Barang" },
    { key: "lot_batch", header: "LOT/Batch", render: (row) => <span className="font-mono text-xs">{row.lot_batch}</span> },
    { key: "unit_cost", header: "Unit Cost", render: (row) => formatCurrency(row.unit_cost) },
    { key: "grand_total_cost", header: "Grand Total Cost", render: (row) => formatCurrency(row.grand_total_cost) },
    { key: "cogs", header: "COGS/unit", render: (row) => formatCurrency(row.cogs) },
    { key: "stock_qty", header: "Stok" },
  ];

  return (
    <div>
      <PageHeader title="Data Barang" description="Master inventory berbasis LOT/Batch dengan kalkulasi COGS otomatis." />

      <Can permission="products.create">
        <Card title="Tambah Barang Baru" className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <Input
                label="Nama Barang"
                name="name"
                placeholder="mis. 8AL 25PPM H2S/100PPM CO"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <Input
              label="Unit Cost"
              name="unit_cost"
              type="number"
              min="0"
              value={form.unit_cost}
              onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
              required
            />
            <Input
              label="Qty"
              name="quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
            <Input
              label="Biaya Tambahan"
              name="additional_cost"
              type="number"
              min="0"
              hint="Opsional, mis. ongkos kirim"
              value={form.additional_cost}
              onChange={(e) => setForm({ ...form, additional_cost: e.target.value })}
            />
            <div className="flex items-end">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Menyimpan..." : "Tambah Barang"}
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
        <DataTable
          columns={columns}
          rows={products}
          rowKey={(row) => row.id}
          emptyMessage="Belum ada data barang."
        />
      )}
    </div>
  );
}
