import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Badge, Button, CodeChip, DataTable, Input, Modal, PageHeader, Pagination, Select, Textarea } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { barcodeImageUrl, barcodePayload, transactionScanUrl } from "../../utils/barcode";
import { downloadTransactionReceipt } from "../../utils/receipt";

export default function TransactionsPage() {
  const { can, user } = useAuth();
  const { tenantId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState(null);
  const [scanning, setScanning] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [actionType, setActionType] = useState(null);
  const [acting, setActing] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState(null);

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

  const handleDownloadReceipt = async () => {
    setReceiptError(null);
    setDownloadingReceipt(true);
    try {
      await downloadTransactionReceipt(selected, { tenantId, tenantName: user?.tenant_name });
    } catch {
      setReceiptError("Gagal mengunduh resi.");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Handheld scanners act like a keyboard, typing the barcode's raw value
  // (trx_number) into whichever field has focus, then pressing Enter — this
  // resolves that scan to the same transaction detail view as clicking a row.
  const handleScanSubmit = async (event) => {
    event.preventDefault();
    if (!scanCode.trim()) return;
    setScanError(null);
    setScanning(true);
    try {
      const { data } = await apiClient.get(`/transactions/lookup/${encodeURIComponent(scanCode.trim())}`);
      setSelected(data.data);
      setRejectionNote("");
      setDetailError(null);
      setScanCode("");
    } catch {
      setScanError("Transaksi dengan No. Transaksi tersebut tidak ditemukan.");
    } finally {
      setScanning(false);
    }
  };

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
    {
      key: "item",
      header: "Barang",
      render: (row) => {
        const items = row.items ?? [];
        if (items.length === 0) return "-";
        return items.length === 1 ? items[0].product_name : `${items[0].product_name} +${items.length - 1} lainnya`;
      },
    },
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

  const items = selected?.items ?? [];
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

      <form onSubmit={handleScanSubmit} className="mb-3 flex flex-wrap items-start gap-3">
        <div className="min-w-56 flex-1">
          <Input
            placeholder="Scan barcode / No. Transaksi..."
            value={scanCode}
            onChange={(e) => {
              setScanCode(e.target.value);
              setScanError(null);
            }}
            error={scanError}
          />
        </div>
        <Button type="submit" variant="secondary" loading={scanning} disabled={!scanCode.trim()}>
          Lihat Detail
        </Button>
      </form>

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

              <div className="flex flex-col gap-2 rounded-lg bg-surface-2 p-4">
                {items.length === 0 && <div className="text-sm text-ink-muted">-</div>}
                {items.map((it, index) => (
                  <div key={it.id ?? index} className={index > 0 ? "border-t border-border pt-2" : ""}>
                    <div className="font-semibold text-ink">{it.product_name}</div>
                    <div className="mt-1 text-sm text-ink-muted">
                      LOT: {it.lot_batch ?? "-"} · Qty: {it.qty}
                    </div>
                  </div>
                ))}
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

              {selected.recipient_address && (
                <div>
                  <div className="text-xs text-ink-muted">Alamat Penerima</div>
                  <div className="text-sm font-medium text-ink">{selected.recipient_address.label}</div>
                  <div className="text-sm text-ink-muted">
                    {[
                      selected.recipient_address.detail,
                      selected.recipient_address.village_name,
                      selected.recipient_address.district_name,
                      selected.recipient_address.regency_name,
                      selected.recipient_address.province_name,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-ink-muted">No. Invoice</div>
                <div className="text-sm font-medium text-ink">
                  {selected.no_invoice ? "Tanpa Invoice" : (selected.invoice_number ?? "-")}
                </div>
              </div>

              {(selected.barcode_type || selected.status === "approved") && (
                <div className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">BARCODE - {selected.trx_number}</div>
                    {selected.status === "approved" && (
                      <Button type="button" variant="secondary" size="sm" loading={downloadingReceipt} onClick={handleDownloadReceipt}>
                        Download Resi
                      </Button>
                    )}
                  </div>

                  {selected.barcode_type && (
                    <img
                      src={barcodeImageUrl(
                        selected.barcode_type,
                        barcodePayload(
                          selected.barcode_type,
                          selected.trx_number,
                          transactionScanUrl(tenantId, selected.trx_number),
                          selected.id,
                        ),
                      )}
                      alt="Barcode"
                      className="h-14 rounded bg-white p-1.5"
                    />
                  )}

                  {receiptError && (
                    <p className="mt-2 text-xs text-danger">{receiptError}</p>
                  )}
                </div>
              )}

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
