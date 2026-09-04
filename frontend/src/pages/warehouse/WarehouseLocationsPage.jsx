import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, ConfirmDialog, DataTable, IconButton, Input, Modal, PageHeader, PencilIcon, Select, Textarea, TrashIcon } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";
import { hasErrors, validate } from "../../utils/validate";

const EMPTY_FORM = { name: "", code: "", type: "warehouse", parent_id: "", notes: "" };

const VALIDATION_RULES = [{ name: "name", label: "Nama Lokasi", required: true }];

export default function WarehouseLocationsPage() {
  const { can } = useAuth();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [formMode, setFormMode] = useState(null); // "create" | "edit" | null
  const [editingLocation, setEditingLocation] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/warehouse/locations", { params: { q: search || undefined } });
      setLocations(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data lokasi gudang.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadLocations();
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setFormMode("create");
  };

  const openEdit = (location) => {
    setEditingLocation(location);
    setFieldErrors({});
    setFormError(null);
    setFormMode("edit");
    setForm({
      name: location.name ?? "",
      code: location.code ?? "",
      type: location.type ?? "warehouse",
      parent_id: location.parent_id ?? "",
      notes: location.notes ?? "",
    });
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingLocation(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    const errors = validate(form, VALIDATION_RULES);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    const payload = { ...form, parent_id: form.parent_id || null };

    setSubmitting(true);
    try {
      if (formMode === "create") {
        await apiClient.post("/warehouse/locations", payload);
      } else {
        await apiClient.put(`/warehouse/locations/${editingLocation.id}`, payload);
      }
      closeForm();
      await loadLocations();
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Gagal menyimpan lokasi gudang.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/warehouse/locations/${confirmDelete.id}`);
      setConfirmDelete(null);
      await loadLocations();
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal menghapus lokasi gudang.");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Racks are parented under a warehouse; a warehouse itself can't be parented.
  const warehouseOptions = locations.filter((l) => l.type === "warehouse" && l.id !== editingLocation?.id);

  const columns = [
    { key: "name", header: "Nama" },
    { key: "code", header: "Kode", render: (row) => row.code ?? "-" },
    { key: "type", header: "Tipe", render: (row) => <Badge status={row.type === "warehouse" ? "trial" : "lime"}>{row.type === "warehouse" ? "Gudang" : "Rak"}</Badge> },
    { key: "parent_name", header: "Induk", render: (row) => row.parent_name ?? "-" },
    { key: "notes", header: "Catatan", render: (row) => row.notes ?? "-" },
  ];

  if (can("warehouse-locations.update") || can("warehouse-locations.delete")) {
    columns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Can permission="warehouse-locations.update">
            <IconButton icon={<PencilIcon />} label="Edit" onClick={() => openEdit(row)} />
          </Can>
          <Can permission="warehouse-locations.delete">
            <IconButton icon={<TrashIcon />} label="Hapus" variant="danger" onClick={() => setConfirmDelete(row)} />
          </Can>
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Gudang & Rak"
        description="Kelola lokasi penyimpanan barang — gudang utama dan rak/sub-lokasi di dalamnya."
        action={
          <Can permission="warehouse-locations.create">
            <Button onClick={openCreate}>+ Tambah Lokasi</Button>
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
          placeholder="Cari nama / kode lokasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <DataTable columns={columns} rows={locations} rowKey={(row) => row.id} emptyMessage="Belum ada lokasi gudang." loading={loading} />

      {formMode && (
        <Modal
          title={formMode === "create" ? "Tambah Lokasi Baru" : `Edit Lokasi — ${editingLocation?.name}`}
          onClose={closeForm}
          width="560px"
        >
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Lokasi"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={fieldErrors.name}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Kode"
                name="code"
                placeholder="mis. GD-01"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <Select label="Tipe" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="warehouse">Gudang</option>
                <option value="rack">Rak</option>
              </Select>
            </div>
            {form.type === "rack" && (
              <Select
                label="Induk Gudang"
                hint="Rak ini berada di dalam gudang mana."
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              >
                <option value="">Tanpa induk</option>
                {warehouseOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            )}
            <Textarea
              label="Catatan"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            {formError && <Alert>{formError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Batal
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : formMode === "create" ? "Tambah Lokasi" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Hapus Lokasi"
          description={`Hapus lokasi "${confirmDelete.name}"? Lokasi yang masih punya rak atau stok tidak bisa dihapus.`}
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
