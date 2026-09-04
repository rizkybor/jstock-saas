import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EyeIcon,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  PencilIcon,
  Select,
  Tabs,
  Textarea,
  TrashIcon,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import Can from "../../routes/Can";

const STATUS_LABEL = { draft: "Draft", ordered: "Dipesan", partially_received: "Diterima Sebagian", received: "Diterima", cancelled: "Dibatalkan" };

const formatCurrency = (value) => `Rp ${Number(value).toLocaleString("id-ID")}`;
const formatDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-");

const EMPTY_SUPPLIER_FORM = { name: "", contact_name: "", phone: "", email: "", address: "" };
const EMPTY_PO_FORM = { warehouse_supplier_id: "", receiving_location_id: "", ordered_at: "", notes: "", items: [] };

export default function WarehousePurchaseOrdersPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState("orders"); // "orders" | "suppliers"

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [poFormOpen, setPoFormOpen] = useState(false);
  const [poForm, setPoForm] = useState(EMPTY_PO_FORM);
  const [poError, setPoError] = useState(null);
  const [poSubmitting, setPoSubmitting] = useState(false);

  const [detailOrder, setDetailOrder] = useState(null);
  const [receiveQtys, setReceiveQtys] = useState({});
  const [receiveLocationId, setReceiveLocationId] = useState("");
  const [receiveError, setReceiveError] = useState(null);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState(null);
  const [supplierFormMode, setSupplierFormMode] = useState(null); // "create" | "edit" | null
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [supplierFormError, setSupplierFormError] = useState(null);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [confirmDeleteSupplier, setConfirmDeleteSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(false);

  const loadLookups = async () => {
    try {
      const [itemsRes, locationsRes, suppliersRes] = await Promise.all([
        apiClient.get("/warehouse/items", { params: { limit: 200 } }),
        apiClient.get("/warehouse/locations"),
        apiClient.get("/warehouse/suppliers"),
      ]);
      setItems(itemsRes.data.data);
      setLocations(locationsRes.data.data);
      setSuppliers(suppliersRes.data.data);
    } catch {
      // Selects render empty — submit errors are surfaced separately.
    } finally {
      setSuppliersLoading(false);
    }
  };

  const loadOrders = async (page = 1) => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { data } = await apiClient.get("/warehouse/purchase-orders", { params: { page, status: statusFilter || undefined } });
      setOrders(data.data);
      setMeta(data.meta);
    } catch (err) {
      setOrdersError(err.response?.data?.message ?? "Gagal memuat data Purchase Order.");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data } = await apiClient.get("/warehouse/suppliers");
      setSuppliers(data.data);
    } catch (err) {
      setSuppliersError(err.response?.data?.message ?? "Gagal memuat data supplier.");
    }
  };

  useEffect(() => {
    loadLookups();
    loadOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadOrders(1);
  };

  // --- Purchase Order create ---

  const openPoForm = () => {
    setPoForm(EMPTY_PO_FORM);
    setPoError(null);
    setPoFormOpen(true);
  };

  const addPoLine = () => setPoForm((f) => ({ ...f, items: [...f.items, { warehouse_item_id: "", qty_ordered: "", unit_cost: "" }] }));
  const updatePoLine = (index, patch) =>
    setPoForm((f) => ({ ...f, items: f.items.map((line, i) => (i === index ? { ...line, ...patch } : line)) }));
  const removePoLine = (index) => setPoForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const handlePoSubmit = async (event) => {
    event.preventDefault();
    setPoError(null);

    if (!poForm.warehouse_supplier_id) {
      setPoError("Supplier wajib dipilih.");
      return;
    }
    if (poForm.items.length === 0) {
      setPoError("Tambahkan minimal satu barang.");
      return;
    }
    if (poForm.items.some((line) => !line.warehouse_item_id || !line.qty_ordered)) {
      setPoError("Setiap baris barang wajib memilih barang dan mengisi kuantitas.");
      return;
    }

    setPoSubmitting(true);
    try {
      await apiClient.post("/warehouse/purchase-orders", {
        ...poForm,
        receiving_location_id: poForm.receiving_location_id || null,
        ordered_at: poForm.ordered_at || undefined,
        items: poForm.items.map((line) => ({
          warehouse_item_id: line.warehouse_item_id,
          qty_ordered: Number(line.qty_ordered),
          unit_cost: line.unit_cost === "" ? undefined : Number(line.unit_cost),
        })),
      });
      setPoFormOpen(false);
      await loadOrders(1);
    } catch (err) {
      setPoError(err.response?.data?.message ?? "Gagal membuat Purchase Order.");
    } finally {
      setPoSubmitting(false);
    }
  };

  // --- Purchase Order detail / receive ---

  const openDetail = async (order) => {
    setReceiveError(null);
    try {
      const { data } = await apiClient.get(`/warehouse/purchase-orders/${order.id}`);
      setDetailOrder(data.data);
      setReceiveLocationId(data.data.receiving_location?.id ?? "");
      setReceiveQtys({});
    } catch (err) {
      setOrdersError(err.response?.data?.message ?? "Gagal memuat detail Purchase Order.");
    }
  };

  const closeDetail = () => setDetailOrder(null);

  const handleReceiveSubmit = async (event) => {
    event.preventDefault();
    setReceiveError(null);

    const lines = Object.entries(receiveQtys)
      .filter(([, qty]) => qty !== "" && Number(qty) > 0)
      .map(([poItemId, qty]) => ({ po_item_id: Number(poItemId), qty_received: Number(qty) }));

    if (lines.length === 0) {
      setReceiveError("Isi kuantitas yang diterima untuk minimal satu barang.");
      return;
    }
    if (!detailOrder.receiving_location && !receiveLocationId) {
      setReceiveError("Pilih lokasi penerimaan.");
      return;
    }

    setReceiveSubmitting(true);
    try {
      const { data } = await apiClient.patch(`/warehouse/purchase-orders/${detailOrder.id}/receive`, {
        receiving_location_id: receiveLocationId || undefined,
        items: lines,
      });
      setDetailOrder(data.data);
      setReceiveQtys({});
      await loadOrders(meta.current_page);
    } catch (err) {
      setReceiveError(err.response?.data?.message ?? "Gagal mencatat penerimaan barang.");
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // --- Suppliers CRUD ---

  const openCreateSupplier = () => {
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setSupplierFormError(null);
    setSupplierFormMode("create");
  };

  const openEditSupplier = (supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name ?? "",
      contact_name: supplier.contact_name ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
    });
    setSupplierFormError(null);
    setSupplierFormMode("edit");
  };

  const closeSupplierForm = () => {
    setSupplierFormMode(null);
    setEditingSupplier(null);
  };

  const handleSupplierSubmit = async (event) => {
    event.preventDefault();
    setSupplierFormError(null);

    if (!supplierForm.name.trim()) {
      setSupplierFormError("Nama supplier wajib diisi.");
      return;
    }

    setSupplierSubmitting(true);
    try {
      if (supplierFormMode === "create") {
        await apiClient.post("/warehouse/suppliers", supplierForm);
      } else {
        await apiClient.put(`/warehouse/suppliers/${editingSupplier.id}`, supplierForm);
      }
      closeSupplierForm();
      await loadSuppliers();
    } catch (err) {
      setSupplierFormError(err.response?.data?.message ?? "Gagal menyimpan data supplier.");
    } finally {
      setSupplierSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    setDeletingSupplier(true);
    try {
      await apiClient.delete(`/warehouse/suppliers/${confirmDeleteSupplier.id}`);
      setConfirmDeleteSupplier(null);
      await loadSuppliers();
    } catch (err) {
      setSuppliersError(err.response?.data?.message ?? "Gagal menghapus supplier.");
      setConfirmDeleteSupplier(null);
    } finally {
      setDeletingSupplier(false);
    }
  };

  const orderColumns = [
    { key: "po_number", header: "No. PO" },
    { key: "supplier", header: "Supplier", render: (row) => row.supplier?.name ?? "-" },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status}>{STATUS_LABEL[row.status] ?? row.status}</Badge> },
    { key: "ordered_at", header: "Tgl Pesan", render: (row) => formatDate(row.ordered_at) },
    { key: "items_count", header: "Jml Barang", render: (row) => row.items?.length ?? 0 },
    {
      key: "actions",
      header: "Aksi",
      render: (row) => <IconButton icon={<EyeIcon />} label="Detail" onClick={() => openDetail(row)} />,
    },
  ];

  const supplierColumns = [
    { key: "name", header: "Nama Supplier" },
    { key: "contact_name", header: "Kontak", render: (row) => row.contact_name ?? "-" },
    { key: "phone", header: "Telepon", render: (row) => row.phone ?? "-" },
    { key: "email", header: "Email", render: (row) => row.email ?? "-" },
  ];

  if (can("warehouse-suppliers.update") || can("warehouse-suppliers.delete")) {
    supplierColumns.push({
      key: "actions",
      header: "Aksi",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Can permission="warehouse-suppliers.update">
            <IconButton icon={<PencilIcon />} label="Edit" onClick={() => openEditSupplier(row)} />
          </Can>
          <Can permission="warehouse-suppliers.delete">
            <IconButton icon={<TrashIcon />} label="Hapus" variant="danger" onClick={() => setConfirmDeleteSupplier(row)} />
          </Can>
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title="Purchase Order"
        description="Pesan barang ke supplier dan catat penerimaannya ke stok."
        action={
          tab === "orders" ? (
            <Can permission="warehouse-purchase-orders.create">
              <Button onClick={openPoForm}>+ Buat PO</Button>
            </Can>
          ) : (
            <Can permission="warehouse-suppliers.create">
              <Button onClick={openCreateSupplier}>+ Tambah Supplier</Button>
            </Can>
          )
        }
      />

      <Tabs
        tabs={[
          { key: "orders", label: "Purchase Order" },
          { key: "suppliers", label: "Supplier" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "orders" && (
        <>
          {ordersError && (
            <div className="mb-4">
              <Alert>{ordersError}</Alert>
            </div>
          )}
          <form onSubmit={handleFilterSubmit} className="mb-4 flex flex-wrap gap-3">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-56">
              <option value="">Semua Status</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
          </form>
          <DataTable
            columns={orderColumns}
            rows={orders}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada Purchase Order."
            startIndex={(meta.current_page - 1) * 10}
            loading={ordersLoading}
          />
          {!ordersLoading && (
            <Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} onPageChange={loadOrders} />
          )}
        </>
      )}

      {tab === "suppliers" && (
        <>
          {suppliersError && (
            <div className="mb-4">
              <Alert>{suppliersError}</Alert>
            </div>
          )}
          <DataTable
            columns={supplierColumns}
            rows={suppliers}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada data supplier."
            loading={suppliersLoading}
          />
        </>
      )}

      {poFormOpen && (
        <Modal title="Buat Purchase Order" onClose={() => setPoFormOpen(false)} width="680px">
          <form onSubmit={handlePoSubmit} noValidate className="flex flex-col gap-4">
            <Select
              label="Supplier"
              value={poForm.warehouse_supplier_id}
              onChange={(e) => setPoForm({ ...poForm, warehouse_supplier_id: e.target.value })}
              required
            >
              <option value="">Pilih supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Lokasi Penerimaan"
                hint="Bisa ditentukan nanti saat menerima barang."
                value={poForm.receiving_location_id}
                onChange={(e) => setPoForm({ ...poForm, receiving_location_id: e.target.value })}
              >
                <option value="">Belum ditentukan</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Tanggal Pesan"
                type="date"
                value={poForm.ordered_at}
                onChange={(e) => setPoForm({ ...poForm, ordered_at: e.target.value })}
              />
            </div>
            <Textarea label="Catatan" value={poForm.notes} onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })} />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Barang Dipesan</span>
                <Button type="button" variant="secondary" size="sm" onClick={addPoLine}>
                  + Tambah Barang
                </Button>
              </div>
              {poForm.items.length === 0 ? (
                <p className="text-sm text-ink-muted">Belum ada barang ditambahkan.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {poForm.items.map((line, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_100px_120px_auto]">
                      <Select value={line.warehouse_item_id} onChange={(e) => updatePoLine(index, { warehouse_item_id: e.target.value })}>
                        <option value="">Pilih barang...</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={line.qty_ordered}
                        onChange={(e) => updatePoLine(index, { qty_ordered: e.target.value })}
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Harga satuan"
                        value={line.unit_cost}
                        onChange={(e) => updatePoLine(index, { unit_cost: e.target.value })}
                      />
                      <IconButton icon={<TrashIcon />} label="Hapus" variant="outline-danger" onClick={() => removePoLine(index)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {poError && <Alert>{poError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={() => setPoFormOpen(false)}>
                Batal
              </Button>
              <Button type="submit" loading={poSubmitting}>
                {poSubmitting ? "Menyimpan..." : "Buat PO"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {detailOrder && (
        <Modal
          title={`Purchase Order — ${detailOrder.po_number}`}
          description={`Supplier: ${detailOrder.supplier?.name ?? "-"} · Status: ${STATUS_LABEL[detailOrder.status] ?? detailOrder.status}`}
          onClose={closeDetail}
          width="680px"
        >
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-2">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-ink-muted uppercase">Barang</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-ink-muted uppercase">Dipesan</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-ink-muted uppercase">Diterima</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-ink-muted uppercase">Harga</th>
                    {detailOrder.status !== "received" && detailOrder.status !== "cancelled" && (
                      <th className="px-3 py-2 text-left text-xs font-semibold text-ink-muted uppercase">Terima Sekarang</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {detailOrder.items.map((line) => {
                    const remaining = line.qty_ordered - line.qty_received;
                    return (
                      <tr key={line.id} className="border-t border-border">
                        <td className="px-3 py-2 text-ink">
                          {line.item_name}
                          {line.item_sku ? ` (${line.item_sku})` : ""}
                        </td>
                        <td className="px-3 py-2 text-ink">{line.qty_ordered}</td>
                        <td className="px-3 py-2 text-ink">{line.qty_received}</td>
                        <td className="px-3 py-2 text-ink">{formatCurrency(line.unit_cost)}</td>
                        {detailOrder.status !== "received" && detailOrder.status !== "cancelled" && (
                          <td className="px-3 py-2">
                            {remaining > 0 ? (
                              <Input
                                type="number"
                                min="0"
                                max={remaining}
                                placeholder={`maks ${remaining}`}
                                value={receiveQtys[line.id] ?? ""}
                                onChange={(e) => setReceiveQtys({ ...receiveQtys, [line.id]: e.target.value })}
                                className="w-28"
                              />
                            ) : (
                              <span className="text-xs text-ink-muted">Lunas</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {detailOrder.status !== "received" && detailOrder.status !== "cancelled" && (
              <Can permission="warehouse-purchase-orders.receive">
                <form onSubmit={handleReceiveSubmit} className="flex flex-col gap-3 border-t border-border pt-4">
                  {!detailOrder.receiving_location && (
                    <Select
                      label="Lokasi Penerimaan"
                      value={receiveLocationId}
                      onChange={(e) => setReceiveLocationId(e.target.value)}
                      required
                    >
                      <option value="">Pilih lokasi...</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  {receiveError && <Alert>{receiveError}</Alert>}
                  <div className="flex justify-end">
                    <Button type="submit" loading={receiveSubmitting}>
                      {receiveSubmitting ? "Menyimpan..." : "Catat Penerimaan"}
                    </Button>
                  </div>
                </form>
              </Can>
            )}
          </div>
        </Modal>
      )}

      {supplierFormMode && (
        <Modal
          title={supplierFormMode === "create" ? "Tambah Supplier Baru" : `Edit Supplier — ${editingSupplier?.name}`}
          onClose={closeSupplierForm}
          width="560px"
        >
          <form onSubmit={handleSupplierSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Nama Supplier"
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nama Kontak"
                value={supplierForm.contact_name}
                onChange={(e) => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
              />
              <Input
                label="Telepon"
                value={supplierForm.phone}
                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />
            <Textarea
              label="Alamat"
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
            />

            {supplierFormError && <Alert>{supplierFormError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={closeSupplierForm}>
                Batal
              </Button>
              <Button type="submit" loading={supplierSubmitting}>
                {supplierSubmitting ? "Menyimpan..." : supplierFormMode === "create" ? "Tambah Supplier" : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDeleteSupplier && (
        <ConfirmDialog
          title="Hapus Supplier"
          description={`Hapus supplier "${confirmDeleteSupplier.name}"? Supplier yang masih punya riwayat PO tidak bisa dihapus.`}
          confirmLabel="Hapus"
          variant="danger"
          loading={deletingSupplier}
          onConfirm={handleDeleteSupplier}
          onCancel={() => setConfirmDeleteSupplier(null)}
        />
      )}
    </div>
  );
}
