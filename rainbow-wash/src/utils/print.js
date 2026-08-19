import { money } from "./format";
import { BUSINESS_INFO } from "../data/constants";

function rowsForOrder(order) {
  if (order.items && order.items.length) {
    return order.items
      .map(
        (i) => `
      <tr>
        <td>${i.name}</td>
        <td style="text-align:center">${i.qty}${i.unit || ""}</td>
        <td style="text-align:right">${money(i.price)}</td>
        <td style="text-align:right">${money(i.price * i.qty)}</td>
      </tr>`
      )
      .join("");
  }
  return `
      <tr>
        <td>${order.service || "Cleaning Service"} — ${order.size || ""}</td>
        <td style="text-align:center">1</td>
        <td style="text-align:right">${money(order.price || order.total || 0)}</td>
        <td style="text-align:right">${money(order.price || order.total || 0)}</td>
      </tr>`;
}

export function openPrintSlip(order, staffUser) {
  const total = order.total ?? order.price ?? 0;
  const placedDate = order.placedAt ? new Date(order.placedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const printedAt = new Date().toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${order.id} — Rainbow Wash</title>
<style>
  /* Force color retention when printing */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .noprint { display: none; }
  }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 32px; max-width: 700px; margin: 0 auto; background: #fff; }
  
  /* Rainbow stripe banner matching brand styling */
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
</style>
</head>
<body>
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
    <div class="grand"><span>Total</span><span>${money(total)}</span></div>
  </div>

  <div class="foot">
    <span>Printed by: ${staffUser?.name || "Staff"} (${staffUser?.role || "Staff"})</span>
    <span>${printedAt}</span>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=760,height=900");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}