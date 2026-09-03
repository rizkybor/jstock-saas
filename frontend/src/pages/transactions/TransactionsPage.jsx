import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, Card, CodeChip, DataTable, Input, PageHeader, Pagination, Select } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_FORM = { product_id: "", qty: "", sender_name: "", recipient_name: "", recipient_company: "" };

const VALIDATION_RULES = [
  { name: "product_id", label: "Barang / LOT", required: true },
  { name: "qty", label: "Qty", required: true, type: "number", min: 1 },
  { name: "sender_name", label: "Nama Pengirim", required: true },
  { name: "recipient_name", label: "Nama Penerima", required: true },
];

const formatCurrency = (value) => `Rp ${value.toLocaleString("id-ID")}`;

export default function TransactionsPage() {
  const { can } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [actionId, setActionId] = useState(null);
  const [actionType, setActionType] = useState(null);

  const loadTransactions = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/transactions", { params: { page } });
      setTransactions(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data transaksi.");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    // Not paginated on purpose: the dropdown needs every product in stock, not just page 1.
    const { data } = await apiClient.get("/products", { params: { limit: 1000 } });
    setProducts(data.data);
  };

  useEffect(() => {
    loadTransactions(1);
    loadProducts();
  }, []);

  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = validate(form, VALIDATION_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await apiClient.post("/transactions", {
        sender_name: form.sender_name,
        recipient_name: form.recipient_name,
        recipient_company: form.recipient_company,
        items: [{ product_id: Number(form.product_id), qty: Number(form.qty) }],
      });
      setForm(EMPTY_FORM);
      setFieldErrors({});
      await Promise.all([loadTransactions(1), loadProducts()]);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal membuat transaksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    setError(null);
    setActionId(id);
    setActionType("approve");
    try {
      await apiClient.patch(`/transactions/${id}/approve`);
      await Promise.all([loadTransactions(meta.current_page), loadProducts()]);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal approve transaksi.");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const handleReject = async (id) => {
    const note = prompt("Alasan penolakan:");
    if (!note) return;
    setError(null);
    setActionId(id);
    setActionType("reject");
    try {
      await apiClient.patch(`/transactions/${id}/reject`, { rejection_note: note });
      await loadTransactions(meta.current_page);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal reject transaksi.");
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const columns = [
    { key: "trx_number", header: "No. Trx", render: (row) => <CodeChip>{row.trx_number}</CodeChip> },
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
            <Button
              variant="success"
              size="sm"
              loading={actionId === row.id && actionType === "approve"}
              disabled={actionId === row.id && actionType === "reject"}
              onClick={() => handleApprove(row.id)}
            >
              Approve
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              loading={actionId === row.id && actionType === "reject"}
              disabled={actionId === row.id && actionType === "approve"}
              onClick={() => handleReject(row.id)}
            >
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
          <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Barang / LOT"
              name="product_id"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              error={fieldErrors.product_id}
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
              error={fieldErrors.qty}
              required
            />
            <Input
              label="Nama Pengirim"
              name="sender_name"
              value={form.sender_name}
              onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
              error={fieldErrors.sender_name}
              required
            />
            <Input
              label="Nama Penerima"
              name="recipient_name"
              value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
              error={fieldErrors.recipient_name}
              required
            />
            <Input
              label="Perusahaan Penerima"
              name="recipient_company"
              hint="Opsional"
              value={form.recipient_company}
              onChange={(e) => setForm({ ...form, recipient_company: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <span aria-hidden="true" className="text-sm font-semibold text-transparent select-none">
                Aksi
              </span>
              <Button type="submit" loading={submitting} className="h-10 w-full">
                {submitting ? "Menyimpan..." : "Submit untuk Approval"}
              </Button>
            </div>
          </form>
          {selectedProduct && (
            <div className="mt-4 rounded-lg bg-surface-2 p-4">
              <div className="mb-2 text-xs font-semibold tracking-wide text-success uppercase">✓ Barang Ditemukan</div>
              <div className="mb-1 text-base font-semibold text-ink">{selectedProduct.name}</div>
              <div className="mb-2">
                <CodeChip>{selectedProduct.lot_batch}</CodeChip>
              </div>
              <div className="text-sm text-ink-muted">Stok tersedia: {selectedProduct.stock_qty}</div>
            </div>
          )}
        </Card>
      </Can>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={transactions}
        rowKey={(row) => row.id}
        emptyMessage="Belum ada transaksi."
        startIndex={(meta.current_page - 1) * 10}
        loading={loading}
      />
      {!loading && (
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          onPageChange={loadTransactions}
        />
      )}
    </div>
  );
}
