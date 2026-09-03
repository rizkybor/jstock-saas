import { barcodeImageUrl, barcodePayload, transactionScanUrl } from "./barcode";

const formatCurrency = (value) => `Rp ${Number(value).toLocaleString("id-ID")}`;
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

function wrapText(ctx, text, maxWidth) {
  const words = String(text ?? "").split(" ");
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/**
 * Hand-rolled single-page PDF wrapping one JPEG image — avoids pulling in
 * a PDF library just to export a receipt. JPEG bytes are DCTDecode data
 * that a PDF stream can embed verbatim, so this is a plain byte-offset
 * PDF/1.4 file: Catalog -> Pages -> one Page whose content stream just
 * paints the image across the full page.
 */
function buildSingleImagePdf(jpegBytes, pageWidthPt, pageHeightPt, imagePixelWidth, imagePixelHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;

  const pushText = (str) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    length += bytes.length;
  };
  const pushBytes = (bytes) => {
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObj = (num) => {
    offsets[num] = length;
    pushText(`${num} 0 obj\n`);
  };

  pushText("%PDF-1.4\n");

  beginObj(1);
  pushText("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObj(2);
  pushText("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  beginObj(3);
  pushText(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );

  // /Width and /Height describe the JPEG's own pixel grid, which is denser
  // than the page's point size below (see SCALE in downloadTransactionReceipt)
  // — that's what makes the embedded image render sharp instead of blurry.
  beginObj(4);
  pushText(
    `<< /Type /XObject /Subtype /Image /Width ${imagePixelWidth} /Height ${imagePixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
  );
  pushBytes(jpegBytes);
  pushText("\nendstream\nendobj\n");

  const content = `q ${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm /Im0 Do Q`;
  beginObj(5);
  pushText(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

  const xrefOffset = length;
  const objectCount = 6;
  pushText(`xref\n0 ${objectCount}\n0000000000 65535 f \n`);
  for (let i = 1; i < objectCount; i++) {
    pushText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  pushText(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdf = new Uint8Array(length);
  let pos = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, pos);
    pos += chunk.length;
  }
  return pdf;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar barcode."));
    img.src = src;
  });
}

/**
 * Renders an approved transaction as a compact Indonesian courier-style
 * shipping receipt (resi) — sender/recipient boxes, item list, barcode —
 * and downloads it as a PDF. Kept deliberately small/print-like (a few
 * hundred px wide) rather than a full page, same spirit as
 * downloadBarcodeLabel()'s product sticker.
 */
export async function downloadTransactionReceipt(transaction, { tenantId, tenantName }) {
  const width = 380;
  const padding = 12;
  const contentWidth = width - padding * 2;

  // Everything below is drawn in these logical (point-like) units — SCALE
  // supersamples the actual canvas pixel grid so the exported PDF stays
  // crisp instead of pixelated when zoomed or printed, without having to
  // rewrite every coordinate/font-size below. The PDF page keeps the
  // logical size in points; only the embedded image has SCALE× the pixels.
  const SCALE = 3;

  // Content height varies with item count / address length / barcode box
  // size — draw on a generously tall scratch canvas first, then crop to
  // what was actually used. Anything drawn beyond this budget is silently
  // clipped by the canvas (that's what caused the footer to get cut off
  // before), so keep this comfortably larger than a realistic worst case
  // rather than tightly tuned to today's layout.
  const scratch = document.createElement("canvas");
  const scratchLogicalHeight = 900 + (transaction.items?.length ?? 0) * 40;
  scratch.width = width * SCALE;
  scratch.height = scratchLogicalHeight * SCALE;
  const ctx = scratch.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, width, 46);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 14px sans-serif";
  ctx.fillText("BUKTI TRANSAKSI", padding, 20);
  ctx.font = "400 11px sans-serif";
  ctx.fillText(tenantName || "jstock", padding, 36);

  let y = 46 + 24;

  ctx.fillStyle = "#111827";
  ctx.font = "700 17px sans-serif";
  ctx.fillText(transaction.trx_number, padding, y);
  ctx.font = "700 10px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "right";
  ctx.fillText(String(transaction.status).toUpperCase(), width - padding, y);
  ctx.textAlign = "left";
  y += 12;

  if (transaction.barcode_type) {
    const barcodeUrl = barcodeImageUrl(
      transaction.barcode_type,
      barcodePayload(
        transaction.barcode_type,
        transaction.trx_number,
        transactionScanUrl(tenantId, transaction.trx_number),
      ),
      300,
    );
    if (barcodeUrl) {
      try {
        const img = await loadImage(barcodeUrl);
        const boxH = 65;
        const scale = Math.min(contentWidth / img.width, boxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        y += 8;
        ctx.drawImage(img, padding + (contentWidth - w) / 2, y, w, h);
        // ctx.drawImage(img, padding, y, w, h); RATA KIRI
        y += h + 10;
      } catch {
        // Non-fatal: the receipt still prints fine without the barcode image.
      }
    }
  }

  const divider = () => {
    y += 6;
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    y += 16;
  };

  divider();

  const colWidth = contentWidth / 2 - 8;
  const rightX = padding + colWidth + 16;

  ctx.font = "700 9px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("PENGIRIM", padding, y);
  ctx.fillText("PENERIMA", rightX, y);
  y += 14;

  ctx.font = "600 12px sans-serif";
  ctx.fillStyle = "#111827";
  ctx.fillText(transaction.sender?.name ?? "-", padding, y);
  ctx.fillText(transaction.recipient?.name ?? "-", rightX, y);

  let rightY = y + 13;

  const recipientMeta = [transaction.recipient?.position, transaction.recipient?.company].filter(Boolean).join(" — ");
  if (recipientMeta) {
    ctx.font = "400 10px sans-serif";
    ctx.fillStyle = "#6b7280";
    wrapText(ctx, recipientMeta, colWidth).forEach((line) => {
      ctx.fillText(line, rightX, rightY);
      rightY += 12;
    });
  }

  if (transaction.recipient_address) {
    const address = transaction.recipient_address;
    const addressLine =
      [address.detail, address.village_name, address.district_name, address.regency_name, address.province_name]
        .filter(Boolean)
        .join(", ") || address.label;
    ctx.font = "400 10px sans-serif";
    ctx.fillStyle = "#374151";
    wrapText(ctx, addressLine, colWidth)
      .slice(0, 3)
      .forEach((line) => {
        ctx.fillText(line, rightX, rightY);
        rightY += 12;
      });
  }

  y = Math.max(y + 13, rightY) + 4;
  divider();

  ctx.font = "700 9px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("BARANG", padding, y);
  ctx.textAlign = "right";
  ctx.fillText("QTY", width - padding, y);
  ctx.textAlign = "left";
  y += 12;

  (transaction.items ?? []).forEach((item) => {
    ctx.font = "600 11px sans-serif";
    ctx.fillStyle = "#111827";
    ctx.fillText(item.product_name, padding, y);
    ctx.textAlign = "right";
    ctx.fillText(String(item.qty), width - padding, y);
    ctx.textAlign = "left";
    y += 13;
    if (item.lot_batch) {
      ctx.font = "400 9px sans-serif";
      ctx.fillStyle = "#9ca3af";
      ctx.fillText(`LOT: ${item.lot_batch}`, padding, y);
      y += 13;
    }
  });

  divider();

  ctx.font = "700 12px sans-serif";
  ctx.fillStyle = "#111827";
  ctx.fillText("Total", padding, y);
  ctx.textAlign = "right";
  ctx.fillText(formatCurrency(transaction.total), width - padding, y);
  ctx.textAlign = "left";
  y += 16;

  ctx.font = "400 10px sans-serif";
  ctx.fillStyle = "#6b7280";
  const invoiceLabel = transaction.no_invoice ? "Tanpa Invoice" : (transaction.invoice?.invoice_number ?? transaction.invoice_number ?? "-");
  ctx.fillText(`No. Invoice: ${invoiceLabel}`, padding, y);
  y += 13;

  if (transaction.approved_at) {
    ctx.fillText(`Disetujui: ${formatDateTime(transaction.approved_at)}`, padding, y);
    y += 13;
  }

  divider();

  ctx.font = "400 8px sans-serif";
  ctx.fillStyle = "#9ca3af";
  const footerText = `Dicetak dari sistem ${tenantName || "jstock"} pada ${formatDateTime(new Date().toISOString())}`;
  wrapText(ctx, footerText, contentWidth).forEach((line) => {
    ctx.fillText(line, padding, y);
    y += 11;
  });
  y += padding - 11;

  const finalLogicalHeight = y;
  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = finalLogicalHeight * SCALE;
  const finalCtx = canvas.getContext("2d");
  finalCtx.scale(SCALE, SCALE);
  finalCtx.fillStyle = "#ffffff";
  finalCtx.fillRect(0, 0, width, finalLogicalHeight);
  // Source rect is in the scratch canvas's real pixel grid (SCALE× the
  // logical size); destination rect is in this context's logical units,
  // which its own scale(SCALE, SCALE) maps onto the same dense pixel grid.
  finalCtx.drawImage(scratch, 0, 0, width * SCALE, finalLogicalHeight * SCALE, 0, 0, width, finalLogicalHeight);
  finalCtx.strokeStyle = "#d0d5dd";
  finalCtx.lineWidth = 2;
  finalCtx.strokeRect(1, 1, width - 2, finalLogicalHeight - 2);

  // The on-screen barcode stays a plain PNG <img> — only the downloaded
  // resi itself is a PDF, wrapping a high-quality JPEG rendering of the
  // same canvas (see buildSingleImagePdf). Quality 0.98 plus the SCALE
  // supersampling above is what keeps the exported PDF sharp.
  const jpegBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat resi."))), "image/jpeg", 0.98);
  });
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdfBytes = buildSingleImagePdf(jpegBytes, width, finalLogicalHeight, canvas.width, canvas.height);

  const url = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `resi-${transaction.trx_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
