import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import Can from "../../routes/Can";

const EMPTY_FORM = { product_id: "", qty: "", sender_name: "", recipient_name: "", recipient_company: "" };

export default function TransactionsPage() {
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
      const message = err.response?.data?.message ?? "Gagal membuat transaksi.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
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
    try {
      await apiClient.patch(`/transactions/${id}/reject`, { rejection_note: note });
      await loadTransactions();
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal reject transaksi.");
    }
  };

  return (
    <div>
      <h1>Transaksi Barang Keluar</h1>

      <Can permission="transactions.create">
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: ".5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            required
          >
            <option value="">Pilih Barang / LOT</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.lot_batch}) - stok {p.stock_qty}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Qty"
            min="1"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
            required
          />
          <input
            placeholder="Nama Pengirim"
            value={form.sender_name}
            onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
            required
          />
          <input
            placeholder="Nama Penerima"
            value={form.recipient_name}
            onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
            required
          />
          <input
            placeholder="Perusahaan Penerima"
            value={form.recipient_company}
            onChange={(e) => setForm({ ...form, recipient_company: e.target.value })}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Submit untuk Approval"}
          </button>
        </form>
        {selectedProduct && (
          <p style={{ fontSize: ".85rem", color: "#555" }}>
            Highlight: {selectedProduct.name} &middot; {selectedProduct.lot_batch} &middot; Stok tersedia {selectedProduct.stock_qty}
          </p>
        )}
      </Can>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {loading ? (
        <p>Memuat...</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>No. Trx</th>
              <th>Sender</th>
              <th>Recipient</th>
              <th>Total</th>
              <th>Status</th>
              <Can permission="transactions.approve">
                <th>Aksi</th>
              </Can>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6}>Belum ada transaksi.</td>
              </tr>
            )}
            {transactions.map((trx) => (
              <tr key={trx.id}>
                <td>{trx.trx_number}</td>
                <td>{trx.sender?.name ?? "-"}</td>
                <td>{trx.recipient?.name ?? "-"}</td>
                <td>{trx.total.toLocaleString("id-ID")}</td>
                <td>{trx.status}</td>
                <Can permission="transactions.approve">
                  <td>
                    {trx.status === "pending" && (
                      <>
                        <button onClick={() => handleApprove(trx.id)}>Approve</button>{" "}
                        <button onClick={() => handleReject(trx.id)}>Reject</button>
                      </>
                    )}
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
