import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Badge, Skeleton } from "../../components/ui";
import { barcodeImageUrl, barcodePayload, barcodeTypeLabel, productScanUrl } from "../../utils/barcode";

const formatDate = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

/**
 * Landing page for a scanned product QR code — barcodeImageUrl() encodes
 * this exact route for the "qr" type, so a phone camera opens straight
 * here instead of just showing raw text. Rendered outside AppLayout and
 * outside auth entirely (see App.jsx): a scanned label is opened by
 * whoever has the physical item, not just a logged-in tenant user, so it
 * hits the public /public/:tenantId/products/scan/:uniqueId endpoint —
 * which also omits cost/COGS figures the authenticated view has, since
 * those shouldn't be visible to anyone who scans the label.
 */
export default function ProductScanPage() {
  const { tenantId, uniqueId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get(`/public/${tenantId}/products/scan/${encodeURIComponent(uniqueId)}`)
      .then(({ data }) => setProduct(data.data))
      .catch((err) => setError(err.response?.data?.message ?? "Barang dengan ID unik tersebut tidak ditemukan."))
      .finally(() => setLoading(false));
  }, [tenantId, uniqueId]);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg px-4 py-8">
      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && error && <Alert>{error}</Alert>}

      {!loading && product && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Hasil Scan Barcode</div>
          <h1 className="mb-4 text-xl font-bold text-ink">{product.name}</h1>

          {product.barcode_type && (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Barcode — {barcodeTypeLabel(product.barcode_type)}
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <img
                  src={barcodeImageUrl(
                    product.barcode_type,
                    barcodePayload(product.barcode_type, product.unique_id, productScanUrl(tenantId, product.unique_id)),
                  )}
                  alt="Barcode"
                  className="h-20 shrink-0 rounded bg-white p-2"
                />

                <div className="grid flex-1 grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">ID Unik</div>
                    <div className="text-ink">{product.unique_id ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Jenis Gas</div>
                    <div className="text-ink">{product.series?.name ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">LOT/Batch</div>
                    <div className="text-ink">{product.lot_batch ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Kuantitas</div>
                    <div className="text-ink">{product.stock_qty}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tgl Input</div>
            <div className="text-sm text-ink">{formatDate(product.input_date)}</div>
          </div>

          {product.item_detail && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Item Detail</div>
              <div className="text-sm text-ink">{product.item_detail}</div>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Riwayat Transaksi</div>
            {!product.transactions || product.transactions.length === 0 ? (
              <p className="text-sm text-ink-muted">Belum ada riwayat transaksi untuk barang ini.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {product.transactions.map((trx) => (
                  <div key={trx.id} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-ink">{trx.trx_number}</span>
                      <Badge status={trx.status}>{trx.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-muted">
                      <span>{new Date(trx.created_at).toLocaleString("id-ID")}</span>
                      <span>Qty: {trx.qty}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
