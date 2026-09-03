import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Input, Modal, PageHeader, Pagination, Select } from "../../components/ui";
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
  const [formOpen, setFormOpen] = useState(false);
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

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

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
      closeForm();
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

  const handleCancel = async (id) => {
    if (!confirm("Batalkan transaksi ini?")) return;
    setError(null);
    setActionId(id);
    setActionType("cancel");
    try {
      await apiClient.delete(`/transactions/${id}`);
      await loadTransactions(meta.current_page);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal membatalkan transaksi.");
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

  if (can("transactions.approve") || can("transactions.delete")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) =>
        row.status === "pending" && (
          <div className="flex flex-wrap gap-2">
            <Can permission="transactions.approve">
              <Button
                variant="success"
                size="sm"
                loading={actionId === row.id && actionType === "approve"}
                disabled={actionId === row.id && actionType !== "approve"}
                onClick={() => handleApprove(row.id)}
              >
                Approve
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                loading={actionId === row.id && actionType === "reject"}
                disabled={actionId === row.id && actionType !== "reject"}
                onClick={() => handleReject(row.id)}
              >
                Reject
              </Button>
            </Can>
            <Can permission="transactions.delete">
              <Button
                variant="secondary"
                size="sm"
                loading={actionId === row.id && actionType === "cancel"}
                disabled={actionId === row.id && actionType !== "cancel"}
                onClick={() => handleCancel(row.id)}
              >
                Batalkan
              </Button>
            </Can>
          </div>
        ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Transaksi Barang Keluar"
        description="Catat pengeluaran barang dan pantau status approval."
        action={
          <Can permission="transactions.create">
            <Button onClick={openCreate}>+ Transaksi Keluar</Button>
          </Can>
        }
      />

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

      {formOpen && (
        <Modal title="Transaksi Barang Keluar" description="Cari barang, lalu lengkapi data pengirim & penerima." onClose={closeForm} width="640px">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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

            {selectedProduct && (
              <div className="rounded-lg bg-surface-2 p-4">
                <div className="mb-2 text-xs font-semibold tracking-wide text-success uppercase">✓ Barang Ditemukan</div>
                <div className="mb-1 text-base font-semibold text-ink">{selectedProduct.name}</div>
                <div className="mb-2">
                  <CodeChip>{selectedProduct.lot_batch}</CodeChip>
                </div>
                <div className="text-sm text-ink-muted">Stok tersedia: {selectedProduct.stock_qty}</div>
              </div>
            )}

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>
            <Input
              label="Perusahaan Penerima"
              name="recipient_company"
              hint="Opsional"
              value={form.recipient_company}
              onChange={(e) => setForm({ ...form, recipient_company: e.target.value })}
            />

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : "Submit untuk Approval"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
