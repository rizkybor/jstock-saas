import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Skeleton } from "../../components/ui";
import { barcodeImageUrl, barcodePayload, barcodeTypeLabel, productScanUrl } from "../../utils/barcode";

const formatCurrency = (value) => `Rp ${Number(value).toLocaleString("id-ID")}`;
const formatDate = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

/**
 * Landing page for a scanned product QR code — barcodeImageUrl() encodes
 * this exact route for the "qr" type, so a phone camera opens straight
 * here instead of just showing raw text.
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
      .get(`/products/lookup/${encodeURIComponent(uniqueId)}`)
      .then(({ data }) => setProduct(data.data))
      .catch((err) => setError(err.response?.data?.message ?? "Barang dengan ID unik tersebut tidak ditemukan."))
      .finally(() => setLoading(false));
  }, [uniqueId]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
        <Link to={`/${tenantId}/products`} className="text-sm text-ink-muted hover:text-ink">
          &larr; Data Barang
        </Link>
      </div>

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

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Jenis Gas</div>
              <div className="text-ink">{product.series?.name ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">LOT/Batch</div>
              <div className="text-ink">{product.lot_batch ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">ID Unik</div>
              <div className="text-ink">{product.unique_id ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Tgl Input</div>
              <div className="text-ink">{formatDate(product.input_date)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Unit Cost</div>
              <div className="text-ink">{formatCurrency(product.unit_cost)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Kuantitas</div>
              <div className="text-ink">{product.stock_qty}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Grand Total Cost</div>
              <div className="font-semibold text-ink">{formatCurrency(product.grand_total_cost)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">COGS</div>
              <div className="text-ink">{formatCurrency(product.cogs)}</div>
            </div>
          </div>

          {product.item_detail && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Item Detail</div>
              <div className="text-sm text-ink">{product.item_detail}</div>
            </div>
          )}

          {product.barcode_type && (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Barcode — {barcodeTypeLabel(product.barcode_type)}
              </div>
              <img
                src={barcodeImageUrl(
                  product.barcode_type,
                  barcodePayload(product.barcode_type, product.unique_id, productScanUrl(tenantId, product.unique_id)),
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
