import { useState } from "react";
import {
  Lock, LayoutDashboard, Truck, Calendar, Package, Plus, ShoppingBag, History, Search,
  Archive, Shirt, RefreshCw, DollarSign, BarChart3, Printer, LogOut, User, Eye, EyeOff,
} from "lucide-react";
import { TRACK_STAGES, PAYMENT_STATUSES, ROLES } from "../data/constants";
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
    addonProducts, setAddonProducts,
    currentUser, setCurrentUser,
    teamAccounts, setTeamAccounts,
  } = useApp();

  const [loginName, setLoginName] = useState("");
  const [loginRole, setLoginRole] = useState("Staff");
  const [loginPass, setLoginPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

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

  // Team creation states
  const [empFullName, setEmpFullName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empRole, setEmpRole] = useState("Staff");
  const [empPassword, setEmpPassword] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [empMessage, setEmpMessage] = useState("");

  const [historyQuery, setHistoryQuery] = useState("");
  const [historyRange, setHistoryRange] = useState("week");
  const [reportsRange, setReportsRange] = useState("month");

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginName.trim()) return;
    setLoginError(null);
    setLoginLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const trimmedName = loginName.trim().toLowerCase();

      // 1. Strict Admin Check
      if (loginRole === "Admin") {
        if (trimmedName !== "faith dike" && trimmedName !== "dike") {
          throw new Error("Unauthorized username for Admin account.");
        }
        if (loginPass !== "AdminPass123") {
          throw new Error("Incorrect password for Admin account.");
        }
      } 
      // 2. Check dynamic or default team accounts for Staff / Manager
      else {
        const foundAccount = teamAccounts?.find(
          (acc) => acc.name.toLowerCase() === trimmedName && acc.role.toLowerCase() === loginRole.toLowerCase()
        );

        const defaultPasswords = {
          Manager: "ManagerPass123",
          Staff: "StaffPass123",
        };

        const validPass = foundAccount ? foundAccount.password : defaultPasswords[loginRole];

        if (!validPass || loginPass !== validPass) {
          throw new Error(`Incorrect name or password for ${loginRole} role.`);
        }
      }

      setCurrentUser({ name: loginName.trim(), role: loginRole });
      setLoginLoading(false);
    } catch (err) {
      setLoginError(err.message || "Invalid name or password");
      setLoginLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="rw-section">
        <div className="rw-login-box">
          <Lock size={28} color="var(--blue)" style={{ marginBottom: 10 }} />
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>Staff Login</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 18 }}>
            Access the Rainbow Wash dashboard.
          </p>

          {loginError && (
            <div style={{ color: "var(--bad)", fontSize: 13, marginBottom: 12, background: "#fdece9", padding: "8px", borderRadius: "4px" }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="rw-field" style={{ textAlign: "left" }}>
              <label>Your name (shown on printed slips)</label>
              <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="e.g. Faith Dike" required />
            </div>
            <div className="rw-field" style={{ textAlign: "left" }}>
              <label>Role</label>
              <div className="rw-pill-group">
                {ROLES.map((r) => (
                  <button type="button" key={r} className={`rw-pill ${loginRole === r ? "active" : ""}`} onClick={() => setLoginRole(r)}>{r}</button>
                ))}
              </div>
            </div>
            <div className="rw-field" style={{ textAlign: "left" }}>
              <label>Password</label>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={loginPass} 
                  onChange={(e) => setLoginPass(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                  style={{ width: "100%", paddingRight: "40px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "var(--ink-soft)",
                    padding: 0
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="rw-btn rw-btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 6 }}
              disabled={loginLoading}
            >
              {loginLoading ? "Authenticating..." : "Log in"}
            </button>
          </form>

          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 12 }}>
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
  
  const updateProductField = (id, field, value) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    if (field === "price" || field === "name") {
      setAddonProducts((aps) =>
        aps.map((ap) => (ap.id === id || ap.label === products.find(p => p.id === id)?.name ? { ...ap, [field === "name" ? "label" : field]: value } : ap))
      );
    }
  };

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
    const parsedPrice = Math.max(0, Number(newPrice));
    const parsedStock = Math.max(MIN_UNIT, Number(newStock) || MIN_UNIT);
    const trimmedName = newName.trim();

    setProducts((ps) => [
      ...ps,
      { id, name: trimmedName, price: parsedPrice, stock: parsedStock, status: newStatus },
    ]);

    setAddonProducts((aps) => [
      ...aps,
      { id, label: trimmedName, price: parsedPrice, group: "Shop & Retail Items" }
    ]);

    setNewName("");
    setNewPrice("");
    setNewStock(MIN_UNIT);
    setNewStatus("Active");
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setEmpLoading(true);
    setEmpMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      
      const newAccount = {
        name: empFullName.trim(),
        email: empEmail.trim(),
        role: empRole,
        password: empPassword,
      };

      setTeamAccounts((prev) => [...prev, newAccount]);

      setEmpMessage(`Success! Account created for ${empFullName} (${empRole}). Password: ${empPassword}`);
      setEmpFullName("");
      setEmpEmail("");
      setEmpPassword("");
      setEmpRole("Staff");
      setEmpLoading(false);
    } catch (err) {
      setEmpMessage("Failed to create employee. Please try again.");
      setEmpLoading(false);
    }
  };

  const updateSelfWash = (id, price) => setSelfWashRates((rs) => rs.map((r) => (r.id === id ? { ...r, price: Number(price) } : r)));
  const updateStaffWash = (id, price) => setStaffWashRates((rs) => rs.map((r) => (r.id === id ? { ...r, price: Number(price) } : r)));
  const updateDryClean = (id, field, value) => setDryCleanItems((its) => its.map((i) => (i.id === id ? { ...i, [field]: Number(value) } : i)));
  const updateShoeCare = (id, field, value) => setShoeCareItems((its) => its.map((i) => (i.id === id ? { ...i, [field]: Number(value) } : i)));
  const updateAddon = (id, price) => {
    const numPrice = Number(price);
    setAddonProducts((ps) => ps.map((p) => (p.id === id ? { ...p, price: numPrice } : p)));
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, price: numPrice } : p)));
  };

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

  const NAV = [
    canSeeOverview && { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Laundry Orders", icon: Truck },
    { id: "bookings", label: "Cleaning Bookings", icon: Calendar },
    { id: "shop", label: "Shop Orders", icon: ShoppingBag },
    { id: "history", label: "History", icon: History },
    canEditPricing && { id: "inventory", label: "Inventory", icon: Package },
    canEditPricing && { id: "pricing", label: "Pricing", icon: DollarSign },
    canSeeReports && { id: "reports", label: "Reports", icon: BarChart3 },
    canSeeOverview && { id: "team", label: "Team Management", icon: User },
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
              Nothing is ever delayed, everything moves into <b>History</b>, searchable by day, week, month or year.
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
              <thead><tr><th>Product Name</th><th>Price (₦)</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={p.name} onChange={(e) => updateProductField(p.id, "name", e.target.value)} /></td>
                    <td><input type="number" step="50" style={{ width: 100, padding: "6px 8px" }} value={p.price} onChange={(e) => updateProductField(p.id, "price", Number(e.target.value))} /></td>
                    <td>
                      <span className={`rw-stock-badge ${p.stock <= 5 ? "rw-stock-low" : "rw-stock-ok"}`} style={{ marginRight: 8 }}>
                        {p.stock} units
                      </span>
                    </td>
                    <td>
                      <select className="rw-status-select" value={p.status || "Active"} onChange={(e) => updateProductField(p.id, "status", e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => restock(p.id)}>
                        Restock (+{RESTOCK_STEP})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "pricing" && canEditPricing && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Pricing Control Center</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Changes here instantly update prices across all customer-facing pages.</p>
              </div>
            </div>

            <h3 style={{ fontSize: 16, marginTop: 16, marginBottom: 8 }}>Self-Wash Rates</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Service Name</th><th>Price (₦)</th></tr></thead>
              <tbody>
                {selfWashRates.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={r.price} onChange={(e) => updateSelfWash(r.id, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 16, marginBottom: 8 }}>Staff-Wash Rates</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Service Name</th><th>Price (₦)</th></tr></thead>
              <tbody>
                {staffWashRates.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={r.price} onChange={(e) => updateStaffWash(r.id, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 16, marginBottom: 8 }}>Dry Cleaning Items</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Item Name</th><th>Category</th><th>Price (₦)</th></tr></thead>
              <tbody>
                {dryCleanItems.map((item) => (
                  <tr key={item.id}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={item.name} onChange={(e) => updateDryClean(item.id, "name", e.target.value)} /></td>
                    <td>{item.category}</td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={item.price} onChange={(e) => updateDryClean(item.id, "price", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 16, marginBottom: 8 }}>Shoe Care Items</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Service Name</th><th>Price (₦)</th></tr></thead>
              <tbody>
                {shoeCareItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={item.price} onChange={(e) => updateShoeCare(item.id, "price", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 16, marginBottom: 8 }}>Shop & Add-on Products</h3>
            <table className="rw-table" style={{ marginBottom: 24 }}>
              <thead><tr><th>Product / Addon</th><th>Group</th><th>Price (₦)</th></tr></thead>
              <tbody>
                {addonProducts.map((ap) => (
                  <tr key={ap.id}>
                    <td>{ap.label}</td>
                    <td>{ap.group}</td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={ap.price} onChange={(e) => updateAddon(ap.id, e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "reports" && canSeeReports && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Reports & Financial Summary</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Detailed breakdown of all revenue streams and metrics.</p>
              </div>
              <div className="rw-pill-group">
                {RANGES.map((r) => (
                  <button key={r.id} className={`rw-pill ${reportsRange === r.id ? "active" : ""}`} onClick={() => setReportsRange(r.id)}>{r.label}</button>
                ))}
              </div>
            </div>

            <div className="rw-stat-grid" style={{ marginBottom: 24 }}>
              <div className="rw-stat-card"><b>{money(totalInvoiced)}</b><span>Total Invoiced</span></div>
              <div className="rw-stat-card"><b>{money(paidTotal)}</b><span>Confirmed Paid</span></div>
              <div className="rw-stat-card"><b>{money(unpaidTotal)}</b><span>Pending Collection</span></div>
            </div>

            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Top Clients by Spend</h3>
            <table className="rw-table" style={{ marginBottom: 28 }}>
              <thead><tr><th>Client Name</th><th>Phone</th><th>Total Spend</th><th>Orders Count</th></tr></thead>
              <tbody>
                {topClients.map((c, idx) => (
                  <tr key={idx}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                    <td>{money(c.total)}</td>
                    <td>{c.count}</td>
                  </tr>
                ))}
                {topClients.length === 0 && (
                  <tr><td colSpan={4} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No client records for this range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "team" && canSeeOverview && (
          <div>
            <div className="rw-admin-panel-head">
              <h2>Team Management — Provision Staff & Manager</h2>
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 18 }}>
              Only Administrators can provision new Staff or Manager accounts. Official credentials created here can be used instantly to log in.
            </p>

            <div style={{ maxWidth: "500px", background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              {empMessage && (
                <div style={{ marginBottom: 15, padding: "10px", fontSize: "13px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "4px" }}>
                  {empMessage}
                </div>
              )}

              <form onSubmit={handleCreateEmployee}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Full Name</label>
                  <input 
                    type="text" 
                    value={empFullName}
                    onChange={(e) => setEmpFullName(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Email Address</label>
                  <input 
                    type="email" 
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    placeholder="john@rainbowwash.com"
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Assign Role</label>
                  <select 
                    value={empRole} 
                    onChange={(e) => setEmpRole(e.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                  >
                    <option value="Staff">Staff</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 505 }}>Set Password</label>
                  <input 
                    type="text" 
                    value={empPassword}
                    onChange={(e) => setEmpPassword(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    placeholder="Create login password"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={empLoading}
                  className="rw-btn rw-btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {empLoading ? "Creating Account..." : "Create Employee Account"}
                </button>
              </form>

              <div style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 12 }}>
                <h4 style={{ fontSize: 13, marginBottom: 8, color: "var(--navy)" }}>Existing Registered Staff & Managers:</h4>
                <ul style={{ fontSize: 12, paddingLeft: 16, color: "var(--ink-soft)" }}>
                  {teamAccounts?.map((acc, i) => (
                    <li key={i} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        <b>{acc.name}</b> ({acc.role}) — Password: <span className="mono">{acc.password}</span>
                      </span>
                      {acc.role !== "Admin" && (
                        <button 
                          type="button"
                          className="rw-btn rw-btn-ghost rw-btn-sm"
                          style={{ color: "var(--bad)", padding: "2px 6px", fontSize: "11px" }}
                          onClick={() => {
                            setTeamAccounts((prev) => prev.filter((_, index) => index !== i));
                          }}
                        >
                          Revoke / Delete
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}