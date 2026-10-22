import { money } from "./format";
import { BUSINESS_INFO, VAT_RATE, DELIVERY_FEE } from "../data/constants";

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
    // Always computed fresh from the real line items — never trusts a stored
    // `order.total` blindly. That was the actual bug: a walk-in order's total
    // had been saved without VAT ever added to it, so the receipt was just
    // faithfully repeating a wrong number instead of getting it right.
    const itemsSubtotal = order.items.reduce((s, i) => s + i.qty * i.price, 0);
    const vat = itemsSubtotal * VAT_RATE;
    const other = order.fulfilment === "pickup" ? Math.max(DELIVERY_FEE, Number(order.deliveryFee) || DELIVERY_FEE) : 0;
    const total = itemsSubtotal + vat + other;
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
    BUSINESS_INFO.name,
    ...BUSINESS_INFO.phones,
    BUSINESS_INFO.email,
    "",
    `Receipt: ${order.id}`,
    `Date: ${placedDate}`,
    `Customer: ${order.fullName || "Customer"}${order.phone ? " (" + order.phone + ")" : ""}`,
    "",
    ...plainTextLines(order, subtotal),
    "",
    `Subtotal: ${money(subtotal)}`,
    `VAT (${VAT_RATE * 100}%): ${money(vat)}`,
  ];
  if (other > 1) lines.push(`Delivery / Other: ${money(other)}`);
  lines.push(
    `Total: ${money(total)}`,
    `Order Status: ${order.status || "—"}`,
    `Payment Method: ${order.paymentMethod || "—"}`,
    `Payment Status: ${order.paymentStatus || "Pending"}`
  );
  return lines.join("\n");
}

const PRINT_SIZE_CSS = {
  a4: `
    body.size-a4 { max-width: 700px; font-size: 13.5px; }
    body.size-a4 .biz { font-size: 18px; }
    body.size-a4 h1 { font-size: 24px; }
  `,
  thermal80: `
    body.size-thermal80 { max-width: 72mm; font-size: 11px; padding: 6px; }
    body.size-thermal80 .biz { font-size: 14px; }
    body.size-thermal80 h1 { font-size: 15px; margin: 10px 0 4px; }
    body.size-thermal80 .meta { flex-direction: column; gap: 6px; padding: 8px; }
    body.size-thermal80 .totals { width: 100%; }
    body.size-thermal80 .print-rainbow-stripe { height: 4px; margin-bottom: 12px; }
  `,
  thermal58: `
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
    paymentMethod: order.paymentMethod || "—",
    paymentStatus: order.paymentStatus || "Pending",
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
<style id="receipt-page-size">@page { size: A4; margin: 14mm; }</style>
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

  .head { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 20px; min-width: 0; }
  .biz { font-weight: 800; font-size: 18px; color: #0c3f66; max-width: 100%; overflow-wrap: anywhere; line-height: 1.3; }
  .contact { text-align: left; font-size: 12px; color: #555; line-height: 1.6; overflow-wrap: anywhere; max-width: 100%; }

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
      <div><b>Order Status:</b> ${order.status || "—"}</div>
      <div><b>Payment Method:</b> ${order.paymentMethod || "—"}</div>
      <div><b>Payment Status:</b> ${order.paymentStatus || "Pending"}</div>
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

    var selectedPdfSize = 'a4';

    function setSizeAndPrint(size) {
      selectedPdfSize = ['a4', 'thermal80', 'thermal58'].indexOf(size) !== -1 ? size : 'a4';
      document.body.className = 'size-' + selectedPdfSize;
      var pageStyle = document.getElementById('receipt-page-size');
      var pageSettings = {
        a4: 'size: A4; margin: 14mm;',
        thermal80: 'size: 80mm auto; margin: 4mm;',
        thermal58: 'size: 58mm auto; margin: 3mm;'
      };
      if (pageStyle) pageStyle.textContent = '@page { ' + (pageSettings[size] || pageSettings.a4) + ' }';
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
      var bodyClass = document.body.className || '';
      var activeSize = selectedPdfSize ||
        (bodyClass.indexOf('size-thermal80') !== -1 ? 'thermal80' :
         bodyClass.indexOf('size-thermal58') !== -1 ? 'thermal58' : 'a4');
      var is80 = activeSize === 'thermal80';
      var is58 = activeSize === 'thermal58';
      var isThermal = is80 || is58;

      // jsPDF custom formats are expressed in points.
      var mmToPt = 72 / 25.4;
      var pageW = is80 ? 80 * mmToPt : is58 ? 58 * mmToPt : 595.28;
      var left = isThermal ? (is80 ? 8 : 6) : 40;
      var right = pageW - left;
      var contentW = right - left;
      var small = isThermal;
      var rainbow = [
        [239,65,54], [247,148,29], [255,206,51],
        [57,181,74], [39,170,225], [142,68,173]
      ];
      var accentBlue = [39, 170, 225];
      var marginBottom = small ? 18 : 40;

      // Estimate a long-roll page height before creating the PDF.
      // The width remains the actual selected thermal-paper width.
      var estimatedH = 0;
      if (isThermal) {
        estimatedH = 260;
        estimatedH += String(d.bizName || '').length * (is80 ? 5 : 6);
        estimatedH += String(d.contactLine || '').length * 3;
        estimatedH += String(d.email || '').length * 3;
        estimatedH += String(d.billTo || '').length * 3;
        estimatedH += String(d.ref || '').length * 2;
        estimatedH += String(d.status || '').length * 2;
        estimatedH += String(d.paymentMethod || '').length * 2;
        estimatedH += String(d.paymentStatus || '').length * 2;
        (d.items || []).forEach(function (r) {
          estimatedH += 48 + Math.ceil(String(r.desc || '').length / (is80 ? 25 : 16)) * 12;
        });
        estimatedH += (d.other ? 120 : 100);
        estimatedH = Math.max(estimatedH, 420);
      }

      var doc = isThermal
        ? new jsPDFCtor({
            unit: 'pt',
            format: [pageW, estimatedH],
            compress: true
          })
        : new jsPDFCtor({ unit: 'pt', format: 'a4' });

      // Use the real page dimensions supplied by jsPDF.
      pageW = doc.internal.pageSize.getWidth();
      right = pageW - left;
      contentW = right - left;

      var y = 0;
      var fontBody = is58 ? 7.5 : is80 ? 8.5 : 9.5;
      var fontSmall = is58 ? 6.5 : is80 ? 7.5 : 9;
      var lineGap = is58 ? 9 : is80 ? 10 : 12;

      // Rainbow stripe across the page.
      var stripeW = pageW / rainbow.length;
      rainbow.forEach(function (rgb, i) {
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(i * stripeW, 0, stripeW + 1, 5, 'F');
      });

      y = small ? 19 : 36;
      doc.setFontSize(small ? (is58 ? 10 : 12) : 16);
      doc.setTextColor(12, 63, 102);
      doc.setFont(undefined, 'bold');
      var bizLines = doc.splitTextToSize(String(d.bizName || ''), contentW);
      doc.text(bizLines, left, y);
      y += bizLines.length * (small ? (is58 ? 11 : 14) : 19) + 3;

      doc.setFontSize(fontSmall);
      doc.setTextColor(85, 85, 85);
      doc.setFont(undefined, 'normal');

      var phoneLines = String(d.contactLine || '').split(' / ');
      phoneLines.forEach(function (phoneLine) {
        var lines = doc.splitTextToSize(phoneLine, contentW);
        doc.text(lines, left, y);
        y += lines.length * lineGap;
      });

      var emailLines = doc.splitTextToSize(String(d.email || ''), contentW);
      doc.text(emailLines, left, y);
      y += emailLines.length * lineGap + (small ? 5 : 10);

      doc.setDrawColor(221, 231, 240);
      doc.setLineWidth(0.7);
      doc.line(left, y, right, y);
      y += small ? 17 : 32;

      doc.setFontSize(small ? (is58 ? 10 : 12) : 19);
      doc.setTextColor(12, 63, 102);
      doc.setFont(undefined, 'bold');
      var titleLines = doc.splitTextToSize('Service Receipt / Slip', contentW);
      doc.text(titleLines, left, y);
      y += titleLines.length * (small ? 13 : 22) + (small ? 5 : 10);

      // Keep all order and payment details visible.
      var detailFont = small ? fontSmall : 9;
      var valueFont = small ? fontBody : 10;
      var details = [
        ['BILL TO', d.billTo],
        ['PHONE', d.phone],
        ['REF', d.ref],
        ['DATE', d.date],
        ['ORDER STATUS', d.status],
        ['PAYMENT METHOD', d.paymentMethod],
        ['PAYMENT STATUS', d.paymentStatus]
      ];

      var detailPad = small ? 5 : 9;
      var detailLineH = small ? (is58 ? 10 : 11) : 13;
      var detailValueGap = small ? 2 : 3;
      var detailHeights = details.map(function (pair) {
        var valueLines = doc.splitTextToSize(
          String(pair[1] == null || pair[1] === '' ? '—' : pair[1]),
          contentW - detailPad * 2 - 8
        );
        return detailLineH + detailValueGap +
          Math.max(1, valueLines.length) * detailLineH + detailPad;
      });
      var detailBoxH = detailHeights.reduce(function (a, b) { return a + b; }, detailPad);

      doc.setFillColor(244, 248, 251);
      doc.roundedRect(left, y, contentW, detailBoxH, small ? 3 : 6, small ? 3 : 6, 'F');
      doc.setFillColor(accentBlue[0], accentBlue[1], accentBlue[2]);
      doc.rect(left, y, small ? 2 : 4, detailBoxH, 'F');

      var dy = y + detailPad;
      details.forEach(function (pair) {
        doc.setFontSize(detailFont);
        doc.setTextColor(76, 96, 121);
        doc.setFont(undefined, 'bold');
        doc.text(pair[0], left + detailPad + 3, dy);
        dy += detailLineH + detailValueGap;

        doc.setFontSize(valueFont);
        doc.setTextColor(20, 20, 20);
        doc.setFont(undefined, 'normal');
        var valueLines = doc.splitTextToSize(
          String(pair[1] == null || pair[1] === '' ? '—' : pair[1]),
          contentW - detailPad * 2 - 8
        );
        doc.text(valueLines, left + detailPad + 3, dy);
        dy += Math.max(1, valueLines.length) * detailLineH + detailPad;
      });

      y += detailBoxH + (small ? 10 : 16);

      if (isThermal) {
        // Thermal paper: stack every item field within the usable paper width.
        (d.items || []).forEach(function (r, idx) {
          var innerLeft = left + 4;
          var innerRight = right - 4;
          var rowW = Math.max(20, innerRight - innerLeft);
          var descLines = doc.splitTextToSize(
            String(r.desc || 'Item'),
            rowW
          );
          var rowTop = y;
          var descLineH = lineGap;
          var valueLineH = lineGap + 1;
          var rowH = descLines.length * descLineH + valueLineH * 3 + 8;

          if (idx % 2 === 0) {
            doc.setFillColor(249, 251, 253);
            doc.rect(left, rowTop - 3, contentW, rowH, 'F');
          }

          doc.setFontSize(fontBody);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(30, 30, 30);
          doc.text(descLines, innerLeft, y + descLineH - 2);
          y += descLines.length * descLineH + 2;

          doc.setFontSize(fontSmall);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(30, 30, 30);
          doc.text('Qty: ' + String(r.qty), innerLeft, y);
          y += valueLineH;

          doc.text('Unit price: ' + String(r.unitPrice), innerLeft, y);
          y += valueLineH;

          doc.setFont(undefined, 'bold');
          var amountText = 'Amount: ' + String(r.amount);
          var amountLines = doc.splitTextToSize(amountText, rowW);
          doc.text(amountLines, innerLeft, y);
          y += Math.max(1, amountLines.length) * valueLineH + 5;

          doc.setDrawColor(230, 235, 240);
          doc.line(left, y - 2, right, y - 2);
        });
      } else {
        // A4 table: use adaptive columns and wrap long descriptions.
        var qtyX = left + contentW * 0.57;
        var unitX = left + contentW * 0.79;
        var amtX = right - 7;
        var descW = qtyX - left - 20;

        doc.setFillColor(234, 244, 251);
        doc.rect(left, y - 12, contentW, 22, 'F');
        doc.setFontSize(8.5);
        doc.setTextColor(12, 63, 102);
        doc.setFont(undefined, 'bold');
        doc.text('DESCRIPTION', left + 7, y + 2);
        doc.text('QTY', qtyX, y + 2, { align: 'center' });
        doc.text('UNIT PRICE', unitX, y + 2, { align: 'right' });
        doc.text('AMOUNT', amtX, y + 2, { align: 'right' });
        y += 22;

        (d.items || []).forEach(function (r, idx) {
          var descLines = doc.splitTextToSize(String(r.desc || 'Item'), descW);
          var rowH = Math.max(22, descLines.length * 12 + 8);

          if (idx % 2 === 1) {
            doc.setFillColor(249, 251, 253);
            doc.rect(left, y - 13, contentW, rowH, 'F');
          }

          doc.setFontSize(9);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(30, 30, 30);
          doc.text(descLines, left + 7, y);
          doc.text(String(r.qty), qtyX, y, { align: 'center' });
          doc.text(String(r.unitPrice), unitX, y, { align: 'right' });
          doc.text(String(r.amount), amtX, y, { align: 'right' });
          y += rowH;
        });

        doc.setDrawColor(221, 231, 240);
        doc.line(left, y - 8, right, y - 8);
        y += 8;
      }

      // Totals always fit the available paper width.
      y += small ? 5 : 12;
      var boxW = small ? contentW : Math.min(250, contentW);
      var boxX = right - boxW;
      var totalRows = d.other ? 4 : 3;
      var boxH = totalRows * (small ? 14 : 20) + (small ? 13 : 18);

      doc.setFillColor(244, 248, 251);
      doc.roundedRect(boxX, y, boxW, boxH, small ? 3 : 6, small ? 3 : 6, 'F');

      var ty = y + (small ? 12 : 20);
      var labelX = boxX + (small ? 5 : 14);
      var amountX = right - (small ? 5 : 14);
      var totalFont = small ? fontSmall : 10;

      doc.setFontSize(totalFont);
      doc.setTextColor(76, 96, 121);
      doc.setFont(undefined, 'normal');
      doc.text('Subtotal', labelX, ty);
      doc.text(String(d.subtotal), amountX, ty, { align: 'right' });
      ty += small ? 14 : 20;

      doc.text(String(d.vatLabel || 'VAT'), labelX, ty);
      doc.text(String(d.vat), amountX, ty, { align: 'right' });
      ty += small ? 14 : 20;

      if (d.other) {
        doc.text('Delivery / Other', labelX, ty);
        doc.text(String(d.other), amountX, ty, { align: 'right' });
        ty += small ? 14 : 20;
      }

      doc.setDrawColor(12, 63, 102);
      doc.setLineWidth(1);
      doc.line(labelX, ty - 5, amountX, ty - 5);
      ty += small ? 8 : 12;

      doc.setFontSize(small ? (is58 ? 8 : 9) : 13);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(12, 63, 102);
      doc.text('TOTAL', labelX, ty);
      doc.text(String(d.total), amountX, ty, { align: 'right' });

      y += boxH + (small ? 25 : 55);
      doc.setDrawColor(221, 221, 221);
      doc.setLineWidth(0.7);
      doc.line(left, y - 10, right, y - 10);

      doc.setFontSize(small ? (is58 ? 6 : 7) : 8.5);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(120, 120, 120);
      var printedBy = doc.splitTextToSize(
        'Printed by: ' + String(d.printedBy || ''),
        contentW
      );
      doc.text(printedBy, left, y);
      y += printedBy.length * lineGap;
      var printedAt = doc.splitTextToSize(String(d.printedAt || ''), contentW);
      doc.text(printedAt, left, y);

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


// Dedicated print slip for online Express quote requests.
// This is intentionally separate from normal laundry receipts:
// no VAT calculation and no implication that payment has been made.
export const openExpressQuotePrintSlip = (request, staffUser, onPrinted) => {
  if (!request) {
    alert("Express quote details are unavailable.");
    return;
  }

  const price = Number(request.quotedPrice);
  if (!Number.isFinite(price) || price <= 0) {
    alert("Save a valid quote price before printing.");
    return;
  }

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);

  const formatMoney = (value) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(value);

  const reference = request.id || request.referenceId || "—";
  const turnaround = ({
    "same-day": "Same day Express",
    "next-day": "Next day Express",
  })[request.turnaround] || request.turnaround || "—";

  const date = request.placedAt
    ? new Date(request.placedAt).toLocaleString("en-NG")
    : new Date().toLocaleString("en-NG");

  const staffName =
    staffUser?.fullName ||
    staffUser?.name ||
    staffUser?.username ||
    staffUser?.email ||
    "Rainbow Wash staff";

  const popup = window.open("", "_blank", "width=850,height=950");
  if (!popup) {
    alert("Your browser blocked the print window. Allow pop-ups and try again.");
    return;
  }

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Express Quote ${escapeHtml(reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; color: #171717; font: 14px/1.5 Arial, sans-serif; }
  .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin: 0 auto 18px; max-width: 760px; }
  button { border: 0; padding: 10px 16px; border-radius: 5px; cursor: pointer; }
  .print { background: #111; color: #fff; }
  .close { background: #eee; color: #111; }
  .sheet { max-width: 760px; margin: auto; border: 1px solid #ddd; padding: 32px; }
  .brand { font-size: 23px; font-weight: 800; letter-spacing: 1px; }
  .subtitle { color: #555; margin-top: 3px; }
  .heading { margin: 28px 0 4px; font-size: 22px; font-weight: 800; }
  .status { display: inline-block; margin: 8px 0 20px; padding: 5px 10px; border: 1px solid #aaa; border-radius: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 22px 0; }
  .field { margin: 0 0 12px; overflow-wrap: anywhere; }
  .label { display: block; color: #666; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .value { font-weight: 600; white-space: pre-wrap; overflow-wrap: anywhere; }
  .description { border: 1px solid #ddd; padding: 14px; min-height: 70px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .amount { margin-top: 24px; padding: 18px; background: #f5f5f5; }
  .amount-label { color: #555; font-size: 12px; text-transform: uppercase; }
  .amount-value { font-size: 27px; font-weight: 800; margin-top: 4px; }
  .notice { margin-top: 18px; padding: 12px; border: 1px solid #ddd; }
  .footer { margin-top: 28px; border-top: 1px solid #ddd; padding-top: 12px; color: #555; font-size: 11px; }
  @media print {
    body { padding: 0; }
    .toolbar { display: none; }
    .sheet { max-width: none; border: 0; padding: 12mm; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="close" onclick="window.close()">Close</button>
    <button class="print" onclick="window.print()">Print quote</button>
  </div>
  <main class="sheet">
    <div class="brand">RAINBOW WASH</div>
    <div class="subtitle">Laundry and Cleaning Services</div>
    <div class="heading">EXPRESS SERVICE QUOTE</div>
    <div>Reference: <strong>${escapeHtml(reference)}</strong></div>
    <div class="status">${escapeHtml(request.status || "Quoted")}</div>

    <div class="grid">
      <section>
        <div class="field"><span class="label">Customer</span><span class="value">${escapeHtml(request.fullName)}</span></div>
        <div class="field"><span class="label">Phone</span><span class="value">${escapeHtml(request.phone)}</span></div>
        <div class="field"><span class="label">Email</span><span class="value">${escapeHtml(request.email || "—")}</span></div>
      </section>
      <section>
        <div class="field"><span class="label">Request date</span><span class="value">${escapeHtml(date)}</span></div>
        <div class="field"><span class="label">Service</span><span class="value">${escapeHtml(request.service)}</span></div>
        <div class="field"><span class="label">Turnaround</span><span class="value">${escapeHtml(turnaround)}</span></div>
      </section>
    </div>

    <div class="field"><span class="label">Customer's description</span></div>
    <div class="description">${escapeHtml(request.description || "—")}</div>

    <div class="amount">
      <div class="amount-label">Quoted price — not a payment receipt</div>
      <div class="amount-value">${escapeHtml(formatMoney(price))}</div>
    </div>

    <div class="notice">
      This document is a quotation only. It is not proof of payment, does not include a VAT calculation,
      and does not confirm that payment has been received. Final service arrangements remain subject
      to confirmation with Rainbow Wash.
    </div>

    <div class="footer">
      Prepared by ${escapeHtml(staffName)} · Printed ${escapeHtml(new Date().toLocaleString("en-NG"))}
    </div>
  </main>
<script>
  window.addEventListener("afterprint", () => {
    if (window.opener) {
      window.opener.postMessage({
        rainbowWashExpressQuotePrinted: true,
        quoteId: ${JSON.stringify(String(reference))}
      }, "*");
    }
  });
</script>
</body>
</html>`);
  popup.document.close();

  const handleMessage = (event) => {
    if (event.source !== popup || !event.data?.rainbowWashExpressQuotePrinted) return;
    window.removeEventListener("message", handleMessage);
    if (typeof onPrinted === "function") onPrinted();
  };
  window.addEventListener("message", handleMessage);
};
