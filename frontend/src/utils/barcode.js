// Barcode image generation via the public barcodeapi.org service —
// https://barcodeapi.org/ — used to render a live preview / printable
// barcode for products and outbound transactions.
const BASE_URL = "https://barcodeapi.org/api";

export const BARCODE_TYPES = [
  { value: "qr", label: "QR Code" },
  { value: "128", label: "Code 128" },
  { value: "39", label: "Code 39" },
  { value: "itf", label: "ITF-14" },
];

export function barcodeTypeLabel(type) {
  return BARCODE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function barcodeImageUrl(type, value) {
  if (!type || !value) return null;
  return `${BASE_URL}/${type}/${encodeURIComponent(value)}`;
}

export function productScanUrl(tenantId, uniqueId) {
  return `${window.location.origin}/${tenantId}/products/scan/${encodeURIComponent(uniqueId)}`;
}

export function transactionScanUrl(tenantId, trxNumber) {
  return `${window.location.origin}/${tenantId}/transactions/scan/${encodeURIComponent(trxNumber)}`;
}

/**
 * Only QR can carry a full URL (linear types like Code 128/39 and ITF-14
 * only encode short plain text — ITF-14 is numeric-only) — so a QR
 * barcode opens the scan-detail page directly when scanned with a phone
 * camera, while other types encode the raw code for a handheld scanner /
 * manual "Cari via Barcode" lookup to resolve to the same page instead.
 */
export function barcodePayload(type, rawValue, scanUrl) {
  return type === "qr" ? scanUrl : rawValue;
}
