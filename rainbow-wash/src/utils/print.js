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
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 32px; max-width: 700px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .biz { font-weight: 700; font-size: 15px; }
  .contact { text-align: right; font-size: 12px; color: #555; line-height: 1.6; }
  h1 { font-size: 22px; margin: 18px 0 4px; }
  .meta { display: flex; justify-content: space-between; margin: 18px 0; font-size: 13px; }
  .meta div { line-height: 1.8; }
  .meta b { color: #444; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #666; border-bottom: 2px solid #ddd; padding: 8px 6px; }
  td { padding: 9px 6px; border-bottom: 1px solid #eee; font-size: 13.5px; }
  .totals { margin-top: 16px; width: 260px; margin-left: auto; font-size: 13.5px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .grand { font-weight: 700; font-size: 16px; border-top: 2px solid #222; padding-top: 8px; margin-top: 6px; }
  .foot { margin-top: 40px; padding-top: 14px; border-top: 1px solid #ddd; font-size: 11.5px; color: #777; display: flex; justify-content: space-between; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
  <div class="head">
    <div class="biz">${BUSINESS_INFO.name}</div>
    <div class="contact">
      ${BUSINESS_INFO.phones.join("<br/>")}<br/>
      ${BUSINESS_INFO.email}
    </div>
  </div>

  <h1>Receipt / Slip</h1>

  <div class="meta">
    <div>
      <b>Bill To</b><br/>
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
