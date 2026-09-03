import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Badge, CodeChip, Skeleton } from "../../components/ui";
import { barcodeImageUrl, barcodePayload, barcodeTypeLabel, transactionScanUrl } from "../../utils/barcode";

/**
 * Landing page for a scanned transaction QR code — barcodeImageUrl()
 * encodes this exact route for the "qr" type, so a phone camera opens
 * straight here instead of just showing raw text. Read-only: approving
 * or rejecting still happens from the Transaksi list. Rendered outside
 * AppLayout and outside auth entirely (see App.jsx): a courier confirming
 * delivery by scanning the label has no jstock account, so this hits the
 * public /public/:tenantId/transactions/scan/:trxNumber endpoint — which
 * also omits money figures (total, item subtotal) the authenticated view
 * has.
 */
export default function TransactionScanPage() {
  const { tenantId, trxNumber } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get(`/public/${tenantId}/transactions/scan/${encodeURIComponent(trxNumber)}`)
      .then(({ data }) => setTransaction(data.data))
      .catch((err) => setError(err.response?.data?.message ?? "Transaksi dengan No. Transaksi tersebut tidak ditemukan."))
      .finally(() => setLoading(false));
  }, [tenantId, trxNumber]);

  const items = transaction?.items ?? [];

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg px-4 py-8">
      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && error && <Alert>{error}</Alert>}

      {!loading && transaction && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Hasil Scan Barcode</div>
          <div className="mb-4 flex items-center gap-2">
            <CodeChip>{transaction.trx_number}</CodeChip>
            <Badge status={transaction.status}>{transaction.status}</Badge>
          </div>

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

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-ink-muted">Pengirim</div>
              <div className="text-sm font-medium text-ink">{transaction.sender?.name ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Penerima</div>
              <div className="text-sm font-medium text-ink">
                {transaction.recipient?.name ?? "-"}
                {transaction.recipient?.position ? ` — ${transaction.recipient.position}` : ""}
              </div>
            </div>
          </div>

          {transaction.recipient_address && (
            <div className="mt-4">
              <div className="text-xs text-ink-muted">Alamat Penerima</div>
              <div className="text-sm font-medium text-ink">{transaction.recipient_address.label}</div>
              <div className="text-sm text-ink-muted">
                {[
                  transaction.recipient_address.detail,
                  transaction.recipient_address.village_name,
                  transaction.recipient_address.district_name,
                  transaction.recipient_address.regency_name,
                  transaction.recipient_address.province_name,
                ]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="text-xs text-ink-muted">No. Invoice</div>
            <div className="text-sm font-medium text-ink">
              {transaction.no_invoice ? "Tanpa Invoice" : (transaction.invoice_number ?? "-")}
            </div>
          </div>

          {transaction.status === "rejected" && transaction.rejection_note && (
            <p className="mt-2 text-sm text-ink-muted">Catatan Penolakan: {transaction.rejection_note}</p>
          )}
          {transaction.status === "approved" && transaction.invoice && (
            <p className="mt-2 text-sm text-ink-muted">Invoice: {transaction.invoice.invoice_number}</p>
          )}

          {transaction.barcode_type && (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Barcode — {barcodeTypeLabel(transaction.barcode_type)}
              </div>
              <img
                src={barcodeImageUrl(
                  transaction.barcode_type,
                  barcodePayload(
                    transaction.barcode_type,
                    transaction.trx_number,
                    transactionScanUrl(tenantId, transaction.trx_number),
                    transaction.id,
                  ),
                )}
                alt="Barcode"
                className="h-20 rounded bg-white p-2"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
