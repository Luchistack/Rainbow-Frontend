import { Link } from "react-router-dom";
import { ChevronRight, Shirt, Sparkles, Truck, Home as HomeIcon, Package, Clock, ShieldCheck, Wallet, Smartphone } from "lucide-react";
import Hero from "../components/Hero";
import Steps from "../components/Steps";
import Testimonials from "../components/Testimonials";
import FeatureGrid from "../components/FeatureGrid";
import PhotoFeature from "../components/PhotoFeature";
import { PRODUCTS, DELIVERY_FEE, DELIVERY_COVERAGE_NOTE } from "../data/constants";
import { money } from "../utils/format";
import washersPhoto from "../assets/feature-washers.jpg";

const SERVICES_PREVIEW = [
  { icon: Shirt, color: "#27AAE1", title: "Self Wash", desc: "Bring your laundry and use our machines yourself at a discounted rate." },
  { icon: Sparkles, color: "#F7941D", title: "Washing & Ironing", desc: "Full wash, dry and press service, folded and ready to wear." },
  { icon: Truck, color: "#39B54A", title: "Express Wash", desc: "Same day turnaround for when you need it back in a hurry." },
  { icon: HomeIcon, color: "#8E44AD", title: "Cleaning Services", desc: "Home, office and deep cleaning carried out by trained staff." },
  { icon: Package, color: "#EF4136", title: "Upholstery", desc: "Sofas, chairs, car interiors and mattresses steam cleaned on site." },
  { icon: Truck, color: "#4fb3e8", title: "Pickup & Delivery", desc: "We collect and return your laundry to your doorstep." },
];

const HOW_IT_WORKS = [
  { title: "Book online", desc: "Choose laundry, cleaning or a shop order and tell us what you need in under two minutes." },
  { title: "We collect", desc: "Drop off in-store or let our rider pick up from your home or office at a time that suits you." },
  { title: "We work our magic", desc: "Your items are weighed, washed, cleaned or packed by trained staff, no guesswork, no shortcuts." },
  { title: "Delivered & tracked", desc: "Watch status move from Received to Out for Delivery, right from your phone." },
];

const WHY_US = [
  { icon: Clock, color: "#27AAE1", title: "Same Day Express", desc: "Need it back today? Our express option has you covered." },
  { icon: Wallet, color: "#F7941D", title: "Fair, Transparent Pricing", desc: "Priced by weight, just like on our in store scale, no surprise charges." },
  { icon: ShieldCheck, color: "#39B54A", title: "Spotless Guarantee", desc: "Not happy with a wash or clean? We'll make it right, free of charge." },
  { icon: Smartphone, color: "#8E44AD", title: "Track From Your Phone", desc: "Real-time status updates from drop-off to doorstep delivery." },
];

const TESTIMONIALS = [
  { name: "Bukola A.", role: "Maryland, Lagos", quote: "I schedule pickup on my way to work and my clothes are back, folded and fresh, by the next evening. Genuinely changed my week." },
  { name: "Emeka O.", role: "Office manager, Ikeja", quote: "We use Rainbow Wash for our office upholstery every quarter. Always on time, always thorough." },
  { name: "Tosin F.", role: "Mende, Lagos", quote: "The tracking page is such a small thing but it means I stop calling to ask 'is it ready yet?' Love it." },
];

export default function Home() {
  return (
    <div>
      <Hero />

      <div className="rw-section">
        <div className="rw-section-head">
          <div className="rw-kicker">What we do</div>
          <h2>Everything your laundry needs, in one place</h2>
          <p>From an everyday wash to full home deep cleaning, pick a service and we'll handle the rest.</p>
        </div>
        <div className="rw-grid-3">
          {SERVICES_PREVIEW.map((s) => (
            <div className="rw-card rw-svc-card" key={s.title}>
              <div className="rw-card-icon" style={{ background: s.color + "1c" }}>
                <s.icon size={22} color={s.color} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link to="/services" className="rw-btn rw-btn-ghost">See all services <ChevronRight size={16} /></Link>
        </div>
      </div>

      <Steps
        kicker="How it works"
        title="Four steps from hamper to doorstep"
        subtitle="Whether it's laundry, a full home clean, or a shop order, the process is the same simple flow."
        steps={HOW_IT_WORKS}
      />

      <PhotoFeature
        image={washersPhoto}
        alt="Rainbow Wash laundromat with rows of washing machines"
        kicker="Inside the laundromat"
        title="Modern machines, careful hands"
        text="Every load runs through commercial grade washers and dryers, sorted by fabric and colour, and checked by staff before it's ever bagged for delivery."
        points={[
          "Fabric safe detergents for delicates and colours",
          "Machines cleaned and serviced regularly",
          "Every item logged against your order reference",
        ]}
      />

      <FeatureGrid
        kicker="Why Rainbow Wash"
        title="Built around your schedule, not ours"
        items={WHY_US}
      />

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-cta-band">
          <div>
            <h3>Track your order in real time</h3>
            <p>Received → Washing → Ready → Out for delivery. No calling to check up.</p>
          </div>
          <Link to="/track-order" className="rw-btn rw-btn-rainbow">Track an order</Link>
        </div>
      </div>

      <div className="rw-section" style={{ paddingTop: 0 }}>
        <div className="rw-section-head">
          <div className="rw-kicker">In the shop</div>
          <h2>Laundry essentials, delivered</h2>
          <p>Delivery is a flat {money(DELIVERY_FEE)}. {DELIVERY_COVERAGE_NOTE}</p>
        </div>
        <div className="rw-grid-4">
          {PRODUCTS.slice(0, 4).map((p) => (
            <div className="rw-card" key={p.id}>
              <div className="rw-product-thumb"><Package size={26} /></div>
              <h3 style={{ fontSize: 15 }}>{p.name}</h3>
              <div className="rw-price" style={{ marginTop: 6 }}>{money(p.price)}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link to="/shop" className="rw-btn rw-btn-primary">Visit the shop</Link>
        </div>
      </div>

      <Testimonials
        kicker="Customers say"
        title="Trusted around Mende Maryland"
        items={TESTIMONIALS}
      />
    </div>
  );
}
