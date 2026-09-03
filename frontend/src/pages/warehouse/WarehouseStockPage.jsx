import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, DataTable, Input, Modal, PageHeader, Pagination, Select, Tabs, Textarea } from "../../components/ui";
import Can from "../../routes/Can";

const MOVEMENT_BADGE = { in: "active", out: "rejected", adjustment: "pending" };
const MOVEMENT_LABEL = { in: "Masuk", out: "Keluar", adjustment: "Penyesuaian" };
const REFERENCE_LABEL = { manual: "Manual", purchase_order: "Purchase Order", transfer: "Transfer", opname: "Stock Opname" };

const EMPTY_MOVE_FORM = { warehouse_item_id: "", warehouse_location_id: "", type: "in", qty: "", note: "" };
const EMPTY_TRANSFER_FORM = { warehouse_item_id: "", from_location_id: "", to_location_id: "", qty: "", note: "" };

export default function WarehouseStockPage() {
  const [tab, setTab] = useState("stock"); // "stock" | "movements"

  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);

  const [stocks, setStocks] = useState([]);
  const [stockLoading, setStockLoading] = useState(true);
  const [stockError, setStockError] = useState(null);

  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementsError, setMovementsError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [moveMode, setMoveMode] = useState(false);
  const [moveForm, setMoveForm] = useState(EMPTY_MOVE_FORM);
  const [moveError, setMoveError] = useState(null);
  const [moveSubmitting, setMoveSubmitting] = useState(false);

  const [transferMode, setTransferMode] = useState(false);
  const [transferForm, setTransferForm] = useState(EMPTY_TRANSFER_FORM);
  const [transferError, setTransferError] = useState(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  const loadLookups = async () => {
    try {
      const [itemsRes, locationsRes] = await Promise.all([
        apiClient.get("/warehouse/items", { params: { limit: 200 } }),
        apiClient.get("/warehouse/locations"),
      ]);
      setItems(itemsRes.data.data);
      setLocations(locationsRes.data.data);
    } catch {
      // Selects just render empty — the form itself surfaces submit errors.
    }
  };

  const loadStocks = async () => {
    setStockLoading(true);
    setStockError(null);
    try {
      const { data } = await apiClient.get("/warehouse/stock");
      setStocks(data.data);
    } catch (err) {
      setStockError(err.response?.data?.message ?? "Gagal memuat data stok.");
    } finally {
      setStockLoading(false);
    }
  };

  const loadMovements = async (page = 1) => {
    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const { data } = await apiClient.get("/warehouse/stock/movements", { params: { page } });
      setMovements(data.data);
      setMeta(data.meta);
    } catch (err) {
      setMovementsError(err.response?.data?.message ?? "Gagal memuat riwayat pergerakan stok.");
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    loadStocks();
    loadMovements(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openMove = () => {
    setMoveForm(EMPTY_MOVE_FORM);
    setMoveError(null);
    setMoveMode(true);
  };

  const handleMoveSubmit = async (event) => {
    event.preventDefault();
    setMoveError(null);

    if (!moveForm.warehouse_item_id || !moveForm.warehouse_location_id || !moveForm.qty) {
      setMoveError("Barang, lokasi, dan kuantitas wajib diisi.");
      return;
    }

    setMoveSubmitting(true);
    try {
      await apiClient.post("/warehouse/stock/move", { ...moveForm, qty: Number(moveForm.qty) });
      setMoveMode(false);
      await Promise.all([loadStocks(), loadMovements(1)]);
    } catch (err) {
      setMoveError(err.response?.data?.message ?? "Gagal mencatat stok masuk/keluar.");
    } finally {
      setMoveSubmitting(false);
    }
  };

  const openTransfer = () => {
    setTransferForm(EMPTY_TRANSFER_FORM);
    setTransferError(null);
    setTransferMode(true);
  };

  const handleTransferSubmit = async (event) => {
    event.preventDefault();
    setTransferError(null);

    if (!transferForm.warehouse_item_id || !transferForm.from_location_id || !transferForm.to_location_id || !transferForm.qty) {
      setTransferError("Barang, lokasi asal, lokasi tujuan, dan kuantitas wajib diisi.");
      return;
    }
    if (transferForm.from_location_id === transferForm.to_location_id) {
      setTransferError("Lokasi asal dan tujuan tidak boleh sama.");
      return;
    }

    setTransferSubmitting(true);
    try {
      await apiClient.post("/warehouse/stock/transfer", { ...transferForm, qty: Number(transferForm.qty) });
      setTransferMode(false);
      await Promise.all([loadStocks(), loadMovements(1)]);
    } catch (err) {
      setTransferError(err.response?.data?.message ?? "Gagal mencatat transfer stok.");
    } finally {
      setTransferSubmitting(false);
    }
  };

  const stockColumns = [
    { key: "item", header: "Barang", render: (row) => `${row.item?.name ?? "-"}${row.item?.sku ? ` (${row.item.sku})` : ""}` },
    { key: "location", header: "Lokasi", render: (row) => row.location?.name ?? "-" },
    { key: "unit", header: "Satuan", render: (row) => row.item?.unit ?? "-" },
    { key: "qty", header: "Kuantitas", render: (row) => row.qty },
  ];

  const movementColumns = [
    { key: "created_at", header: "Waktu", render: (row) => new Date(row.created_at).toLocaleString("id-ID") },
    { key: "item", header: "Barang", render: (row) => row.item?.name ?? "-" },
    { key: "location", header: "Lokasi", render: (row) => row.location?.name ?? "-" },
    { key: "type", header: "Tipe", render: (row) => <Badge status={MOVEMENT_BADGE[row.type]}>{MOVEMENT_LABEL[row.type] ?? row.type}</Badge> },
    { key: "qty", header: "Qty", render: (row) => row.qty },
    { key: "reference_type", header: "Sumber", render: (row) => REFERENCE_LABEL[row.reference_type] ?? row.reference_type },
    { key: "note", header: "Catatan", render: (row) => row.note ?? "-" },
    { key: "created_by_name", header: "Oleh", render: (row) => row.created_by_name ?? "-" },
  ];

  return (
    <div>
      <PageHeader
        title="Stok Masuk & Keluar"
        description="Kelola stok per lokasi, catat mutasi manual, dan pindahkan stok antar lokasi."
        action={
          <div className="flex gap-2">
            <Can permission="warehouse-stock.move">
              <Button variant="secondary" onClick={openTransfer}>
                Transfer Lokasi
              </Button>
            </Can>
            <Can permission="warehouse-stock.move">
              <Button onClick={openMove}>+ Stok Masuk/Keluar</Button>
            </Can>
          </div>
        }
      />

      <Tabs
        tabs={[
          { key: "stock", label: "Stok Saat Ini" },
          { key: "movements", label: "Riwayat Pergerakan" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "stock" && (
        <>
          {stockError && (
            <div className="mb-4">
              <Alert>{stockError}</Alert>
            </div>
          )}
          <DataTable columns={stockColumns} rows={stocks} rowKey={(row) => row.id} emptyMessage="Belum ada data stok." loading={stockLoading} />
        </>
      )}

      {tab === "movements" && (
        <>
          {movementsError && (
            <div className="mb-4">
              <Alert>{movementsError}</Alert>
            </div>
          )}
          <DataTable
            columns={movementColumns}
            rows={movements}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada riwayat pergerakan stok."
            startIndex={(meta.current_page - 1) * 15}
            loading={movementsLoading}
          />
          {!movementsLoading && (
            <Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} onPageChange={loadMovements} />
          )}
        </>
      )}

      {moveMode && (
        <Modal title="Stok Masuk / Keluar" onClose={() => setMoveMode(false)} width="500px">
          <form onSubmit={handleMoveSubmit} noValidate className="flex flex-col gap-4">
            <Select
              label="Tipe"
              value={moveForm.type}
              onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value })}
              required
            >
              <option value="in">Stok Masuk</option>
              <option value="out">Stok Keluar</option>
            </Select>
            <Select
              label="Barang"
              value={moveForm.warehouse_item_id}
              onChange={(e) => setMoveForm({ ...moveForm, warehouse_item_id: e.target.value })}
              required
            >
              <option value="">Pilih barang...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.sku ? ` (${i.sku})` : ""}
                </option>
              ))}
            </Select>
            <Select
              label="Lokasi"
              value={moveForm.warehouse_location_id}
              onChange={(e) => setMoveForm({ ...moveForm, warehouse_location_id: e.target.value })}
              required
            >
              <option value="">Pilih lokasi...</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Input
              label="Kuantitas"
              type="number"
              min="1"
              value={moveForm.qty}
              onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })}
              required
            />
            <Textarea label="Catatan" value={moveForm.note} onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })} />

            {moveError && <Alert>{moveError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={() => setMoveMode(false)}>
                Batal
              </Button>
              <Button type="submit" loading={moveSubmitting}>
                {moveSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {transferMode && (
        <Modal title="Transfer Stok Antar Lokasi" onClose={() => setTransferMode(false)} width="500px">
          <form onSubmit={handleTransferSubmit} noValidate className="flex flex-col gap-4">
            <Select
              label="Barang"
              value={transferForm.warehouse_item_id}
              onChange={(e) => setTransferForm({ ...transferForm, warehouse_item_id: e.target.value })}
              required
            >
              <option value="">Pilih barang...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {i.sku ? ` (${i.sku})` : ""}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Dari Lokasi"
                value={transferForm.from_location_id}
                onChange={(e) => setTransferForm({ ...transferForm, from_location_id: e.target.value })}
                required
              >
                <option value="">Pilih lokasi...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Ke Lokasi"
                value={transferForm.to_location_id}
                onChange={(e) => setTransferForm({ ...transferForm, to_location_id: e.target.value })}
                required
              >
                <option value="">Pilih lokasi...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Kuantitas"
              type="number"
              min="1"
              value={transferForm.qty}
              onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })}
              required
            />
            <Textarea label="Catatan" value={transferForm.note} onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })} />

            {transferError && <Alert>{transferError}</Alert>}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="secondary" onClick={() => setTransferMode(false)}>
                Batal
              </Button>
              <Button type="submit" loading={transferSubmitting}>
                {transferSubmitting ? "Menyimpan..." : "Transfer"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
