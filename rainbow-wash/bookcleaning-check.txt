import { useEffect, useState } from "react";
import { CheckCircle2, Wallet, Phone, Mail, User, MessageCircle, Landmark, Copy, Zap } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import { buildWhatsAppLink, BANK_DETAILS } from "../data/constants";
import { money, genRef } from "../utils/format";
import { useApp } from "../context/AppContext";
import { createBooking } from "../api/api";


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
  {
    id: "home",
    label: "Home Cleaning",
    sizes: [
      { id: "1bed", label: "1 - 2 Bedrooms", price: 15000 },
      { id: "3bed", label: "3 - 4 Bedrooms", price: 25000 },
      { id: "mansion", label: "5+ Bedrooms / Duplex", price: 40000 },
    ]
  },
  {
    id: "office",
    label: "Office Cleaning",
    sizes: [
      { id: "small", label: "Small Office / Workspace", price: 20000 },
      { id: "large", label: "Large Office Suite", price: 45000 },
    ]
  },
  {
    id: "deep",
    label: "Deep Clean",
    sizes: [
      { id: "standard", label: "Standard Deep Clean", price: 35000 },
      { id: "heavy", label: "Heavy Duty / Post-Construction", price: 60000 },
    ]
  }
];

function buildReceipt(booking) {
  const lines = [
    "🧹 New Cleaning Booking, Rainbow Wash",
    `Ref: ${booking.id}`,
    `Service: ${booking.service}`,
    `Size: ${booking.size}`,
    `Date: ${booking.date || "—"} ${booking.time || ""}`.trim(),
    `Address: ${booking.address || "—"}`,
    `Requested payment split: ${booking.payType === "deposit" ? "70% deposit now, balance on completion" : "Full payment"}`,
    ];
  if (booking.transferNote) lines.push(`Transfer note: ${booking.transferNote}`);
  if (booking.express) lines.push(`Express (same-day) requested: Yes`);
  lines.push(`Customer name: ${booking.fullName}`);
  lines.push(`Customer phone: ${booking.phone}`);
  lines.push(`Customer email: ${booking.email || "—"}`);
  lines.push("Note: price to be confirmed by our team before payment.");
  return lines.join("\n");
}

export default function BookCleaning() {
  const { setBookings, notify, cleaningServices } = useApp();

  const servicesList = (cleaningServices && cleaningServices.length > 0) ? cleaningServices : FALLBACK_SERVICES;
  const [service, setService] = useState(servicesList[0]?.id);
  const svc = servicesList.find((s) => s.id === service) || servicesList[0];
  const [size, setSize] = useState(svc?.sizes?.[0]?.id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [payType, setPayType] = useState("deposit");
  const [express, setExpress] = useState(false);
  const [transferNote, setTransferNote] = useState("");
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
  const price = sizeObj?.price || 0;
  const deposit = Math.round(price * 0.3);
  const payable = payType === "deposit" ? deposit : price;

  const copyAccount = () => {
    navigator.clipboard?.writeText(BANK_DETAILS.accountNumber);
    notify("Account number copied");
  };

  const submit = async () => {
    if (!fullName.trim()) {
      notify("Please add your full name");
      return;
    }
    if (!phone.trim()) {
      notify("Please add a phone number so we can reach you");
      return;
    }

    const localBooking = {
      id: genRef("CLN"),
      service: svc.label,
      size: sizeObj?.label,
      date, time, address, fullName, phone, email, price, payType, payable, express,
      transferNote,
      paymentStatus: "Pending",
      placedAt: new Date().toISOString(),
      archived: false,
      status: "Pending Quote",
    };

    setSubmitting(true);
    let booking = localBooking;

    try {
      const saved = await createBooking(localBooking);
      // Use the backend's real reference so the number on screen matches Postgres
      booking = { ...localBooking, id: saved.referenceId || localBooking.id };
    } catch (error) {
      console.error("Failed to sync booking to backend:", error);
      notify("We couldn't save your booking to our system, please still send the WhatsApp message and mention this so our team can confirm manually.");
    } finally {
      setSubmitting(false);
    }

    setBookings((bs) => [booking, ...bs]);
    setPlaced(booking);
    notify(`Booking ${booking.id} requested, we'll confirm your price on WhatsApp`);
    window.open(buildWhatsAppLink(buildReceipt(booking)), "_blank");
  };

  if (placed) {
    return (
      <div className="rw-section" style={{ maxWidth: 560 }}>
        <div className="rw-card" style={{ textAlign: "center", padding: 40 }}>
          <CheckCircle2 size={44} color="#39B54A" style={{ marginBottom: 12 }} />
          <h2>Booking requested!</h2>
          <p style={{ color: "var(--ink-soft)", margin: "10px 0 4px" }}>Booking reference</p>
          <div className="mono" style={{ fontSize: 23, fontWeight: 700, color: "var(--navy)" }}>{placed.id}</div>
          <p style={{ color: "var(--ink-soft)", marginTop: 14 }}>
            A request has opened in WhatsApp, our team will confirm your exact price there, then arrive at{" "}
            {placed.address || "the provided address"} on {placed.date || "the selected date"} once payment is sorted.
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
              <label>Preferred payment split</label>
              <div className="rw-pill-group">
                <button className={`rw-pill ${payType === "deposit" ? "active" : ""}`} onClick={() => setPayType("deposit")}>70% deposit</button>
                <button className={`rw-pill ${payType === "full" ? "active" : ""}`} onClick={() => setPayType("full")}>Pay in full</button>
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

            <div className="rw-summary" style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Landmark size={15} /> If paying by bank transfer
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
              <div className="rw-field" style={{ marginTop: 12, marginBottom: 0 }}>
                <label style={{ fontSize: 12.5 }}>Note for our team (optional)</label>
                <textarea rows={2} placeholder="Any detail so we can confirm your payment" value={transferNote} onChange={(e) => setTransferNote(e.target.value)} />
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
            <div className="rw-summary-row"><span>Service</span><span>{svc?.label}</span></div>
            <div className="rw-summary-row"><span>Payment split</span><span>{payType === "deposit" ? "70% deposit" : "Full payment"}</span></div> <div className="rw-summary-row"><span>Payment split</span><span>{payType === "deposit" ? "30% / 70%" : "Full"}</span></div>
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