// Barcode image generation via the public barcodeapi.org service —
// https://barcodeapi.org/ — used to render a live preview / printable
// barcode for products and outbound transactions.
const BASE_URL = "https://barcodeapi.org/api";

export const BARCODE_TYPES = [
  { value: "qr", label: "QR Code" },
  { value: "128", label: "Code 128" },
  { value: "39", label: "Code 39" },
  { value: "itf14", label: "ITF-14" },
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
 * ITF-14 can only encode a numeric, checksummed GTIN-14 — never our
 * alphanumeric product/transaction ids — so we derive one deterministically
 * from the record's own numeric database id instead. Mirrors
 * App\Support\Gtin14 on the backend; the lookup endpoints decode it back to
 * the id, so scanning still resolves to the right record.
 */
export function gtin14Encode(id) {
  const payload = String(id).padStart(13, "0");
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(payload[12 - i]) * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return payload + checkDigit;
}

/**
 * Only QR can carry a full URL (linear types like Code 128/39 only encode
 * short plain text, and ITF-14 only encodes a numeric GTIN-14) — so a QR
 * barcode opens the scan-detail page directly when scanned with a phone
 * camera, Code 128/39 encode the raw code for a handheld scanner / manual
 * "Cari via Barcode" lookup to resolve to the same page, and ITF-14 encodes
 * the id-derived GTIN-14 (null before the record has an id yet, e.g. a
 * create-form preview — barcodeImageUrl() already renders nothing for a
 * null value).
 */
export function barcodePayload(type, rawValue, scanUrl, id) {
  if (type === "qr") return scanUrl;
  if (type === "itf14") return id != null ? gtin14Encode(id) : null;
  return rawValue;
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
