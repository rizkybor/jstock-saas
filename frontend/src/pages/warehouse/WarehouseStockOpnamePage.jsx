import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, Button, Card, DataTable, Input, Pagination, Select, Textarea } from "../../components/ui";
import Can from "../../routes/Can";

const EMPTY_FORM = { warehouse_item_id: "", warehouse_location_id: "", physical_qty: "", note: "" };

export default function WarehouseStockOpnamePage() {
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);

  const [opnames, setOpnames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadLookups = async () => {
    try {
      const [itemsRes, locationsRes] = await Promise.all([
        apiClient.get("/warehouse/items", { params: { limit: 200 } }),
        apiClient.get("/warehouse/locations"),
      ]);
      setItems(itemsRes.data.data);
      setLocations(locationsRes.data.data);
    } catch {
      // Selects render empty — submit errors are surfaced separately.
    }
  };

  const loadOpnames = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/warehouse/stock-opname", { params: { page } });
      setOpnames(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat riwayat stock opname.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
    loadOpnames(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);

    if (!form.warehouse_item_id || !form.warehouse_location_id || form.physical_qty === "") {
      setFormError("Barang, lokasi, dan kuantitas fisik wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/warehouse/stock-opname", { ...form, physical_qty: Number(form.physical_qty) });
      setForm(EMPTY_FORM);
      await loadOpnames(1);
    } catch (err) {
      setFormError(err.response?.data?.message ?? "Gagal mencatat stock opname.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: "created_at", header: "Waktu", render: (row) => new Date(row.created_at).toLocaleString("id-ID") },
    { key: "item", header: "Barang", render: (row) => row.item?.name ?? "-" },
    { key: "location", header: "Lokasi", render: (row) => row.location?.name ?? "-" },
    { key: "system_qty", header: "Qty Sistem", render: (row) => row.system_qty },
    { key: "physical_qty", header: "Qty Fisik", render: (row) => row.physical_qty },
    {
      key: "difference",
      header: "Selisih",
      render: (row) => (
        <Badge status={row.difference === 0 ? "cancelled" : row.difference > 0 ? "active" : "rejected"}>
          {row.difference > 0 ? `+${row.difference}` : row.difference}
        </Badge>
      ),
    },
    { key: "note", header: "Catatan", render: (row) => row.note ?? "-" },
    { key: "created_by_name", header: "Oleh", render: (row) => row.created_by_name ?? "-" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ink">Stock Opname</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cocokkan hasil hitung fisik dengan catatan sistem — stok otomatis disesuaikan dan selisihnya dicatat.
        </p>
      </div>

      <Can permission="warehouse-stock.opname">
        <Card title="Catat Hasil Hitung Fisik" className="mb-6">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Barang"
                value={form.warehouse_item_id}
                onChange={(e) => setForm({ ...form, warehouse_item_id: e.target.value })}
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
                value={form.warehouse_location_id}
                onChange={(e) => setForm({ ...form, warehouse_location_id: e.target.value })}
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
              label="Kuantitas Fisik (Hasil Hitung)"
              type="number"
              min="0"
              value={form.physical_qty}
              onChange={(e) => setForm({ ...form, physical_qty: e.target.value })}
              required
            />
            <Textarea label="Catatan" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />

            {formError && <Alert>{formError}</Alert>}

            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                {submitting ? "Menyimpan..." : "Catat Opname"}
              </Button>
            </div>
          </form>
        </Card>
      </Can>

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <h3 className="mb-3 text-base font-semibold text-ink">Riwayat Stock Opname</h3>
      <DataTable
        columns={columns}
        rows={opnames}
        rowKey={(row) => row.id}
        emptyMessage="Belum ada riwayat stock opname."
        startIndex={(meta.current_page - 1) * 15}
        loading={loading}
      />
      {!loading && <Pagination currentPage={meta.current_page} lastPage={meta.last_page} total={meta.total} onPageChange={loadOpnames} />}
    </div>
  );
}
