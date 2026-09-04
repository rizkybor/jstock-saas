import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, DataTable, EmptyState, PageHeader, Skeleton, StatTile } from "../../components/ui";

const MOVEMENT_BADGE = { in: "active", out: "rejected", adjustment: "pending" };
const MOVEMENT_LABEL = { in: "Masuk", out: "Keluar", adjustment: "Penyesuaian" };

export default function WarehouseDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/warehouse/dashboard/summary");
        setSummary(data.data);
      } catch (err) {
        setError(err.response?.data?.message ?? "Gagal memuat ringkasan dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const lowStockColumns = [
    { key: "sku", header: "SKU", render: (row) => row.sku ?? "-" },
    { key: "name", header: "Nama Barang" },
    { key: "current_stock", header: "Stok Saat Ini", render: (row) => `${row.current_stock} ${row.unit ?? ""}`.trim() },
    { key: "min_stock", header: "Stok Minimum", render: (row) => `${row.min_stock} ${row.unit ?? ""}`.trim() },
  ];

  const movementColumns = [
    { key: "created_at", header: "Waktu", render: (row) => new Date(row.created_at).toLocaleString("id-ID") },
    { key: "item", header: "Barang", render: (row) => row.item?.name ?? "-" },
    { key: "location", header: "Lokasi", render: (row) => row.location?.name ?? "-" },
    { key: "type", header: "Tipe", render: (row) => <Badge status={MOVEMENT_BADGE[row.type]}>{MOVEMENT_LABEL[row.type] ?? row.type}</Badge> },
    { key: "qty", header: "Qty", render: (row) => row.qty },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Ringkasan operasional — Modul Warehouse General." />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        summary && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Jumlah Barang" value={summary.item_count} />
            <StatTile label="Jumlah Lokasi" value={summary.location_count} />
            <StatTile label="Barang Stok Menipis" value={summary.low_stock_count} />
            <StatTile label="PO Menunggu Diterima" value={summary.pending_purchase_orders} />
          </div>
        )
      )}

      {!loading && summary && (
        <>
          <h3 className="mb-3 text-base font-semibold text-ink">Stok Menipis</h3>
          {summary.low_stock_items.length === 0 ? (
            <EmptyState
              title="Tidak ada barang dengan stok menipis"
              description="Semua barang masih di atas ambang stok minimumnya."
            />
          ) : (
            <DataTable columns={lowStockColumns} rows={summary.low_stock_items} rowKey={(row) => row.id} showIndex={false} />
          )}

          <h3 className="mt-8 mb-3 text-base font-semibold text-ink">Aktivitas Stok Terbaru</h3>
          {summary.recent_movements.length === 0 ? (
            <EmptyState
              title="Belum ada pergerakan stok"
              description="Mutasi stok masuk, keluar, transfer, dan penyesuaian akan muncul di sini."
            />
          ) : (
            <DataTable columns={movementColumns} rows={summary.recent_movements} rowKey={(row) => row.id} showIndex={false} />
          )}
        </>
      )}
    </div>
  );
}
