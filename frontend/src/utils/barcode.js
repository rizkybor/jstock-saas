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
