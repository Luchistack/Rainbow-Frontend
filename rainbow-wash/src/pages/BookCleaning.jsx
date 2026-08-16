import { useEffect, useState } from "react";
import { CheckCircle2, Wallet, Phone, Mail, User } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import { CLEANING_SERVICES, buildWhatsAppLink } from "../data/constants";
import { money, genRef } from "../utils/format";
import { useApp } from "../context/AppContext";

const BOOKING_STEPS = [
  { title: "Pick a service", desc: "Home, office, deep clean, or upholstery, choose what fits the job." },
  { title: "Choose size & slot", desc: "Tell us the property size and a date and time that works for you." },
  { title: "Pay online", desc: "30% deposit or pay in full via Paystack, Flutterwave or bank transfer." },
  { title: "We show up & clean", desc: "Trained staff arrive with equipment and complete the job to our spotless standard." },
];

const INCLUDED = [
  "Dusting, sweeping and mopping of all floors",
  "Kitchen surfaces, sink and stovetop wiped down",
  "Bathroom cleaning and sanitising",
  "Trash removal and bin liners replaced",
  "Upholstery spot-checked on request",
];

const BOOK_TESTIMONIALS = [
  { name: "Nkechi P.", role: "Home Cleaning, 2-Bed", quote: "Booked in the morning, cleaners arrived by afternoon. House felt brand new." },
  { name: "David A.", role: "Office Cleaning", quote: "Our small office gets cleaned every Friday now, consistent and professional every time." },
];

const BOOK_FAQ = [
  { q: "Do I need to be home during the cleaning?", a: "Not necessarily, many customers provide access instructions. We'll confirm arrangements when we call to confirm your slot." },
  { q: "What's the difference between regular and deep cleaning?", a: "Regular cleaning covers everyday upkeep; deep cleaning includes baseboards, inside appliances, grout and other detail work." },
  { q: "Can I reschedule after booking?", a: "Yes, contact us at least a few hours before your slot and we'll move it to a new date and time." },
  { q: "Why do you ask for my phone number?", a: "So our team can call to confirm access and let you know when they're on the way." },
];

function buildReceipt(booking) {
  return [
    "🧹 New Cleaning Booking, Rainbow Wash",
    `Ref: ${booking.id}`,
    `Service: ${booking.service}`,
    `Size: ${booking.size}`,
    `Date: ${booking.date || "—"} ${booking.time || ""}`.trim(),
    `Address: ${booking.address || "—"}`,
    `Payment: ${booking.payType === "deposit" ? "30% deposit" : "Full payment"}, ${money(booking.payable)}`,
    `Customer name: ${booking.fullName}`,
    `Customer phone: ${booking.phone}`,
    `Customer email: ${booking.email || "—"}`,
  ].join("\n");
}

export default function BookCleaning() {
  const { setBookings, notify } = useApp();

  const [service, setService] = useState(CLEANING_SERVICES[0].id);
  const svc = CLEANING_SERVICES.find((s) => s.id === service);
  const [size, setSize] = useState(svc.sizes[0].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [payType, setPayType] = useState("deposit");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    setSize(svc.sizes[0].id);
  }, [service]);

  const sizeObj = svc.sizes.find((s) => s.id === size) || svc.sizes[0];
  const price = sizeObj.price;
  const deposit = Math.round(price * 0.3);
  const payable = payType === "deposit" ? deposit : price;

  const submit = () => {
    if (!fullName.trim()) {
      notify("Please add your full name");
      return;
    }
    if (!phone.trim()) {
      notify("Please add a phone number so we can reach you");
      return;
    }
    const booking = {
      id: genRef("CLN"),
      service: svc.label,
      size: sizeObj.label,
      date, time, address, fullName, phone, email, price, payType, payable,
      placedAt: new Date().toISOString(),
      archived: false,
      status: "Confirmed",
    };
    setBookings((bs) => [booking, ...bs]);
    setPlaced(booking);
    notify(`Booking ${booking.id} confirmed, ${money(payable)} paid`);
    window.open(buildWhatsAppLink(buildReceipt(booking)), "_blank");
  };

  if (placed) {
    return (
      <div className="rw-section" style={{ maxWidth: 560 }}>
        <div className="rw-card" style={{ textAlign: "center", padding: 40 }}>
          <CheckCircle2 size={44} color="#39B54A" style={{ marginBottom: 12 }} />
          <h2>Cleaning booked!</h2>
          <p style={{ color: "var(--ink-soft)", margin: "10px 0 4px" }}>Booking reference</p>
          <div className="mono" style={{ fontSize: 23, fontWeight: 700, color: "var(--navy)" }}>{placed.id}</div>
          <p style={{ color: "var(--ink-soft)", marginTop: 14 }}>
            A receipt has opened in WhatsApp to send to our team. Our team will call {placed.phone} and arrive at{" "}
            {placed.address || "the provided address"} on {placed.date || "the selected date"}.
          </p>
          <button className="rw-btn rw-btn-primary" style={{ marginTop: 18 }} onClick={() => setPlaced(null)}>
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Book a Cleaning" subtitle="Home, office, deep cleans and upholstery, pick a slot that works for you." />
      <div className="rw-section" style={{ paddingTop: 44 }}>
        <div className="rw-grid-2" style={{ alignItems: "flex-start" }}>
          <div className="rw-card">
            <div className="rw-field">
              <label>Service type</label>
              <div className="rw-pill-group">
                {CLEANING_SERVICES.map((s) => (
                  <button key={s.id} className={`rw-pill ${service === s.id ? "active" : ""}`} onClick={() => setService(s.id)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rw-field">
              <label>Property / job size</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {svc.sizes.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}, {money(s.price)}</option>
                ))}
              </select>
            </div>
            <div className="rw-form-grid">
              <div className="rw-field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="rw-field">
                <label>Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="rw-field">
              <label>Location / address</label>
              <input placeholder="Full address for our team" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="rw-field">
              <label>Payment</label>
              <div className="rw-pill-group">
                <button className={`rw-pill ${payType === "deposit" ? "active" : ""}`} onClick={() => setPayType("deposit")}>Pay 30% deposit</button>
                <button className={`rw-pill ${payType === "full" ? "active" : ""}`} onClick={() => setPayType("full")}>Pay in full</button>
              </div>
            </div>
            <div className="rw-field">
              <label><User size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Full name</label>
              <input placeholder="e.g. Ada Obi" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="rw-field">
              <label><Phone size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Phone number (so we can call to confirm)</label>
              <input type="tel" placeholder="e.g. 0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="rw-field">
              <label><Mail size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Email (optional, for your receipt)</label>
              <input type="email" placeholder="e.g. you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="rw-card rw-summary" style={{ position: "sticky", top: 90 }}>
            <h3 style={{ marginBottom: 14 }}>Booking summary</h3>
            <div className="rw-summary-row"><span>Service</span><span>{svc.label}</span></div>
            <div className="rw-summary-row"><span>Size</span><span>{sizeObj.label}</span></div>
            <div className="rw-summary-row"><span>Full price</span><span>{money(price)}</span></div>
            <div className="rw-summary-row total">
              <span>{payType === "deposit" ? "Deposit due now" : "Total due now"}</span>
              <span>{money(payable)}</span>
            </div>
            <button className="rw-btn rw-btn-rainbow" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={submit}>
              <Wallet size={16} /> Confirm & Pay
            </button>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>
              A receipt opens in WhatsApp automatically so our team gets notified right away.
            </p>
          </div>
        </div>
      </div>

      <Steps kicker="How it works" title="Booking a cleaning, step by step" steps={BOOKING_STEPS} />

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-card">
          <h3 style={{ marginBottom: 16 }}>What's included in a standard clean</h3>
          <ul className="rw-check-list">
            {INCLUDED.map((i) => (
              <li key={i}><CheckCircle2 size={18} /> {i}</li>
            ))}
          </ul>
        </div>
      </div>

      <Testimonials kicker="Recent bookings" title="What customers say" items={BOOK_TESTIMONIALS} />

      <FAQ kicker="Questions" title="Booking FAQ" items={BOOK_FAQ} />
    </div>
  );
}
