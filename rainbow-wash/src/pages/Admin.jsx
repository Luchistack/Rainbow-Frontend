import { useState } from "react";
import {
  Lock, LayoutDashboard, Truck, Calendar, Package, Plus, ShoppingBag, History, Search,
  Archive, Shirt, RefreshCw, DollarSign, BarChart3, Printer, LogOut, User,
} from "lucide-react";
import { TRACK_STAGES, PAYMENT_STATUSES, ADDON_GROUPS, ROLES } from "../data/constants";
import { money, formatPlacedAt, isToday, matchesRange } from "../utils/format";
import { useApp } from "../context/AppContext";
import { openPrintSlip } from "../utils/print";

const MIN_UNIT = 5;
const RESTOCK_STEP = 5;
const RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
];
const BOOKING_STAGES = ["Pending Quote", "Confirmed", "Completed", "Cancelled"];

export default function Admin() {
  const {
    laundryOrders, setLaundryOrders, bookings, setBookings, shopOrders, setShopOrders,
    products, setProducts,
    selfWashRates, setSelfWashRates, staffWashRates, setStaffWashRates,
    dryCleanItems, setDryCleanItems, shoeCareItems, setShoeCareItems,
    addonProducts, setAddonProducts, cleaningServices, setCleaningServices,
    currentUser, setCurrentUser,
  } = useApp();

  const [loginName, setLoginName] = useState("");
  const [loginRole, setLoginRole] = useState("Staff");
  const [loginPass, setLoginPass] = useState("");

  const role = currentUser?.role;
  const canSeeOverview = role === "Admin";
  const canSeeReports = role === "Admin";
  const canEditPricing = role === "Manager" || role === "Admin";

  const defaultTab = canSeeOverview ? "overview" : "orders";
  const [tab, setTab] = useState(defaultTab);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState(MIN_UNIT);
  const [newStatus, setNewStatus] = useState("Active");

  const [historyQuery, setHistoryQuery] = useState("");
  const [historyRange, setHistoryRange] = useState("week");
  const [reportsRange, setReportsRange] = useState("month");

  if (!currentUser) {
    return (
      <div className="rw-section">
        <div className="rw-login-box">
          <Lock size={28} color="var(--blue)" style={{ marginBottom: 10 }} />
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Staff Login</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 18 }}>
            Access the Rainbow Wash dashboard.
          </p>
          <div className="rw-field" style={{ textAlign: "left" }}>
            <label>Your name (shown on printed slips)</label>
            <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="e.g. Faith Oluchi" />
          </div>
          <div className="rw-field" style={{ textAlign: "left" }}>
            <label>Role</label>
            <div className="rw-pill-group">
              {ROLES.map((r) => (
                <button key={r} className={`rw-pill ${loginRole === r ? "active" : ""}`} onClick={() => setLoginRole(r)}>{r}</button>
              ))}
            </div>
          </div>
          <div className="rw-field" style={{ textAlign: "left" }}>
            <label>Password</label>
            <input type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="••••••••" />
          </div>
          <button
            className="rw-btn rw-btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
            onClick={() => {
              if (!loginName.trim()) return;
              setCurrentUser({ name: loginName.trim(), role: loginRole });
            }}
          >
            Log in
          </button>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 12 }}>
            Demo mode, any password works. Real authentication connects once the backend is live.
            Staff: no pricing or reports access. Manager: everything except Overview & Reports. Admin: full access.
          </p>
        </div>
      </div>
    );
  }

  const lowStock = products.filter((p) => p.stock <= 5).length;

  const todaysOrders = laundryOrders.filter((o) => !o.archived && isToday(o.placedAt));
  const todaysBookings = bookings.filter((b) => !b.archived && isToday(b.placedAt));
  const todaysShopOrders = shopOrders.filter((o) => !o.archived && isToday(o.placedAt));

  const revenueToday =
    todaysOrders.reduce((s, o) => s + o.total, 0) +
    todaysBookings.reduce((s, b) => s + b.payable, 0) +
    todaysShopOrders.reduce((s, o) => s + o.total, 0);

  const updateOrderStatus = (id, status) => setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
  const updateOrderTotal = (id, total) => setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, total: Number(total) } : o)));
  const updateOrderPayment = (id, paymentStatus) => setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentStatus } : o)));

  const updateBookingStatus = (id, status) => setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b)));
  const updateBookingPayable = (id, payable) => setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, payable: Number(payable) } : b)));
  const updateBookingPayment = (id, paymentStatus) => setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, paymentStatus } : b)));

  const updateShopOrderStatus = (id, status) => setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
  const updateShopPayment = (id, paymentStatus) => setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentStatus } : o)));

  const restock = (id) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, stock: p.stock + RESTOCK_STEP } : p)));
  const updateProductField = (id, field, value) => setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const archiveOrder = (id) => setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o)));
  const archiveBooking = (id) => setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, archived: true } : b)));
  const archiveShopOrder = (id) => setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o)));

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
      { id, name: newName.trim(), price: Math.max(0, Number(newPrice)), stock: Math.max(MIN_UNIT, Number(newStock) || MIN_UNIT), status: newStatus },
    ]);
    setNewName("");
    setNewPrice("");
    setNewStock(MIN_UNIT);
    setNewStatus("Active");
  };

  // Pricing editors
  const updateSelfWash = (id, price) => setSelfWashRates((rs) => rs.map((r) => (r.id === id ? { ...r, price: Number(price) } : r)));
  const updateStaffWash = (id, price) => setStaffWashRates((rs) => rs.map((r) => (r.id === id ? { ...r, price: Number(price) } : r)));
  const updateDryClean = (id, field, value) => setDryCleanItems((its) => its.map((i) => (i.id === id ? { ...i, [field]: Number(value) } : i)));
  const updateShoeCare = (id, field, value) => setShoeCareItems((its) => its.map((i) => (i.id === id ? { ...i, [field]: Number(value) } : i)));
  const updateAddon = (id, price) => setAddonProducts((ps) => ps.map((p) => (p.id === id ? { ...p, price: Number(price) } : p)));
  const updateCleaningPrice = (serviceId, sizeId, price) =>
    setCleaningServices((css) =>
      css.map((s) => (s.id === serviceId ? { ...s, sizes: s.sizes.map((sz) => (sz.id === sizeId ? { ...sz, price: Number(price) } : sz)) } : s))
    );

  const historyRows = [
    ...laundryOrders.map((o) => ({
      key: `L-${o.id}`, type: "Laundry", ref: o.id, placedAt: o.placedAt, name: o.fullName, phone: o.phone, email: o.email,
      details: o.items ? o.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—",
      total: o.total, status: o.status, paymentStatus: o.paymentStatus,
    })),
    ...bookings.map((b) => ({
      key: `C-${b.id}`, type: "Cleaning", ref: b.id, placedAt: b.placedAt, name: b.fullName, phone: b.phone, email: b.email,
      details: `${b.service} · ${b.size}`, total: b.payable, status: b.status, paymentStatus: b.paymentStatus,
    })),
    ...shopOrders.map((o) => ({
      key: `S-${o.id}`, type: "Shop", ref: o.id, placedAt: o.placedAt, name: o.fullName, phone: o.phone, email: "",
      details: o.items.map((i) => `${i.name} ×${i.qty}`).join(", "), total: o.total, status: o.status, paymentStatus: o.paymentStatus,
    })),
  ]
    .filter((r) => matchesRange(r.placedAt, historyRange))
    .filter((r) => {
      const q = historyQuery.trim().toLowerCase();
      if (!q) return true;
      return [r.ref, r.name, r.phone, r.email, r.details].join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.placedAt || 0) - new Date(a.placedAt || 0));

  // Reports data (Admin only)
  const allRecords = [
    ...laundryOrders.map((o) => ({ total: o.total, placedAt: o.placedAt, paymentStatus: o.paymentStatus, name: o.fullName, phone: o.phone })),
    ...bookings.map((b) => ({ total: b.payable, placedAt: b.placedAt, paymentStatus: b.paymentStatus, name: b.fullName, phone: b.phone })),
    ...shopOrders.map((o) => ({ total: o.total, placedAt: o.placedAt, paymentStatus: o.paymentStatus, name: o.fullName, phone: o.phone })),
  ].filter((r) => matchesRange(r.placedAt, reportsRange));

  const totalInvoiced = allRecords.reduce((s, r) => s + (r.total || 0), 0);
  const paidTotal = allRecords.filter((r) => r.paymentStatus === "Confirmed").reduce((s, r) => s + (r.total || 0), 0);
  const unpaidTotal = totalInvoiced - paidTotal;

  const clientMap = {};
  allRecords.forEach((r) => {
    const key = r.phone || r.name || "Unknown";
    if (!clientMap[key]) clientMap[key] = { name: r.name || "Unknown", phone: r.phone || "—", total: 0, count: 0 };
    clientMap[key].total += r.total || 0;
    clientMap[key].count += 1;
  });
  const topClients = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 6);
  const maxClientTotal = Math.max(1, ...topClients.map((c) => c.total));

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyTotals = monthNames.map((_, idx) =>
    allRecords.filter((r) => r.placedAt && new Date(r.placedAt).getMonth() === idx).reduce((s, r) => s + (r.total || 0), 0)
  );
  const maxMonthly = Math.max(1, ...monthlyTotals);

  const NAV = [
    canSeeOverview && { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Laundry Orders", icon: Truck },
    { id: "bookings", label: "Cleaning Bookings", icon: Calendar },
    { id: "shop", label: "Shop Orders", icon: ShoppingBag },
    { id: "history", label: "History", icon: History },
    canEditPricing && { id: "inventory", label: "Inventory", icon: Package },
    canEditPricing && { id: "pricing", label: "Pricing", icon: DollarSign },
    canSeeReports && { id: "reports", label: "Reports", icon: BarChart3 },
  ].filter(Boolean);

  return (
    <div className="rw-admin-shell">
      <div className="rw-admin-side">
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#fff", padding: "6px 12px 16px", borderBottom: "1px solid rgba(255,255,255,.12)", marginBottom: 10 }}>
          <User size={16} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{currentUser.name}</div>
            <div style={{ fontSize: 11.5, color: "#a9c3db" }}>{currentUser.role}</div>
          </div>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={tab === n.id ? "active" : ""} onClick={() => setTab(n.id)}><n.icon size={16} /> {n.label}</button>
        ))}
        <button style={{ marginTop: 14 }} onClick={() => setCurrentUser(null)}><LogOut size={16} /> Log out</button>
      </div>

      <div className="rw-admin-main">
        {tab === "overview" && canSeeOverview && (
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
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Items</th><th>Phone</th><th>Email</th><th>Total (₦)</th><th>Status</th><th>Payment</th><th></th></tr></thead>
              <tbody>
                {todaysOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{formatPlacedAt(o.placedAt)}</td>
                    <td>{o.fullName || "—"}</td>
                    <td style={{ maxWidth: 240, fontSize: 13 }}>{o.items ? o.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—"}</td>
                    <td>{o.phone || "—"}</td>
                    <td>{o.email || "—"}</td>
                    <td><input type="number" step="50" style={{ width: 86, padding: "6px 8px" }} value={o.total} onChange={(e) => updateOrderTotal(o.id, e.target.value)} /></td>
                    <td>
                      <select className="rw-status-select" value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                        {TRACK_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="rw-status-select" value={o.paymentStatus || "Pending"} onChange={(e) => updateOrderPayment(o.id, e.target.value)}>
                        {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => openPrintSlip(o, currentUser)} title="Print slip"><Printer size={13} /></button>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveOrder(o.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button>
                    </td>
                  </tr>
                ))}
                {todaysOrders.length === 0 && (
                  <tr><td colSpan={10} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No laundry orders placed today yet.</td></tr>
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
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Prices are internal, never shown to the customer; confirm and adjust here.</p>
              </div>
              {todaysBookings.length > 0 && (
                <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysBookings}>
                  <RefreshCw size={14} /> Clear today's list
                </button>
              )}
            </div>
            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Service</th><th>Size</th><th>Date</th><th>Phone</th><th>Confirmed Price (₦)</th><th>Status</th><th>Payment</th><th></th></tr></thead>
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
                    <td><input type="number" step="500" style={{ width: 90, padding: "6px 8px" }} value={b.payable} onChange={(e) => updateBookingPayable(b.id, e.target.value)} /></td>
                    <td>
                      <select className="rw-status-select" value={b.status} onChange={(e) => updateBookingStatus(b.id, e.target.value)}>
                        {BOOKING_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="rw-status-select" value={b.paymentStatus || "Pending"} onChange={(e) => updateBookingPayment(b.id, e.target.value)}>
                        {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => openPrintSlip(b, currentUser)} title="Print slip"><Printer size={13} /></button>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveBooking(b.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button>
                    </td>
                  </tr>
                ))}
                {todaysBookings.length === 0 && (
                  <tr><td colSpan={11} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No bookings requested today yet.</td></tr>
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
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Items</th><th>Fulfilment</th><th>Phone</th><th>Total</th><th>Status</th><th>Payment</th><th></th></tr></thead>
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
                    <td>
                      <select className="rw-status-select" value={o.paymentStatus || "Pending"} onChange={(e) => updateShopPayment(o.id, e.target.value)}>
                        {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => openPrintSlip(o, currentUser)} title="Print slip"><Printer size={13} /></button>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveShopOrder(o.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button>
                    </td>
                  </tr>
                ))}
                {todaysShopOrders.length === 0 && (
                  <tr><td colSpan={10} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No shop orders placed today yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "history" && (
          <div>
            <h2 style={{ marginBottom: 6 }}>History</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 18 }}>
              Every laundry order, cleaning booking and shop purchase ever placed, searchable, nothing deleted, nothing editable here.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
              <div style={{ position: "relative", flex: "1 1 260px" }}>
                <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }} />
                <input placeholder="Search by name, phone, email or reference…" style={{ paddingLeft: 36 }} value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} />
              </div>
              <div className="rw-pill-group">
                {RANGES.map((r) => (
                  <button key={r.id} className={`rw-pill ${historyRange === r.id ? "active" : ""}`} onClick={() => setHistoryRange(r.id)}>{r.label}</button>
                ))}
              </div>
            </div>

            <table className="rw-table">
              <thead><tr><th>Type</th><th>Ref</th><th>Placed</th><th>Name</th><th>Phone</th><th>Email</th><th>Details</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.key}>
                    <td><span className="rw-stock-badge rw-stock-ok" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Shirt size={11} /> {r.type}</span></td>
                    <td className="mono">{r.ref}</td>
                    <td>{formatPlacedAt(r.placedAt)}</td>
                    <td>{r.name || "—"}</td>
                    <td>{r.phone || "—"}</td>
                    <td>{r.email || "—"}</td>
                    <td>{r.details}</td>
                    <td>{money(r.total)}</td>
                    <td>{r.status}</td>
                    <td>{r.paymentStatus || "—"}</td>
                  </tr>
                ))}
                {historyRows.length === 0 && (
                  <tr><td colSpan={10} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No records match that search and time range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "inventory" && canEditPricing && (
          <div>
            <div className="rw-admin-panel-head"><h2>Inventory</h2></div>

            <div className="rw-add-product-form">
              <div><label>Product name</label><input placeholder="e.g. Bleach 1L" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
              <div><label>Price (₦)</label><input type="number" min="0" placeholder="2500" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} /></div>
              <div><label>Stock (units)</label><input type="number" min={MIN_UNIT} step="1" value={newStock} onChange={(e) => setNewStock(e.target.value)} /></div>
              <div>
                <label>Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <button className="rw-btn rw-btn-primary" onClick={addProduct}><Plus size={15} /> Add Product</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -14, marginBottom: 20 }}>New stock always starts at {MIN_UNIT} units or more, the field won't accept less.</p>

            <table className="rw-table">
              <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Stock level</th><th></th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const low = p.stock <= 5;
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{money(p.price)}</td>
                      <td><input type="number" min={MIN_UNIT} style={{ width: 74, padding: "6px 8px" }} value={p.stock} onChange={(e) => updateProductField(p.id, "stock", Math.max(MIN_UNIT, Number(e.target.value) || MIN_UNIT))} /></td>
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

        {tab === "pricing" && canEditPricing && (
          <div>
            <div className="rw-admin-panel-head"><h2>Pricing</h2></div>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 22 }}>
              Edit any price here and it reflects everywhere on the site immediately, Order Laundry, Services, and Book Cleaning.
            </p>

            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Self Wash (per kg)</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Service</th><th>Price</th></tr></thead>
              <tbody>
                {selfWashRates.map((r) => (
                  <tr key={r.id}><td>{r.label}</td><td><input type="number" step="50" style={{ width: 100 }} value={r.price} onChange={(e) => updateSelfWash(r.id, e.target.value)} /></td></tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Staff Wash (per kg)</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Service</th><th>Price</th></tr></thead>
              <tbody>
                {staffWashRates.map((r) => (
                  <tr key={r.id}><td>{r.label}</td><td><input type="number" step="50" style={{ width: 100 }} value={r.price} onChange={(e) => updateStaffWash(r.id, e.target.value)} /></td></tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Dry Cleaning</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Item</th><th>Regular</th><th>Deep Clean</th></tr></thead>
              <tbody>
                {dryCleanItems.map((i) => (
                  <tr key={i.id}>
                    <td>{i.label}</td>
                    <td><input type="number" step="500" style={{ width: 100 }} value={i.regular} onChange={(e) => updateDryClean(i.id, "regular", e.target.value)} /></td>
                    <td><input type="number" step="500" style={{ width: 100 }} value={i.deep} onChange={(e) => updateDryClean(i.id, "deep", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Shoe & Leather Care</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Item</th><th>Regular</th><th>Deep Clean</th><th>Minor Repairs</th></tr></thead>
              <tbody>
                {shoeCareItems.map((i) => (
                  <tr key={i.id}>
                    <td>{i.label}</td>
                    <td><input type="number" step="500" style={{ width: 90 }} value={i.regular} onChange={(e) => updateShoeCare(i.id, "regular", e.target.value)} /></td>
                    <td><input type="number" step="500" style={{ width: 90 }} value={i.deep} onChange={(e) => updateShoeCare(i.id, "deep", e.target.value)} /></td>
                    <td><input type="number" step="500" style={{ width: 90 }} value={i.repair} onChange={(e) => updateShoeCare(i.id, "repair", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {ADDON_GROUPS.map((group) => (
              <div key={group}>
                <h3 style={{ fontSize: 15, marginBottom: 10 }}>{group}</h3>
                <table className="rw-table" style={{ marginBottom: 24 }}>
                  <thead><tr><th>Product</th><th>Price</th></tr></thead>
                  <tbody>
                    {addonProducts.filter((p) => p.group === group).map((p) => (
                      <tr key={p.id}><td>{p.label}</td><td><input type="number" step="50" style={{ width: 100 }} value={p.price} onChange={(e) => updateAddon(p.id, e.target.value)} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <h3 style={{ fontSize: 15, marginBottom: 10 }}>Home / Office / Deep Clean / Upholstery (internal only, never shown to customers)</h3>
            {cleaningServices.map((s) => (
              <table className="rw-table" key={s.id} style={{ marginBottom: 18 }}>
                <thead><tr><th>{s.label}</th><th>Price</th></tr></thead>
                <tbody>
                  {s.sizes.map((sz) => (
                    <tr key={sz.id}><td>{sz.label}</td><td><input type="number" step="1000" style={{ width: 110 }} value={sz.price} onChange={(e) => updateCleaningPrice(s.id, sz.id, e.target.value)} /></td></tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        )}

        {tab === "reports" && canSeeReports && (
          <div>
            <div className="rw-admin-panel-head">
              <h2 style={{ marginBottom: 0 }}>Reports</h2>
              <div className="rw-pill-group">
                {RANGES.filter((r) => r.id !== "today").map((r) => (
                  <button key={r.id} className={`rw-pill ${reportsRange === r.id ? "active" : ""}`} onClick={() => setReportsRange(r.id)}>{r.label}</button>
                ))}
              </div>
            </div>

            <div className="rw-stat-grid">
              <div className="rw-stat-card"><b>{money(totalInvoiced)}</b><span>Total invoiced</span></div>
              <div className="rw-stat-card" style={{ background: "#e7f7ee" }}><b style={{ color: "#1e8f4f" }}>{money(paidTotal)}</b><span>Paid (confirmed)</span></div>
              <div className="rw-stat-card" style={{ background: "#fdece9" }}><b style={{ color: "var(--bad)" }}>{money(unpaidTotal)}</b><span>Unpaid / pending</span></div>
              <div className="rw-stat-card"><b>{Object.keys(clientMap).length}</b><span>Clients invoiced</span></div>
            </div>

            <h3 style={{ fontSize: 15, margin: "20px 0 12px" }}>Invoiced by month</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "0 4px 20px", borderBottom: "1px solid var(--line)" }}>
              {monthNames.map((m, idx) => (
                <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: "100%", height: `${Math.max(3, (monthlyTotals[idx] / maxMonthly) * 110)}px`, background: monthlyTotals[idx] > 0 ? "var(--blue)" : "var(--line)", borderRadius: "4px 4px 0 0" }} title={money(monthlyTotals[idx])} />
                  <span style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{m}</span>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 15, margin: "24px 0 12px" }}>Top clients by revenue</h3>
            {topClients.length === 0 && <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>No records in this time range yet.</p>}
            {topClients.map((c) => (
              <div key={c.phone + c.name} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{c.name} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>({c.phone}) · {c.count} order{c.count > 1 ? "s" : ""}</span></span>
                  <span style={{ fontWeight: 700 }}>{money(c.total)}</span>
                </div>
                <div style={{ background: "var(--line)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${(c.total / maxClientTotal) * 100}%`, background: "var(--blue)", height: "100%" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}