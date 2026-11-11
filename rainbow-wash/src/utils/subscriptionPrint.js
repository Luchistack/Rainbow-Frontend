import { BUSINESS_INFO } from "../data/constants";
import logoDataUrl from "../assets/logo.png?inline";

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const money = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? escapeHtml(value)
    : date.toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? escapeHtml(value)
    : date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export const openSubscriptionPrintSlip = (purchase, staffUser, onPrinted) => {
  if (!purchase) {
    window.alert("Subscription purchase details are unavailable.");
    return false;
  }

  const popup = window.open("", "_blank", "width=850,height=950");

  if (!popup) {
    window.alert("Please allow pop-ups to print the subscription receipt.");
    return false;
  }

  const reference = purchase.referenceId || purchase.id || "—";
  const companyName = escapeHtml(BUSINESS_INFO.name);
  const companyAddress = escapeHtml(BUSINESS_INFO.address);
  const companyEmail = escapeHtml(BUSINESS_INFO.email);
  const companyPhone = escapeHtml((BUSINESS_INFO.phones || [])[0] || "");
  const companyWhatsApp = escapeHtml((BUSINESS_INFO.phones || [])[1] || "");
  const customerName = escapeHtml(purchase.customerName);
  const customerPhone = escapeHtml(purchase.customerPhone);
  const planName = escapeHtml(purchase.planName);
  const planDuration = escapeHtml(purchase.planDuration);
  const planCovers = escapeHtml(purchase.planCovers);
  const kgAllowance = purchase.kgAllowance == null
    ? "—"
    : `${escapeHtml(purchase.kgAllowance)} kg`;
  const creatorName = escapeHtml(
    purchase.createdByName || staffUser?.name || "—"
  );
  const creatorEmail = escapeHtml(
    purchase.createdByEmail || staffUser?.email || "—"
  );
  const paymentMethod = escapeHtml(purchase.paymentMethod);
  const paymentStatus = escapeHtml(purchase.paymentStatus);
  const placedAt = formatDateTime(purchase.placedAt);
  const printedAt = new Date().toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const subtotal = money(purchase.subtotal);
  const vat = money(purchase.vatAmount);
  const total = money(purchase.total);

  const receiptHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Subscription Receipt - ${escapeHtml(reference)}</title>
  <style id="page-size">@page { size: A4; margin: 12mm; }</style>
  <style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    color: #243247;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt { width: 100%; max-width: 700px; margin: 0 auto; }
  .toolbar {
    display: flex; justify-content: flex-end; align-items: center;
    flex-wrap: wrap; gap: 10px; margin: 0 auto 20px; max-width: 700px;
  }
  .toolbar select, .toolbar button {
    padding: 9px 13px; border: 1px solid #cbd5e1;
    border-radius: 6px; background: #fff; font-size: 13px;
  }
  .toolbar button { cursor: pointer; background: #0c3f66; color: #fff; }
  .print-rainbow-stripe {
    height: 6px; width: 100%; display: flex;
    margin-bottom: 18px; border-radius: 4px; overflow: hidden;
  }
  .print-rainbow-stripe span { flex: 1; }
  .company {
    text-align: left; padding-bottom: 14px;
    border-bottom: 2px solid #0c3f66;
  }
  .company-logo { display: block; width: 58px; height: auto; object-fit: contain; margin: 0 0 8px; }
  .company h1 {
    margin: 0 0 6px; font-size: 21px;
    line-height: 1.3; color: #0c3f66; overflow-wrap: anywhere;
  }
  .company p { margin: 3px 0; color: #526477; line-height: 1.45; overflow-wrap: anywhere; }
  .receipt-title {
    text-align: left; margin: 16px 0; padding: 12px 14px;
    background: #f0f7fc; border-left: 4px solid #27aae1; border-radius: 5px;
  }
  .receipt-title h2 { margin: 0 0 5px; font-size: 18px; color: #0c3f66; }
  .muted { color: #64748b; }
  .section {
    margin: 15px 0; padding: 0 0 12px;
    border-bottom: 1px solid #e2eaf1;
  }
  .section h3 {
    margin: 0 0 10px; padding: 8px 10px;
    border-left: 3px solid #27aae1; border-bottom: 0;
    background: #eaf4fb; color: #0c3f66;
    font-size: 12px; text-transform: uppercase; letter-spacing: .5px;
  }
  .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 22px; }
  .detail-label { display: block; color: #64748b; font-size: 10px; margin-bottom: 3px; }
  .detail-value { display: block; font-weight: 600; color: #243247; overflow-wrap: anywhere; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 9px 7px; border-bottom: 1px solid #e2e8f0; }
  td:first-child { color: #526477; }
  td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }
  .grand-total td {
    border-top: 2px solid #0c3f66; border-bottom: 0;
    font-size: 16px; font-weight: 800; color: #0c3f66;
  }
  .footer {
    margin-top: 20px; padding-top: 12px;
    border-top: 1px solid #cbd5e1; text-align: center;
    color: #64748b; font-size: 11px; line-height: 1.6;
  }
  body.size-a4 .receipt { max-width: 720px; }

  body.size-thermal80 {
    max-width: 72mm;
    font-size: 11px;
    padding: 6px;
    margin: 0 auto;
  }
  body.size-thermal80 .receipt { max-width: none; }
  body.size-thermal80 .print-rainbow-stripe {
    height: 4px;
    margin-bottom: 12px;
  }
  body.size-thermal80 .company { padding-bottom: 9px; }
  body.size-thermal80 .company-logo { width: 42px; margin-bottom: 6px; }
  body.size-thermal80 .company h1 { font-size: 14px; }
  body.size-thermal80 .company p { font-size: 10px; }
  body.size-thermal80 .receipt-title { margin: 12px 0; padding: 9px; }
  body.size-thermal80 .receipt-title h2 { font-size: 14px; }
  body.size-thermal80 .details { grid-template-columns: 1fr; gap: 7px; }
  body.size-thermal80 .section { margin: 11px 0; padding-bottom: 9px; }
  body.size-thermal80 .section h3 { padding: 7px 9px; font-size: 10px; }
  body.size-thermal80 .detail-label { font-size: 9px; }
  body.size-thermal80 .detail-value { font-size: 11px; }
  body.size-thermal80 td { padding: 7px 3px; font-size: 10px; }
  body.size-thermal80 .grand-total td { font-size: 14px; }
  body.size-thermal80 .footer { margin-top: 14px; font-size: 9px; }

  body.size-thermal58 {
    max-width: 52mm;
    font-size: 9.5px;
    padding: 4px;
    margin: 0 auto;
  }
  body.size-thermal58 .receipt { max-width: none; }
  body.size-thermal58 .print-rainbow-stripe {
    height: 3px;
    margin-bottom: 10px;
  }
  body.size-thermal58 .company { padding-bottom: 7px; }
  body.size-thermal58 .company-logo { width: 34px; margin-bottom: 5px; }
  body.size-thermal58 .company h1 { font-size: 12px; }
  body.size-thermal58 .company p { font-size: 8.5px; }
  body.size-thermal58 .receipt-title { margin: 9px 0; padding: 7px; }
  body.size-thermal58 .receipt-title h2 { font-size: 12px; }
  body.size-thermal58 .details { grid-template-columns: 1fr; gap: 6px; }
  body.size-thermal58 .section { margin: 9px 0; padding-bottom: 7px; }
  body.size-thermal58 .section h3 { padding: 6px 7px; font-size: 9px; }
  body.size-thermal58 .detail-label { font-size: 8px; }
  body.size-thermal58 .detail-value { font-size: 9.5px; }
  body.size-thermal58 td { padding: 6px 2px; font-size: 9px; }
  body.size-thermal58 .grand-total td { font-size: 12px; }
  body.size-thermal58 .footer { margin-top: 11px; font-size: 8px; }

  @media print {
    body { padding: 0; }
    .toolbar { display: none !important; }
    .receipt { max-width: none; }
    body.size-thermal80,
    body.size-thermal58 {
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
  @media screen and (max-width: 560px) {
    body { padding: 12px; }
    .details { grid-template-columns: 1fr; }
    .company h1 { font-size: 19px; }
  }
</style>
</head>
<body class="size-a4">
  <div class="toolbar">
    <label for="paper-size">Paper size</label>
    <select id="paper-size">
      <option value="A4">A4</option>
      <option value="80mm">80mm thermal</option>
      <option value="58mm">58mm thermal</option>
    </select>
    <button type="button" onclick="window.print()">Print receipt</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>

  <main class="receipt">
    <div class="print-rainbow-stripe">
      <span style="background: #ef4136;"></span>
      <span style="background: #f7941d;"></span>
      <span style="background: #ffce33;"></span>
      <span style="background: #39b54a;"></span>
      <span style="background: #27aae1;"></span>
      <span style="background: #8e44ad;"></span>
    </div>
    <header class="company">
      <img class="company-logo" src="${logoDataUrl}" alt="Rainbow Wash logo" />
      <h1>${companyName}</h1>
      <p>${companyAddress}</p>
      <p class="company-contacts">
        <span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-label="WhatsApp"><circle cx="12" cy="12" r="11" fill="#25D366"/><path fill="#fff" d="M8.1 6.8c-.3-.6-.6-.6-.9-.6h-.7c-.2 0-.6.1-.9.5-.3.3-1.1 1.1-1.1 2.7s1.1 3.1 1.3 3.3c.2.2 2.1 3.4 5.2 4.6 2.6 1 3.1.8 3.7.7.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.3.2-1.5-.1-.1-.3-.3-.7-.4l-2.1-1c-.3-.1-.5-.2-.7.2-.2.2-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5Z"/></svg>${companyWhatsApp}
        </span>
        <span style="display:inline-flex;align-items:center;gap:4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-label="Phone"><path fill="#2878C8" d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.49c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.19 2.2Z"/></svg>${companyPhone}
        </span>
      </p>
      <p>${companyEmail}</p>
    </header>

    <div class="receipt-title">
      <h2>SUBSCRIPTION PURCHASE RECEIPT</h2>
      <div class="muted">Reference: ${escapeHtml(reference)}</div>
    </div>

    <section class="section">
      <h3>Customer information</h3>
      <div class="details">
        <div><span class="detail-label">Customer name</span><span class="detail-value">${customerName || "—"}</span></div>
        <div><span class="detail-label">Phone number</span><span class="detail-value">${customerPhone || "—"}</span></div>
      </div>
    </section>

    <section class="section">
      <h3>Subscription details</h3>
      <div class="details">
        <div><span class="detail-label">Plan</span><span class="detail-value">${planName || "—"}</span></div>
        <div><span class="detail-label">Duration</span><span class="detail-value">${planDuration || "—"}</span></div>
        <div><span class="detail-label">Plan covers</span><span class="detail-value">${planCovers || "—"}</span></div>
        <div><span class="detail-label">KG allowance</span><span class="detail-value">${kgAllowance}</span></div>
        <div><span class="detail-label">Start date</span><span class="detail-value">${formatDate(purchase.startDate)}</span></div>
        <div><span class="detail-label">Expiry date</span><span class="detail-value">${formatDate(purchase.expiryDate)}</span></div>
      </div>
    </section>

    <section class="section">
      <h3>Payment summary</h3>
      <table>
        <tbody>
          <tr><td>Subscription subtotal</td><td>${subtotal}</td></tr>
          <tr><td>VAT</td><td>${vat}</td></tr>
          <tr class="grand-total"><td>Total</td><td>${total}</td></tr>
        </tbody>
      </table>
      <div class="details" style="margin-top: 14px;">
        <div><span class="detail-label">Payment method</span><span class="detail-value">${paymentMethod || "—"}</span></div>
        <div><span class="detail-label">Payment status</span><span class="detail-value">${paymentStatus || "—"}</span></div>
      </div>
    </section>

    <section class="section">
      <h3>Recorded by</h3>
      <div class="details">
        <div><span class="detail-label">Staff name</span><span class="detail-value">${creatorName}</span></div>
        <div><span class="detail-label">Staff email</span><span class="detail-value">${creatorEmail}</span></div>
        <div><span class="detail-label">Purchase date</span><span class="detail-value">${escapeHtml(placedAt)}</span></div>
        <div><span class="detail-label">Receipt generated</span><span class="detail-value">${escapeHtml(printedAt)}</span></div>
      </div>
    </section>

    <footer class="footer">
      Thank you for choosing Rainbow Wash.<br>
      We appreciate your business.
    </footer>
  </main>

  <script>
    const pageStyle = document.getElementById("page-size");
    document.getElementById("paper-size").addEventListener("change", (event) => {
      const selected = event.target.value;
      const sizes = {
        "A4": { className: "size-a4", page: "size: A4; margin: 12mm;" },
        "80mm": { className: "size-thermal80", page: "size: 80mm auto; margin: 4mm;" },
        "58mm": { className: "size-thermal58", page: "size: 58mm auto; margin: 3mm;" }
      };
      const config = sizes[selected] || sizes["A4"];
      document.body.className = config.className;
      pageStyle.textContent = "@page { " + config.page + " }";
    });

    window.addEventListener("afterprint", () => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: "rainbowWashSubscriptionPrinted",
          reference: ${JSON.stringify(String(reference))}
        }, "*");
      }
    });
  </script>
</body>
</html>`;

  const handlePrinted = (event) => {
    if (
      event.source !== popup ||
      event.data?.type !== "rainbowWashSubscriptionPrinted" ||
      event.data?.reference !== String(reference)
    ) {
      return;
    }

    window.removeEventListener("message", handlePrinted);
    if (typeof onPrinted === "function") onPrinted();
  };

  window.addEventListener("message", handlePrinted);

  try {
    popup.document.open();
    popup.document.write(receiptHtml);
    popup.document.close();
    popup.focus();
    return true;
  } catch (error) {
    window.removeEventListener("message", handlePrinted);
    popup.close();
    window.alert("Could not prepare the subscription receipt for printing.");
    return false;
  }
};
