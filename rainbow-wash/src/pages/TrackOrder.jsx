import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, CheckCircle2, Circle, Bell, MessageCircle, Phone } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import FAQ from "../components/FAQ";
import { TRACK_STAGES } from "../data/constants";
import { money } from "../utils/format";
import { useApp } from "../context/AppContext";

const TRACK_STEPS = [
  { title: "Received", desc: "Your items have arrived at Rainbow Wash and are logged against your reference." },
  { title: "Washing", desc: "Sorted, weighed and in process, wash, iron, or dry clean, depending on your order." },
  { title: "Completed", desc: "Finished, checked and packed, ready for pickup or the next delivery run." },
  { title: "Delivered", desc: "Handed over, picked up in-store or delivered to your address." },
];

const TRACK_FAQ = [
  { q: "How often does the status update?", a: "As soon as staff move your order to the next stage in our system, usually within the timeframes shown on the Order Laundry page." },
  { q: "Will I be notified automatically?", a: "Once the backend notification system is live, you'll get an SMS or email whenever your status changes. For now, check this page with your reference." },
  { q: "I lost my reference number, what do I do?", a: "Contact us on WhatsApp or phone with your name and approximate drop-off time and we'll look it up." },
];

export default function TrackOrder() {
  const { laundryOrders } = useApp();
  const [query, setQuery] = useState("");

  const found = laundryOrders.find((o) => o.id.toLowerCase() === query.trim().toLowerCase());
  const stageIndex = found ? TRACK_STAGES.indexOf(found.status) : -1;

  return (
    <div>
      <PageHeader title="Track Your Order" subtitle="Enter the reference number you received when you placed your laundry order." />
      <div className="rw-section" style={{ maxWidth: 720, paddingBottom: 40 }}>
        <div className="rw-card">
          <div style={{ display: "flex", gap: 10 }}>
            <input placeholder="e.g. LND-4821" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="rw-btn rw-btn-primary"><Search size={16} /></button>
          </div>

          {query && !found && (
            <p style={{ color: "var(--bad)", marginTop: 16, fontSize: 14.5 }}>
              No order found with that reference. Try one of the demo IDs below, or place a new order.
            </p>
          )}

          {found && (
            <>
              <div className="rw-track-row">
                {TRACK_STAGES.map((stage, idx) => (
                  <div key={stage} style={{ display: "flex", alignItems: "center", flex: idx < TRACK_STAGES.length - 1 ? 1 : "unset" }}>
                    <div className="rw-track-step">
                      <div className={`rw-track-circle ${idx < stageIndex ? "done" : idx === stageIndex ? "current" : ""}`}>
                        {idx < stageIndex ? <CheckCircle2 size={22} /> : idx === stageIndex ? <Circle size={22} fill="currentColor" /> : <Circle size={20} />}
                      </div>
                      <div className={`rw-track-label ${idx <= stageIndex ? "active" : ""}`}>{stage}</div>
                    </div>
                    {idx < TRACK_STAGES.length - 1 && <div className={`rw-track-line ${idx < stageIndex ? "done" : ""}`} />}
                  </div>
                ))}
              </div>
              <div className="rw-summary" style={{ marginTop: 10 }}>
                <div className="rw-summary-row"><span>Reference</span><span className="mono">{found.id}</span></div>
                <div className="rw-summary-row"><span>Items</span><span style={{ textAlign: "right", maxWidth: 260 }}>{found.items ? found.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—"}</span></div>
                <div className="rw-summary-row total"><span>Total</span><span>{money(found.total)}</span></div>
              </div>
            </>
          )}

          {!query && (
            <div style={{ marginTop: 18 }}>
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 9 }}>Demo references you can try:</p>
              <div className="rw-pill-group">
                {laundryOrders.slice(0, 4).map((o) => (
                  <button key={o.id} className="rw-pill" onClick={() => setQuery(o.id)}>{o.id}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Steps kicker="What each stage means" title="Understanding your order status" steps={TRACK_STEPS} />

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-cta-band">
          <div>
            <h3><Bell size={20} style={{ verticalAlign: -3, marginRight: 6 }} />Notifications are coming soon</h3>
            <p>Once connected to our backend, you'll get an SMS or email the moment your status changes, no need to keep checking.</p>
          </div>
          <Link to="/order-laundry" className="rw-btn rw-btn-rainbow">Place an order</Link>
        </div>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-grid-2">
          <div className="rw-card" style={{ textAlign: "center" }}>
            <MessageCircle size={26} color="var(--blue)" style={{ marginBottom: 10 }} />
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>Chat with us</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>WhatsApp us your reference for a quick status check.</p>
          </div>
          <div className="rw-card" style={{ textAlign: "center" }}>
            <Phone size={26} color="var(--blue)" style={{ marginBottom: 10 }} />
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>Call the shop</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>0812 140 6293 or 0916 589 6730, during opening hours.</p>
          </div>
        </div>
      </div>

      <FAQ kicker="Questions" title="Tracking FAQ" items={TRACK_FAQ} />
    </div>
  );
}
