import { useState } from "react";
import { CheckCircle2, Minus, Plus, Truck, CreditCard, Phone, Mail, User } from "lucide-react";
import PageHeader from "../components/PageHeader";
import FAQ from "../components/FAQ";
import { CLOTHING_RATES, LAUNDRY_SERVICE_LEVELS, DELIVERY_FEE, DELIVERY_COVERAGE_NOTE, buildWhatsAppLink } from "../data/constants";
import { money, genRef } from "../utils/format";
import { useApp } from "../context/AppContext";

const TURNAROUND = [
  { level: "Wash & Fold", time: "24 hours" },
  { level: "Wash & Iron", time: "24–48 hours" },
  { level: "Dry Cleaning", time: "48 hours" },
  { level: "Express", time: "Same day" },
];

const CARE_TIPS = [
  "Empty pockets and check for loose buttons before drop off.",
  "Point out any existing stains so we can pre treat them.",
  "Separate delicates into their own bag if possible.",
  "Note fabric-specific instructions in the address/notes field.",
];

const ORDER_FAQ = [
  { q: "How accurate does my weight estimate need to be?", a: "Just get close, we weigh everything on our in store scale and adjust your bill if it differs from your estimate." },
  { q: "What payment methods are accepted?", a: "Paystack, Flutterwave, or direct bank transfer, choose at checkout." },
  { q: "Can I change the pickup time after ordering?", a: "Yes, contact us with your order reference and we'll adjust the pickup window where possible." },
  // { q: "Is there a delivery fee?", a: `A flat ${money(DELIVERY_FEE)} fee applies for pickup and delivery combined. ${DELIVERY_COVERAGE_NOTE} Drop off in store has no extra fee.` },
  { q: "Why do you ask for my phone number?", a: "So our team can call you the moment your order is ready or if anything needs confirming." },
];

function buildReceipt(order) {
  const clothLabel = CLOTHING_RATES.find((c) => c.id === order.clothType)?.label || order.clothType;
  const levelLabel = LAUNDRY_SERVICE_LEVELS.find((l) => l.id === order.level)?.label || order.level;
  const lines = [
    "🧺 New Laundry Order — Rainbow Wash",
    `Ref: ${order.id}`,
    `Items: ${clothLabel}`,
    `Weight: ${order.weight}kg × ${order.qty} load(s)`,
    `Service: ${levelLabel}`,
    `Fulfilment: ${order.fulfilment === "pickup" ? "Pickup & delivery" : "Drop off in store"}`,
  ];
  if (order.fulfilment === "pickup") {
    lines.push(`Address: ${order.address || "—"}`);
    lines.push(`Preferred: ${order.date || "—"} ${order.time || ""}`.trim());
  }
  lines.push(`Payment method: ${order.payment}`);
  lines.push(`Total: ${money(order.total)}`);
  lines.push(`Customer name: ${order.fullName}`);
  lines.push(`Customer phone: ${order.phone}`);
  lines.push(`Customer email: ${order.email || ":"}`);
  return lines.join("\n");
}

export default function OrderLaundry() {
  const { setLaundryOrders, notify } = useApp();

  const [clothType, setClothType] = useState("regular");
  const [weight, setWeight] = useState(3);
  const [qty, setQty] = useState(1);
  const [level, setLevel] = useState("washfold");
  const [fulfilment, setFulfilment] = useState("pickup");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [payment, setPayment] = useState("paystack");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [placed, setPlaced] = useState(null);

  const rate = CLOTHING_RATES.find((c) => c.id === clothType).rate;
  const mult = LAUNDRY_SERVICE_LEVELS.find((l) => l.id === level).multiplier;
  const base = Math.round(rate * weight * mult);
  const deliveryFee = fulfilment === "pickup" ? DELIVERY_FEE : 0;
  const total = base * qty + deliveryFee;

  const submit = () => {
    if (!fullName.trim()) {
      notify("Please add your full name");
      return;
    }
    if (!phone.trim()) {
      notify("Please add a phone number so we can call you when it's ready");
      return;
    }
    const order = {
      id: genRef("LND"),
      clothType, weight, qty, level, fulfilment, address, date, time, payment, fullName, phone, email,
      placedAt: new Date().toISOString(),
      archived: false,
      total, status: "Received",
    };
    setLaundryOrders((os) => [order, ...os]);
    setPlaced(order);
    notify(`Order ${order.id} placed : ${money(total)} via ${payment}`);
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
            A receipt has opened in WhatsApp to send to our team. We'll call {placed.phone} when it's ready —
            you can also follow status on the Track Order page.
          </p>
          <button className="rw-btn rw-btn-primary" style={{ marginTop: 18 }} onClick={() => setPlaced(null)}>
            Place another order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Order Laundry" subtitle="Tell us what you're washing, priced the same way we weigh it in store." />
      <div className="rw-section" style={{ paddingTop: 44 }}>
        <div className="rw-grid-2" style={{ alignItems: "flex-start" }}>
          <div className="rw-card">
            <div className="rw-field">
              <label>Clothes type</label>
              <select value={clothType} onChange={(e) => setClothType(e.target.value)}>
                {CLOTHING_RATES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label} — {money(c.rate)}/kg</option>
                ))}
              </select>
            </div>

            <div className="rw-form-grid">
              <div className="rw-field">
                <label>Estimated weight (kg)</label>
                <div className="rw-stepper">
                  <button onClick={() => setWeight((w) => Math.max(1, w - 0.5))}><Minus size={15} /></button>
                  <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{weight} kg</span>
                  <button onClick={() => setWeight((w) => Math.min(30, w + 0.5))}><Plus size={15} /></button>
                </div>
              </div>
              <div className="rw-field">
                <label>Number of loads</label>
                <div className="rw-stepper">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={15} /></button>
                  <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{qty}</span>
                  <button onClick={() => setQty((q) => q + 1)}><Plus size={15} /></button>
                </div>
              </div>
            </div>

            <div className="rw-field">
              <label>Service level</label>
              <div className="rw-pill-group">
                {LAUNDRY_SERVICE_LEVELS.map((l) => (
                  <button key={l.id} className={`rw-pill ${level === l.id ? "active" : ""}`} onClick={() => setLevel(l.id)}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

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
                <button className={`rw-pill ${payment === "paystack" ? "active" : ""}`} onClick={() => setPayment("paystack")}>Paystack</button>
                {/* <button className={`rw-pill ${payment === "flutterwave" ? "active" : ""}`} onClick={() => setPayment("flutterwave")}>Flutterwave</button> */}
                {/* <h5>Moniepoint 565423456777 <br /> Rainbow Wash Laundry </h5> */}
                <button className={`rw-pill ${payment === "bank" ? "active" : ""}`} onClick={() => setPayment("bank")}>Bank Transfer</button>
              </div>
            </div>

            <div className="rw-field">
              <label><User size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Full name</label>
              <input placeholder="e.g. Ada Obi" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="rw-field">
              <label><Phone size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Phone number (so we can call you when it's ready)</label>
              <input type="tel" placeholder="e.g. 0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="rw-field">
              <label><Mail size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Email (optional, for your receipt)</label>
              <input type="email" placeholder="e.g. you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="rw-card rw-summary" style={{ position: "sticky", top: 90 }}>
            <h3 style={{ marginBottom: 14 }}>Price estimate</h3>
            <div className="rw-summary-row"><span>Rate ({CLOTHING_RATES.find((c) => c.id === clothType).label})</span><span>{money(rate)}/kg</span></div>
            <div className="rw-summary-row"><span>Weight × loads</span><span>{weight}kg × {qty}</span></div>
            <div className="rw-summary-row"><span>Service level</span><span>×{mult}</span></div>
            <div className="rw-summary-row"><span>Delivery fee</span><span>{fulfilment === "pickup" ? money(deliveryFee) : "—"}</span></div>
            <div className="rw-summary-row total"><span>Total</span><span>{money(total)}</span></div>
            <button className="rw-btn rw-btn-rainbow" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={submit}>
              <CreditCard size={16} /> Pay & Place Order
            </button>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>
              Final weight is confirmed on our scale; your bill will be adjusted if it differs. A receipt opens in
              WhatsApp automatically so our team gets notified right away.
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

      <FAQ kicker="Questions" title="Order Laundry FAQ" items={ORDER_FAQ} />
    </div>
  );
}
