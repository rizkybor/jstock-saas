import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Button, CodeChip, DataTable, Input, Modal, PageHeader, Pagination, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_CREATE_FORM = {
  name: "",
  product_series_id: "",
  lot_batch: "",
  unique_id: "",
  item_detail: "",
  unit_cost: "",
  quantity: "",
  additional_cost: "",
  input_date: "",
};

const CREATE_RULES = [
  { name: "name", label: "Nama Barang", required: true },
  { name: "unit_cost", label: "Unit Cost", required: true, type: "number", min: 0 },
  { name: "quantity", label: "Qty", required: true, type: "number", min: 1 },
  { name: "additional_cost", label: "Biaya Tambahan", type: "number", min: 0 },
];

const EDIT_RULES = [
  { name: "name", label: "Nama Barang", required: true },
  { name: "unit_cost", label: "Unit Cost", required: true, type: "number", min: 0 },
  { name: "stock_qty", label: "Stok", required: true, type: "number", min: 0 },
];

const formatCurrency = (value) => `Rp ${value.toLocaleString("id-ID")}`;
const formatDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const rules = formMode === "create" ? CREATE_RULES : EDIT_RULES;
    const errors = validate(form, rules);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      if (formMode === "create") {
        await apiClient.post("/products", form);
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
    { key: "name", header: "Nama Barang" },
    { key: "lot_batch", header: "LOT/Batch", render: (row) => <CodeChip>{row.lot_batch}</CodeChip> },
    { key: "series", header: "Kategori", render: (row) => row.series?.name ?? "-" },
    { key: "input_date", header: "Tgl Input", render: (row) => formatDate(row.input_date) },
    { key: "unit_cost", header: "Unit Cost", render: (row) => formatCurrency(row.unit_cost) },
    { key: "grand_total_cost", header: "Grand Total Cost", render: (row) => formatCurrency(row.grand_total_cost) },
    { key: "cogs", header: "COGS/unit", render: (row) => formatCurrency(row.cogs) },
    { key: "stock_qty", header: "Stok" },
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
          <option value="">Semua Kategori</option>
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

      {formMode && (
        <Modal
          title={formMode === "create" ? "Tambah Barang" : `Edit Barang — ${editingProduct?.name}`}
          description="LOT/Batch bisa diisi manual atau dikosongkan untuk digenerate otomatis oleh sistem. Grand Total Cost & COGS dihitung otomatis."
          onClose={closeForm}
          width="640px"
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Barang"
              name="name"
              placeholder="mis. 8AL 25PPM H2S/100PPM CO/2.5%CH4/18%O2/N2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Kategori / Product Series"
                name="product_series_id"
                value={form.product_series_id}
                onChange={(e) => setForm({ ...form, product_series_id: e.target.value })}
              >
                <option value="">Tanpa kategori</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Tanggal Input"
                name="input_date"
                type="date"
                value={form.input_date}
                onChange={(e) => setForm({ ...form, input_date: e.target.value })}
                hint={formMode === "create" ? "Kosongkan untuk hari ini" : undefined}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="LOT / Batch Number"
                name="lot_batch"
                placeholder="LOT-..."
                hint={formMode === "create" ? "Kosongkan untuk generate otomatis" : undefined}
                value={form.lot_batch}
                onChange={(e) => setForm({ ...form, lot_batch: e.target.value })}
              />
              <Input
                label="ID Unik Per Produk"
                name="unique_id"
                placeholder="BRG-..."
                value={form.unique_id}
                onChange={(e) => setForm({ ...form, unique_id: e.target.value })}
              />
            </div>

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
              {formMode === "create" ? (
                <Input
                  label="Qty"
                  name="quantity"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  error={fieldErrors.quantity}
                  required
                />
              ) : (
                <Input
                  label="Stok"
                  name="stock_qty"
                  type="number"
                  min="0"
                  value={form.stock_qty}
                  onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                  error={fieldErrors.stock_qty}
                  required
                />
              )}
            </div>
            {formMode === "create" && (
              <Input
                label="Biaya Tambahan"
                name="additional_cost"
                type="number"
                min="0"
                hint="Opsional, mis. ongkos kirim — ditambahkan ke Grand Total Cost"
                value={form.additional_cost}
                onChange={(e) => setForm({ ...form, additional_cost: e.target.value })}
                error={fieldErrors.additional_cost}
              />
            )}

            {formError && <Alert>{formError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : formMode === "create" ? "Simpan Barang" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
