import { useEffect, useState } from "react";
import apiClient from "../../api/client";
import { Alert, Badge, CodeChip, DataTable, EmptyState, PageHeader, Skeleton, StatTile } from "../../components/ui";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.get("/dashboard/summary");
        setSummary(data.data);
      } catch (err) {
        setError(err.response?.data?.message ?? "Gagal memuat ringkasan dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const columns = [
    { key: "trx_number", header: "No. Transaksi", render: (row) => <CodeChip>{row.trx_number}</CodeChip> },
    { key: "item", header: "Barang", render: (row) => row.items?.[0]?.product_name ?? "-" },
    { key: "recipient", header: "Penerima", render: (row) => row.recipient?.name ?? "-" },
    { key: "status", header: "Status", render: (row) => <Badge status={row.status}>{row.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Ringkasan operasional — Modul Inventory Gas Kalibrasi." />

      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        summary && (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Jumlah Stok Barang" value={summary.item_count} />
            <StatTile label="Menunggu Approval" value={summary.pending_count} />
            <StatTile label="Transaksi Bulan Ini" value={summary.transactions_this_month} />
          </div>
        )
      )}

      {!loading && summary && (
        <>
          <h3 className="mb-3 text-base font-semibold text-ink">Transaksi Menunggu Approval</h3>
          {summary.pending_transactions.length === 0 ? (
            <EmptyState
              title="Tidak ada transaksi menunggu approval"
              description="Semua transaksi sudah diproses. Transaksi baru akan muncul di sini saat menunggu persetujuan."
            />
          ) : (
            <DataTable
              columns={columns}
              rows={summary.pending_transactions}
              rowKey={(row) => row.id}
              showIndex={false}
            />
          )}
        </>
      )}
    </div>
  );
}
