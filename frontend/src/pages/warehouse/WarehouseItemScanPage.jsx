import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Alert, Skeleton } from "../../components/ui";
import { barcodeImageUrl, barcodePayload, barcodeTypeLabel, warehouseItemScanUrl } from "../../utils/barcode";

/**
 * Landing page for a scanned warehouse item QR code — mirrors
 * ProductScanPage for the Inventory Gas Kalibrasi module. Rendered outside
 * AppLayout and outside auth entirely (see App.jsx): a scanned label is
 * opened by whoever has the physical item, not just a logged-in tenant
 * user, so it hits the public /public/:tenantId/warehouse/items/scan/:uniqueId
 * endpoint — which also omits price_buy/price_sell the authenticated view
 * has, since those shouldn't be visible to anyone who scans the label.
 */
export default function WarehouseItemScanPage() {
  const { tenantId, uniqueId } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiClient
      .get(`/public/${tenantId}/warehouse/items/scan/${encodeURIComponent(uniqueId)}`)
      .then(({ data }) => setItem(data.data))
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

      {!loading && item && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Hasil Scan Barcode</div>
          <h1 className="mb-4 text-xl font-bold text-ink">{item.name}</h1>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">SKU</div>
              <div className="text-ink">{item.sku ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Kategori</div>
              <div className="text-ink">{item.category_name ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Satuan</div>
              <div className="text-ink">{item.unit ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">ID Unik</div>
              <div className="text-ink">{item.unique_id ?? "-"}</div>
            </div>
          </div>

          {item.barcode_type && (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Barcode — {barcodeTypeLabel(item.barcode_type)}
              </div>
              <img
                src={barcodeImageUrl(item.barcode_type, barcodePayload(item.barcode_type, item.unique_id, warehouseItemScanUrl(tenantId, item.unique_id)))}
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
