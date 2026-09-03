import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, ConfirmDialog, DataTable, Input, Modal, PageHeader, Pagination, Select, Tabs, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_FORM = {
  name: "",
  sku: "",
  warehouse_category_id: "",
  unit: "",
  price_buy: "",
  price_sell: "",
  min_stock: "",
  notes: "",
  is_inventory_grant: false,
  inventory_grant_source: "",
};
const EMPTY_CATEGORY_FORM = { name: "" };

const VALIDATION_RULES = [{ name: "name", label: "Nama Barang", required: true }];

const formatCurrency = (value) => (value === null || value === undefined ? "-" : `Rp ${Number(value).toLocaleString("id-ID")}`);

export default function WarehouseItemsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState("items"); // "items" | "categories"

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

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

  const [categoryFormMode, setCategoryFormMode] = useState(null); // "create" | "edit" | null
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [categoryFormError, setCategoryFormError] = useState(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const { data } = await apiClient.get("/warehouse/categories");
      setCategories(data.data);
    } catch (err) {
      setCategoriesError(err.response?.data?.message ?? "Gagal memuat data kategori.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadItems = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/warehouse/items", {
        params: { page, q: search || undefined, warehouse_category_id: categoryFilter || undefined },
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
    loadCategories();
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
      warehouse_category_id: item.warehouse_category_id ?? "",
      unit: item.unit ?? "",
      price_buy: item.price_buy ?? "",
      price_sell: item.price_sell ?? "",
      min_stock: item.min_stock ?? "",
      notes: item.notes ?? "",
      is_inventory_grant: item.is_inventory_grant ?? false,
      inventory_grant_source: item.inventory_grant_source ?? "",
    });
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingItem(null);
  };

  const toggleInventoryGrant = (checked) =>
    setForm((f) => ({
      ...f,
      is_inventory_grant: checked,
      // A donated/inventory-grant item has no purchase price to record.
      price_buy: checked ? "" : f.price_buy,
      price_sell: checked ? "" : f.price_sell,
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const errors = validate(form, VALIDATION_RULES);
    if (form.is_inventory_grant && !form.inventory_grant_source.trim()) {
      errors.inventory_grant_source = "Sumber inventaris/hibah wajib diisi.";
    }
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    const payload = {
      ...form,
      warehouse_category_id: form.warehouse_category_id || null,
      price_buy: form.is_inventory_grant || form.price_buy === "" ? null : Number(form.price_buy),
      price_sell: form.is_inventory_grant || form.price_sell === "" ? null : Number(form.price_sell),
      min_stock: form.min_stock === "" ? null : Number(form.min_stock),
      inventory_grant_source: form.is_inventory_grant ? form.inventory_grant_source : null,
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

  // --- Categories CRUD ---

  const openCreateCategory = () => {
    setCategoryForm(EMPTY_CATEGORY_FORM);
    setCategoryFormError(null);
    setCategoryFormMode("create");
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({ name: category.name ?? "" });
    setCategoryFormError(null);
    setCategoryFormMode("edit");
  };

  const closeCategoryForm = () => {
    setCategoryFormMode(null);
    setEditingCategory(null);
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setCategoryFormError(null);

    if (!categoryForm.name.trim()) {
      setCategoryFormError("Nama kategori wajib diisi.");
      return;
    }

    setCategorySubmitting(true);
    try {
      if (categoryFormMode === "create") {
        await apiClient.post("/warehouse/categories", categoryForm);
      } else {
        await apiClient.put(`/warehouse/categories/${editingCategory.id}`, categoryForm);
      }
      closeCategoryForm();
      await loadCategories();
    } catch (err) {
      setCategoryFormError(err.response?.data?.message ?? "Gagal menyimpan kategori.");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    setDeletingCategory(true);
    try {
      await apiClient.delete(`/warehouse/categories/${confirmDeleteCategory.id}`);
      setConfirmDeleteCategory(null);
      await loadCategories();
    } catch (err) {
      setCategoriesError(err.response?.data?.message ?? "Gagal menghapus kategori.");
      setConfirmDeleteCategory(null);
    } finally {
      setDeletingCategory(false);
    }
  };

  const columns = [
    { key: "sku", header: "SKU", render: (row) => row.sku ?? "-" },
    {
      key: "name",
      header: "Nama Barang",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span>{row.name}</span>
          {row.is_inventory_grant && <Badge status="lime">Hibah</Badge>}
        </div>
      ),
    },
    { key: "category_name", header: "Kategori", render: (row) => row.category_name ?? "-" },
    { key: "unit", header: "Satuan", render: (row) => row.unit ?? "-" },
    { key: "total_stock", header: "Stok", render: (row) => row.total_stock ?? 0 },
    {
      key: "price_buy",
      header: "Harga Beli",
      render: (row) => (row.is_inventory_grant ? `Hibah (${row.inventory_grant_source ?? "-"})` : formatCurrency(row.price_buy)),
    },
    { key: "price_sell", header: "Harga Jual", render: (row) => (row.is_inventory_grant ? "-" : formatCurrency(row.price_sell)) },
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

  const categoryColumns = [
    { key: "name", header: "Nama Kategori" },
    { key: "items_count", header: "Jumlah Barang", render: (row) => row.items_count ?? 0 },
  ];

  if (can("warehouse-items.update") || can("warehouse-items.delete")) {
    categoryColumns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Can permission="warehouse-items.update">
            <Button variant="secondary" size="sm" onClick={() => openEditCategory(row)}>
              Edit
            </Button>
          </Can>
          <Can permission="warehouse-items.delete">
            <Button variant="danger" size="sm" onClick={() => setConfirmDeleteCategory(row)}>
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
          tab === "items" ? (
            <Can permission="warehouse-items.create">
              <Button onClick={openCreate}>+ Tambah Barang</Button>
            </Can>
          ) : (
            <Can permission="warehouse-items.create">
              <Button onClick={openCreateCategory}>+ Tambah Kategori</Button>
            </Can>
          )
        }
      />

      <Tabs
        tabs={[
          { key: "items", label: "Barang" },
          { key: "categories", label: "Kategori" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "items" && (
        <>
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
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-48">
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
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
        </>
      )}

      {tab === "categories" && (
        <>
          {categoriesError && (
            <div className="mb-4">
              <Alert>{categoriesError}</Alert>
            </div>
          )}
          <DataTable
            columns={categoryColumns}
            rows={categories}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada kategori. Tambahkan kategori agar bisa dipilih saat menambah barang."
            loading={categoriesLoading}
          />
        </>
      )}

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
              <Select
                label="Kategori"
                hint={categories.length === 0 ? 'Belum ada kategori — tambahkan lewat tab "Kategori".' : undefined}
                value={form.warehouse_category_id}
                onChange={(e) => setForm({ ...form, warehouse_category_id: e.target.value })}
              >
                <option value="">Tanpa kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
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
                disabled={form.is_inventory_grant}
                hint={form.is_inventory_grant ? "Nonaktif — barang inventaris/hibah tidak punya harga beli." : undefined}
              />
              <Input
                label="Harga Jual"
                name="price_sell"
                type="number"
                min="0"
                value={form.price_sell}
                onChange={(e) => setForm({ ...form, price_sell: e.target.value })}
                disabled={form.is_inventory_grant}
                hint={form.is_inventory_grant ? "Nonaktif — barang inventaris/hibah tidak punya harga jual." : undefined}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_inventory_grant}
                onChange={(e) => toggleInventoryGrant(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              <span className="font-semibold text-ink">Inventaris/Hibah</span>
            </label>
            {form.is_inventory_grant && (
              <Input
                label="Dari Siapa (Inventaris/Hibah)"
                value={form.inventory_grant_source}
                onChange={(e) => setForm({ ...form, inventory_grant_source: e.target.value })}
                error={fieldErrors.inventory_grant_source}
                required
              />
            )}

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

      {categoryFormMode && (
        <Modal
          title={categoryFormMode === "create" ? "Tambah Kategori Baru" : `Edit Kategori — ${editingCategory?.name}`}
          onClose={closeCategoryForm}
          width="440px"
        >
          <form onSubmit={handleCategorySubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Kategori"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ name: e.target.value })}
              required
            />

            {categoryFormError && <Alert>{categoryFormError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeCategoryForm}>
                Batal
              </Button>
              <Button type="submit" loading={categorySubmitting}>
                {categorySubmitting ? "Menyimpan..." : categoryFormMode === "create" ? "Tambah Kategori" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDeleteCategory && (
        <ConfirmDialog
          title="Hapus Kategori"
          description={`Hapus kategori "${confirmDeleteCategory.name}"? Kategori yang masih dipakai barang tidak bisa dihapus.`}
          confirmLabel="Hapus"
          variant="danger"
          loading={deletingCategory}
          onConfirm={handleDeleteCategory}
          onCancel={() => setConfirmDeleteCategory(null)}
        />
      )}
    </div>
  );
}
