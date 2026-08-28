import { money } from "./format";
import { BUSINESS_INFO, VAT_RATE } from "../data/constants";

function rowsForOrder(order, subtotal) {
  if (order.items && order.items.length) {
    return order.items.map((i) => ({
      desc: i.name,
      qty: `${i.qty}${i.unit || ""}`,
      unitPrice: i.price,
      amount: i.price * i.qty,
    }));
  }
  return [{ desc: `${order.service || "Cleaning Service"} — ${order.size || ""}`, qty: "1", unitPrice: subtotal, amount: subtotal }];
}

// The one honest source of truth for a receipt's numbers. VAT is always ADDED
// on top of the real item subtotal, never backed out of a stored total (that
// was the bug: a ₦130,000 order was showing "VAT" as if it had been carved out
// of ₦130,000, when nothing extra was ever actually charged).
function computeTotals(order) {
  if (order.items && order.items.length) {
    const itemsSubtotal = order.items.reduce((s, i) => s + i.qty * i.price, 0);
    const vat = itemsSubtotal * VAT_RATE;
    const total = order.total ?? itemsSubtotal + vat;
    const other = Math.max(0, total - itemsSubtotal - vat); // delivery fee, if any
    return { subtotal: itemsSubtotal, vat, other, total };
  }
  // Cleaning bookings: no item list, just a single confirmed/negotiated price.
  // That price is treated as the pre-VAT amount, VAT is added on top here.
  const subtotal = order.payable ?? order.price ?? order.total ?? 0;
  const vat = subtotal * VAT_RATE;
  return { subtotal, vat, other: 0, total: subtotal + vat };
}

function plainTextLines(order, subtotal) {
  return rowsForOrder(order, subtotal).map((r) => `- ${r.desc} x${r.qty}: ${money(r.amount)}`);
}

function buildShareText(order) {
  const { subtotal, vat, other, total } = computeTotals(order);
  const placedDate = order.placedAt ? new Date(order.placedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

  const lines = [
    `Rainbow Wash — Receipt ${order.id}`,
    `Date: ${placedDate}`,
    `Customer: ${order.fullName || "Customer"}${order.phone ? " (" + order.phone + ")" : ""}`,
    "",
    ...plainTextLines(order, subtotal),
    "",
    `Subtotal: ${money(subtotal)}`,
    `VAT (${VAT_RATE * 100}%): ${money(vat)}`,
  ];
  if (other > 1) lines.push(`Delivery / Other: ${money(other)}`);
  lines.push(`Total: ${money(total)}`, `Status: ${order.status || "—"}`);
  return lines.join("\n");
}

const PRINT_SIZE_CSS = {
  a4: `
    @page { size: A4; margin: 14mm; }
    body.size-a4 { max-width: 700px; font-size: 13.5px; }
    body.size-a4 .biz { font-size: 18px; }
    body.size-a4 h1 { font-size: 24px; }
  `,
  thermal80: `
    @page { size: 80mm auto; margin: 4mm; }
    body.size-thermal80 { max-width: 72mm; font-size: 11px; padding: 6px; }
    body.size-thermal80 .biz { font-size: 14px; }
    body.size-thermal80 h1 { font-size: 15px; margin: 10px 0 4px; }
    body.size-thermal80 .meta { flex-direction: column; gap: 6px; padding: 8px; }
    body.size-thermal80 .totals { width: 100%; }
    body.size-thermal80 .print-rainbow-stripe { height: 4px; margin-bottom: 12px; }
  `,
  thermal58: `
    @page { size: 58mm auto; margin: 3mm; }
    body.size-thermal58 { max-width: 52mm; font-size: 9.5px; padding: 4px; }
    body.size-thermal58 .biz { font-size: 12px; }
    body.size-thermal58 .contact { font-size: 9px; }
    body.size-thermal58 h1 { font-size: 12.5px; margin: 8px 0 3px; }
    body.size-thermal58 .meta { flex-direction: column; gap: 5px; padding: 6px; font-size: 9.5px; }
    body.size-thermal58 table th, body.size-thermal58 table td { padding: 5px 3px; font-size: 9px; }
    body.size-thermal58 .totals { width: 100%; padding: 6px 8px; }
    body.size-thermal58 .print-rainbow-stripe { height: 3px; margin-bottom: 10px; }
  `,
};

export function openPrintSlip(order, staffUser, onPrinted) {
  const { subtotal, vat, other, total } = computeTotals(order);
  const rows = rowsForOrder(order, subtotal);

  const placedDate = order.placedAt ? new Date(order.placedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const printedAt = new Date().toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  const shareText = buildShareText(order);
  const waLinkFallback = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const gmailLinkFallback = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Rainbow Wash Receipt ${order.id}`)}&body=${encodeURIComponent(shareText)}`;

  const tableRowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="white-space: nowrap;">${r.desc}</td>
        <td style="text-align:center">${r.qty}</td>
        <td style="text-align:right">${money(r.unitPrice)}</td>
        <td style="text-align:right">${money(r.amount)}</td>
      </tr>`
    )
    .join("");

  const otherRowHtml = other > 1 ? `<div><span>Delivery / Other</span><span>${money(other)}</span></div>` : "";

  // Pre-format every number the PDF script needs, out here where `money()` is
  // actually available, and pass the finished strings in — the popup window's
  // script has no access to this app's imports, so it must not try to
  // reformat currency itself.
  const pdfItems = rows.map((r) => ({ desc: r.desc, qty: r.qty, unitPrice: money(r.unitPrice), amount: money(r.amount) }));
  const pdfData = {
    bizName: BUSINESS_INFO.name,
    contactLine: BUSINESS_INFO.phones.join(" / "),
    email: BUSINESS_INFO.email,
    billTo: order.fullName || "Customer",
    phone: order.phone || "",
    ref: order.id,
    date: placedDate,
    status: order.status || "—",
    items: pdfItems,
    subtotal: money(subtotal),
    vatLabel: `VAT (${VAT_RATE * 100}%)`,
    vat: money(vat),
    other: other > 1 ? money(other) : null,
    total: money(total),
    printedBy: `${staffUser?.name || "Staff"} (${staffUser?.role || "Staff"})`,
    printedAt,
    fileName: `${order.id}-receipt.pdf`,
    shareTitle: `Rainbow Wash Receipt ${order.id}`,
    shareText,
    waLinkFallback,
    gmailLinkFallback,
  };

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${order.id} — Rainbow Wash</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<style>
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .noprint { display: none !important; }
  }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 32px; max-width: 700px; margin: 0 auto; background: #fff; }

  .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; padding: 14px; background: #f4f8fb; border-radius: 10px; border: 1px solid #dde7f0; }
  .toolbar b { display: block; width: 100%; font-size: 12px; color: #4c6079; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
  .toolbar button { font-family: inherit; font-size: 13px; font-weight: 700; padding: 9px 14px; border-radius: 8px; border: none; cursor: pointer; }
  .btn-print { background: #1f6fb2; color: #fff; }
  .btn-pdf { background: #6b21a8; color: #fff; }
  .btn-wa { background: #25d366; color: #fff; }
  .btn-mail { background: #ea4335; color: #fff; }
  .share-hint { width: 100%; font-size: 11.5px; color: #6b7a8a; margin-top: 2px; }

  .print-rainbow-stripe { height: 6px; width: 100%; display: flex; margin-bottom: 24px; border-radius: 4px; overflow: hidden; }
  .print-rainbow-stripe span { flex: 1; }

  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .biz { font-weight: 800; font-size: 18px; color: #0c3f66; }
  .contact { text-align: right; font-size: 12px; color: #555; line-height: 1.6; }

  h1 { font-size: 24px; margin: 18px 0 4px; color: #0c3f66; }

  .meta { display: flex; justify-content: space-between; margin: 18px 0; font-size: 13px; background: #f4f8fb; padding: 14px; border-radius: 8px; border-left: 4px solid #27aae1; }
  .meta div { line-height: 1.8; }
  .meta b { color: #0c3f66; }

  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #0c3f66; border-bottom: 2px solid #27aae1; padding: 10px 8px; background: #eaf4fb; }
  td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 13.5px; word-wrap: break-word; overflow-wrap: break-word; }

  .totals { margin-top: 16px; width: 280px; margin-left: auto; font-size: 13.5px; background: #f4f8fb; padding: 10px 14px; border-radius: 8px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-weight: 800; font-size: 16px; border-top: 2px solid #0c3f66; padding-top: 8px; margin-top: 6px; color: #0c3f66; }

  .foot { margin-top: 40px; padding-top: 14px; border-top: 1px solid #ddd; font-size: 11.5px; color: #777; display: flex; justify-content: space-between; }

  ${PRINT_SIZE_CSS.a4}
  ${PRINT_SIZE_CSS.thermal80}
  ${PRINT_SIZE_CSS.thermal58}
</style>
</head>
<body class="size-a4">
  <div class="toolbar noprint">
    <b>Print size</b>
    <button class="btn-print" onclick="setSizeAndPrint('a4')">🖨️ Print A4</button>
    <button class="btn-print" onclick="setSizeAndPrint('thermal80')">🖨️ Print 80mm receipt</button>
    <button class="btn-print" onclick="setSizeAndPrint('thermal58')">🖨️ Print 58mm receipt</button>
    <button class="btn-pdf" onclick="downloadPdf()">⬇️ Download PDF</button>
    <button class="btn-wa" onclick="shareTo('whatsapp')">💬 Share via WhatsApp</button>
    <button class="btn-mail" onclick="shareTo('gmail')">✉️ Share via Gmail</button>
    <span class="share-hint">Share buttons attach the actual PDF where your browser supports it (most mobile browsers); otherwise they download the PDF and open a pre-filled message so you can attach it manually.</span>
  </div>

  <div class="print-rainbow-stripe">
    <span style="background: #ef4136;"></span>
    <span style="background: #f7941d;"></span>
    <span style="background: #ffce33;"></span>
    <span style="background: #39b54a;"></span>
    <span style="background: #27aae1;"></span>
    <span style="background: #8e44ad;"></span>
  </div>

  <div class="head">
    <div class="biz">${BUSINESS_INFO.name}</div>
    <div class="contact">
      ${BUSINESS_INFO.phones.join("<br/>")}<br/>
      ${BUSINESS_INFO.email}
    </div>
  </div>

  <h1>Service Receipt / Slip</h1>

  <div class="meta">
    <div>
      <b>Bill To:</b><br/>
      ${order.fullName || "Customer"}<br/>
      ${order.phone || ""}
    </div>
    <div style="text-align:right">
      <div><b>Ref:</b> ${order.id}</div>
      <div><b>Date:</b> ${placedDate}</div>
      <div><b>Status:</b> ${order.status || "—"}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      ${tableRowsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div><span>VAT (${VAT_RATE * 100}%)</span><span>${money(vat)}</span></div>
    ${otherRowHtml}
    <div class="grand"><span>Total</span><span>${money(total)}</span></div>
  </div>

  <div class="foot">
    <span>Printed by: ${staffUser?.name || "Staff"} (${staffUser?.role || "Staff"})</span>
    <span>${printedAt}</span>
  </div>

  <script>
    var PDF_DATA = ${JSON.stringify(pdfData)};

    function setSizeAndPrint(size) {
      document.body.className = 'size-' + size;
      window.print();
      notifyPrinted();
    }

    function notifyPrinted() {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ rainbowWashPrinted: true, orderId: PDF_DATA.ref }, '*');
      }
    }

    function buildPdf() {
      var d = PDF_DATA;
      var jsPDFCtor = window.jspdf.jsPDF;
      var doc = new jsPDFCtor({ unit: 'pt', format: 'a4' });
      var left = 40, y = 50;

      doc.setFontSize(16); doc.setTextColor(12, 63, 102); doc.setFont(undefined, 'bold');
      doc.text(d.bizName, left, y);
      doc.setFontSize(9); doc.setTextColor(85, 85, 85); doc.setFont(undefined, 'normal');
      doc.text(d.contactLine, 555, y - 10, { align: 'right' });
      doc.text(d.email, 555, y + 4, { align: 'right' });

      y += 34;
      doc.setFontSize(18); doc.setTextColor(12, 63, 102); doc.setFont(undefined, 'bold');
      doc.text('Service Receipt / Slip', left, y);

      y += 26;
      doc.setFontSize(10); doc.setTextColor(20, 20, 20); doc.setFont(undefined, 'normal');
      doc.text('Bill To: ' + d.billTo, left, y);
      doc.text('Ref: ' + d.ref, 555, y, { align: 'right' });
      y += 14;
      doc.text(d.phone, left, y);
      doc.text('Date: ' + d.date, 555, y, { align: 'right' });
      y += 14;
      doc.text('Status: ' + d.status, 555, y, { align: 'right' });

      y += 26;
      doc.setFillColor(234, 244, 251);
      doc.rect(left, y - 12, 515, 20, 'F');
      doc.setFontSize(9); doc.setTextColor(12, 63, 102); doc.setFont(undefined, 'bold');
      doc.text('DESCRIPTION', left + 6, y + 2);
      doc.text('QTY', 330, y + 2);
      doc.text('UNIT PRICE', 400, y + 2);
      doc.text('AMOUNT', 500, y + 2);
      y += 20;

      doc.setFont(undefined, 'normal'); doc.setTextColor(20, 20, 20);
      d.items.forEach(function (r) {
        doc.text(String(r.desc).slice(0, 48), left + 6, y);
        doc.text(String(r.qty), 330, y);
        doc.text(String(r.unitPrice), 400, y);
        doc.text(String(r.amount), 500, y);
        y += 18;
        doc.setDrawColor(230, 230, 230);
        doc.line(left, y - 6, 555, y - 6);
      });

      y += 14;
      var totalsX = 380;
      doc.text('Subtotal', totalsX, y);
      doc.text(d.subtotal, 555, y, { align: 'right' });
      y += 16;
      doc.text(d.vatLabel, totalsX, y);
      doc.text(d.vat, 555, y, { align: 'right' });
      y += 16;
      if (d.other) {
        doc.text('Delivery / Other', totalsX, y);
        doc.text(d.other, 555, y, { align: 'right' });
        y += 16;
      }
      doc.setDrawColor(12, 63, 102); doc.line(totalsX, y - 4, 555, y - 4);
      y += 12;
      doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(12, 63, 102);
      doc.text('Total', totalsX, y);
      doc.text(d.total, 555, y, { align: 'right' });

      y += 50;
      doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(120, 120, 120);
      doc.text('Printed by: ' + d.printedBy, left, y);
      doc.text(d.printedAt, 555, y, { align: 'right' });

      return doc;
    }

    function downloadPdf() {
      buildPdf().save(PDF_DATA.fileName);
      notifyPrinted();
    }

    async function shareTo(channel) {
      var doc = buildPdf();
      var blob = doc.output('blob');
      var file = new File([blob], PDF_DATA.fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: PDF_DATA.shareTitle, text: PDF_DATA.shareText });
          notifyPrinted();
          return;
        } catch (e) {
          // user cancelled the native share sheet, or it's unsupported here — fall through
        }
      }

      doc.save(PDF_DATA.fileName);
      if (channel === 'whatsapp') {
        window.open(PDF_DATA.waLinkFallback, '_blank');
      } else {
        window.location.href = PDF_DATA.gmailLinkFallback;
      }
      notifyPrinted();
    }
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=800,height=920");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();

  if (onPrinted) {
    const handler = (event) => {
      if (event.data && event.data.rainbowWashPrinted && event.data.orderId === order.id) {
        onPrinted();
        window.removeEventListener("message", handler);
      }
    };
    window.addEventListener("message", handler);
  }
}
