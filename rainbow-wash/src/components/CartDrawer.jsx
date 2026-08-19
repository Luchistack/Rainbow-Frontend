import { useState } from "react";
import { X, Package, Minus, Plus, Trash2, CreditCard, User } from "lucide-react";
import { useApp } from "../context/AppContext";
import { money, genRef } from "../utils/format";
import { buildWhatsAppLink } from "../data/constants";

function buildReceipt(order) {
  const itemLines = order.items.map((i) => `  • ${i.name} × ${i.qty}, ${money(i.price * i.qty)}`).join("\n");
  return [
    "🧴 New Shop Order, Rainbow Wash",
    `Ref: ${order.id}`,
    itemLines,
    `Fulfilment: ${order.mode === "delivery" ? "Delivery" : "Pickup in-store"}`,
    `Total: ${money(order.total)}`,
    `Customer name: ${order.fullName}`,
    `Customer phone: ${order.phone}`,
  ].join("\n");
}

export default function CartDrawer({ open, onClose }) {
  const { cart, setCart, setShopOrders, notify } = useApp();
  const [mode, setMode] = useState("delivery");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const updateQty = (id, delta) => {
    setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  };
  const removeItem = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const checkout = () => {
    if (cart.length === 0) return;
    if (!fullName.trim()) {
      notify("Please add your full name");
      return;
    }
    if (!phone.trim()) {
      notify("Please add a phone number so we can reach you");
      return;
    }
    const order = {
      id: genRef("SHOP"),
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      mode, fullName, phone, total,
      placedAt: new Date().toISOString(),
      paymentStatus: "Pending",
      archived: false,
      status: "Received",
    };
    setShopOrders((os) => [order, ...os]);
    notify(`Order placed! Ref ${order.id}, ${mode === "delivery" ? "delivery" : "pickup"} selected.`);
    window.open(buildWhatsAppLink(buildReceipt(order)), "_blank");
    setCart([]);
    setFullName("");
    setPhone("");
    onClose();
  };

  return (
    <>
      {open && <div className="rw-overlay" onClick={onClose} />}
      <div className={`rw-cart-drawer ${open ? "open" : ""}`}>
        <div className="rw-cart-head">
          <h3 style={{ fontSize: 18 }}>Your Cart</h3>
          <button className="rw-icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="rw-cart-body">
          {cart.length === 0 && (
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Your cart is empty. Add some products from the shop.</p>
          )}
          {cart.map((i) => (
            <div className="rw-cart-item" key={i.id}>
              <div className="rw-product-thumb"><Package size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.name}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 12.5 }}>{money(i.price)}</div>
                <div className="rw-stepper" style={{ marginTop: 6 }}>
                  <button onClick={() => updateQty(i.id, -1)}><Minus size={13} /></button>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{i.qty}</span>
                  <button onClick={() => updateQty(i.id, 1)}><Plus size={13} /></button>
                </div>
              </div>
              <button className="rw-icon-btn" onClick={() => removeItem(i.id)}>
                <Trash2 size={16} color="#e0473f" />
              </button>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="rw-cart-foot">
            <div className="rw-pill-group" style={{ marginBottom: 14 }}>
              <button className={`rw-pill ${mode === "delivery" ? "active" : ""}`} onClick={() => setMode("delivery")}>Delivery</button>
              <button className={`rw-pill ${mode === "pickup" ? "active" : ""}`} onClick={() => setMode("pickup")}>Pickup</button>
            </div>
            <div className="rw-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5 }}><User size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Full name</label>
              <input placeholder="e.g. Ada Obi" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="rw-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12.5 }}>Phone number</label>
              <input type="tel" placeholder="e.g. 0803 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="rw-summary-row total"><span>Total</span><span>{money(total)}</span></div>
            <button className="rw-btn rw-btn-rainbow" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={checkout}>
              <CreditCard size={16} /> Pay & Place Order
            </button>
          </div>
        )}
      </div>
    </>
  );
}
