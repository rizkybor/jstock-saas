import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Input, Modal, PageHeader, Pagination, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function TransactionsPage() {
  const { can, user } = useAuth();
  const { tenantId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionType, setActionType] = useState(null);
  const [acting, setActing] = useState(false);

  const loadTransactions = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get("/transactions", {
        params: { page, q: listSearch || undefined, status: statusFilter || undefined },
      });
      setTransactions(data.data);
      setMeta(data.meta);
    } catch (err) {
      setError(err.response?.data?.message ?? "Gagal memuat data transaksi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadTransactions(1);
  };

  const openDetail = async (row) => {
    setSelected({ id: row.id });
    setRejectionNote("");
    setDetailError(null);
    setDetailLoading(true);
    try {
      const { data } = await apiClient.get(`/transactions/${row.id}`);
      setSelected(data.data);
    } catch (err) {
      setDetailError(err.response?.data?.message ?? "Gagal memuat detail transaksi.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelected(null);

  const handleApprove = async () => {
    setDetailError(null);
    setActionType("approve");
    setActing(true);
    try {
      await apiClient.patch(`/transactions/${selected.id}/approve`);
      closeDetail();
      await loadTransactions(meta.current_page);
    } catch (err) {
      setDetailError(err.response?.data?.message ?? "Gagal approve transaksi.");
    } finally {
      setActing(false);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionNote.trim()) {
      setDetailError("Catatan penolakan wajib diisi untuk reject.");
      return;
    }
    setDetailError(null);
    setActionType("reject");
    setActing(true);
    try {
      await apiClient.patch(`/transactions/${selected.id}/reject`, { rejection_note: rejectionNote });
      closeDetail();
      await loadTransactions(meta.current_page);
    } catch (err) {
      setDetailError(err.response?.data?.message ?? "Gagal reject transaksi.");
    } finally {
      setActing(false);
      setActionType(null);
    }
  };

  const columns = [
    { key: "trx_number", header: "No. Transaksi", render: (row) => <CodeChip>{row.trx_number}</CodeChip> },
    { key: "item", header: "Barang", render: (row) => row.items?.[0]?.product_name ?? "-" },
    { key: "sender", header: "Pengirim", render: (row) => row.sender?.name ?? "-" },
    { key: "recipient", header: "Penerima", render: (row) => row.recipient?.name ?? "-" },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <Badge status={row.status}>{row.status}</Badge>
          {row.status === "pending" && row.pending_approval && (
            <span className="text-xs text-ink-muted">
              Menunggu: {row.pending_approval.label || row.pending_approval.role}
            </span>
          )}
        </div>
      ),
    },
  ];

  const item = selected?.items?.[0];
  const isPending = selected?.status === "pending";
  const isMyTurn = !selected?.pending_approval || selected?.pending_approval.role === user?.role;
  const canAct = isPending && isMyTurn && (can("transactions.approve") || can("transactions.delete"));

  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="Riwayat transaksi barang keluar"
        action={
          can("transactions.create") && (
            <Link to={`/${tenantId}/transactions/new`}>
              <Button>+ Transaksi Keluar</Button>
            </Link>
          )
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
          placeholder="Cari no. transaksi / pengirim / penerima..."
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={transactions}
        rowKey={(row) => row.id}
        emptyMessage="Belum ada transaksi."
        startIndex={(meta.current_page - 1) * 10}
        loading={loading}
        onRowClick={openDetail}
      />
      {!loading && (
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          onPageChange={loadTransactions}
        />
      )}

      {selected && (
        <Modal title="Approve / Reject Transaksi" onClose={closeDetail} width="480px">
          {detailLoading ? (
            <div className="py-6 text-center text-sm text-ink-muted">Memuat detail...</div>
          ) : (
            <div className="flex flex-col gap-4">
              <CodeChip>{selected.trx_number}</CodeChip>

              <div className="rounded-lg bg-surface-2 p-4">
                <div className="font-semibold text-ink">{item?.product_name ?? "-"}</div>
                <div className="mt-1 text-sm text-ink-muted">
                  LOT: {item?.lot_batch ?? "-"} · Qty: {item?.qty ?? "-"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-ink-muted">Pengirim</div>
                  <div className="text-sm font-medium text-ink">{selected.sender?.name ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-ink-muted">Penerima</div>
                  <div className="text-sm font-medium text-ink">
                    {selected.recipient?.name ?? "-"}
                    {selected.recipient?.position ? ` — ${selected.recipient.position}` : ""}
                  </div>
                </div>
              </div>

              {!isPending && (
                <div>
                  <Badge status={selected.status}>{selected.status}</Badge>
                  {selected.status === "rejected" && selected.rejection_note && (
                    <p className="mt-2 text-sm text-ink-muted">Catatan: {selected.rejection_note}</p>
                  )}
                  {selected.status === "approved" && selected.invoice && (
                    <p className="mt-2 text-sm text-ink-muted">Invoice: {selected.invoice.invoice_number}</p>
                  )}
                </div>
              )}

              {isPending && !isMyTurn && (
                <Alert tone="info">
                  Menunggu approval dari role "{selected.pending_approval?.role}" — bukan giliran Anda.
                </Alert>
              )}

              {canAct && (
                <Textarea
                  label="Catatan Penolakan (wajib untuk Reject)"
                  placeholder="Alasan penolakan..."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                />
              )}

              {detailError && <Alert>{detailError}</Alert>}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="secondary" onClick={closeDetail}>
                  Batal
                </Button>
                {canAct && (
                  <>
                    <Button
                      type="button"
                      variant="outline-danger"
                      loading={acting && actionType === "reject"}
                      disabled={acting && actionType !== "reject"}
                      onClick={handleReject}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="success"
                      loading={acting && actionType === "approve"}
                      disabled={acting && actionType !== "approve"}
                      onClick={handleApprove}
                    >
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
