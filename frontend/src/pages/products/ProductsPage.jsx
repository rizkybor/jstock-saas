import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Input, Modal, PageHeader, Pagination, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_CREATE_FORM = {
  name: "",
  seriesMode: "existing",
  product_series_id: "",
  new_series_name: "",
  lot_batch: "",
  unique_id: "",
  item_detail: "",
  unit_cost: "",
  additional_cost: "",
  quantity: "",
  input_date: "",
};

const CREATE_RULES = [
  { name: "name", label: "Nama Barang", required: true },
  { name: "unit_cost", label: "Unit Cost", required: true, type: "number", min: 0 },
  { name: "quantity", label: "Kuantitas", required: true, type: "number", min: 1 },
];

const EDIT_RULES = [
  { name: "name", label: "Nama Barang", required: true },
  { name: "unit_cost", label: "Unit Cost", required: true, type: "number", min: 0 },
  { name: "stock_qty", label: "Kuantitas", required: true, type: "number", min: 0 },
];

const formatCurrency = (value) => `Rp ${Number(value).toLocaleString("id-ID")}`;
const formatDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");

// Nama Jenis Gas -> tone badge, hanya untuk pembeda visual cepat di tabel.
const seriesBadgeTone = (name = "") => {
  const upper = name.toUpperCase();
  if (upper.includes("H2S")) return "pending";
  if (upper.includes("CO") && !upper.includes("CO2")) return "rejected";
  if (upper.includes("CH4")) return "trial";
  return "cancelled";
};

export default function ProductsPage() {
  const { can } = useAuth();
  const [products, setProducts] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [formMode, setFormMode] = useState(null); // "create" | "edit" | null
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_CREATE_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/products", {
        params: {
          page,
          q: search || undefined,
          product_series_id: seriesFilter || undefined,
          date_from: dateFilter || undefined,
          date_to: dateFilter || undefined,
        },
      });
      setProducts(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data barang.");
    } finally {
      setLoading(false);
    }
  };

  const loadSeries = async () => {
    try {
      const { data } = await apiClient.get("/product-series");
      setSeries(data.data);
    } catch {
      // Non-fatal: forms/filters just show no category options.
    }
  };

  useEffect(() => {
    loadProducts(1);
    loadSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadProducts(1);
  };

  const openCreate = () => {
    setForm(EMPTY_CREATE_FORM);
    setFieldErrors({});
    setFormError(null);
    setFormMode("create");
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name ?? "",
      product_series_id: product.product_series_id ?? "",
      lot_batch: product.lot_batch ?? "",
      unique_id: product.unique_id ?? "",
      item_detail: product.item_detail ?? "",
      unit_cost: product.unit_cost ?? "",
      additional_cost: product.additional_cost ?? "",
      stock_qty: product.stock_qty ?? "",
      input_date: product.input_date ?? "",
    });
    setFieldErrors({});
    setFormError(null);
    setFormMode("edit");
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingProduct(null);
  };

  const generateLotPreview = () => setForm((f) => ({ ...f, lot_batch: "" }));

  const selectExistingSeries = (seriesId) => {
    const picked = series.find((s) => String(s.id) === String(seriesId));
    setForm((f) => ({
      ...f,
      seriesMode: "existing",
      product_series_id: seriesId,
      unit_cost: picked?.unit_cost != null ? picked.unit_cost : f.unit_cost,
    }));
  };

  const previewUnitCost = Number(form.unit_cost || 0);
  const previewQty = Number((formMode === "create" ? form.quantity : form.stock_qty) || 0);
  const previewAdditionalCost = Number(form.additional_cost || 0);
  const previewGrandTotal = previewUnitCost * previewQty + previewAdditionalCost;
  const previewCogs = previewQty > 0 ? previewGrandTotal / previewQty : 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const rules = formMode === "create" ? CREATE_RULES : EDIT_RULES;
    const errors = validate(form, rules);
    if (formMode === "create") {
      if (form.seriesMode === "existing" && !form.product_series_id) {
        errors.product_series_id = "Pilih Jenis Gas.";
      }
      if (form.seriesMode === "new" && !form.new_series_name.trim()) {
        errors.new_series_name = "Nama Jenis Gas wajib diisi.";
      }
    }
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      if (formMode === "create") {
        let seriesId = form.product_series_id;
        if (form.seriesMode === "new") {
          const { data } = await apiClient.post("/product-series", {
            name: form.new_series_name,
            unit_cost: form.unit_cost,
          });
          seriesId = data.data.id;
        }
        await apiClient.post("/products", {
          name: form.name,
          product_series_id: seriesId,
          lot_batch: form.lot_batch || undefined,
          unique_id: form.unique_id || undefined,
          item_detail: form.item_detail || undefined,
          unit_cost: form.unit_cost,
          additional_cost: form.additional_cost || undefined,
          quantity: form.quantity,
          input_date: form.input_date || undefined,
        });
        await loadSeries();
      } else {
        await apiClient.put(`/products/${editingProduct.id}`, form);
      }
      closeForm();
      await loadProducts(formMode === "create" ? 1 : meta.current_page);
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Gagal menyimpan barang.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus barang ini? Tindakan ini tidak bisa dibatalkan.")) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/products/${id}`);
      await loadProducts(meta.current_page);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal menghapus barang.");
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Nama Barang",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-ink">{row.name}</span>
          {row.series?.name && <Badge status={seriesBadgeTone(row.series.name)}>{row.series.name}</Badge>}
        </div>
      ),
    },
    { key: "lot_batch", header: "LOT/Batch", render: (row) => <CodeChip>{row.lot_batch}</CodeChip> },
    { key: "input_date", header: "Tgl Input", render: (row) => formatDate(row.input_date) },
    { key: "unit_cost", header: "Unit Cost", render: (row) => formatCurrency(row.unit_cost) },
    { key: "grand_total_cost", header: "Grand Total Cost", render: (row) => <span className="font-semibold">{formatCurrency(row.grand_total_cost)}</span> },
    { key: "cogs", header: "COGS", render: (row) => formatCurrency(row.cogs) },
    { key: "stock_qty", header: "Kuantitas" },
  ];

  if (can("products.update") || can("products.delete")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Can permission="products.update">
            <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
              Edit
            </Button>
          </Can>
          <Can permission="products.delete">
            <Button variant="danger" size="sm" loading={deletingId === row.id} onClick={() => handleDelete(row.id)}>
              Hapus
            </Button>
          </Can>
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Data Barang"
        description="Master inventory berbasis LOT/Batch dengan kalkulasi COGS otomatis."
        action={
          <Can permission="products.create">
            <Button onClick={openCreate}>+ Tambah Barang</Button>
          </Can>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <form onSubmit={handleFilterSubmit} className="mb-4 flex flex-wrap gap-3">
        <Input
          type="search"
          placeholder="Cari nama barang / LOT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}>
          <option value="">Semua Jenis Gas</option>
          {series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={products}
        rowKey={(row) => row.id}
        emptyMessage="Belum ada data barang."
        startIndex={(meta.current_page - 1) * 10}
        loading={loading}
      />
      {!loading && (
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          onPageChange={loadProducts}
        />
      )}

      {formMode === "create" && (
        <Modal title="Tambah Barang" description="Isi detail barang & LOT/Batch baru." onClose={closeForm} width="640px">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Barang"
              name="name"
              placeholder="mis. Gas Kalibrasi CH4 2.5%"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              required
            />

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Jenis Gas<span className="ml-0.5 text-danger">*</span>
              </span>
              <select
                value={form.seriesMode === "new" ? "__new__" : form.product_series_id}
                onChange={(e) => (e.target.value === "__new__" ? setForm({ ...form, seriesMode: "new", product_series_id: "" }) : selectExistingSeries(e.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-[15px] text-ink focus:border-primary focus:outline-none"
              >
                <option value="">Pilih Jenis Gas</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.unit_cost != null ? ` — ${formatCurrency(s.unit_cost)}` : ""}
                  </option>
                ))}
                <option value="__new__">+ Jenis Gas Baru</option>
              </select>
              {fieldErrors.product_series_id && <span className="mt-1 block text-xs text-danger">{fieldErrors.product_series_id}</span>}
            </div>

            {form.seriesMode === "new" && (
              <Input
                label="Nama Jenis Gas Baru"
                placeholder="mis. CH4 — 2.5%"
                value={form.new_series_name}
                onChange={(e) => setForm({ ...form, new_series_name: e.target.value })}
                error={fieldErrors.new_series_name}
                required
              />
            )}

            <div>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label="LOT / Batch"
                    name="lot_batch"
                    placeholder="LOT-..."
                    value={form.lot_batch}
                    onChange={(e) => setForm({ ...form, lot_batch: e.target.value })}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={generateLotPreview}>
                  Auto-generate
                </Button>
              </div>
              <span className="mt-1.5 block text-xs text-ink-muted">Kosongkan untuk generate otomatis</span>
            </div>

            <Input
              label="ID Unik"
              name="unique_id"
              placeholder="BRG-..."
              value={form.unique_id}
              onChange={(e) => setForm({ ...form, unique_id: e.target.value })}
            />

            <Textarea
              label="Item Detail"
              name="item_detail"
              placeholder="Deskripsi tabung, tekanan, sertifikat, dll."
              value={form.item_detail}
              onChange={(e) => setForm({ ...form, item_detail: e.target.value })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Unit Cost"
                name="unit_cost"
                type="number"
                min="0"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                error={fieldErrors.unit_cost}
                required
              />
              <Input
                label="Kuantitas"
                name="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                error={fieldErrors.quantity}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Biaya Tambahan"
                name="additional_cost"
                type="number"
                min="0"
                hint="Opsional, mis. ongkos kirim"
                value={form.additional_cost}
                onChange={(e) => setForm({ ...form, additional_cost: e.target.value })}
              />
              <Input
                label="Tanggal Input"
                name="input_date"
                type="date"
                value={form.input_date}
                onChange={(e) => setForm({ ...form, input_date: e.target.value })}
                hint="Kosongkan untuk hari ini"
              />
            </div>

            <div className="rounded-lg bg-surface-2 p-3">
              <div className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">Kalkulasi Otomatis (Ilustratif)</div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink-muted">Grand Total Cost</span>
                <span className="font-semibold text-ink">{formatCurrency(previewGrandTotal)}</span>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-ink-muted">COGS</span>
                <span className="font-semibold text-ink">{formatCurrency(previewCogs)}</span>
              </div>
              <div className="text-xs text-ink-faint">Metode kalkulasi belum final dikonfirmasi klien.</div>
            </div>

            {formError && <Alert>{formError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Barang"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {formMode === "edit" && (
        <Modal
          title={`Edit Barang — ${editingProduct?.name}`}
          description="LOT/Batch bisa diisi manual atau dikosongkan untuk digenerate otomatis oleh sistem. Grand Total Cost & COGS dihitung otomatis."
          onClose={closeForm}
          width="640px"
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Barang"
              name="name"
              placeholder="mis. Gas Kalibrasi CH4 2.5%"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              required
            />

            <Select
              label="Jenis Gas"
              name="product_series_id"
              value={form.product_series_id}
              onChange={(e) => setForm({ ...form, product_series_id: e.target.value })}
            >
              <option value="">Tanpa Jenis Gas</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>

            <div>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Input
                    label="LOT / Batch Number"
                    name="lot_batch"
                    placeholder="LOT-..."
                    value={form.lot_batch}
                    onChange={(e) => setForm({ ...form, lot_batch: e.target.value })}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={generateLotPreview}>
                  Auto-generate
                </Button>
              </div>
              <span className="mt-1.5 block text-xs text-ink-muted">Kosongkan untuk generate otomatis</span>
            </div>

            <Input
              label="ID Unik Per Produk"
              name="unique_id"
              placeholder="BRG-..."
              value={form.unique_id}
              onChange={(e) => setForm({ ...form, unique_id: e.target.value })}
            />

            <Textarea
              label="Item Detail"
              name="item_detail"
              placeholder="Deskripsi tabung, tekanan, sertifikat, dll."
              value={form.item_detail}
              onChange={(e) => setForm({ ...form, item_detail: e.target.value })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Unit Cost"
                name="unit_cost"
                type="number"
                min="0"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                error={fieldErrors.unit_cost}
                required
              />
              <Input
                label="Kuantitas"
                name="stock_qty"
                type="number"
                min="0"
                value={form.stock_qty}
                onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                error={fieldErrors.stock_qty}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Biaya Tambahan"
                name="additional_cost"
                type="number"
                min="0"
                hint="Opsional, mis. ongkos kirim"
                value={form.additional_cost}
                onChange={(e) => setForm({ ...form, additional_cost: e.target.value })}
              />
              <Input
                label="Tanggal Input"
                name="input_date"
                type="date"
                value={form.input_date}
                onChange={(e) => setForm({ ...form, input_date: e.target.value })}
              />
            </div>

            <div className="rounded-lg bg-surface-2 p-3">
              <div className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">Kalkulasi Otomatis (Ilustratif)</div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink-muted">Grand Total Cost</span>
                <span className="font-semibold text-ink">{formatCurrency(previewGrandTotal)}</span>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-ink-muted">COGS</span>
                <span className="font-semibold text-ink">{formatCurrency(previewCogs)}</span>
              </div>
              <div className="text-xs text-ink-faint">Metode kalkulasi belum final dikonfirmasi klien.</div>
            </div>

            {formError && <Alert>{formError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
