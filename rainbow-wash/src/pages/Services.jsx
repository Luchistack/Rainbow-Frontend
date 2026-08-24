import { Link } from "react-router-dom";
import { Shirt, Sparkles, Truck, Home as HomeIcon, Package, MessageCircle, Star } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import { buildWhatsAppLink, SUBSCRIPTION_PLANS } from "../data/constants";
import { money } from "../utils/format";
import { useApp } from "../context/AppContext";

const SERVICES = [
  { icon: Shirt, color: "#27AAE1", title: "Self Wash", desc: "Bring your laundry and use our machines yourself at a discounted rate." },
  { icon: Sparkles, color: "#F7941D", title: "Washing & Ironing", desc: "Full wash, dry and press service, folded and ready to wear." },
  { icon: Truck, color: "#39B54A", title: "Express Wash", desc: "Same day turnaround for when you need it back in a hurry." },
  { icon: HomeIcon, color: "#8E44AD", title: "Cleaning Services", desc: "Home, office and deep cleaning carried out by trained staff." },
  { icon: Package, color: "#EF4136", title: "Upholstery", desc: "Sofas, chairs, car interiors and mattresses steam cleaned on site." },
  { icon: Truck, color: "#4fb3e8", title: "Pickup & Delivery", desc: "We collect and return your laundry to your doorstep." },
  { icon: Sparkles, color: "#FFCE33", title: "Dry Cleaning", desc: "Gentle, professional care for delicate and formal garments." },
];

const PROCESS = [
  { title: "Choose a service", desc: "Laundry by weight or item, or a cleaning appointment for home, office or upholstery." },
  { title: "Set your schedule", desc: "Drop off in store, or pick a pickup window that fits your day." },
  { title: "We do the work", desc: "Weighed, washed, pressed or deep cleaned by trained staff, start to finish." },
  { title: "Pay and track", desc: "Pay online via Paystack, Flutterwave or bank transfer, then track live status." },
];

const SERVICES_TESTIMONIALS = [
  { name: "Ada N.", role: "Wash & Iron customer", quote: "My shirts come back pressed better than my own ironing ever managed. Worth every naira." },
  { name: "Chuka I.", role: "Deep Cleaning customer", quote: "Booked a deep clean before hosting family, the team was thorough and fast." },
  { name: "Grace M.", role: "Upholstery customer", quote: "Our office sofas looked brand new after the upholstery treatment. Booking again for next quarter." },
];

const SERVICES_FAQ = [
  { q: "How is my laundry priced?", a: "By weight for Self Wash and Staff Wash, or per item for dry cleaning and shoe/leather care, the exact same prices shown on the Order Laundry page." },
  { q: "How fast is delivery?", a: "Same day or next day delivery, depending on when your items are dropped off and the service selected." },
  { q: "Can I book cleaning and order laundry in one trip?", a: "Yes, place a laundry order and a cleaning booking separately; both are tracked from the same account." },
  { q: "Is there a minimum order for pickup and delivery?", a: "No fixed minimum, but a flat delivery fee applies per pickup/delivery run, shown before you pay." },
];

export default function Services() {
  const { selfWashRates, staffWashRates, dryCleanItems, shoeCareItems, cleaningServices } = useApp();

  const subscribeLink = (plan) =>
    buildWhatsAppLink(`Hi Rainbow Wash, I'd like to subscribe to the ${plan.name} plan (${money(plan.price)}, ${plan.duration}).`);
  const cleaningQuoteLink = buildWhatsAppLink("Hi Rainbow Wash, I'd like a price quote for a cleaning service.");

  return (
    <div>
      <PageHeader title="Our Services" subtitle="Need extra clean laundry services? We've got you covered." />

      <div className="rw-section">
        <div className="rw-grid-3">
          {SERVICES.map((s) => (
            <div className="rw-card rw-svc-card" key={s.title}>
              <div className="rw-card-icon" style={{ background: s.color + "1c" }}>
                <s.icon size={22} color={s.color} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <Steps kicker="How booking works" title="From drop off to delivery" steps={PROCESS} />

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-section-head">
          <div className="rw-kicker">Laundry pricing</div>
          <h2>Self Wash & Staff Wash, per kg</h2>
          <p>Self Wash: you use the machines. Staff Wash: we do it for you. 5% off any Self Wash line of 5kg or more.</p>
        </div>
        <div className="rw-grid-2">
          <div className="rw-card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Self Wash</h3>
            {selfWashRates.map((r) => (
              <div key={r.id} className="rw-summary-row"><span>{r.label}</span><span style={{ fontWeight: 700, color: "var(--navy)" }}>{money(r.price)}/kg</span></div>
            ))}
          </div>
          <div className="rw-card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Staff Wash</h3>
            {staffWashRates.map((r) => (
              <div key={r.id} className="rw-summary-row"><span>{r.label}</span><span style={{ fontWeight: 700, color: "var(--navy)" }}>{money(r.price)}/kg</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-section-head">
          <div className="rw-kicker">Dry cleaning & garment care</div>
          <h2>Priced per item, Regular or Deep Clean</h2>
        </div>
        <div className="rw-grid-2">
          <div className="rw-card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Dry Cleaning</h3>
            {dryCleanItems.map((i) => (
              <div key={i.id} className="rw-summary-row"><span>{i.label}</span><span style={{ fontWeight: 700, color: "var(--navy)" }}>{money(i.regular)} – {money(i.deep)}</span></div>
            ))}
          </div>
          <div className="rw-card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Shoe & Leather Care</h3>
            {shoeCareItems.map((i) => (
              <div key={i.id} className="rw-summary-row"><span>{i.label}</span><span style={{ fontWeight: 700, color: "var(--navy)" }}>{money(i.regular)} – {money(i.deep)}</span></div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 12 }}>
          Full price list, including minor repairs and add-on products, is available on the Order Laundry page.
        </p>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-section-head">
          <div className="rw-kicker">Cleaning pricing</div>
          <h2>Home, office, deep clean & upholstery</h2>
          <p>Every property and job is different, so pricing here is confirmed by WhatsApp or a quick call, never a surprise on the day.</p>
        </div>
        <div className="rw-grid-2">
          {cleaningServices.map((s) => (
            <div className="rw-card" key={s.id}>
              <h3 style={{ fontSize: 17, marginBottom: 12 }}>{s.label}</h3>
              {s.sizes.map((sz) => (
                <div key={sz.id} className="rw-summary-row">
                  <span>{sz.label}</span>
                  <span style={{ fontWeight: 700, color: "var(--blue)", fontSize: 13 }}>Price via WhatsApp</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href={cleaningQuoteLink} target="_blank" rel="noopener noreferrer" className="rw-btn rw-btn-ghost">
            <MessageCircle size={16} /> Ask for a price on WhatsApp
          </a>
        </div>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-section-head">
          <div className="rw-kicker">Subscription plans</div>
          <h2>Laundry on a schedule</h2>
          <p>Subscribe once, we handle the rest, no need to place a fresh order every time. Sign up via WhatsApp.</p>
        </div>
        <div className="rw-grid-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div className="rw-card" key={plan.id} style={{ textAlign: "center" }}>
              <Star size={20} color="var(--blue)" style={{ marginBottom: 10 }} />
              <h3 style={{ fontSize: 18 }}>{plan.name}</h3>
              <div className="rw-price" style={{ fontSize: 26, margin: "10px 0" }}>{money(plan.price)}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10 }}>{plan.duration}</div>
              <p style={{ fontSize: 14, color: "var(--ink)", marginBottom: 16 }}>{plan.covers}</p>
              <a href={subscribeLink(plan)} target="_blank" rel="noopener noreferrer" className="rw-btn rw-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <MessageCircle size={15} /> Subscribe via WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>

      <Testimonials kicker="Real results" title="What customers say about our services" items={SERVICES_TESTIMONIALS} />

      <FAQ kicker="Common questions" title="Services FAQ" items={SERVICES_FAQ} />

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-cta-band">
          <div>
            <h3>Ready to get started?</h3>
            <p>Place a laundry order or book a cleaning appointment in under two minutes.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/order-laundry" className="rw-btn rw-btn-rainbow">Order Laundry</Link>
            <Link
              to="/book-cleaning"
              className="rw-btn rw-btn-ghost"
              style={{ background: "rgba(255,255,255,.06)", color: "#fff", borderColor: "rgba(255,255,255,.25)" }}
            >
              Book Cleaning
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
