import { useState } from "react";
import {
  CheckCircle2, Minus, Plus, Truck, CreditCard, Phone, Mail, User,
  Shirt, Users, Sparkles, Package, ShoppingBag, Trash2, Landmark, Copy, Zap,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import FAQ from "../components/FAQ";
import {
  ADDON_GROUPS, SELF_WASH_DISCOUNT_KG, SELF_WASH_DISCOUNT_RATE,
  DELIVERY_FEE, DELIVERY_COVERAGE_NOTE, BANK_DETAILS, buildWhatsAppLink, VAT_RATE,
} from "../data/constants";
import { money, genRef } from "../utils/format";
import { useApp } from "../context/AppContext";
import { createOrder } from "../api/api";

const CATEGORIES = [
  { id: "selfwash", label: "Self Wash", icon: Shirt },
  { id: "staffwash", label: "Staff Wash", icon: Users },
  { id: "dryclean", label: "Dry Cleaning", icon: Sparkles },
  { id: "shoecare", label: "Shoe & Leather Care", icon: Package },
  { id: "express", label: "Express", icon: Zap },
  { id: "extras", label: "Add Extras", icon: ShoppingBag },
];

const TURNAROUND = [
  { level: "Self Wash", time: "Same visit" },
  { level: "Staff Wash", time: "24–48 hours" },
  { level: "Dry Cleaning", time: "48 hours" },
  { level: "Shoe & Leather Care", time: "48–72 hours" },
];

const CARE_TIPS = [
  "Empty pockets and check for loose buttons before drop-off.",
  "Point out any existing stains so we can pre treat them.",
  "Separate delicates into their own bag if possible.",
  "Note fabric-specific instructions in the address/notes field.",
];

function buildReceipt(order) {
  const itemLines = order.items.map((i) => `  • ${i.name} × ${i.qty}${i.unit ? i.unit : ""}, ${money(i.price * i.qty)}`).join("\n");
  const lines = [
    "🧺 New Laundry Order, Rainbow Wash",
    `Ref: ${order.id}`,
    itemLines,
    `Fulfilment: ${order.fulfilment === "pickup" ? "Pickup & delivery" : "Drop off, in store"}`,
  ];
  if (order.fulfilment === "pickup") {
    lines.push(`Address: ${order.address || "—"}`);
    lines.push(`Preferred: ${order.date || "—"} ${order.time || ""}`.trim());
  }
  lines.push(`Payment method: ${order.payment}`);
  if (order.payment === "bank" && order.transferNote) lines.push(`Transfer note: ${order.transferNote}`);
  lines.push(`Total: ${money(order.total)}`);
  lines.push(`Customer name: ${order.fullName}`);
  lines.push(`Customer phone: ${order.phone}`);
  lines.push(`Customer email: ${order.email || "—"}`);
  return lines.join("\n");
}

export default function OrderLaundry() {
  const { setLaundryOrders, notify, selfWashRates, staffWashRates, dryCleanItems, shoeCareItems, addonProducts, expressServices } = useApp();

  const [category, setCategory] = useState("selfwash");
  const [items, setItems] = useState([]);

  const [washRateId, setWashRateId] = useState(selfWashRates[0].id);
  const [washWeight, setWashWeight] = useState(3);

  const [dcItemId, setDcItemId] = useState(dryCleanItems[0].id);
  const [dcType, setDcType] = useState("regular");
  const [dcQty, setDcQty] = useState(1);
  const [exItemId, setExItemId] = useState(expressServices[0].id);
  const [exQty, setExQty] = useState(1);
  const [scItemId, setScItemId] = useState(shoeCareItems[0].id);
  const [scType, setScType] = useState("regular");
  const [scQty, setScQty] = useState(1);

  const [fulfilment, setFulfilment] = useState("pickup");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState("paystack");
  const [transferNote, setTransferNote] = useState("");
  const [transferSent, setTransferSent] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [placed, setPlaced] = useState(null);

  const addItem = (name, qty, price, unit) => {
    setItems((its) => {
      const existing = its.find((i) => i.name === name && i.unit === unit);
      if (existing) return its.map((i) => (i === existing ? { ...i, qty: i.qty + qty } : i));
      return [...its, { id: `${Date.now()}-${Math.random()}`, name, qty, price, unit }];
    });
    notify(`Added to your order`);
  };

  const removeItem = (id) => setItems((its) => its.filter((i) => i.id !== id));
  const updateItemQty = (id, delta) => setItems((its) => its.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));

  const addWashLine = (isSelf) => {
    const rate = (isSelf ? selfWashRates : staffWashRates).find((r) => r.id === washRateId);
    let unitPrice = rate.price;
    let discounted = false;
    if (isSelf && washWeight >= SELF_WASH_DISCOUNT_KG) {
      unitPrice = Math.round(rate.price * (1 - SELF_WASH_DISCOUNT_RATE));
      discounted = true;
    }
    const name = `${isSelf ? "Self Wash" : "Staff Wash"}, ${rate.label}${discounted ? ` (${SELF_WASH_DISCOUNT_RATE * 100}% off)` : ""}`;
    addItem(name, washWeight, unitPrice, "kg");
  };

  const addDryCleanLine = () => {
    const item = dryCleanItems.find((i) => i.id === dcItemId);
    const price = dcType === "deep" ? item.deep : item.regular;
    const name = `${item.label} (${dcType === "deep" ? "Deep Clean" : "Regular"})`;
    addItem(name, dcQty, price, "");
  };

  const addExpressLine = () => {
    const item = expressServices.find((i) => i.id === exItemId);
    addItem(item.label, exQty, item.price, "");
  };

  const addShoeCareLine = () => {
    const item = shoeCareItems.find((i) => i.id === scItemId);
    const price = scType === "deep" ? item.deep : scType === "repair" ? item.repair : item.regular;
    const typeLabel = scType === "deep" ? "Deep Clean" : scType === "repair" ? "Minor Repairs" : "Regular";
    const name = `${item.label} (${typeLabel})`;
    addItem(name, scQty, price, "");
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const vat = subtotal * VAT_RATE;
  const deliveryFee = fulfilment === "pickup" ? DELIVERY_FEE : 0;
  const total = subtotal + vat + deliveryFee;

  const copyAccount = () => {
    navigator.clipboard?.writeText(BANK_DETAILS.accountNumber);
    notify("Account number copied");
  };

  const submit = async () => {
    if (items.length === 0) {
      notify("Add at least one item to your order first");
      return;
    }
    if (!fullName.trim()) {
      notify("Please add your full name");
      return;
    }
    if (!phone.trim()) {
      notify("Please add a phone number so we can call you when it's ready");
      return;
    }

    const localOrder = {
      id: genRef("LND"),
      items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, unit: i.unit })),
      fulfilment, address, date, time, payment, transferNote,
      paymentStatus: payment === "bank" && transferSent ? "Sent" : "Pending",
      fullName, phone, email,
      placedAt: new Date().toISOString(),
      archived: false,
      total, status: "Received",
    };

    let order = localOrder;
    try {
      const saved = await createOrder({
        items: items.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price })),
        fulfilment, address,
        preferredDate: date, preferredTime: time,
        paymentMethod: payment, transferNote,
        total, fullName, phone, email,
      });
      order = saved || localOrder;
    } catch (err) {
      // Backend unreachable — still lets the customer complete their order and
      // get a reference, just not synced to the dashboard until it's retried.
    }

    setLaundryOrders((os) => [order, ...os]);
    setPlaced(order);
    notify(`Order ${order.id} placed, ${money(total)} via ${payment}`);
    window.open(buildWhatsAppLink(buildReceipt(order)), "_blank");
  };

  if (placed) {
    return (
      <div className="rw-section" style={{ maxWidth: 560 }}>
        <div className="rw-card" style={{ textAlign: "center", padding: 40 }}>
          <CheckCircle2 size={44} color="#39B54A" style={{ marginBottom: 12 }} />
          <h2>Order placed!</h2>
          <p style={{ color: "var(--ink-soft)", margin: "10px 0 4px" }}>Your reference number</p>
          <div className="mono" style={{ fontSize: 23, fontWeight: 700, color: "var(--navy)" }}>{placed.id}</div>
          <p style={{ color: "var(--ink-soft)", marginTop: 14 }}>
            A receipt has opened in WhatsApp to send to our team. We'll call {placed.phone} when it's ready,
            you can also follow status on the Track Order page.
          </p>
          <button
            className="rw-btn rw-btn-primary"
            style={{ marginTop: 18 }}
            onClick={() => {
              setPlaced(null);
              setItems([]);
              setFullName("");
              setPhone("");
              setEmail("");
              setAddress("");
              setTransferNote("");
              setTransferSent(false);
            }}
          >
            Place another order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Order Laundry" subtitle="Self wash, staff wash, dry cleaning, shoe & leather care, priced exactly like our in store list." />
      <div className="rw-section" style={{ paddingTop: 44 }}>
        <div className="rw-grid-2" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="rw-card" style={{ marginBottom: 20 }}>
              <div className="rw-pill-group" style={{ marginBottom: 18 }}>
                {CATEGORIES.map((c) => (
                  <button key={c.id} className={`rw-pill ${category === c.id ? "active" : ""}`} onClick={() => setCategory(c.id)}>
                    <c.icon size={13} style={{ marginRight: 5, verticalAlign: -2 }} />{c.label}
                  </button>
                ))}
              </div>

              {(category === "selfwash" || category === "staffwash") && (
                <div>
                  <div className="rw-field">
                    <label>{category === "selfwash" ? "Self Wash" : "Staff Wash"} service</label>
                    <select value={washRateId} onChange={(e) => setWashRateId(e.target.value)}>
                      {(category === "selfwash" ? selfWashRates : staffWashRates).map((r) => (
                        <option key={r.id} value={r.id}>{r.label}, {money(r.price)}/kg</option>
                      ))}
                    </select>
                  </div>
                  <div className="rw-field">
                    <label>Weight (kg)</label>
                    <div className="rw-stepper">
                      <button onClick={() => setWashWeight((w) => Math.max(1, w - 0.5))}><Minus size={15} /></button>
                      <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{washWeight} kg</span>
                      <button onClick={() => setWashWeight((w) => Math.min(40, w + 0.5))}><Plus size={15} /></button>
                    </div>
                    {category === "selfwash" && washWeight >= SELF_WASH_DISCOUNT_KG && (
                      <p style={{ fontSize: 12.5, color: "var(--good)", marginTop: 8, fontWeight: 600 }}>
                        {SELF_WASH_DISCOUNT_RATE * 100}% discount applied for {SELF_WASH_DISCOUNT_KG}kg+
                      </p>
                    )}
                  </div>
                  <button className="rw-btn rw-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => addWashLine(category === "selfwash")}>
                    <Plus size={15} /> Add to order
                  </button>
                </div>
              )}

              {category === "dryclean" && (
                <div>
                  <div className="rw-field">
                    <label>Item</label>
                    <select value={dcItemId} onChange={(e) => setDcItemId(e.target.value)}>
                      {dryCleanItems.map((i) => (
                        <option key={i.id} value={i.id}>{i.label}, Regular {money(i.regular)} / Deep {money(i.deep)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rw-field">
                    <label>Clean type</label>
                    <div className="rw-pill-group">
                      <button className={`rw-pill ${dcType === "regular" ? "active" : ""}`} onClick={() => setDcType("regular")}>Regular</button>
                      <button className={`rw-pill ${dcType === "deep" ? "active" : ""}`} onClick={() => setDcType("deep")}>Deep Clean</button>
                    </div>
                  </div>
                  <div className="rw-field">
                    <label>Quantity</label>
                    <div className="rw-stepper">
                      <button onClick={() => setDcQty((q) => Math.max(1, q - 1))}><Minus size={15} /></button>
                      <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{dcQty}</span>
                      <button onClick={() => setDcQty((q) => q + 1)}><Plus size={15} /></button>
                    </div>
                  </div>
                  <button className="rw-btn rw-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addDryCleanLine}>
                    <Plus size={15} /> Add to order
                  </button>
                </div>
              )}

              {category === "express" && (
                <div>
                  <div className="rw-field">
                    <label>Express service</label>
                    <select value={exItemId} onChange={(e) => setExItemId(e.target.value)}>
                      {expressServices.map((i) => (
                        <option key={i.id} value={i.id}>{i.label}, {money(i.price)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rw-field">
                    <label>Quantity</label>
                    <div className="rw-stepper">
                      <button onClick={() => setExQty((q) => Math.max(1, q - 1))}><Minus size={15} /></button>
                      <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{exQty}</span>
                      <button onClick={() => setExQty((q) => q + 1)}><Plus size={15} /></button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 14 }}>
                    Add an Express line alongside your laundry, upholstery or cleaning items for same-day turnaround.
                  </p>
                  <button className="rw-btn rw-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addExpressLine}>
                    <Plus size={15} /> Add to order
                  </button>
                </div>
              )}

              {category === "shoecare" && (
                <div>
                  <div className="rw-field">
                    <label>Item</label>
                    <select value={scItemId} onChange={(e) => setScItemId(e.target.value)}>
                      {shoeCareItems.map((i) => (
                        <option key={i.id} value={i.id}>{i.label}, Regular {money(i.regular)} / Deep {money(i.deep)} / Repair {money(i.repair)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rw-field">
                    <label>Service type</label>
                    <div className="rw-pill-group">
                      <button className={`rw-pill ${scType === "regular" ? "active" : ""}`} onClick={() => setScType("regular")}>Regular</button>
                      <button className={`rw-pill ${scType === "deep" ? "active" : ""}`} onClick={() => setScType("deep")}>Deep Clean</button>
                      <button className={`rw-pill ${scType === "repair" ? "active" : ""}`} onClick={() => setScType("repair")}>Minor Repairs</button>
                    </div>
                  </div>
                  <div className="rw-field">
                    <label>Quantity (pairs/items)</label>
                    <div className="rw-stepper">
                      <button onClick={() => setScQty((q) => Math.max(1, q - 1))}><Minus size={15} /></button>
                      <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{scQty}</span>
                      <button onClick={() => setScQty((q) => q + 1)}><Plus size={15} /></button>
                    </div>
                  </div>
                  <button className="rw-btn rw-btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={addShoeCareLine}>
                    <Plus size={15} /> Add to order
                  </button>
                </div>
              )}

              {category === "extras" && (
                <div>
                  {ADDON_GROUPS.map((group) => (
                    <div key={group} style={{ marginBottom: 18 }}>
                      <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)", marginBottom: 8 }}>{group}</h4>
                      <div className="rw-grid-2">
                        {addonProducts.filter((p) => p.group === group).map((p) => (
                          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                              <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{money(p.price)}</div>
                            </div>
                            <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => addItem(p.label, 1, p.price, "")}>
                              <Plus size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rw-card">
              <h3 style={{ marginBottom: 14 }}>Pickup, delivery & payment</h3>
              <div className="rw-field">
                <label>Pickup & delivery</label>
                <div className="rw-pill-group">
                  <button className={`rw-pill ${fulfilment === "pickup" ? "active" : ""}`} onClick={() => setFulfilment("pickup")}>
                    <Truck size={13} style={{ marginRight: 5, verticalAlign: -2 }} />Pickup & deliver (+{money(DELIVERY_FEE)})
                  </button>
                  <button className={`rw-pill ${fulfilment === "dropoff" ? "active" : ""}`} onClick={() => setFulfilment("dropoff")}>
                    I'll drop off in-store
                  </button>
                </div>
              </div>

              {fulfilment === "pickup" && (
                <div className="rw-form-grid">
                  <div className="rw-field" style={{ gridColumn: "1 / -1" }}>
                    <label>Pickup / delivery address</label>
                    <input placeholder="e.g. 14 Adeyemi Street, Maryland, Lagos" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="rw-field">
                    <label>Preferred date</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div className="rw-field">
                    <label>Preferred time</label>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="rw-field">
                <label>Payment method</label>
                <div className="rw-pill-group">
                  {/* <button className={`rw-pill ${payment === "paystack" ? "active" : ""}`} onClick={() => setPayment("paystack")}>Paystack</button>
                  <button className={`rw-pill ${payment === "flutterwave" ? "active" : ""}`} onClick={() => setPayment("flutterwave")}>Flutterwave</button> */}
                  <button className={`rw-pill ${payment === "bank" ? "active" : ""}`} onClick={() => setPayment("bank")}>Bank Transfer</button>
                </div>
              </div>

              {payment === "bank" && (
                <div className="rw-summary" style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Landmark size={15} /> Transfer to
                  </h4>
                  <div className="rw-summary-row"><span>Bank</span><span style={{ fontWeight: 700 }}>{BANK_DETAILS.bankName}</span></div>
                  <div className="rw-summary-row">
                    <span>Account Number</span>
                    <span style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      {BANK_DETAILS.accountNumber}
                      <button className="rw-icon-btn" onClick={copyAccount} title="Copy account number"><Copy size={13} /></button>
                    </span>
                  </div>
                  <div className="rw-summary-row"><span>Account Name</span><span style={{ fontWeight: 700, textAlign: "right" }}>{BANK_DETAILS.accountName}</span></div>
                  <div className="rw-field" style={{ marginTop: 12, marginBottom: 10 }}>
                    <label style={{ fontSize: 12.5 }}>Transfer note (optional)</label>
                    <textarea rows={2} placeholder="e.g. Sent from GTBank, ref 123456" value={transferNote} onChange={(e) => setTransferNote(e.target.value)} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                    <input type="checkbox" checked={transferSent} onChange={(e) => setTransferSent(e.target.checked)} style={{ width: "auto" }} />
                    I've already made this transfer
                  </label>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>
                    Your order stays marked "Payment Pending" until our team confirms the transfer, we'll message you once it's confirmed.
                  </p>
                </div>
              )}

              <div className="rw-field">
                <label><User size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Full name</label>
                <input placeholder="e.g. Ada Obi" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="rw-field">
                <label><Phone size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Phone number</label>
                <input type="tel" placeholder="e.g. 0803 1111 1111" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="rw-field">
                <label><Mail size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Email (optional)</label>
                <input type="email" placeholder="e.g. you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rw-card rw-summary" style={{ position: "sticky", top: 90 }}>
            <h3 style={{ marginBottom: 14 }}>Your order</h3>
            {items.length === 0 && <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>Add items from the left to build your order.</p>}
            {items.map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{i.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{i.qty}{i.unit} × {money(i.price)}</div>
                </div>
                <div className="rw-stepper" style={{ gap: 6 }}>
                  <button onClick={() => updateItemQty(i.id, i.unit === "kg" ? -0.5 : -1)}><Minus size={12} /></button>
                  <span style={{ fontWeight: 700, fontSize: 12.5, minWidth: 24, textAlign: "center" }}>{i.qty}</span>
                  <button onClick={() => updateItemQty(i.id, i.unit === "kg" ? 0.5 : 1)}><Plus size={12} /></button>
                </div>
                <button className="rw-icon-btn" onClick={() => removeItem(i.id)}><Trash2 size={14} color="#e0473f" /></button>
              </div>
            ))}
            <div className="rw-summary-row" style={{ marginTop: 10 }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="rw-summary-row"><span>VAT ({VAT_RATE * 100}%)</span><span>{money(vat)}</span></div>
            <div className="rw-summary-row"><span>Delivery fee</span><span>{fulfilment === "pickup" ? money(deliveryFee) : "—"}</span></div>
            <div className="rw-summary-row total"><span>Total</span><span>{money(total)}</span></div>
            <button className="rw-btn rw-btn-rainbow" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={submit}>
              <CreditCard size={16} /> Pay & Place Order
            </button>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
              A receipt opens in WhatsApp automatically so our team gets notified right away.
            </p>
          </div>
        </div>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-section-head">
          <div className="rw-kicker">Turnaround times</div>
          <h2>How long each service takes</h2>
        </div>
        <div className="rw-grid-4">
          {TURNAROUND.map((t) => (
            <div className="rw-card" key={t.level} style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 16 }}>{t.level}</h3>
              <div className="rw-price" style={{ marginTop: 8, fontSize: 18 }}>{t.time}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-card">
          <h3 style={{ marginBottom: 16 }}>Get the best result, a few care tips</h3>
          <ul className="rw-check-list">
            {CARE_TIPS.map((t) => (
              <li key={t}><CheckCircle2 size={18} /> {t}</li>
            ))}
          </ul>
        </div>
      </div>

      <FAQ
        kicker="Questions"
        title="Order Laundry FAQ"
        items={[
          { q: "What's the difference between Self Wash and Staff Wash?", a: "Self Wash means you use our machines yourself at a lower rate. Staff Wash means our team washes, dries and/or irons it for you, priced a little higher to cover the labour." },
          { q: "Do I get a discount on Self Wash?", a: `Yes, any Self Wash line of ${SELF_WASH_DISCOUNT_KG}kg or more automatically gets ${SELF_WASH_DISCOUNT_RATE * 100}% off.` },
          { q: "How fast is delivery?", a: "Same day or next day delivery, depending on when your items are dropped off and the service selected." },
          { q: "What payment methods are accepted?", a: "Paystack, Flutterwave, or direct bank transfer, choose at checkout." },
          { q: "Is there a delivery fee?", a: `A flat ${money(DELIVERY_FEE)} fee applies for pickup and delivery combined. ${DELIVERY_COVERAGE_NOTE} Drop off, in store has no extra fee.` },
          { q: "Why do you ask for my phone number?", a: "So our team can call you the moment your order is ready or if anything needs confirming." },
        ]}
      />
    </div>
  );
}
