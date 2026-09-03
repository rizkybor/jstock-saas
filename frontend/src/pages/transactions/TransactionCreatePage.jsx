import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AddressFieldset from "../../components/AddressFieldset";
import apiClient from "../../api/client";
import { Alert, Button, Card, CodeChip, Input, RequiredMark, Select, Skeleton } from "../../components/ui";
import { EMPTY_ADDRESS, fetchProvinces } from "../../utils/wilayah";

const EMPTY_FORM = {
  items: [], // { product, qty }
  senderMode: "existing",
  sender_user_id: "",
  sender_name: "",
  recipientMode: "existing",
  client_id: "",
  recipient_name: "",
  recipient_position: "",
  recipient_company: "",
  addressMode: "existing",
  address_id: "",
  newAddress: { ...EMPTY_ADDRESS },
  invoice_number: "",
  no_invoice: false,
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
  const [provinces, setProvinces] = useState([]);
  const [clientAddresses, setClientAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stagingQty, setStagingQty] = useState("");
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
          apiClient.get("/clients", { params: { limit: 1000, status: "active" } }),
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
    fetchProvinces()
      .then(setProvinces)
      .catch(() => setProvinces([]));
  }, []);

  // Klien dipilih sebagai Penerima -> ambil alamat-alamat yang sudah ada
  // supaya bisa dipilih; kalau belum ada, langsung tawarkan form alamat baru.
  useEffect(() => {
    if (form.recipientMode !== "existing" || !form.client_id) {
      setClientAddresses([]);
      return;
    }

    setAddressesLoading(true);
    apiClient
      .get(`/clients/${form.client_id}`)
      .then(({ data }) => {
        const addresses = data.data.addresses ?? [];
        setClientAddresses(addresses);
        setForm((f) =>
          f.client_id === String(data.data.id) || f.client_id === data.data.id
            ? { ...f, addressMode: addresses.length > 0 ? "existing" : "new", address_id: "" }
            : f,
        );
      })
      .catch(() => setClientAddresses([]))
      .finally(() => setAddressesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.client_id, form.recipientMode]);

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

  const addItem = () => {
    const qty = Number(stagingQty);
    if (!matchedProduct || !qty || qty < 1) return;

    setForm((f) => {
      const existingIndex = f.items.findIndex((i) => i.product.id === matchedProduct.id);
      if (existingIndex >= 0) {
        const items = [...f.items];
        items[existingIndex] = { ...items[existingIndex], qty: items[existingIndex].qty + qty };
        return { ...f, items };
      }
      return { ...f, items: [...f.items, { product: matchedProduct, qty }] };
    });
    setSearchQuery("");
    setStagingQty("");
    setFieldErrors((errs) => ({ ...errs, items: undefined }));
  };

  const removeItem = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const grandTotal = form.items.reduce((sum, i) => sum + i.product.unit_cost * i.qty, 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const errors = {};
    if (form.items.length === 0) errors.items = "Tambahkan minimal satu barang.";
    if (form.senderMode === "existing" && !form.sender_user_id) errors.sender = "Pilih pengirim.";
    if (form.senderMode === "new" && !form.sender_name.trim()) errors.sender = "Nama Pengirim wajib diisi.";
    if (form.recipientMode === "existing" && !form.client_id) errors.client_id = "Pilih penerima.";
    if (form.recipientMode === "new" && !form.recipient_name.trim()) errors.recipient_name = "Nama Penerima wajib diisi.";
    if (form.recipientMode === "existing" && form.client_id) {
      if (form.addressMode === "existing" && clientAddresses.length > 0 && !form.address_id) {
        errors.address_id = "Pilih alamat penerima.";
      }
      if (form.addressMode === "new" && !form.newAddress.label.trim()) {
        errors.address_id = "Isi label alamat baru (mis. Rumah, Kantor).";
      }
    }
    if (form.recipientMode === "new" && !form.newAddress.label.trim()) {
      errors.address_id = "Alamat penerima wajib diisi.";
    }
    if (!form.no_invoice && !form.invoice_number.trim()) errors.invoice_number = "No. Invoice wajib diisi (atau centang Tanpa Invoice).";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const usingExistingAddress = form.recipientMode === "existing" && form.addressMode === "existing" && form.address_id;
    const usingNewAddress =
      (form.recipientMode === "existing" && form.addressMode === "new" && form.newAddress.label.trim()) ||
      (form.recipientMode === "new" && form.newAddress.label.trim());

    setSubmitting(true);
    try {
      await apiClient.post("/transactions", {
        sender_user_id: form.senderMode === "existing" ? Number(form.sender_user_id) : undefined,
        sender_name: form.senderMode === "new" ? form.sender_name : undefined,
        client_id: form.recipientMode === "existing" ? Number(form.client_id) : undefined,
        recipient_name: form.recipientMode === "new" ? form.recipient_name : undefined,
        recipient_position: form.recipient_position || undefined,
        recipient_company: form.recipient_company || undefined,
        address_id: usingExistingAddress ? Number(form.address_id) : undefined,
        address: usingNewAddress ? form.newAddress : undefined,
        no_invoice: form.no_invoice,
        invoice_number: form.no_invoice ? undefined : form.invoice_number,
        items: form.items.map((i) => ({ product_id: i.product.id, qty: i.qty })),
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

                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        label="Qty"
                        type="number"
                        min="1"
                        value={stagingQty}
                        onChange={(e) => setStagingQty(e.target.value)}
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={addItem} disabled={!stagingQty || Number(stagingQty) < 1}>
                      + Tambah
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {fieldErrors.items && <p className="mt-2 text-xs text-danger">{fieldErrors.items}</p>}

            {form.items.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Barang Dipilih</div>
                {form.items.map((item, index) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-ink">{item.product.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                        <CodeChip>{item.product.lot_batch}</CodeChip>
                        <span>Qty: {item.qty}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-ink">{formatCurrency(item.product.unit_cost * item.qty)}</span>
                      <Button type="button" variant="danger" size="sm" onClick={() => removeItem(index)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="text-right text-sm font-semibold text-ink">Total: {formatCurrency(grandTotal)}</div>
              </div>
            )}
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

              <div>
                <Select
                  label="Nama Penerima"
                  value={form.recipientMode === "new" ? "__new__" : form.client_id}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setForm({ ...form, recipientMode: "new", client_id: "" });
                      return;
                    }
                    const client = clients.find((c) => String(c.id) === e.target.value);
                    setForm({
                      ...form,
                      recipientMode: "existing",
                      client_id: e.target.value,
                      recipient_position: client?.pic_position ?? form.recipient_position,
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
                  <option value="__new__">+ Penerima baru</option>
                </Select>
                {form.recipientMode === "new" && (
                  <Input
                    placeholder="Nama penerima baru"
                    className="mt-2"
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                    error={fieldErrors.recipient_name}
                  />
                )}
              </div>
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

              {form.recipientMode === "existing" && form.client_id && (
                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Alamat Penerima
                    <RequiredMark />
                  </span>
                  {addressesLoading ? (
                    <p className="text-sm text-ink-muted">Memuat alamat...</p>
                  ) : (
                    <>
                      {clientAddresses.length > 0 && (
                        <select
                          value={form.addressMode === "new" ? "__new__" : form.address_id}
                          onChange={(e) =>
                            e.target.value === "__new__"
                              ? setForm({ ...form, addressMode: "new", address_id: "" })
                              : setForm({ ...form, addressMode: "existing", address_id: e.target.value })
                          }
                          className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-[15px] text-ink focus:border-primary focus:outline-none"
                        >
                          <option value="">Pilih alamat</option>
                          {clientAddresses.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label}
                              {a.detail ? ` — ${a.detail}` : ""}
                            </option>
                          ))}
                          <option value="__new__">+ Alamat baru</option>
                        </select>
                      )}
                      {fieldErrors.address_id && <span className="mt-1 block text-xs text-danger">{fieldErrors.address_id}</span>}

                      {form.addressMode === "new" && (
                        <div className="mt-2">
                          <AddressFieldset
                            value={form.newAddress}
                            provinces={provinces}
                            onChange={(next) => setForm({ ...form, newAddress: next })}
                            onRemove={
                              clientAddresses.length > 0
                                ? () => setForm({ ...form, addressMode: "existing", newAddress: { ...EMPTY_ADDRESS } })
                                : undefined
                            }
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {form.recipientMode === "new" && (
                <div>
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Alamat Penerima
                    <RequiredMark />
                  </span>
                  <AddressFieldset
                    value={form.newAddress}
                    provinces={provinces}
                    onChange={(next) => setForm({ ...form, newAddress: next })}
                  />
                  {fieldErrors.address_id && <span className="mt-1 block text-xs text-danger">{fieldErrors.address_id}</span>}
                  <p className="mt-1 text-xs text-ink-muted">Alamat penerima baru ini hanya disimpan untuk transaksi ini, bukan di Data Klien.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <Card title="Invoice" className="mt-6">
          <Input
            label="No. Invoice"
            placeholder="mis. INV-2026-0001"
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
            error={fieldErrors.invoice_number}
            disabled={form.no_invoice}
            required={!form.no_invoice}
          />
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.no_invoice}
              onChange={(e) => setForm({ ...form, no_invoice: e.target.checked, invoice_number: e.target.checked ? "" : form.invoice_number })}
              className="h-4 w-4 cursor-pointer accent-primary"
            />
            Tanpa Invoice
          </label>
        </Card>

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
