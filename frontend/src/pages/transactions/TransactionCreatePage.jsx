import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Button, Card, CodeChip, Input, Select, Skeleton } from "../../components/ui";

const EMPTY_FORM = {
  qty: "",
  senderMode: "existing",
  sender_user_id: "",
  sender_name: "",
  client_id: "",
  recipient_position: "",
  recipient_company: "",
};

const formatCurrency = (value) => `Rp ${Number(value).toLocaleString("id-ID")}`;

export default function TransactionCreatePage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [trxNumber, setTrxNumber] = useState(null);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [nextRes, productsRes, usersRes, clientsRes] = await Promise.all([
          apiClient.get("/transactions/next-number"),
          apiClient.get("/products", { params: { limit: 1000 } }),
          apiClient.get("/users"),
          apiClient.get("/clients", { params: { limit: 1000 } }),
        ]);
        setTrxNumber(nextRes.data.data.trx_number);
        setProducts(productsRes.data.data);
        setUsers(usersRes.data.data);
        setClients(clientsRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message ?? "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Meniru "Input ID Barang / scan LOT/Batch — sistem highlight dan
  // auto-pull data barang" dari proses bisnis Transaksi Barang Keluar.
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = {};
    if (!matchedProduct) errors.product = "Barang tidak ditemukan — periksa ID Barang atau LOT/Batch.";
    if (!form.qty || Number(form.qty) < 1) errors.qty = "Qty wajib diisi.";
    if (form.senderMode === "existing" && !form.sender_user_id) errors.sender = "Pilih pengirim.";
    if (form.senderMode === "new" && !form.sender_name.trim()) errors.sender = "Nama Pengirim wajib diisi.";
    if (!form.client_id) errors.client_id = "Pilih penerima.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await apiClient.post("/transactions", {
        sender_user_id: form.senderMode === "existing" ? Number(form.sender_user_id) : undefined,
        sender_name: form.senderMode === "new" ? form.sender_name : undefined,
        client_id: Number(form.client_id),
        recipient_position: form.recipient_position || undefined,
        recipient_company: form.recipient_company || undefined,
        items: [{ product_id: matchedProduct.id, qty: Number(form.qty) }],
      });
      navigate(`/${tenantId}/transactions`);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal membuat transaksi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-1">
        <Link to={`/${tenantId}/transactions`} className="text-sm text-ink-muted hover:text-ink">
          &larr; Transaksi
        </Link>
      </div>
      <h1 className="text-[22px] font-bold tracking-[-0.25px] text-ink">Transaksi Barang Keluar</h1>
      <div className="mt-1 mb-6 flex items-center gap-2 text-sm text-ink-muted">
        No. Transaksi otomatis:{" "}
        {loading ? <Skeleton className="h-5 w-24" /> : <CodeChip>{trxNumber}</CodeChip>}
      </div>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Cari Barang">
            <Input
              label="ID Barang / LOT Batch"
              placeholder="mis. BRG-001 atau LOT-CH4-0625-014"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              error={fieldErrors.product}
            />

            <div className="mt-4 rounded-lg bg-surface-2 p-4">
              {!searchQuery.trim() && <p className="text-sm text-ink-muted">Masukkan ID Barang atau LOT/Batch untuk melihat detail.</p>}

              {searchQuery.trim() && !matchedProduct && (
                <p className="text-sm text-danger">Barang tidak ditemukan — periksa kembali ID Barang atau LOT/Batch.</p>
              )}

              {matchedProduct && (
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="mb-1 text-xs font-semibold tracking-wide text-success uppercase">✓ Barang Ditemukan</div>
                    <div className="text-base font-semibold text-ink">{matchedProduct.name}</div>
                    <div className="mt-1.5">
                      <CodeChip>{matchedProduct.lot_batch}</CodeChip>
                    </div>
                    <div className="mt-1.5 text-sm text-ink-muted">Stok tersedia: {matchedProduct.stock_qty}</div>
                  </div>

                  <Input
                    label="Qty"
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: e.target.value })}
                    error={fieldErrors.qty}
                    required
                  />

                  {form.qty > 0 && (
                    <div className="text-right text-sm font-semibold text-ink">
                      Total Otomatis: {formatCurrency(matchedProduct.unit_cost * Number(form.qty || 0))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title="Data Pengirim & Penerima">
            <div className="flex flex-col gap-4">
              <div>
                <Select
                  label="Pengirim"
                  value={form.senderMode === "new" ? "__new__" : form.sender_user_id}
                  onChange={(e) =>
                    e.target.value === "__new__"
                      ? setForm({ ...form, senderMode: "new", sender_user_id: "" })
                      : setForm({ ...form, senderMode: "existing", sender_user_id: e.target.value })
                  }
                  error={fieldErrors.sender}
                  required
                >
                  <option value="">Pilih pengirim</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                  <option value="__new__">+ Pengirim baru</option>
                </Select>
                {form.senderMode === "new" && (
                  <Input
                    placeholder="Nama pengirim baru"
                    className="mt-2"
                    value={form.sender_name}
                    onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
                  />
                )}
              </div>

              <Select
                label="Nama Penerima"
                value={form.client_id}
                onChange={(e) => {
                  const client = clients.find((c) => String(c.id) === e.target.value);
                  setForm({
                    ...form,
                    client_id: e.target.value,
                    recipient_company: client?.company_name ?? form.recipient_company,
                  });
                }}
                error={fieldErrors.client_id}
                required
              >
                <option value="">Pilih klien</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.pic_name} — {c.company_name}
                  </option>
                ))}
              </Select>
              <Input
                label="Jabatan"
                placeholder="mis. QA Manager"
                value={form.recipient_position}
                onChange={(e) => setForm({ ...form, recipient_position: e.target.value })}
              />
              <Input
                label="Perusahaan"
                placeholder="Nama perusahaan penerima"
                value={form.recipient_company}
                onChange={(e) => setForm({ ...form, recipient_company: e.target.value })}
              />
            </div>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(`/${tenantId}/transactions`)}>
            Batal
          </Button>
          <Button type="submit" loading={submitting}>
            {submitting ? "Menyimpan..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
