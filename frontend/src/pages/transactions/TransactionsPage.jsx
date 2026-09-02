import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, Card, DataTable, Input, PageHeader, Select } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";

const EMPTY_FORM = { product_id: "", qty: "", sender_name: "", recipient_name: "", recipient_company: "" };

const formatCurrency = (value) => `Rp ${value.toLocaleString("id-ID")}`;

export default function TransactionsPage() {
  const { can } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/transactions");
      setTransactions(data.data);
    } catch {
      setError("Gagal memuat data transaksi.");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    const { data } = await apiClient.get("/products");
    setProducts(data.data);
  };

  useEffect(() => {
    loadTransactions();
    loadProducts();
  }, []);

  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/transactions", {
        sender_name: form.sender_name,
        recipient_name: form.recipient_name,
        recipient_company: form.recipient_company,
        items: [{ product_id: Number(form.product_id), qty: Number(form.qty) }],
      });
      setForm(EMPTY_FORM);
      await Promise.all([loadTransactions(), loadProducts()]);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal membuat transaksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setError(null);
    try {
      await apiClient.patch(`/transactions/${id}/approve`);
      await Promise.all([loadTransactions(), loadProducts()]);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal approve transaksi.");
    }
  };

  const handleReject = async (id) => {
    const note = prompt("Alasan penolakan:");
    if (!note) return;
    setError(null);
    try {
      await apiClient.patch(`/transactions/${id}/reject`, { rejection_note: note });
      await loadTransactions();
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal reject transaksi.");
    }
  };

  const columns = [
    { key: "trx_number", header: "No. Trx", render: (row) => <span className="font-mono text-xs">{row.trx_number}</span> },
    { key: "sender", header: "Pengirim", render: (row) => row.sender?.name ?? "-" },
    { key: "recipient", header: "Penerima", render: (row) => row.recipient?.name ?? "-" },
    { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status}>{row.status}</Badge> },
  ];

  if (can("transactions.approve")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) =>
        row.status === "pending" && (
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={() => handleApprove(row.id)}>
              Approve
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleReject(row.id)}>
              Reject
            </Button>
          </div>
        ),
    });
  }

  return (
    <div>
      <PageHeader title="Transaksi Barang Keluar" description="Catat pengeluaran barang dan pantau status approval." />

      <Can permission="transactions.create">
        <Card title="Transaksi Baru" className="mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Barang / LOT"
              name="product_id"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">Pilih barang</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.lot_batch}) &middot; stok {p.stock_qty}
                </option>
              ))}
            </Select>
            <Input
              label="Qty"
              name="qty"
              type="number"
              min="1"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
              required
            />
            <Input
              label="Nama Pengirim"
              name="sender_name"
              value={form.sender_name}
              onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
              required
            />
            <Input
              label="Nama Penerima"
              name="recipient_name"
              value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
              required
            />
            <Input
              label="Perusahaan Penerima"
              name="recipient_company"
              hint="Opsional"
              value={form.recipient_company}
              onChange={(e) => setForm({ ...form, recipient_company: e.target.value })}
            />
            <div className="flex items-end">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Menyimpan..." : "Submit untuk Approval"}
              </Button>
            </div>
          </form>
          {selectedProduct && (
            <p className="mt-3 rounded-md border border-dashed border-warning/40 bg-warning-soft px-3 py-2 text-xs font-medium text-warning">
              Highlight: {selectedProduct.name} &middot; {selectedProduct.lot_batch} &middot; Stok tersedia {selectedProduct.stock_qty}
            </p>
          )}
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
          rows={transactions}
          rowKey={(row) => row.id}
          emptyMessage="Belum ada transaksi."
        />
      )}
    </div>
  );
}
