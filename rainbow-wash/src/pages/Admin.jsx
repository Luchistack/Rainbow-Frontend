import { useState } from "react";
import { Lock, LayoutDashboard, Truck, Calendar, Package, Plus, ShoppingBag, History, Search, Archive, Shirt, RefreshCw } from "lucide-react";
import { TRACK_STAGES } from "../data/constants";
import { money, formatPlacedAt, isToday, matchesRange } from "../utils/format";
import { useApp } from "../context/AppContext";

const MIN_UNIT = 5;
const RESTOCK_STEP = 5;
const RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
];

export default function Admin() {
  const { laundryOrders, setLaundryOrders, bookings, setBookings, shopOrders, setShopOrders, products, setProducts } = useApp();
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState("orders");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState(MIN_UNIT);
  const [newStatus, setNewStatus] = useState("Active");

  const [historyQuery, setHistoryQuery] = useState("");
  const [historyRange, setHistoryRange] = useState("week");

  if (!loggedIn) {
    return (
      <div className="rw-section">
        <div className="rw-login-box">
          <Lock size={28} color="var(--blue)" style={{ marginBottom: 10 }} />
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Staff Login</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 18 }}>
            Access the Rainbow Wash admin dashboard.
          </p>
          <div className="rw-field" style={{ textAlign: "left" }}>
            <label>Username</label>
            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="staff username" />
          </div>
          <div className="rw-field" style={{ textAlign: "left" }}>
            <label>Password</label>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="rw-btn rw-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 6 }} onClick={() => setLoggedIn(true)}>
            Log in
          </button>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 12 }}>
            Demo mode, any details will log you in. Real authentication connects once the backend is live.
          </p>
        </div>
      </div>
    );
  }

  const lowStock = products.filter((p) => p.stock <= 5).length;

  // "Today" = not archived and placed today. Nothing is ever deleted — once
  // the calendar day rolls over, yesterday's entries simply stop appearing
  // here and are only visible in History instead.
  const todaysOrders = laundryOrders.filter((o) => !o.archived && isToday(o.placedAt));
  const todaysBookings = bookings.filter((b) => !b.archived && isToday(b.placedAt));
  const todaysShopOrders = shopOrders.filter((o) => !o.archived && isToday(o.placedAt));

  const revenueToday =
    todaysOrders.reduce((s, o) => s + o.total, 0) +
    todaysBookings.reduce((s, b) => s + b.payable, 0) +
    todaysShopOrders.reduce((s, o) => s + o.total, 0);

  const updateOrderStatus = (id, status) => setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
  const updateOrderTotal = (id, total) => setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, total: Number(total) } : o)));
  const updateShopOrderStatus = (id, status) => setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
  const restock = (id) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stock: p.stock + RESTOCK_STEP } : p)));
  const updateProductField = (id, field, value) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const archiveOrder = (id) => setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o)));
  const archiveBooking = (id) => setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, archived: true } : b)));
  const archiveShopOrder = (id) => setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o)));

  // Manual "start a new day" — archives everything currently showing as
  // today's, instantly resetting the active lists to empty without waiting
  // for the calendar to roll over. Nothing is deleted; it all remains in History.
  const clearTodaysOrders = () => setLaundryOrders((os) => os.map((o) => (!o.archived && isToday(o.placedAt) ? { ...o, archived: true } : o)));
  const clearTodaysBookings = () => setBookings((bs) => bs.map((b) => (!b.archived && isToday(b.placedAt) ? { ...b, archived: true } : b)));
  const clearTodaysShopOrders = () => setShopOrders((os) => os.map((o) => (!o.archived && isToday(o.placedAt) ? { ...o, archived: true } : o)));
  const startNewDay = () => {
    clearTodaysOrders();
    clearTodaysBookings();
    clearTodaysShopOrders();
  };

  const addProduct = () => {
    if (!newName.trim() || !newPrice) return;
    const id = "p" + Date.now();
    setProducts((ps) => [
      ...ps,
      {
        id,
        name: newName.trim(),
        price: Math.max(0, Number(newPrice)),
        stock: Math.max(MIN_UNIT, Number(newStock) || MIN_UNIT),
        status: newStatus,
      },
    ]);
    setNewName("");
    setNewPrice("");
    setNewStock(MIN_UNIT);
    setNewStatus("Active");
  };

  // Combined, searchable, all-time record across every order type — this is
  // the permanent history nothing ever gets removed from.
  const historyRows = [
    ...laundryOrders.map((o) => ({
      key: `L-${o.id}`,
      type: "Laundry",
      ref: o.id,
      placedAt: o.placedAt,
      name: o.fullName,
      phone: o.phone,
      email: o.email,
      details: o.items ? o.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—",
      total: o.total,
      status: o.status,
    })),
    ...bookings.map((b) => ({
      key: `C-${b.id}`,
      type: "Cleaning",
      ref: b.id,
      placedAt: b.placedAt,
      name: b.fullName,
      phone: b.phone,
      email: b.email,
      details: `${b.service} · ${b.size}`,
      total: b.payable,
      status: b.status,
    })),
    ...shopOrders.map((o) => ({
      key: `S-${o.id}`,
      type: "Shop",
      ref: o.id,
      placedAt: o.placedAt,
      name: o.fullName,
      phone: o.phone,
      email: "",
      details: o.items.map((i) => `${i.name} ×${i.qty}`).join(", "),
      total: o.total,
      status: o.status,
    })),
  ]
    .filter((r) => matchesRange(r.placedAt, historyRange))
    .filter((r) => {
      const q = historyQuery.trim().toLowerCase();
      if (!q) return true;
      return [r.ref, r.name, r.phone, r.email, r.details].join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.placedAt || 0) - new Date(a.placedAt || 0));

  return (
    <div className="rw-admin-shell">
      <div className="rw-admin-side">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><LayoutDashboard size={16} /> Overview</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><Truck size={16} /> Laundry Orders</button>
        <button className={tab === "bookings" ? "active" : ""} onClick={() => setTab("bookings")}><Calendar size={16} /> Cleaning Bookings</button>
        <button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}><ShoppingBag size={16} /> Shop Orders</button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}><History size={16} /> History</button>
        <button className={tab === "inventory" ? "active" : ""} onClick={() => setTab("inventory")}><Package size={16} /> Inventory</button>
      </div>

      <div className="rw-admin-main">
        {tab === "overview" && (
          <div>
            <div className="rw-admin-panel-head">
              <h2 style={{ marginBottom: 0 }}>Overview, Today</h2>
              <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={startNewDay}>
                <RefreshCw size={14} /> Start New Day (clear all today's lists)
              </button>
            </div>
            <div className="rw-stat-grid">
              <div className="rw-stat-card"><b>{todaysOrders.length}</b><span>Laundry orders today</span></div>
              <div className="rw-stat-card"><b>{todaysBookings.length}</b><span>Cleaning bookings today</span></div>
              <div className="rw-stat-card"><b>{todaysShopOrders.length}</b><span>Shop orders today</span></div>
              <div className="rw-stat-card"><b>{money(revenueToday)}</b><span>Revenue today</span></div>
              <div className="rw-stat-card" style={{ background: lowStock ? "#fdece9" : "var(--ice)" }}>
                <b style={{ color: lowStock ? "var(--bad)" : "var(--navy)" }}>{lowStock}</b>
                <span>Low-stock products</span>
              </div>
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
              These numbers reset automatically at midnight, or instantly if you click "Start New Day" above.
              Nothing is ever deleted, everything moves into <b>History</b>, searchable by day, week, month or year.
            </p>
          </div>
        )}

        {tab === "orders" && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Laundry Orders, Today</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Older orders have moved to History automatically.</p>
              </div>
              {todaysOrders.length > 0 && (
                <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysOrders}>
                  <RefreshCw size={14} /> Clear today's list
                </button>
              )}
            </div>
            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Items</th><th>Phone</th><th>Email</th><th>Total (₦)</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {todaysOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{formatPlacedAt(o.placedAt)}</td>
                    <td>{o.fullName || "—"}</td>
                    <td style={{ maxWidth: 260, fontSize: 13 }}>{o.items ? o.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—"}</td>
                    <td>{o.phone || "—"}</td>
                    <td>{o.email || "—"}</td>
                    <td>
                      <input type="number" step="50" style={{ width: 90, padding: "6px 8px" }} value={o.total} onChange={(e) => updateOrderTotal(o.id, e.target.value)} />
                    </td>
                    <td>
                      <select className="rw-status-select" value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                        {TRACK_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveOrder(o.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button></td>
                  </tr>
                ))}
                {todaysOrders.length === 0 && (
                  <tr><td colSpan={9} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No laundry orders placed today yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Cleaning Bookings, Today</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Older bookings have moved to History automatically.</p>
              </div>
              {todaysBookings.length > 0 && (
                <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysBookings}>
                  <RefreshCw size={14} /> Clear today's list
                </button>
              )}
            </div>
            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Service</th><th>Size</th><th>Date</th><th>Phone</th><th>Email</th><th>Paid</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {todaysBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.id}</td>
                    <td>{formatPlacedAt(b.placedAt)}</td>
                    <td>{b.fullName || "—"}</td>
                    <td>{b.service}</td>
                    <td>{b.size}</td>
                    <td>{b.date || "—"} {b.time}</td>
                    <td>{b.phone || "—"}</td>
                    <td>{b.email || "—"}</td>
                    <td>{money(b.payable)} {b.payType === "deposit" && <span style={{ color: "var(--warn)", fontSize: 12 }}>(deposit)</span>}</td>
                    <td><span className="rw-stock-badge rw-stock-ok">{b.status}</span></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveBooking(b.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button></td>
                  </tr>
                ))}
                {todaysBookings.length === 0 && (
                  <tr><td colSpan={11} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No bookings placed today yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "shop" && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Shop Orders, Today</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Older shop orders have moved to History automatically.</p>
              </div>
              {todaysShopOrders.length > 0 && (
                <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysShopOrders}>
                  <RefreshCw size={14} /> Clear today's list
                </button>
              )}
            </div>
            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Items</th><th>Fulfilment</th><th>Phone</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {todaysShopOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{formatPlacedAt(o.placedAt)}</td>
                    <td>{o.fullName || "—"}</td>
                    <td>{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                    <td style={{ textTransform: "capitalize" }}>{o.mode}</td>
                    <td>{o.phone || "—"}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <select className="rw-status-select" value={o.status} onChange={(e) => updateShopOrderStatus(o.id, e.target.value)}>
                        {["Received", "Packed", "Out for Delivery", "Completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveShopOrder(o.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button></td>
                  </tr>
                ))}
                {todaysShopOrders.length === 0 && (
                  <tr><td colSpan={9} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No shop orders placed today yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "history" && (
          <div>
            <h2 style={{ marginBottom: 6 }}>History</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 18 }}>
              Every laundry order, cleaning booking and shop purchase ever placed, searchable, nothing deleted.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
              <div style={{ position: "relative", flex: "1 1 260px" }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }} />
                <input
                  placeholder="Search by name, phone, email or reference…"
                  style={{ paddingLeft: 36 }}
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                />
              </div>
              <div className="rw-pill-group">
                {RANGES.map((r) => (
                  <button key={r.id} className={`rw-pill ${historyRange === r.id ? "active" : ""}`} onClick={() => setHistoryRange(r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <table className="rw-table">
              <thead><tr><th>Type</th><th>Ref</th><th>Placed</th><th>Name</th><th>Phone</th><th>Email</th><th>Details</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <span className="rw-stock-badge rw-stock-ok" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Shirt size={11} /> {r.type}
                      </span>
                    </td>
                    <td className="mono">{r.ref}</td>
                    <td>{formatPlacedAt(r.placedAt)}</td>
                    <td>{r.name || "—"}</td>
                    <td>{r.phone || "—"}</td>
                    <td>{r.email || "—"}</td>
                    <td>{r.details}</td>
                    <td>{money(r.total)}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
                {historyRows.length === 0 && (
                  <tr><td colSpan={9} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No records match that search and time range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "inventory" && (
          <div>
            <div className="rw-admin-panel-head">
              <h2>Inventory</h2>
            </div>

            <div className="rw-add-product-form">
              <div>
                <label>Product name</label>
                <input placeholder="e.g. Bleach 1L" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <label>Price (₦)</label>
                <input type="number" min="0" placeholder="2500" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div>
                <label>Stock (units)</label>
                <input type="number" min={MIN_UNIT} step="1" value={newStock} onChange={(e) => setNewStock(e.target.value)} />
              </div>
              <div>
                <label>Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button className="rw-btn rw-btn-primary" onClick={addProduct}><Plus size={15} /> Add Product</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -14, marginBottom: 20 }}>
              New stock always starts at {MIN_UNIT} units or more, the field won't accept less.
            </p>

            <table className="rw-table">
              <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Stock level</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const low = p.stock <= 5;
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{money(p.price)}</td>
                      <td>
                        <input
                          type="number"
                          min={MIN_UNIT}
                          style={{ width: 74, padding: "6px 8px" }}
                          value={p.stock}
                          onChange={(e) => updateProductField(p.id, "stock", Math.max(MIN_UNIT, Number(e.target.value) || MIN_UNIT))}
                        />
                      </td>
                      <td>
                        <select className="rw-status-select" value={p.status || "Active"} onChange={(e) => updateProductField(p.id, "status", e.target.value)}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </td>
                      <td><span className={`rw-stock-badge ${low ? "rw-stock-low" : "rw-stock-ok"}`}>{low ? "Restock needed" : "Healthy"}</span></td>
                      <td>{low && <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => restock(p.id)}>+{RESTOCK_STEP} units</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
