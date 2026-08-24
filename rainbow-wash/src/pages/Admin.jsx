import { useEffect, useState } from "react";
import {
  Lock, LayoutDashboard, Truck, Calendar, Package, Plus, ShoppingBag, History, Search,
  Archive, Shirt, RefreshCw, DollarSign, BarChart3, Printer, LogOut, User, Eye, EyeOff, KeyRound, Shield, Trash2,
} from "lucide-react";
import { TRACK_STAGES, PAYMENT_STATUSES } from "../data/constants";
import { money, formatPlacedAt, isToday, matchesRange } from "../utils/format";
import { useApp } from "../context/AppContext";
import { openPrintSlip } from "../utils/print";
import {
  loginAdmin, logoutUser, createEmployee, fetchEmployees, resetEmployeePassword, changePassword,
  createProduct, updateProduct, deleteProduct,
} from "../api/api";

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
    notify,
  } = useApp();

  const [loginEmail, setLoginEmail] = useState("");
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
  const [addingProduct, setAddingProduct] = useState(false);

  // Team creation states
  const [empFullName, setEmpFullName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empRole, setEmpRole] = useState("Staff");
  const [empLoading, setEmpLoading] = useState(false);
  const [empMessage, setEmpMessage] = useState("");

  // Real employee list, fetched from the backend (not local state) — this is what's
  // actually in Postgres, so it reflects reality across every browser/device.
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resettingId, setResettingId] = useState(null);

  // Own account password change (available to every logged-in role)
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwMessage, setChangePwMessage] = useState("");
  const [changePwError, setChangePwError] = useState(false);

  const [historyQuery, setHistoryQuery] = useState("");
  const [historyRange, setHistoryRange] = useState("week");
  const [reportsRange, setReportsRange] = useState("month");

  // Turns the backend's "ADMIN" / "MANAGER" / "STAFF" (Java enum .name()) into the
  // "Admin" / "Manager" / "Staff" strings the rest of this dashboard's role checks
  // (canSeeOverview, canEditPricing, canSeeReports) already expect.
  const normalizeRole = (backendRole) => {
    if (!backendRole) return "Staff";
    return backendRole.charAt(0).toUpperCase() + backendRole.slice(1).toLowerCase();
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPass) return;
    setLoginError(null);
    setLoginLoading(true);

    try {
      const data = await loginAdmin({ email: loginEmail.trim(), password: loginPass });
      setCurrentUser({ name: data.name, role: normalizeRole(data.role) });
    } catch (err) {
      setLoginError(err.message || "Invalid email or password");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  const loadEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (err) {
      // Leaves the list as-is on failure; the Team tab still shows whatever it last had.
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Load the real employee list whenever an Admin opens the Team tab.
  useEffect(() => {
    if (tab === "team" && canSeeOverview) {
      loadEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, canSeeOverview]);

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
              <label>Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="you@rainbowwash.com"
                required
              />
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

  // --- Inventory: local field edits (as-you-type, no network call) ---
  const updateProductField = (id, field, value) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    if (field === "price" || field === "name") {
      setAddonProducts((aps) =>
        aps.map((ap) => (ap.id === id || ap.label === products.find(p => p.id === id)?.name ? { ...ap, [field === "name" ? "label" : field]: value } : ap))
      );
    }
  };

  // --- Inventory: persist a product's current field values to the backend.
  // Called on blur for text/number fields, and immediately for discrete actions
  // (status dropdown, restock) so those don't need a separate blur trigger. ---
  const persistProduct = async (product) => {
    try {
      const saved = await updateProduct(product.id, product);
      setProducts((ps) => ps.map((p) => (p.id === product.id ? saved : p)));
    } catch (err) {
      notify("Failed to save product changes");
    }
  };

  const updateProductStatus = (id, status) => {
    const updated = { ...products.find((p) => p.id === id), status };
    setProducts((ps) => ps.map((p) => (p.id === id ? updated : p)));
    persistProduct(updated);
  };

  const restock = (id) => {
    const target = products.find((p) => p.id === id);
    if (!target) return;
    const updated = { ...target, stock: target.stock + RESTOCK_STEP };
    setProducts((ps) => ps.map((p) => (p.id === id ? updated : p)));
    persistProduct(updated);
  };

  const removeProduct = async (id) => {
    try {
      await deleteProduct(id);
      setProducts((ps) => ps.filter((p) => p.id !== id));
      setAddonProducts((aps) => aps.filter((ap) => ap.id !== id));
    } catch (err) {
      notify("Failed to delete product");
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

  // --- Inventory: create a real product on the backend, then reflect the real
  // saved row (with its real DB id) in local state — no more fake "p"+Date.now() ids. ---
  const addProduct = async () => {
    if (!newName.trim() || !newPrice) return;
    setAddingProduct(true);
    try {
      const saved = await createProduct({
        name: newName.trim(),
        price: Math.max(0, Number(newPrice)),
        stock: Math.max(MIN_UNIT, Number(newStock) || MIN_UNIT),
        status: newStatus,
        category: "Shop",
        description: "",
      });

      setProducts((ps) => [...ps, saved]);
      setAddonProducts((aps) => [
        ...aps,
        { id: saved.id, label: saved.name, price: saved.price, group: "Shop & Retail Items" }
      ]);

      setNewName("");
      setNewPrice("");
      setNewStock(MIN_UNIT);
      setNewStatus("Active");
    } catch (err) {
      notify("Failed to add product");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setEmpLoading(true);
    setEmpMessage("");

    try {
      const result = await createEmployee({
        fullName: empFullName.trim(),
        email: empEmail.trim(),
        role: empRole.toUpperCase(), // "Staff" -> "STAFF", "Manager" -> "MANAGER", matching the UserRole enum
      });

      setEmpMessage(
        `Success! Account created for ${empFullName} (${empRole}). Temporary password: ${result.tempPassword} — share this with them directly, it won't be shown again.`
      );
      setEmpFullName("");
      setEmpEmail("");
      setEmpRole("Staff");

      // Refresh the real list from the backend so the new account shows up immediately.
      loadEmployees();
    } catch (err) {
      setEmpMessage(err.message || "Failed to create employee. Please try again.");
    } finally {
      setEmpLoading(false);
    }
  };

  const handleResetPassword = async (employee) => {
    setResettingId(employee.id);
    setResetMessage("");
    try {
      const result = await resetEmployeePassword(employee.id);
      setResetMessage(
        `New password for ${employee.fullName} (${employee.email}): ${result.tempPassword} — share this with them directly, it won't be shown again.`
      );
    } catch (err) {
      setResetMessage(err.message || "Failed to reset password. Please try again.");
    } finally {
      setResettingId(null);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePwMessage("");
    setChangePwError(false);

    if (newPasswordInput.length < 8) {
      setChangePwMessage("New password must be at least 8 characters.");
      setChangePwError(true);
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setChangePwMessage("New password and confirmation don't match.");
      setChangePwError(true);
      return;
    }

    setChangePwLoading(true);
    try {
      await changePassword({ currentPassword: currentPasswordInput, newPassword: newPasswordInput });
      setChangePwMessage("Password changed successfully.");
      setChangePwError(false);
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setConfirmPasswordInput("");
    } catch (err) {
      setChangePwMessage(err.message || "Failed to change password. Please try again.");
      setChangePwError(true);
    } finally {
      setChangePwLoading(false);
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
    { id: "account", label: "Change Password", icon: Shield },
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
        <button style={{ marginTop: 14 }} onClick={handleLogout}><LogOut size={16} /> Log out</button>
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
                    <td>{b.bookingDate || "—"} {b.bookingTime}</td>
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
              <button className="rw-btn rw-btn-primary" onClick={addProduct} disabled={addingProduct}>
                <Plus size={15} /> {addingProduct ? "Adding..." : "Add Product"}
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -14, marginBottom: 20 }}>New stock always starts at {MIN_UNIT} units or more, the field won't accept less.</p>

            <table className="rw-table">
              <thead><tr><th>Product Name</th><th>Price (₦)</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <input
                        style={{ width: "100%", padding: "6px 8px" }}
                        value={p.name}
                        onChange={(e) => updateProductField(p.id, "name", e.target.value)}
                        onBlur={() => persistProduct(products.find((x) => x.id === p.id))}
                      />
                    </td>
                    <td>
                      <input
                        type="number" step="50" style={{ width: 100, padding: "6px 8px" }}
                        value={p.price}
                        onChange={(e) => updateProductField(p.id, "price", Number(e.target.value))}
                        onBlur={() => persistProduct(products.find((x) => x.id === p.id))}
                      />
                    </td>
                    <td>
                      <span className={`rw-stock-badge ${p.stock <= 5 ? "rw-stock-low" : "rw-stock-ok"}`} style={{ marginRight: 8 }}>
                        {p.stock} units
                      </span>
                    </td>
                    <td>
                      <select className="rw-status-select" value={p.status || "Active"} onChange={(e) => updateProductStatus(p.id, e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td style={{ display: "flex", gap: 4 }}>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => restock(p.id)}>
                        Restock (+{RESTOCK_STEP})
                      </button>
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => removeProduct(p.id)} title="Delete product">
                        <Trash2 size={13} color="#e0473f" />
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
              Only Administrators can provision new Staff or Manager accounts. Passwords are never stored or shown again
              after creation — if someone forgets theirs, use "Reset Password" below to issue them a new one.
            </p>

            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div style={{ maxWidth: "500px", flex: "1 1 400px", background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ fontSize: 14, marginBottom: 14 }}>Create New Account</h4>
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

                  <div style={{ marginBottom: 16 }}>
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

                  <button 
                    type="submit" 
                    disabled={empLoading}
                    className="rw-btn rw-btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {empLoading ? "Creating Account..." : "Create Employee Account"}
                  </button>
                </form>
              </div>

              <div style={{ maxWidth: "500px", flex: "1 1 400px", background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ fontSize: 14, marginBottom: 14 }}>Existing Staff & Managers</h4>

                {resetMessage && (
                  <div style={{ marginBottom: 15, padding: "10px", fontSize: "13px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: "4px" }}>
                    {resetMessage}
                  </div>
                )}

                {employeesLoading && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading...</p>}

                {!employeesLoading && employees.length === 0 && (
                  <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No Staff or Manager accounts yet.</p>
                )}

                {!employeesLoading && employees.length > 0 && (
                  <ul style={{ fontSize: 13, listStyle: "none", padding: 0 }}>
                    {employees.map((emp) => (
                      <li
                        key={emp.id}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 0", borderBottom: "1px solid #eee",
                        }}
                      >
                        <span>
                          <b>{emp.fullName}</b> ({normalizeRole(emp.role)})
                          <br />
                          <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>{emp.email}</span>
                        </span>
                        <button
                          type="button"
                          className="rw-btn rw-btn-ghost rw-btn-sm"
                          onClick={() => handleResetPassword(emp)}
                          disabled={resettingId === emp.id}
                          title="Generate a new password for this account"
                        >
                          <KeyRound size={13} /> {resettingId === emp.id ? "Resetting..." : "Reset Password"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div>
            <div className="rw-admin-panel-head">
              <h2>Change Password</h2>
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 18 }}>
              Set a password you'll actually remember. You'll need your current password to confirm it's really you.
            </p>

            <div style={{ maxWidth: "420px", background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              {changePwMessage && (
                <div
                  style={{
                    marginBottom: 15, padding: "10px", fontSize: "13px", borderRadius: "4px",
                    background: changePwError ? "#fdece9" : "#f0fdf4",
                    color: changePwError ? "var(--bad)" : "#166534",
                    border: `1px solid ${changePwError ? "#f5c6c0" : "#bbf7d0"}`,
                  }}
                >
                  {changePwMessage}
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Current Password</label>
                  <input
                    type="password"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    placeholder="Your current password"
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 500 }}>New Password</label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    required
                    minLength={8}
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    placeholder="At least 8 characters"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", marginBottom: 5, fontSize: 13, fontWeight: 500 }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    required
                    style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px" }}
                    placeholder="Re-enter your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changePwLoading}
                  className="rw-btn rw-btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {changePwLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}