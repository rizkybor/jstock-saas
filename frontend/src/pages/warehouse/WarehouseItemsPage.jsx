import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Button, ConfirmDialog, DataTable, Input, Modal, PageHeader, Pagination, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_FORM = { name: "", sku: "", category: "", unit: "", price_buy: "", price_sell: "", min_stock: "", notes: "" };

const VALIDATION_RULES = [{ name: "name", label: "Nama Barang", required: true }];

const formatCurrency = (value) => (value === null || value === undefined ? "-" : `Rp ${Number(value).toLocaleString("id-ID")}`);

export default function WarehouseItemsPage() {
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [formMode, setFormMode] = useState(null); // "create" | "edit" | null
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/warehouse/items", {
        params: { page, q: search || undefined, category: categoryFilter || undefined },
      });
      setItems(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data barang gudang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadItems(1);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setFormMode("create");
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFieldErrors({});
    setFormError(null);
    setFormMode("edit");
    setForm({
      name: item.name ?? "",
      sku: item.sku ?? "",
      category: item.category ?? "",
      unit: item.unit ?? "",
      price_buy: item.price_buy ?? "",
      price_sell: item.price_sell ?? "",
      min_stock: item.min_stock ?? "",
      notes: item.notes ?? "",
    });
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingItem(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const errors = validate(form, VALIDATION_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    const payload = {
      ...form,
      price_buy: form.price_buy === "" ? null : Number(form.price_buy),
      price_sell: form.price_sell === "" ? null : Number(form.price_sell),
      min_stock: form.min_stock === "" ? null : Number(form.min_stock),
    };

    setSubmitting(true);
    try {
      if (formMode === "create") {
        await apiClient.post("/warehouse/items", payload);
      } else {
        await apiClient.put(`/warehouse/items/${editingItem.id}`, payload);
      }
      closeForm();
      await loadItems(formMode === "create" ? 1 : meta.current_page);
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Gagal menyimpan barang gudang.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/warehouse/items/${confirmDelete.id}`);
      setConfirmDelete(null);
      await loadItems(meta.current_page);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal menghapus barang gudang.");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: "sku", header: "SKU", render: (row) => row.sku ?? "-" },
    { key: "name", header: "Nama Barang" },
    { key: "category", header: "Kategori", render: (row) => row.category ?? "-" },
    { key: "unit", header: "Satuan", render: (row) => row.unit ?? "-" },
    { key: "total_stock", header: "Stok", render: (row) => row.total_stock ?? 0 },
    { key: "price_buy", header: "Harga Beli", render: (row) => formatCurrency(row.price_buy) },
    { key: "price_sell", header: "Harga Jual", render: (row) => formatCurrency(row.price_sell) },
  ];

  if (can("warehouse-items.update") || can("warehouse-items.delete")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Can permission="warehouse-items.update">
            <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
              Edit
            </Button>
          </Can>
          <Can permission="warehouse-items.delete">
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(row)}>
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
        title="Data Barang Gudang"
        description="Master barang untuk modul Warehouse General — field dasar tanpa LOT/Batch."
        action={
          <Can permission="warehouse-items.create">
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
          placeholder="Cari nama / SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Input
          placeholder="Filter kategori..."
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-48"
        />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        emptyMessage="Belum ada barang gudang."
        startIndex={(meta.current_page - 1) * 10}
        loading={loading}
      />
      {!loading && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} onPageChange={loadItems} />}

      {formMode && (
        <Modal
          title={formMode === "create" ? "Tambah Barang Baru" : `Edit Barang — ${editingItem?.name}`}
          onClose={closeForm}
          width="600px"
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Barang"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="SKU"
                name="sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                error={fieldErrors.sku}
              />
              <Input
                label="Kategori"
                name="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Satuan"
                name="unit"
                placeholder="mis. pcs, box, kg"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
              <Input
                label="Stok Minimum"
                name="min_stock"
                type="number"
                min="0"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Harga Beli"
                name="price_buy"
                type="number"
                min="0"
                value={form.price_buy}
                onChange={(e) => setForm({ ...form, price_buy: e.target.value })}
              />
              <Input
                label="Harga Jual"
                name="price_sell"
                type="number"
                min="0"
                value={form.price_sell}
                onChange={(e) => setForm({ ...form, price_sell: e.target.value })}
              />
            </div>
            <Textarea label="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

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

      {confirmDelete && (
        <ConfirmDialog
          title="Hapus Barang"
          description={`Hapus barang "${confirmDelete.name}"? Barang yang masih memiliki stok tidak bisa dihapus.`}
          confirmLabel="Hapus"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
