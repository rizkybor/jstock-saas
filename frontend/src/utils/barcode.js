// Barcode image generation via the public barcodeapi.org service —
// https://barcodeapi.org/ — used to render a live preview / printable
// barcode for products and outbound transactions.
const BASE_URL = "https://barcodeapi.org/api";

export const BARCODE_TYPES = [
  { value: "qr", label: "QR Code" },
  { value: "128", label: "Code 128" },
  { value: "39", label: "Code 39" },
];

export function barcodeTypeLabel(type) {
  return BARCODE_TYPES.find((t) => t.value === type)?.label ?? type;
}

/**
 * Which barcode types each feature may offer — mirrors
 * TenantBarcodeSetting::FEATURE_TYPES on the backend. A product label is
 * meant to be scanned by a phone camera (QR only); a transaction barcode
 * is meant for a handheld scanner at the point of shipment (linear types
 * only, no QR).
 */
export const FEATURE_BARCODE_TYPES = {
  product: ["qr"],
  transaction: ["128", "39"],
};

export function barcodeTypesForFeature(feature) {
  const allowed = FEATURE_BARCODE_TYPES[feature] ?? [];
  return BARCODE_TYPES.filter((t) => allowed.includes(t.value));
}

export function barcodeImageUrl(type, value, dpi) {
  if (!type || !value) return null;
  const url = `${BASE_URL}/${type}/${encodeURIComponent(value)}`;
  return dpi ? `${url}?dpi=${dpi}` : url;
}

export function productScanUrl(tenantId, uniqueId) {
  return `${window.location.origin}/${tenantId}/products/scan/${encodeURIComponent(uniqueId)}`;
}

export function transactionScanUrl(tenantId, trxNumber) {
  return `${window.location.origin}/${tenantId}/transactions/scan/${encodeURIComponent(trxNumber)}`;
}

/**
 * Only QR can carry a full URL (linear types like Code 128/39 only encode
 * short plain text) — so a QR barcode opens the scan-detail page directly
 * when scanned with a phone camera, while Code 128/39 encode the raw code
 * for a handheld scanner / manual "Cari via Barcode" lookup to resolve to
 * the same page.
 */
export function barcodePayload(type, rawValue, scanUrl) {
  return type === "qr" ? scanUrl : rawValue;
}

/**
 * Renders the barcode image plus a few label lines onto a canvas and
 * downloads it as a PNG — meant to be printed as a sticker label on the
 * physical product/package. barcodeapi.org sends
 * Access-Control-Allow-Origin: *, so the image can be drawn onto canvas
 * (crossOrigin="anonymous") without tainting it.
 */
export function downloadBarcodeLabel({ barcodeUrl, lines, fileName }) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const padding = 16;
      const barcodeBox = 160;
      const lineHeight = 24;
      const textAreaWidth = 260;
      const canvas = document.createElement("canvas");
      canvas.width = padding * 3 + barcodeBox + textAreaWidth;
      canvas.height = Math.max(barcodeBox, lines.length * lineHeight) + padding * 2;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#d0d5dd";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      const scale = Math.min(barcodeBox / img.width, barcodeBox / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, padding + (barcodeBox - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);

      ctx.fillStyle = "#111827";
      const textX = padding * 2 + barcodeBox;
      let y = padding + 18;
      lines.forEach((line, i) => {
        ctx.font = i === 0 ? "700 16px sans-serif" : "400 14px sans-serif";
        ctx.fillText(line, textX, y, textAreaWidth);
        y += lineHeight;
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Gagal membuat gambar label."));
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        resolve();
      }, "image/png");
    };

    img.onerror = () => reject(new Error("Gagal memuat gambar barcode."));
    img.src = barcodeUrl;
  });
}
