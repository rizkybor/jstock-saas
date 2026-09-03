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
 * and downloads it as a PNG. Kept deliberately small/print-like (a few
 * hundred px wide) rather than a full page, same spirit as
 * downloadBarcodeLabel()'s product sticker.
 */
export async function downloadTransactionReceipt(transaction, { tenantId, tenantName }) {
  const width = 380;
  const padding = 16;
  const contentWidth = width - padding * 2;

  // Content height varies with item count / address length — draw on a
  // generously tall scratch canvas first, then crop to what was actually
  // used. Sized off the item count so a long item list can't overflow it.
  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = 400 + (transaction.items?.length ?? 0) * 30;
  const ctx = scratch.getContext("2d");

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
        transaction.id,
      ),
    );
    if (barcodeUrl) {
      try {
        const img = await loadImage(barcodeUrl);
        const boxH = 48;
        const scale = Math.min(contentWidth / img.width, boxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        y += 8;
        ctx.drawImage(img, padding + (contentWidth - w) / 2, y, w, h);
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
  ctx.fillText(`Dicetak dari sistem ${tenantName || "jstock"} pada ${formatDateTime(new Date().toISOString())}`, padding, y);
  y += padding;

  const finalHeight = y;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = finalHeight;
  const finalCtx = canvas.getContext("2d");
  finalCtx.fillStyle = "#ffffff";
  finalCtx.fillRect(0, 0, width, finalHeight);
  finalCtx.drawImage(scratch, 0, 0, width, finalHeight, 0, 0, width, finalHeight);
  finalCtx.strokeStyle = "#d0d5dd";
  finalCtx.lineWidth = 2;
  finalCtx.strokeRect(1, 1, width - 2, finalHeight - 2);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Gagal membuat resi."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resi-${transaction.trx_number}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}
