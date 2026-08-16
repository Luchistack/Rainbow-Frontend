import { Package, AlertTriangle, CheckCircle2, Plus, Truck, ShieldCheck, Wallet, RefreshCw } from "lucide-react";
import PageHeader from "../components/PageHeader";
import FeatureGrid from "../components/FeatureGrid";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import { useApp } from "../context/AppContext";
import { money } from "../utils/format";

const WHY_SHOP = [
  { icon: Truck, color: "#27AAE1", title: "Delivery or Pickup", desc: "Have it delivered with your next laundry order, or grab it in-store." },
  { icon: ShieldCheck, color: "#39B54A", title: "Trusted Brands", desc: "The same products we use on your laundry, sold by the bottle." },
  { icon: Wallet, color: "#F7941D", title: "Fair Pricing", desc: "No markup games, the price you see is the price you pay." },
  { icon: RefreshCw, color: "#8E44AD", title: "Always Restocked", desc: "We track stock closely so popular items rarely run out." },
];

const SHOP_TESTIMONIALS = [
  { name: "Ifeoma K.", role: "Repeat shop customer", quote: "I add detergent to my laundry order every month, arrives together, one delivery fee." },
  { name: "Samuel T.", role: "Shop customer", quote: "Good prices and the stain remover actually works on my kids' school uniforms." },
];

const SHOP_FAQ = [
  { q: "Can I combine a product order with a laundry order?", a: "Yes, add products to your cart and check out separately, or mention it when placing a laundry order for combined delivery." },
  { q: "Do you deliver products outside Mende Maryland?", a: "Yes, within our delivery coverage area. Delivery fee is calculated at checkout." },
  { q: "What if an item is out of stock?", a: "Low-stock items are flagged on the shop page. Restocks typically happen within a few days." },
];

export default function Shop() {
  const { products, setCart, notify } = useApp();

  const addToCart = (product) => {
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      if (existing) return c.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { ...product, qty: 1 }];
    });
    notify(`${product.name} added to cart`);
  };

  return (
    <div>
      <PageHeader title="Laundry Products Shop" subtitle="Detergents, softeners, stain removers and more, delivered or ready for pickup." />

      <div className="rw-section">
        <div className="rw-grid-4">
          {products.map((p) => {
            const low = p.stock <= 5;
            return (
              <div className="rw-card" key={p.id}>
                <div className="rw-product-thumb"><Package size={28} /></div>
                <h3 style={{ fontSize: 15, marginBottom: 6 }}>{p.name}</h3>
                <span className={`rw-stock-badge ${low ? "rw-stock-low" : "rw-stock-ok"}`}>
                  {low ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                  {low ? `Only ${p.stock} left` : "In stock"}
                </span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                  <span className="rw-price">{money(p.price)}</span>
                  <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={() => addToCart(p)}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FeatureGrid kicker="Why shop with us" title="Laundry essentials, done right" items={WHY_SHOP} />

      <Testimonials kicker="Customers say" title="What shoppers think" items={SHOP_TESTIMONIALS} />

      <FAQ kicker="Questions" title="Shop FAQ" items={SHOP_FAQ} />
    </div>
  );
}
