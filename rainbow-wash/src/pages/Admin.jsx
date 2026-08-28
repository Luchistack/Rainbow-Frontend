import { useEffect, useState } from "react";
import {
  Lock, LayoutDashboard, Truck, Calendar, Package, Plus, ShoppingBag, History, Search,
  Archive, Shirt, RefreshCw, DollarSign, BarChart3, Printer, LogOut, User, Eye, EyeOff, KeyRound, Shield, Trash2,
  Zap, ChevronDown, ChevronUp, X,
} from "lucide-react";
import {
  TRACK_STAGES, PAYMENT_STATUSES, ADDON_GROUPS, DELIVERY_FEE,
} from "../data/constants";
import { money, formatPlacedAt, isToday, matchesRange, genRef } from "../utils/format";
import { useApp } from "../context/AppContext";
import { openPrintSlip } from "../utils/print";
import {
  loginAdmin, logoutUser, createEmployee, fetchEmployees, resetEmployeePassword, deleteEmployee, changePassword,
  createProduct, updateProduct, deleteProduct, createBooking, updateBooking,
  createOrder, updateOrder, createShopOrder, updateShopOrder,
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
    addonProducts, setAddonProducts, expressServices, setExpressServices,
    cleaningServices,
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

  // "Add new item" input state, one per pricing category — kept minimal since
  // it's just a label/price pair (plus a group for add-ons) before Add is clicked.
  const [newSelfWash, setNewSelfWash] = useState({ label: "", price: "" });
  const [newStaffWash, setNewStaffWash] = useState({ label: "", price: "" });
  const [newDryClean, setNewDryClean] = useState({ label: "", regular: "", deep: "" });
  const [newShoeCare, setNewShoeCare] = useState({ label: "", regular: "", deep: "", repair: "" });
  const [newExpress, setNewExpress] = useState({ label: "", price: "" });
  const [newAddon, setNewAddon] = useState({ label: "", price: "", group: ADDON_GROUPS[0] });

  // Confirmation gate before permanently deleting a staff/manager account.
  const [confirmDeleteEmp, setConfirmDeleteEmp] = useState(null);
  const [deletingEmpId, setDeletingEmpId] = useState(null);

  // --- Walk-in / offline order drafting ---
  // Each of the three order types gets its own "open a draft" toggle. While a
  // draft is open, staff/manager/admin can freely add, edit and remove lines —
  // nothing is added to the real Today's lists (and nothing is locked) until
  // "Place Order" is clicked.
  const [draftType, setDraftType] = useState(null); // "laundry" | "cleaning" | "shop" | null
  const [draftItems, setDraftItems] = useState([]); // laundry/shop line items being built
  const [draftFullName, setDraftFullName] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftFulfilment, setDraftFulfilment] = useState("dropoff");
  const [draftAddress, setDraftAddress] = useState("");
  const [draftMode, setDraftMode] = useState("pickup"); // shop fulfilment
  // Cleaning-specific draft fields
  const [draftServiceId, setDraftServiceId] = useState("");
  const [draftSizeId, setDraftSizeId] = useState("");
  const [draftBookingDate, setDraftBookingDate] = useState("");
  const [draftBookingTime, setDraftBookingTime] = useState("");
  const [draftPayable, setDraftPayable] = useState("");
  // Laundry draft item picker
  const [draftCategory, setDraftCategory] = useState("selfwash");
  const [draftWashRateId, setDraftWashRateId] = useState("");
  const [draftWashWeight, setDraftWashWeight] = useState(1);
  const [draftDcItemId, setDraftDcItemId] = useState("");
  const [draftDcType, setDraftDcType] = useState("regular");
  const [draftDcQty, setDraftDcQty] = useState(1);
  const [draftScItemId, setDraftScItemId] = useState("");
  const [draftScType, setDraftScType] = useState("regular");
  const [draftScQty, setDraftScQty] = useState(1);
  const [draftExItemId, setDraftExItemId] = useState("");
  const [draftExQty, setDraftExQty] = useState(1);
  // Shop draft product picker
  const [draftProductId, setDraftProductId] = useState("");
  const [draftProductQty, setDraftProductQty] = useState(1);
  const [placingDraft, setPlacingDraft] = useState(false);

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

  // --- Laundry order field updates: optimistic local update, then persist to
  // the backend if this record actually has a real DB id (records that only
  // ever existed locally, e.g. from before the backend was wired up, or if an
  // API call failed at creation time, are simply skipped here, not an error). ---
  const persistOrder = (id, patch) => {
    const target = laundryOrders.find((o) => o.id === id);
    if (!target?.dbId) return;
    updateOrder(target.dbId, patch).catch(() => notify("Saved locally, but failed to sync to the server"));
  };
  const updateOrderStatus = (id, status) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o))); persistOrder(id, { status }); };
  const updateOrderTotal = (id, total) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, total: Number(total) } : o))); persistOrder(id, { total: Number(total) }); };
  const updateOrderPayment = (id, paymentStatus) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentStatus } : o))); persistOrder(id, { paymentStatus }); };

  const persistBookingUpdate = (id, patch) => {
    const target = bookings.find((b) => b.id === id);
    if (!target?.dbId) return;
    updateBooking(target.dbId, patch).catch(() => notify("Saved locally, but failed to sync to the server"));
  };
  const updateBookingStatus = (id, status) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b))); persistBookingUpdate(id, { status }); };
  const updateBookingPayable = (id, payable) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, payable: Number(payable) } : b))); persistBookingUpdate(id, { payable: Number(payable) }); };
  const updateBookingPayment = (id, paymentStatus) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, paymentStatus } : b))); persistBookingUpdate(id, { paymentStatus }); };

  const persistShopOrder = (id, patch) => {
    const target = shopOrders.find((o) => o.id === id);
    if (!target?.dbId) return;
    updateShopOrder(target.dbId, patch).catch(() => notify("Saved locally, but failed to sync to the server"));
  };
  const updateShopOrderStatus = (id, status) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o))); persistShopOrder(id, { status }); };
  const updateShopPayment = (id, paymentStatus) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentStatus } : o))); persistShopOrder(id, { paymentStatus }); };

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

  const archiveOrder = (id) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o))); persistOrder(id, { archived: true }); };
  const archiveBooking = (id) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, archived: true } : b))); persistBookingUpdate(id, { archived: true }); };
  const archiveShopOrder = (id) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o))); persistShopOrder(id, { archived: true }); };

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

  // --- Pricing: full CRUD (rename, reprice, add, delete) across every category.
  // All Manager/Admin-only, gated at the tab level by canEditPricing. ---
  const updateSelfWash = (id, field, value) => setSelfWashRates((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: field === "label" ? value : Number(value) } : r)));
  const deleteSelfWash = (id) => setSelfWashRates((rs) => rs.filter((r) => r.id !== id));
  const addSelfWash = () => {
    if (!newSelfWash.label.trim() || newSelfWash.price === "") return;
    setSelfWashRates((rs) => [...rs, { id: `sw-${Date.now()}`, label: newSelfWash.label.trim(), unit: "kg", price: Number(newSelfWash.price) }]);
    setNewSelfWash({ label: "", price: "" });
  };

  const updateStaffWash = (id, field, value) => setStaffWashRates((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: field === "label" ? value : Number(value) } : r)));
  const deleteStaffWash = (id) => setStaffWashRates((rs) => rs.filter((r) => r.id !== id));
  const addStaffWash = () => {
    if (!newStaffWash.label.trim() || newStaffWash.price === "") return;
    setStaffWashRates((rs) => [...rs, { id: `stw-${Date.now()}`, label: newStaffWash.label.trim(), unit: "kg", price: Number(newStaffWash.price) }]);
    setNewStaffWash({ label: "", price: "" });
  };

  const updateDryClean = (id, field, value) => setDryCleanItems((its) => its.map((i) => (i.id === id ? { ...i, [field]: field === "label" ? value : Number(value) } : i)));
  const deleteDryClean = (id) => setDryCleanItems((its) => its.filter((i) => i.id !== id));
  const addDryClean = () => {
    if (!newDryClean.label.trim() || newDryClean.regular === "" || newDryClean.deep === "") return;
    setDryCleanItems((its) => [...its, { id: `dc-${Date.now()}`, label: newDryClean.label.trim(), regular: Number(newDryClean.regular), deep: Number(newDryClean.deep) }]);
    setNewDryClean({ label: "", regular: "", deep: "" });
  };

  const updateShoeCare = (id, field, value) => setShoeCareItems((its) => its.map((i) => (i.id === id ? { ...i, [field]: field === "label" ? value : Number(value) } : i)));
  const deleteShoeCare = (id) => setShoeCareItems((its) => its.filter((i) => i.id !== id));
  const addShoeCare = () => {
    if (!newShoeCare.label.trim() || newShoeCare.regular === "" || newShoeCare.deep === "" || newShoeCare.repair === "") return;
    setShoeCareItems((its) => [...its, { id: `sc-${Date.now()}`, label: newShoeCare.label.trim(), regular: Number(newShoeCare.regular), deep: Number(newShoeCare.deep), repair: Number(newShoeCare.repair) }]);
    setNewShoeCare({ label: "", regular: "", deep: "", repair: "" });
  };

  const updateExpress = (id, field, value) => setExpressServices((its) => its.map((i) => (i.id === id ? { ...i, [field]: field === "label" ? value : Number(value) } : i)));
  const deleteExpress = (id) => setExpressServices((its) => its.filter((i) => i.id !== id));
  const addExpress = () => {
    if (!newExpress.label.trim() || newExpress.price === "") return;
    setExpressServices((its) => [...its, { id: `ex-${Date.now()}`, label: newExpress.label.trim(), price: Number(newExpress.price) }]);
    setNewExpress({ label: "", price: "" });
  };

  const updateAddon = (id, field, value) => {
    setAddonProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: field === "price" ? Number(value) : value } : p)));
    if (field === "price") setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, price: Number(value) } : p)));
  };
  const deleteAddon = (id) => setAddonProducts((ps) => ps.filter((p) => p.id !== id));
  const addAddon = () => {
    if (!newAddon.label.trim() || newAddon.price === "") return;
    setAddonProducts((ps) => [...ps, { id: `ad-${Date.now()}`, label: newAddon.label.trim(), price: Number(newAddon.price), group: newAddon.group }]);
    setNewAddon({ label: "", price: "", group: ADDON_GROUPS[0] });
  };

  // --- Staff Account Deletion (Admin only, cannot delete Admin accounts) ---
  const handleDeleteEmployee = async (employee) => {
    setDeletingEmpId(employee.id);
    try {
      await deleteEmployee(employee.id);
      setEmployees((emps) => emps.filter((e) => e.id !== employee.id));
      notify(`${employee.fullName}'s account has been permanently deleted.`);
      setConfirmDeleteEmp(null);
    } catch (err) {
      notify(err.message || "Failed to delete account");
    } finally {
      setDeletingEmpId(null);
    }
  };

  // --- Order locking (walk-in & web orders alike) ---
  // "locked" is true the moment an order exists in a Today's table (it's been
  // submitted) — from then on, regular Staff can no longer edit its content or
  // delete it; Manager/Admin still can, right up until it's actually printed.
  // "printed" becomes true only once a real print button is clicked inside the
  // print-preview window (see print.js) — after that, nobody can delete it.
  const canEditOrderContent = role !== "Staff";
  const canDeleteOrder = (o) => role !== "Staff" && !o.printed;
  const markLaundryPrinted = (id) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, printed: true } : o))); persistOrder(id, { printed: true }); };
  const markBookingPrinted = (id) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, printed: true } : b))); persistBookingUpdate(id, { printed: true }); };
  const markShopPrinted = (id) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, printed: true } : o))); persistShopOrder(id, { printed: true }); };

  // --- Walk-in order drafting ---
  const resetDraft = () => {
    setDraftType(null);
    setDraftItems([]);
    setDraftFullName("");
    setDraftPhone("");
    setDraftFulfilment("dropoff");
    setDraftAddress("");
    setDraftMode("pickup");
    setDraftServiceId("");
    setDraftSizeId("");
    setDraftBookingDate("");
    setDraftBookingTime("");
    setDraftPayable("");
    setDraftProductId("");
    setDraftProductQty(1);
  };

  const openDraft = (type) => {
    resetDraft();
    setDraftType(type);
    if (type === "cleaning" && cleaningServices?.length) {
      setDraftServiceId(cleaningServices[0].id);
      setDraftSizeId(cleaningServices[0].sizes[0].id);
    }
    if (type === "shop" && products?.length) setDraftProductId(products[0].id);
    if (selfWashRates?.length) setDraftWashRateId(selfWashRates[0].id);
    if (dryCleanItems?.length) setDraftDcItemId(dryCleanItems[0].id);
    if (shoeCareItems?.length) setDraftScItemId(shoeCareItems[0].id);
    if (expressServices?.length) setDraftExItemId(expressServices[0].id);
  };

  const addDraftItem = (name, qty, price, unit) => {
    setDraftItems((its) => {
      const existing = its.find((i) => i.name === name && i.unit === unit);
      if (existing) return its.map((i) => (i === existing ? { ...i, qty: i.qty + qty } : i));
      return [...its, { id: `${Date.now()}-${Math.random()}`, name, qty, price, unit }];
    });
  };
  const removeDraftItem = (id) => setDraftItems((its) => its.filter((i) => i.id !== id));

  const addDraftWashLine = () => {
    const isSelf = draftCategory === "selfwash";
    const rate = (isSelf ? selfWashRates : staffWashRates).find((r) => r.id === draftWashRateId);
    if (!rate) return;
    addDraftItem(`${isSelf ? "Self Wash" : "Staff Wash"}, ${rate.label}`, draftWashWeight, rate.price, "kg");
  };
  const addDraftDryCleanLine = () => {
    const item = dryCleanItems.find((i) => i.id === draftDcItemId);
    if (!item) return;
    const price = draftDcType === "deep" ? item.deep : item.regular;
    addDraftItem(`${item.label} (${draftDcType === "deep" ? "Deep Clean" : "Regular"})`, draftDcQty, price, "");
  };
  const addDraftShoeCareLine = () => {
    const item = shoeCareItems.find((i) => i.id === draftScItemId);
    if (!item) return;
    const price = draftScType === "deep" ? item.deep : draftScType === "repair" ? item.repair : item.regular;
    const typeLabel = draftScType === "deep" ? "Deep Clean" : draftScType === "repair" ? "Minor Repairs" : "Regular";
    addDraftItem(`${item.label} (${typeLabel})`, draftScQty, price, "");
  };
  const addDraftExpressLine = () => {
    const item = expressServices.find((i) => i.id === draftExItemId);
    if (!item) return;
    addDraftItem(item.label, draftExQty, item.price, "");
  };
  const addDraftProductLine = () => {
    const product = products.find((p) => p.id === draftProductId);
    if (!product) return;
    addDraftItem(product.name, draftProductQty, product.price, "");
  };

  const draftSubtotal = draftItems.reduce((s, i) => s + i.qty * i.price, 0);
  const draftTotal = draftType === "laundry" && draftFulfilment === "pickup" ? draftSubtotal + DELIVERY_FEE : draftSubtotal;

  const placeDraftLaundryOrder = async () => {
    if (draftItems.length === 0) { notify("Add at least one item first"); return; }
    if (!draftFullName.trim() || !draftPhone.trim()) { notify("Name and phone are required"); return; }
    const localOrder = {
      id: genRef("LND"),
      items: draftItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price, unit: i.unit })),
      fulfilment: draftFulfilment, address: draftAddress, date: "", time: "",
      payment: "walk-in", paymentStatus: "Pending", transferNote: "",
      fullName: draftFullName.trim(), phone: draftPhone.trim(), email: "",
      placedAt: new Date().toISOString(), archived: false, locked: true, printed: false,
      total: draftTotal, status: "Received",
    };
    setPlacingDraft(true);
    try {
      const saved = await createOrder({
        items: draftItems.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price })),
        fulfilment: draftFulfilment, address: draftAddress,
        paymentMethod: "walk-in", total: draftTotal,
        fullName: draftFullName.trim(), phone: draftPhone.trim(),
        createdBy: currentUser?.name,
      }).catch(() => localOrder);
      setLaundryOrders((os) => [saved || localOrder, ...os]);
      notify(`Walk-in order ${(saved || localOrder).id} placed`);
      resetDraft();
    } finally {
      setPlacingDraft(false);
    }
  };

  const placeDraftBooking = async () => {
    if (!draftFullName.trim() || !draftPhone.trim()) { notify("Name and phone are required"); return; }
    const svc = cleaningServices.find((s) => s.id === draftServiceId);
    const size = svc?.sizes.find((s) => s.id === draftSizeId);
    const payable = draftPayable === "" ? size?.price || 0 : Number(draftPayable);
    setPlacingDraft(true);
    try {
      const localBooking = {
        id: genRef("CLN"),
        service: svc?.label || "", size: size?.label || "",
        date: draftBookingDate, time: draftBookingTime, address: draftAddress,
        fullName: draftFullName.trim(), phone: draftPhone.trim(), email: "",
        price: size?.price || 0, payType: "full", payable,
        paymentStatus: "Pending", status: "Confirmed",
        placedAt: new Date().toISOString(), archived: false, locked: true, printed: false,
      };
      const saved = await createBooking(localBooking).catch(() => localBooking);
      setBookings((bs) => [saved, ...bs]);
      notify(`Walk-in booking ${saved.id || localBooking.id} placed`);
      resetDraft();
    } finally {
      setPlacingDraft(false);
    }
  };

  const placeDraftShopOrder = async () => {
    if (draftItems.length === 0) { notify("Add at least one item first"); return; }
    if (!draftFullName.trim() || !draftPhone.trim()) { notify("Name and phone are required"); return; }
    const localOrder = {
      id: genRef("SHOP"),
      items: draftItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      fullName: draftFullName.trim(), phone: draftPhone.trim(), mode: draftMode,
      total: draftSubtotal, status: "Received", paymentStatus: "Pending",
      placedAt: new Date().toISOString(), archived: false, locked: true, printed: false,
    };
    setPlacingDraft(true);
    try {
      const saved = await createShopOrder({
        items: draftItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        fullName: draftFullName.trim(), phone: draftPhone.trim(), mode: draftMode,
        total: draftSubtotal, createdBy: currentUser?.name,
      }).catch(() => localOrder);
      setShopOrders((os) => [saved || localOrder, ...os]);
      notify(`Walk-in sale ${(saved || localOrder).id} placed`);
      resetDraft();
    } finally {
      setPlacingDraft(false);
    }
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
              <div style={{ display: "flex", gap: 8 }}>
                <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={() => openDraft(draftType === "laundry" ? null : "laundry")}>
                  {draftType === "laundry" ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Walk-In Order</>}
                </button>
                {todaysOrders.length > 0 && (
                  <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysOrders}>
                    <RefreshCw size={14} /> Clear today's list
                  </button>
                )}
              </div>
            </div>

            {draftType === "laundry" && (
              <div className="rw-card" style={{ marginBottom: 20, background: "var(--ice)" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Walk-In Laundry Order — Draft</h3>
                <div className="rw-pill-group" style={{ marginBottom: 14 }}>
                  {["selfwash", "staffwash", "dryclean", "shoecare", "express"].map((c) => (
                    <button key={c} className={`rw-pill ${draftCategory === c ? "active" : ""}`} onClick={() => setDraftCategory(c)}>
                      {{ selfwash: "Self Wash", staffwash: "Staff Wash", dryclean: "Dry Cleaning", shoecare: "Shoe Care", express: "Express" }[c]}
                    </button>
                  ))}
                </div>

                {(draftCategory === "selfwash" || draftCategory === "staffwash") && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                    <div style={{ flex: "1 1 220px" }}>
                      <label>Service</label>
                      <select value={draftWashRateId} onChange={(e) => setDraftWashRateId(e.target.value)}>
                        {(draftCategory === "selfwash" ? selfWashRates : staffWashRates).map((r) => (
                          <option key={r.id} value={r.id}>{r.label}, {money(r.price)}/kg</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Weight (kg)</label>
                      <input type="number" step="0.5" min="0.5" style={{ width: 90 }} value={draftWashWeight} onChange={(e) => setDraftWashWeight(Number(e.target.value))} />
                    </div>
                    <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDraftWashLine}><Plus size={13} /> Add</button>
                  </div>
                )}

                {draftCategory === "dryclean" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                    <div style={{ flex: "1 1 220px" }}>
                      <label>Item</label>
                      <select value={draftDcItemId} onChange={(e) => setDraftDcItemId(e.target.value)}>
                        {dryCleanItems.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Type</label>
                      <select value={draftDcType} onChange={(e) => setDraftDcType(e.target.value)}>
                        <option value="regular">Regular</option>
                        <option value="deep">Deep Clean</option>
                      </select>
                    </div>
                    <div>
                      <label>Qty</label>
                      <input type="number" min="1" style={{ width: 70 }} value={draftDcQty} onChange={(e) => setDraftDcQty(Number(e.target.value))} />
                    </div>
                    <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDraftDryCleanLine}><Plus size={13} /> Add</button>
                  </div>
                )}

                {draftCategory === "shoecare" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                    <div style={{ flex: "1 1 220px" }}>
                      <label>Item</label>
                      <select value={draftScItemId} onChange={(e) => setDraftScItemId(e.target.value)}>
                        {shoeCareItems.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Type</label>
                      <select value={draftScType} onChange={(e) => setDraftScType(e.target.value)}>
                        <option value="regular">Regular</option>
                        <option value="deep">Deep Clean</option>
                        <option value="repair">Minor Repairs</option>
                      </select>
                    </div>
                    <div>
                      <label>Qty</label>
                      <input type="number" min="1" style={{ width: 70 }} value={draftScQty} onChange={(e) => setDraftScQty(Number(e.target.value))} />
                    </div>
                    <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDraftShoeCareLine}><Plus size={13} /> Add</button>
                  </div>
                )}

                {draftCategory === "express" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                    <div style={{ flex: "1 1 220px" }}>
                      <label>Express service</label>
                      <select value={draftExItemId} onChange={(e) => setDraftExItemId(e.target.value)}>
                        {expressServices.map((i) => <option key={i.id} value={i.id}>{i.label}, {money(i.price)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Qty</label>
                      <input type="number" min="1" style={{ width: 70 }} value={draftExQty} onChange={(e) => setDraftExQty(Number(e.target.value))} />
                    </div>
                    <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDraftExpressLine}><Plus size={13} /> Add</button>
                  </div>
                )}

                {draftItems.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    {draftItems.map((i) => (
                      <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
                        <span>{i.name} × {i.qty}{i.unit}</span>
                        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {money(i.price * i.qty)}
                          <button className="rw-icon-btn" onClick={() => removeDraftItem(i.id)}><Trash2 size={13} color="#e0473f" /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rw-form-grid" style={{ marginBottom: 12 }}>
                  <div><label>Customer name</label><input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} placeholder="Walk-in customer" /></div>
                  <div><label>Phone</label><input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} placeholder="0803 123 4567" /></div>
                </div>
                <div className="rw-pill-group" style={{ marginBottom: 12 }}>
                  <button className={`rw-pill ${draftFulfilment === "dropoff" ? "active" : ""}`} onClick={() => setDraftFulfilment("dropoff")}>Drop-off in store</button>
                  <button className={`rw-pill ${draftFulfilment === "pickup" ? "active" : ""}`} onClick={() => setDraftFulfilment("pickup")}>Pickup & deliver (+{money(DELIVERY_FEE)})</button>
                </div>
                {draftFulfilment === "pickup" && (
                  <div style={{ marginBottom: 12 }}><label>Address</label><input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} /></div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <b style={{ fontSize: 15 }}>Total: {money(draftTotal)}</b>
                  <button className="rw-btn rw-btn-rainbow" onClick={placeDraftLaundryOrder}>Place Order</button>
                </div>
              </div>
            )}

            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Items</th><th>Fulfilment</th><th>Phone</th><th>Email</th><th>Total (₦)</th><th>Status</th><th>Payment</th><th></th></tr></thead>
              <tbody>
                {todaysOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{formatPlacedAt(o.placedAt)}</td>
                    <td>{o.fullName || "—"}</td>
                    <td style={{ maxWidth: 220, fontSize: 13 }}>{o.items ? o.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>{o.fulfilment || "—"}</td>
                    <td>{o.phone || "—"}</td>
                    <td>{o.email || "—"}</td>
                    <td>
                      {canEditOrderContent && !o.printed ? (
                        <input type="number" step="50" style={{ width: 86, padding: "6px 8px" }} value={o.total} onChange={(e) => updateOrderTotal(o.id, e.target.value)} />
                      ) : (
                        <span style={{ fontWeight: 700 }}>{money(o.total)}</span>
                      )}
                    </td>
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
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => openPrintSlip(o, currentUser, () => markLaundryPrinted(o.id))} title="Print slip"><Printer size={13} /></button>
                      {canDeleteOrder(o) && (
                        <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveOrder(o.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {todaysOrders.length === 0 && (
                  <tr><td colSpan={11} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No laundry orders placed today yet.</td></tr>
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
              <div style={{ display: "flex", gap: 8 }}>
                <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={() => openDraft(draftType === "cleaning" ? null : "cleaning")}>
                  {draftType === "cleaning" ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Walk-In Booking</>}
                </button>
                {todaysBookings.length > 0 && (
                  <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysBookings}>
                    <RefreshCw size={14} /> Clear today's list
                  </button>
                )}
              </div>
            </div>

            {draftType === "cleaning" && (
              <div className="rw-card" style={{ marginBottom: 20, background: "var(--ice)" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Walk-In Cleaning Booking — Draft</h3>
                <div className="rw-form-grid" style={{ marginBottom: 12 }}>
                  <div>
                    <label>Service</label>
                    <select
                      value={draftServiceId}
                      onChange={(e) => {
                        setDraftServiceId(e.target.value);
                        const svc = cleaningServices.find((s) => s.id === e.target.value);
                        if (svc) setDraftSizeId(svc.sizes[0].id);
                      }}
                    >
                      {cleaningServices.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Size</label>
                    <select value={draftSizeId} onChange={(e) => setDraftSizeId(e.target.value)}>
                      {(cleaningServices.find((s) => s.id === draftServiceId)?.sizes || []).map((sz) => (
                        <option key={sz.id} value={sz.id}>{sz.label}, {money(sz.price)}</option>
                      ))}
                    </select>
                  </div>
                  <div><label>Date</label><input type="date" value={draftBookingDate} onChange={(e) => setDraftBookingDate(e.target.value)} /></div>
                  <div><label>Time</label><input type="time" value={draftBookingTime} onChange={(e) => setDraftBookingTime(e.target.value)} /></div>
                  <div><label>Customer name</label><input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} /></div>
                  <div><label>Phone</label><input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} /></div>
                  <div style={{ gridColumn: "1 / -1" }}><label>Address</label><input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} /></div>
                  <div>
                    <label>Confirmed price (₦)</label>
                    <input
                      type="number" step="500"
                      placeholder={String(cleaningServices.find((s) => s.id === draftServiceId)?.sizes.find((sz) => sz.id === draftSizeId)?.price || 0)}
                      value={draftPayable}
                      onChange={(e) => setDraftPayable(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="rw-btn rw-btn-rainbow" onClick={placeDraftBooking} disabled={placingDraft}>
                    {placingDraft ? "Placing..." : "Place Booking"}
                  </button>
                </div>
              </div>
            )}

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
                    <td>
                      {canEditOrderContent && !b.printed ? (
                        <input type="number" step="500" style={{ width: 90, padding: "6px 8px" }} value={b.payable} onChange={(e) => updateBookingPayable(b.id, e.target.value)} />
                      ) : (
                        <span style={{ fontWeight: 700 }}>{money(b.payable)}</span>
                      )}
                    </td>
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
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => openPrintSlip(b, currentUser, () => markBookingPrinted(b.id))} title="Print slip"><Printer size={13} /></button>
                      {canDeleteOrder(b) && (
                        <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveBooking(b.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button>
                      )}
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
              <div style={{ display: "flex", gap: 8 }}>
                <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={() => openDraft(draftType === "shop" ? null : "shop")}>
                  {draftType === "shop" ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Walk-In Sale</>}
                </button>
                {todaysShopOrders.length > 0 && (
                  <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysShopOrders}>
                    <RefreshCw size={14} /> Clear today's list
                  </button>
                )}
              </div>
            </div>

            {draftType === "shop" && (
              <div className="rw-card" style={{ marginBottom: 20, background: "var(--ice)" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Walk-In Shop Sale — Draft</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                  <div style={{ flex: "1 1 240px" }}>
                    <label>Product</label>
                    <select value={draftProductId} onChange={(e) => setDraftProductId(e.target.value)}>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}, {money(p.price)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Qty</label>
                    <input type="number" min="1" style={{ width: 70 }} value={draftProductQty} onChange={(e) => setDraftProductQty(Number(e.target.value))} />
                  </div>
                  <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDraftProductLine}><Plus size={13} /> Add</button>
                </div>

                {draftItems.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    {draftItems.map((i) => (
                      <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13.5 }}>
                        <span>{i.name} × {i.qty}</span>
                        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {money(i.price * i.qty)}
                          <button className="rw-icon-btn" onClick={() => removeDraftItem(i.id)}><Trash2 size={13} color="#e0473f" /></button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rw-form-grid" style={{ marginBottom: 12 }}>
                  <div><label>Customer name</label><input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} /></div>
                  <div><label>Phone</label><input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} /></div>
                </div>
                <div className="rw-pill-group" style={{ marginBottom: 12 }}>
                  <button className={`rw-pill ${draftMode === "pickup" ? "active" : ""}`} onClick={() => setDraftMode("pickup")}>Pickup in store</button>
                  <button className={`rw-pill ${draftMode === "delivery" ? "active" : ""}`} onClick={() => setDraftMode("delivery")}>Delivery</button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: 15 }}>Total: {money(draftSubtotal)}</b>
                  <button className="rw-btn rw-btn-rainbow" onClick={placeDraftShopOrder}>Place Order</button>
                </div>
              </div>
            )}

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
                      <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => openPrintSlip(o, currentUser, () => markShopPrinted(o.id))} title="Print slip"><Printer size={13} /></button>
                      {canDeleteOrder(o) && (
                        <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => archiveShopOrder(o.id)} title="Remove from today's list (kept in History)"><Archive size={13} /></button>
                      )}
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
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Changes here instantly update prices across all customer-facing pages. Add, rename, reprice or delete anything below.</p>
              </div>
            </div>

            <h3 style={{ fontSize: 16, marginTop: 16, marginBottom: 8 }}>Self-Wash Rates</h3>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Service Name</th><th>Price (₦/kg)</th><th></th></tr></thead>
              <tbody>
                {selfWashRates.map((r) => (
                  <tr key={r.id}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={r.label} onChange={(e) => updateSelfWash(r.id, "label", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={r.price} onChange={(e) => updateSelfWash(r.id, "price", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteSelfWash(r.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New service name" style={{ width: "100%", padding: "6px 8px" }} value={newSelfWash.label} onChange={(e) => setNewSelfWash((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Price" style={{ width: 120, padding: "6px 8px" }} value={newSelfWash.price} onChange={(e) => setNewSelfWash((s) => ({ ...s, price: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addSelfWash}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Staff-Wash Rates</h3>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Service Name</th><th>Price (₦/kg)</th><th></th></tr></thead>
              <tbody>
                {staffWashRates.map((r) => (
                  <tr key={r.id}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={r.label} onChange={(e) => updateStaffWash(r.id, "label", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={r.price} onChange={(e) => updateStaffWash(r.id, "price", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteStaffWash(r.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New service name" style={{ width: "100%", padding: "6px 8px" }} value={newStaffWash.label} onChange={(e) => setNewStaffWash((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Price" style={{ width: 120, padding: "6px 8px" }} value={newStaffWash.price} onChange={(e) => setNewStaffWash((s) => ({ ...s, price: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addStaffWash}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Dry Cleaning Items</h3>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Item Name</th><th>Regular (₦)</th><th>Deep Clean (₦)</th><th></th></tr></thead>
              <tbody>
                {dryCleanItems.map((item) => (
                  <tr key={item.id}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={item.label} onChange={(e) => updateDryClean(item.id, "label", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 110, padding: "6px 8px" }} value={item.regular} onChange={(e) => updateDryClean(item.id, "regular", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 110, padding: "6px 8px" }} value={item.deep} onChange={(e) => updateDryClean(item.id, "deep", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteDryClean(item.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New item name" style={{ width: "100%", padding: "6px 8px" }} value={newDryClean.label} onChange={(e) => setNewDryClean((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Regular" style={{ width: 110, padding: "6px 8px" }} value={newDryClean.regular} onChange={(e) => setNewDryClean((s) => ({ ...s, regular: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Deep" style={{ width: 110, padding: "6px 8px" }} value={newDryClean.deep} onChange={(e) => setNewDryClean((s) => ({ ...s, deep: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDryClean}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Shoe Care Items</h3>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Item Name</th><th>Regular (₦)</th><th>Deep Clean (₦)</th><th>Minor Repairs (₦)</th><th></th></tr></thead>
              <tbody>
                {shoeCareItems.map((item) => (
                  <tr key={item.id}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={item.label} onChange={(e) => updateShoeCare(item.id, "label", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 100, padding: "6px 8px" }} value={item.regular} onChange={(e) => updateShoeCare(item.id, "regular", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 100, padding: "6px 8px" }} value={item.deep} onChange={(e) => updateShoeCare(item.id, "deep", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 100, padding: "6px 8px" }} value={item.repair} onChange={(e) => updateShoeCare(item.id, "repair", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteShoeCare(item.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New item name" style={{ width: "100%", padding: "6px 8px" }} value={newShoeCare.label} onChange={(e) => setNewShoeCare((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Regular" style={{ width: 100, padding: "6px 8px" }} value={newShoeCare.regular} onChange={(e) => setNewShoeCare((s) => ({ ...s, regular: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Deep" style={{ width: 100, padding: "6px 8px" }} value={newShoeCare.deep} onChange={(e) => setNewShoeCare((s) => ({ ...s, deep: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Repair" style={{ width: 100, padding: "6px 8px" }} value={newShoeCare.repair} onChange={(e) => setNewShoeCare((s) => ({ ...s, repair: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addShoeCare}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Zap size={15} /> Express Services</h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -4, marginBottom: 10 }}>Covers Laundry, Upholstery and Cleaning — shown as its own category on Order Laundry.</p>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Service Name</th><th>Price (₦)</th><th></th></tr></thead>
              <tbody>
                {expressServices.map((r) => (
                  <tr key={r.id}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={r.label} onChange={(e) => updateExpress(r.id, "label", e.target.value)} /></td>
                    <td><input type="number" step="100" style={{ width: 120, padding: "6px 8px" }} value={r.price} onChange={(e) => updateExpress(r.id, "price", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteExpress(r.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="e.g. Express Duvet" style={{ width: "100%", padding: "6px 8px" }} value={newExpress.label} onChange={(e) => setNewExpress((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="number" placeholder="Price" style={{ width: 120, padding: "6px 8px" }} value={newExpress.price} onChange={(e) => setNewExpress((s) => ({ ...s, price: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addExpress}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Shop & Add-on Products</h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -4, marginBottom: 10 }}>Grouped by category — Detergents, Starch, Bleach, Nylon, Bags, Extras.</p>
            {ADDON_GROUPS.map((group) => {
              const groupItems = addonProducts.filter((p) => p.group === group);
              return (
                <div key={group} style={{ marginBottom: 20 }}>
                  <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--blue)", marginBottom: 8 }}>{group}</h4>
                  <table className="rw-table">
                    <thead><tr><th>Product</th><th>Price (₦)</th><th></th></tr></thead>
                    <tbody>
                      {groupItems.map((ap) => (
                        <tr key={ap.id}>
                          <td><input style={{ width: "100%", padding: "6px 8px" }} value={ap.label} onChange={(e) => updateAddon(ap.id, "label", e.target.value)} /></td>
                          <td><input type="number" step="50" style={{ width: 110, padding: "6px 8px" }} value={ap.price} onChange={(e) => updateAddon(ap.id, "price", e.target.value)} /></td>
                          <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteAddon(ap.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                        </tr>
                      ))}
                      {groupItems.length === 0 && (
                        <tr><td colSpan={3} style={{ color: "var(--ink-soft)", fontSize: 13, padding: "10px 8px" }}>No products in this category yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}

            <h4 style={{ fontSize: 14, marginBottom: 10 }}>Add a new product</h4>
            <div className="rw-form-grid" style={{ marginBottom: 30, alignItems: "end" }}>
              <div><label>Product name</label><input placeholder="e.g. Comfort Fabric Softener" value={newAddon.label} onChange={(e) => setNewAddon((s) => ({ ...s, label: e.target.value }))} /></div>
              <div><label>Price (₦)</label><input type="number" placeholder="2500" value={newAddon.price} onChange={(e) => setNewAddon((s) => ({ ...s, price: e.target.value }))} /></div>
              <div>
                <label>Category</label>
                <select value={newAddon.group} onChange={(e) => setNewAddon((s) => ({ ...s, group: e.target.value }))}>
                  {ADDON_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button className="rw-btn rw-btn-primary" onClick={addAddon}><Plus size={15} /> Add Product</button>
            </div>
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
                        <span style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="rw-btn rw-btn-ghost rw-btn-sm"
                            onClick={() => handleResetPassword(emp)}
                            disabled={resettingId === emp.id}
                            title="Generate a new password for this account"
                          >
                            <KeyRound size={13} /> {resettingId === emp.id ? "Resetting..." : "Reset Password"}
                          </button>
                          <button
                            type="button"
                            className="rw-btn rw-btn-ghost rw-btn-sm"
                            onClick={() => setConfirmDeleteEmp(emp)}
                            title="Permanently delete this account"
                          >
                            <Trash2 size={13} color="#e0473f" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {confirmDeleteEmp && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(7,26,47,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
                <div style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 400, width: "90%" }}>
                  <h3 style={{ fontSize: 16, marginBottom: 10 }}>Permanently delete this account?</h3>
                  <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 20 }}>
                    <b>{confirmDeleteEmp.fullName}</b> ({confirmDeleteEmp.email}) will lose access immediately and this
                    cannot be undone. Only use this when someone has genuinely left the company — for a forgotten
                    password, use "Reset Password" instead.
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => setConfirmDeleteEmp(null)}>Cancel</button>
                    <button
                      className="rw-btn rw-btn-primary rw-btn-sm"
                      style={{ background: "var(--bad)" }}
                      onClick={() => handleDeleteEmployee(confirmDeleteEmp)}
                      disabled={deletingEmpId === confirmDeleteEmp.id}
                    >
                      {deletingEmpId === confirmDeleteEmp.id ? "Deleting..." : "Yes, delete permanently"}
                    </button>
                  </div>
                </div>
              </div>
            )}
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