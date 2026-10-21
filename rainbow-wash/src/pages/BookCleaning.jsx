import { useEffect, useState } from "react";
import { CheckCircle2, Wallet, Phone, Mail, User, MessageCircle, Zap } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import { buildWhatsAppLink } from "../data/constants";
import { genRef } from "../utils/format";
import { useApp } from "../context/AppContext";


const BOOKING_STEPS = [
  { title: "Pick a service", desc: "Home, office, deep clean, or upholstery, choose what fits the job." },
  { title: "Choose size & slot", desc: "Tell us the property size and a date and time that works for you." },
  { title: "We confirm your price", desc: "We message or call you on WhatsApp with the exact price before anything is charged." },
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
  { name: "Luchi F.", role: "Home Cleaning", quote: "Our home gets cleaned every weekend by Rainbow Wash and cleaning service, now it sparkles every time." },
];

const BOOK_FAQ = [
  { q: "Why don't I see a price here?", a: "Cleaning jobs vary a lot by condition and access, so we confirm your exact price by WhatsApp or a quick call after you submit your request, before any payment is due." },
  { q: "Do I need to be home during the cleaning?", a: "Not necessarily, many customers provide access instructions. We'll confirm arrangements when we call to confirm your slot." },
  { q: "What's the difference between regular and deep cleaning?", a: "Regular cleaning covers everyday upkeep; deep cleaning includes baseboards, inside appliances, grout and other detail work." },
  { q: "Can I reschedule after booking?", a: "Yes, contact us at least a few hours before your slot and we'll move it to a new date and time." },
  { q: "Why do you ask for my phone number?", a: "So our team can call to confirm access, price and let you know when they're on the way." },
];

// Fallback cleaning options in case API/Context hasn't fetched them yet
const FALLBACK_SERVICES = [
  { id: "home", label: "Home Cleaning", sizes: [
    { id: "1bed", label: "1 - 2 Bedrooms" },
    { id: "3bed", label: "3 - 4 Bedrooms" },
    { id: "mansion", label: "5+ Bedrooms / Duplex" },
  ]},
  { id: "office", label: "Office Cleaning", sizes: [
    { id: "small", label: "Small Office / Workspace" },
    { id: "large", label: "Large Office Suite" },
  ]},
  { id: "deep", label: "Deep Cleaning", sizes: [
    { id: "standard", label: "Standard Deep Clean" },
    { id: "heavy", label: "Heavy Duty / Post-Construction" },
  ]},
  { id: "upholstery", label: "Upholstery Cleaning", sizes: [
    { id: "single", label: "Single item (chair/mattress)" },
    { id: "sofa", label: "3-seater sofa" },
    { id: "fullset", label: "Full living room set" },
  ]},
];

function buildReceipt(booking) {
  const lines = [
    "🧹 New Cleaning Booking, Rainbow Wash",
    `Ref: ${booking.id}`,
    `Service: ${booking.service}`,
    `Size: ${booking.size}`,
    `Date: ${booking.date || "—"} ${booking.time || ""}`.trim(),
    `Address: ${booking.address || "—"}`,
    `Payment method: ${booking.paymentMethod || "To be confirmed"}`,
    ];
  if (booking.express) lines.push(`Express (same-day) requested: Yes`);
  lines.push(`Customer name: ${booking.fullName}`);
  lines.push(`Customer phone: ${booking.phone}`);
  lines.push(`Customer email: ${booking.email || "—"}`);
  lines.push("Note: price to be confirmed by our team before payment.");
  return lines.join("\n");
}

export default function BookCleaning() {
  const { notify, cleaningServices } = useApp();

  const servicesList = (cleaningServices && cleaningServices.length > 0) ? cleaningServices : FALLBACK_SERVICES;
  const [service, setService] = useState(servicesList[0]?.id);
  const svc = servicesList.find((s) => s.id === service) || servicesList[0];
  const [size, setSize] = useState(svc?.sizes?.[0]?.id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("bank");
  const [express, setExpress] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [placed, setPlaced] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (svc?.sizes?.[0]?.id) {
      setSize(svc.sizes[0].id);
    }
  }, [service, svc]);

  const sizeObj = svc?.sizes?.find((s) => s.id === size) || svc?.sizes?.[0];
  // Cleaning prices are quoted by staff; no preset customer price is applied.
  const price = 0;
  const submit = () => {
    if (!fullName.trim()) {
      notify("Please add your full name");
      return;
    }
    if (!phone.trim()) {
      notify("Please add a phone number so we can reach you");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.com$/i.test(email.trim())) {
      notify("Please enter a valid email address ending in .com");
      return;
    }
    if (!date || !time || !address.trim()) {
      notify("Please provide your preferred date, time, and full address");
      return;
    }

    const localBooking = {
      id: genRef("CLN"),
      service: svc.label,
      size: sizeObj?.label,
      date, time, address, fullName: fullName.trim(),
      phone: phone.trim(), email: email.trim(),
      price: 0, payType: "full", payable: 0,
      paymentMethod: payment === "bank" ? "Transfer" : "POS",
      express,
      paymentStatus: "Pending",
      placedAt: new Date().toISOString(),
      archived: false,
      status: "Pending Quote",
    };

    setPlaced(localBooking);
    notify("Cleaning request prepared. Send the WhatsApp message so our team can confirm the price and booking.");
    window.open(buildWhatsAppLink(buildReceipt(localBooking)), "_blank");
  };

  if (placed) {
    return (
      <div className="rw-section" style={{ maxWidth: 560 }}>
        <div className="rw-card" style={{ textAlign: "center", padding: 40 }}>
          <CheckCircle2 size={44} color="#39B54A" style={{ marginBottom: 12 }} />
          <h2>Booking Request Received!</h2>
          <p style={{ color: "var(--ink-soft)", marginTop: 14 }}>
            We have received your booking details. Our team will contact you shortly to confirm price, availability, and provide your tracking number. Your order is pending final confirmation.
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
      <PageHeader title="Book a Cleaning" subtitle="Home, office, deep cleans and upholstery, pick a slot, we confirm your exact price via WhatsApp." />
      <div className="rw-section" style={{ paddingTop: 44 }}>
        <div className="rw-grid-2" style={{ alignItems: "flex-start" }}>
          <div className="rw-card">
            <div className="rw-field">
              <label>Service type</label>
              <div className="rw-pill-group">
                {servicesList.map((s) => (
                  <button key={s?.id} className={`rw-pill ${service === s?.id ? "active" : ""}`} onClick={() => setService(s?.id)}>
                    {s?.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rw-field">
              <label>Property / job size</label>
              <select value={size} onChange={(e) => setSize(e.target.value)}>
                {svc?.sizes?.map((s) => (
                  <option key={s?.id} value={s?.id}>{s?.label}</option>
                ))}
              </select>
            </div>
            <div className="rw-form-grid">
              <div className="rw-field">
                <label>Date</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="rw-field">
                <label>Time</label>
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div className="rw-field">
              <label>Location / address</label>
              <input required placeholder="Full address for our team" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="rw-field">
              <label>Payment method</label>
              <div className="rw-pill-group">
                <button type="button" className={`rw-pill ${payment === "bank" ? "active" : ""}`} onClick={() => setPayment("bank")}>Bank Transfer</button>
                <button type="button" className={`rw-pill ${payment === "pos" ? "active" : ""}`} onClick={() => setPayment("pos")}>POS</button>
              </div>
            </div>

            <div className="rw-field">
              <label><Zap size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Need it done today?</label>
              <div className="rw-pill-group">
                <button className={`rw-pill ${!express ? "active" : ""}`} onClick={() => setExpress(false)}>Standard scheduling</button>
                <button className={`rw-pill ${express ? "active" : ""}`} onClick={() => setExpress(true)}>Express (same-day)</button>
              </div>
              {express && (
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8 }}>
                  Noted, our team will factor same-day turnaround into the price they confirm with you on WhatsApp.
                </p>
              )}
            </div>

            {payment === "bank" ? (
              <div className="rw-summary" style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>Bank Transfer</h4>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  Our team will confirm the booking and price first. Bank account details will be provided through WhatsApp after confirmation. Please wait for the team's instructions before making a transfer.
                </p>
              </div>
            ) : (
              <div className="rw-summary" style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>POS</h4>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  Select POS if you prefer to pay by POS. Our team will confirm the payment arrangements with you after reviewing your booking.
                </p>
              </div>
            )}

            <div className="rw-field">
              <label><User size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Full name</label>
              <input placeholder="e.g. Ada Obi" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="rw-field">
              <label><Phone size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Phone number (so we can call to confirm)</label>
              <input type="tel" placeholder="e.g. 0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="rw-field">
              <label><Mail size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Email * (for your receipt)</label>
              <input type="email" required autoComplete="email" placeholder="e.g. you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="rw-card rw-summary" style={{ position: "sticky", top: 90 }}>
            <h3 style={{ marginBottom: 14 }}>Booking summary</h3>
            <div className="rw-summary-row"><span>Service</span><span>{svc?.label}</span></div>
           <div className="rw-summary-row"><span>Payment method</span><span>{payment === "bank" ? "Bank Transfer" : "POS"}</span></div>
            {express && <div className="rw-summary-row"><span>Turnaround</span><span style={{ fontWeight: 700, color: "var(--blue)" }}>Express (same-day)</span></div>}
            <div style={{ background: "var(--ice)", borderRadius: 12, padding: 14, marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <MessageCircle size={18} color="var(--blue)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
                Price will be confirmed via WhatsApp or a call before any payment is due, nothing is charged automatically.
              </p>
            </div>
            <button className="rw-btn rw-btn-rainbow" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={submit} disabled={submitting}>
              <Wallet size={16} /> {submitting ? "Sending..." : "Request Booking"}
            </button>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
              A request opens in WhatsApp automatically so our team gets notified right away.
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

      <FAQ kicker="Booking FAQ" title="Booking FAQ" items={BOOK_FAQ} />
    </div>
  );
}