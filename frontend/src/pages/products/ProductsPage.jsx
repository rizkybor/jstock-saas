import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Button, CodeChip, DataTable, Input, Modal, PageHeader, Pagination } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_CREATE_FORM = { name: "", unit_cost: "", quantity: "", additional_cost: "" };

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

export default function ProductsPage() {
  const { can } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [deletingId, setDeletingId] = useState(null);

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
      const { data } = await apiClient.get("/products", { params: { page } });
      setProducts(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data barang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(1);
  }, []);

  const openCreate = () => {
    setForm(EMPTY_CREATE_FORM);
    setFieldErrors({});
    setFormError(null);
    setFormMode("create");
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({ name: product.name ?? "", unit_cost: product.unit_cost ?? "", stock_qty: product.stock_qty ?? "" });
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
          title={formMode === "create" ? "Tambah Barang Baru" : `Edit Barang — ${editingProduct?.name}`}
          description={
            formMode === "create"
              ? "LOT/Batch dan COGS dihitung otomatis oleh sistem."
              : `LOT/Batch: ${editingProduct?.lot_batch ?? "-"} (tidak bisa diubah)`
          }
          onClose={closeForm}
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Barang"
              name="name"
              placeholder="mis. 8AL 25PPM H2S/100PPM CO"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              required
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
                hint="Opsional, mis. ongkos kirim"
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
                {submitting ? "Menyimpan..." : formMode === "create" ? "Tambah Barang" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
