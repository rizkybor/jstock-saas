import { useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Input, Modal, PageHeader, Pagination, Select } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";

const EMPTY_FORM = {
  qty: "",
  senderMode: "existing",
  sender_id: "",
  sender_name: "",
  recipientMode: "existing",
  recipient_id: "",
  recipient_name: "",
  recipient_position: "",
  recipient_company: "",
};

const formatCurrency = (value) => `Rp ${value.toLocaleString("id-ID")}`;

export default function TransactionsPage() {
  const { can, user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [senders, setSenders] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
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
    // Not paginated on purpose: pencarian barang butuh seluruh stok, bukan cuma halaman 1.
    const { data } = await apiClient.get("/products", { params: { limit: 1000 } });
    setProducts(data.data);
  };

  const loadSenders = async () => {
    const { data } = await apiClient.get("/senders");
    setSenders(data.data);
  };

  const loadRecipients = async () => {
    const { data } = await apiClient.get("/recipients");
    setRecipients(data.data);
  };

  useEffect(() => {
    loadTransactions(1);
    loadProducts();
    loadSenders();
    loadRecipients();
  }, []);

  // Meniru "Input ID Barang / scan LOT/Batch + ID Unik — sistem highlight
  // dan auto-pull data barang" dari proses bisnis Transaksi Barang Keluar.
  const matchedProduct = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return (
      products.find((p) => p.lot_batch?.toLowerCase() === query || p.unique_id?.toLowerCase() === query) ??
      products.find(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.lot_batch?.toLowerCase().includes(query) ||
          p.unique_id?.toLowerCase().includes(query),
      ) ??
      null
    );
  }, [searchQuery, products]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setSearchQuery("");
    setFieldErrors({});
    setError(null);
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = {};
    if (!matchedProduct) errors.product = "Barang tidak ditemukan — periksa ID Barang atau LOT/Batch.";
    if (!form.qty || Number(form.qty) < 1) errors.qty = "Qty wajib diisi.";
    if (form.senderMode === "existing" && !form.sender_id) errors.sender = "Pilih pengirim.";
    if (form.senderMode === "new" && !form.sender_name.trim()) errors.sender = "Nama Pengirim wajib diisi.";
    if (form.recipientMode === "existing" && !form.recipient_id) errors.recipient = "Pilih penerima.";
    if (form.recipientMode === "new" && !form.recipient_name.trim()) errors.recipient = "Nama Penerima wajib diisi.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await apiClient.post("/transactions", {
        sender_id: form.senderMode === "existing" ? Number(form.sender_id) : undefined,
        sender_name: form.senderMode === "new" ? form.sender_name : undefined,
        recipient_id: form.recipientMode === "existing" ? Number(form.recipient_id) : undefined,
        recipient_name: form.recipientMode === "new" ? form.recipient_name : undefined,
        recipient_position: form.recipientMode === "new" ? form.recipient_position : undefined,
        recipient_company: form.recipientMode === "new" ? form.recipient_company : undefined,
        items: [{ product_id: matchedProduct.id, qty: Number(form.qty) }],
      });
      closeForm();
      await Promise.all([loadTransactions(1), loadProducts(), loadSenders(), loadRecipients()]);
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
    { key: "trx_number", header: "No. Transaksi", render: (row) => <CodeChip>{row.trx_number}</CodeChip> },
    { key: "item", header: "Barang", render: (row) => row.items?.[0]?.product_name ?? "-" },
    { key: "sender", header: "Pengirim", render: (row) => row.sender?.name ?? "-" },
    { key: "recipient", header: "Penerima", render: (row) => row.recipient?.name ?? "-" },
    { key: "total", header: "Total", render: (row) => formatCurrency(row.total) },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <Badge status={row.status}>{row.status}</Badge>
          {row.status === "pending" && row.pending_approval && (
            <span className="text-xs text-ink-muted">
              Menunggu: {row.pending_approval.label || row.pending_approval.role}
            </span>
          )}
        </div>
      ),
    },
  ];

  if (can("transactions.approve") || can("transactions.delete")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => {
        const isMyTurn = !row.pending_approval || row.pending_approval.role === user?.role;

        return (
          row.status === "pending" && (
            <div className="flex flex-wrap gap-2">
              <Can permission="transactions.approve">
                {isMyTurn ? (
                  <>
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
                  </>
                ) : (
                  <span className="text-xs text-ink-muted">Bukan giliran Anda</span>
                )}
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
          )
        );
      },
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
            <Input
              label="Cari ID Barang / Scan LOT/Batch"
              placeholder="mis. LOT-20260902-4WIG atau nama barang"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              error={fieldErrors.product}
              required
            />

            {searchQuery.trim() && (
              <div className={`rounded-lg p-4 ${matchedProduct ? "bg-surface-2" : "bg-danger-soft"}`}>
                {matchedProduct ? (
                  <>
                    <div className="mb-2 text-xs font-semibold tracking-wide text-success uppercase">✓ Barang Ditemukan</div>
                    <div className="mb-1 text-base font-semibold text-ink">{matchedProduct.name}</div>
                    <div className="mb-2">
                      <CodeChip>{matchedProduct.lot_batch}</CodeChip>
                    </div>
                    <div className="text-sm text-ink-muted">Stok tersedia: {matchedProduct.stock_qty}</div>
                  </>
                ) : (
                  <div className="text-sm text-danger">Barang tidak ditemukan — periksa kembali ID Barang atau LOT/Batch.</div>
                )}
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
              <div>
                <Select
                  label="Data Pengirim"
                  value={form.senderMode === "new" ? "__new__" : form.sender_id}
                  onChange={(e) =>
                    e.target.value === "__new__"
                      ? setForm({ ...form, senderMode: "new", sender_id: "" })
                      : setForm({ ...form, senderMode: "existing", sender_id: e.target.value })
                  }
                  error={fieldErrors.sender}
                  required
                >
                  <option value="">Pilih pengirim</option>
                  {senders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__new__">+ Pengirim baru</option>
                </Select>
                {form.senderMode === "new" && (
                  <Input
                    name="sender_name"
                    placeholder="Nama pengirim baru"
                    className="mt-2"
                    value={form.sender_name}
                    onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
                  />
                )}
              </div>

              <div>
                <Select
                  label="Data Penerima"
                  value={form.recipientMode === "new" ? "__new__" : form.recipient_id}
                  onChange={(e) =>
                    e.target.value === "__new__"
                      ? setForm({ ...form, recipientMode: "new", recipient_id: "" })
                      : setForm({ ...form, recipientMode: "existing", recipient_id: e.target.value })
                  }
                  error={fieldErrors.recipient}
                  required
                >
                  <option value="">Pilih penerima</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.company ? `— ${r.company}` : ""}
                    </option>
                  ))}
                  <option value="__new__">+ Penerima baru</option>
                </Select>
              </div>
            </div>

            {form.recipientMode === "new" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input
                  name="recipient_name"
                  placeholder="Nama penerima"
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                />
                <Input
                  name="recipient_position"
                  placeholder="Jabatan"
                  value={form.recipient_position}
                  onChange={(e) => setForm({ ...form, recipient_position: e.target.value })}
                />
                <Input
                  name="recipient_company"
                  placeholder="Perusahaan"
                  value={form.recipient_company}
                  onChange={(e) => setForm({ ...form, recipient_company: e.target.value })}
                />
              </div>
            )}

            {matchedProduct && form.qty > 0 && (
              <div className="text-right text-sm font-semibold text-ink">
                Total Otomatis: {formatCurrency(matchedProduct.unit_cost * Number(form.qty || 0))}
              </div>
            )}

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
