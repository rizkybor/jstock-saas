import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, PageHeader, Skeleton, StatTile } from "../../components/ui";

const formatCurrency = (value) => `Rp ${Number(value ?? 0).toLocaleString("id-ID")}`;

export default function LaporanPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/reports/summary");
        setSummary(data.data);
      } catch (err) {
        setError(err.response?.data?.message ?? "Gagal memuat laporan.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Ringkasan inventory dan transaksi — Modul Inventory Gas Kalibrasi."
      />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <h3 className="mb-3 text-sm font-semibold text-ink-muted uppercase">Inventory</h3>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Total Barang" value={summary.total_products} />
            <StatTile label="Total Nilai Stok" value={formatCurrency(summary.total_stock_value)} />
            <StatTile label="Total COGS Approved" value={formatCurrency(summary.total_cogs)} />
          </div>

          <h3 className="mb-3 text-sm font-semibold text-ink-muted uppercase">Transaksi</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Approved" value={summary.transactions_approved} />
            <StatTile label="Pending" value={summary.transactions_pending} />
            <StatTile label="Rejected" value={summary.transactions_rejected} />
            <StatTile label="Cancelled" value={summary.transactions_cancelled} />
          </div>
        </>
      )}
    </div>
  );
}
