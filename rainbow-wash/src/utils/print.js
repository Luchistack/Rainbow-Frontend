import { money } from "./format";
import { BUSINESS_INFO } from "../data/constants";

function rowsForOrder(order) {
  if (order.items && order.items.length) {
    return order.items
      .map(
        (i) => `
      <tr>
        <td style="white-space: nowrap;">${i.name}</td>
        <td style="text-align:center">${i.qty}${i.unit || ""}</td>
        <td style="text-align:right">${money(i.price)}</td>
        <td style="text-align:right">${money(i.price * i.qty)}</td>
      </tr>`
      )
      .join("");
  }
  return `
      <tr>
        <td style="white-space: nowrap;">${order.service || "Cleaning Service"} — ${order.size || ""}</td>
        <td style="text-align:center">1</td>
        <td style="text-align:right">${money(order.price || order.subtotal || 0)}</td>
        <td style="text-align:right">${money(order.price || order.subtotal || 0)}</td>
      </tr>`;
}

function plainTextLines(order) {
  if (order.items && order.items.length) {
    return order.items.map((i) => `- ${i.name} x${i.qty}${i.unit || ""}: ${money(i.price * i.qty)}`);
  }
  return [`- ${order.service || "Cleaning Service"} (${order.size || ""}): ${money(order.price || order.subtotal || 0)}`];
}

// Builds the same plain-text summary used elsewhere in the app, so the WhatsApp/
// email share matches what customers already see in their order-confirmation receipts.
function buildShareText(order) {
  const subtotal = order.subtotal ?? order.price ?? (order.total ? order.total / 1.075 : 0);
  const total = order.total ?? subtotal;
  const placedDate = order.placedAt ? new Date(order.placedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return [
    `Rainbow Wash — Receipt ${order.id}`,
    `Date: ${placedDate}`,
    `Customer: ${order.fullName || "Customer"}${order.phone ? " (" + order.phone + ")" : ""}`,
    "",
    ...plainTextLines(order),
    "",
    `Total: ${money(total)}`,
    `Status: ${order.status || "—"}`,
  ].join("\n");
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
  const subtotal = order.subtotal ?? order.price ?? (order.total ? order.total / 1.075 : 0);
  const tax = order.tax ?? (subtotal * 0.075);
  const total = order.total ?? (subtotal + tax);

  const placedDate = order.placedAt ? new Date(order.placedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const printedAt = new Date().toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  const shareText = buildShareText(order);
  const waLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(`Rainbow Wash Receipt ${order.id}`)}&body=${encodeURIComponent(shareText)}`;

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${order.id} — Rainbow Wash</title>
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
  .btn-wa { background: #25d366; color: #fff; }
  .btn-mail { background: #ea4335; color: #fff; }

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
    <button class="btn-wa" onclick="window.open('${waLink}', '_blank')">💬 Share via WhatsApp</button>
    <button class="btn-mail" onclick="window.location.href='${gmailLink}'">✉️ Share via Gmail</button>
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
      ${rowsForOrder(order)}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div><span>VAT (7.5%)</span><span>${money(tax)}</span></div>
    <div class="grand"><span>Total</span><span>${money(total)}</span></div>
  </div>

  <div class="foot">
    <span>Printed by: ${staffUser?.name || "Staff"} (${staffUser?.role || "Staff"})</span>
    <span>${printedAt}</span>
  </div>

  <script>
    function setSizeAndPrint(size) {
      document.body.className = 'size-' + size;
      window.print();
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ rainbowWashPrinted: true, orderId: ${JSON.stringify(order.id)} }, '*');
      }
    }
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=800,height=920");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();

  // Listens for the postMessage the print window sends the moment any actual
  // print button is clicked, so the dashboard can flip the order to "printed"
  // (locking it from deletion) only once a real print action happened — not
  // just because the preview window was opened.
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
