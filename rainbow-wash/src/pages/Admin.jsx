import { useEffect, useState } from "react";
import {
  Lock, LayoutDashboard, Truck, Calendar, Package, Plus, Minus, ShoppingBag, History, Search,
  Archive, Shirt, RefreshCw, DollarSign, BarChart3, Printer, LogOut, User, Eye, EyeOff, KeyRound, Shield, Trash2,
  Zap, ChevronDown, ChevronUp, X, Star,
} from "lucide-react";
import {
  TRACK_STAGES, PAYMENT_STATUSES, PAYMENT_METHODS, ADDON_GROUPS, DELIVERY_FEE, VAT_RATE,
} from "../data/constants";
import { money, formatPlacedAt, matchesRange, genRef, roundedMoneyParts } from "../utils/format";
import { useApp } from "../context/AppContext";
import { openPrintSlip, openExpressQuotePrintSlip } from "../utils/print";
import { openSubscriptionPrintSlip } from "../utils/subscriptionPrint";
import {
  loginAdmin, logoutUser, createEmployee, fetchEmployees, resetEmployeePassword, deleteEmployee, changePassword,
  createProduct, updateProduct, deleteProduct, createBooking, updateBooking,
  createOrder, updateOrder, deleteOrder, createShopOrder, updateShopOrder, deleteShopOrder, deleteBooking,
  createLaundryService, updateLaundryService, deleteLaundryService,
  fetchExpressQuoteRequests, updateExpressQuoteRequest,
  fetchManageSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan,
  fetchSubscriptionPurchases, createSubscriptionPurchase,
  updateSubscriptionPurchasePaymentStatus, markSubscriptionPurchasePrinted,
} from "../api/api";

const MIN_UNIT = 5;
const RESTOCK_STEP = 5;
const RANGES = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "year", label: "This Year" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Pick a date" },
];
const BOOKING_STAGES = ["Pending Quote", "Confirmed", "Completed", "Cancelled"];

export default function Admin() {
  const {
    laundryOrders, setLaundryOrders, bookings, setBookings, shopOrders, setShopOrders,
    products, setProducts, customServiceCategories,
    selfWashRates, staffWashRates, dryCleanItems, shoeCareItems, addonProducts, expressServices, cleaningServices,
    refreshServices,
    currentUser, setCurrentUser, refreshAll, refreshSubscriptionPlans, subscriptionPlans,
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
  // Only Manager/Admin can clear the active lists (per the PRD: Staff must
  // never be able to make orders/bookings disappear from the working view).
  const canClearLists = role === "Manager" || role === "Admin";

  const defaultTab = canSeeOverview ? "overview" : "orders";
  const [tab, setTab] = useState(defaultTab);

  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState(MIN_UNIT);
  const [newStatus, setNewStatus] = useState("Active");
  const [addingProduct, setAddingProduct] = useState(false);
  const [pricingDrafts, setPricingDrafts] = useState({});
  const [customServiceDrafts, setCustomServiceDrafts] = useState({});
  const [newCustomService, setNewCustomService] = useState({ category: "", name: "", description: "", pricingUnit: "Per item", price: "" });

  // Subscription plans have their own state, separate from laundry pricing.
  const [managedSubscriptionPlans, setManagedSubscriptionPlans] = useState([]);
  const [subscriptionDraft, setSubscriptionDraft] = useState({
    name: "", price: "", duration: "", kgAllowance: "", covers: "", active: true,
  });
  const [editingSubscriptionId, setEditingSubscriptionId] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [confirmDeleteSubscriptionId, setConfirmDeleteSubscriptionId] = useState(null);

  const [subscriptionPurchases, setSubscriptionPurchases] = useState([]);
  const [subscriptionPurchaseLoading, setSubscriptionPurchaseLoading] = useState(false);
  const [subscriptionPurchaseSaving, setSubscriptionPurchaseSaving] = useState(false);
  const [subscriptionPurchaseDraft, setSubscriptionPurchaseDraft] = useState({
    customerName: "", customerPhone: "", planId: "", startDate: "", expiryDate: "", paymentMethod: "Transfer",
  });
  const [updatingSubscriptionPurchaseId, setUpdatingSubscriptionPurchaseId] = useState(null);

  // "Add new item" input state, one per pricing category — kept minimal since
  // it's just a label/price pair (plus a group for add-ons) before Add is clicked.
  const [newSelfWash, setNewSelfWash] = useState({ label: "", price: "" });
  const [newStaffWash, setNewStaffWash] = useState({ label: "", price: "" });
  const [newDryClean, setNewDryClean] = useState({ label: "", regular: "", deep: "" });
  const [newShoeCare, setNewShoeCare] = useState({ label: "", regular: "", deep: "", repair: "" });
  const [newExpress, setNewExpress] = useState({
    label: "",
    description: "",
    options: [{
      turnaround: "Same-day",
      pricingUnit: "Per job",
      price: "",
      available: true,
    }],
  });
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
  const [draftEmail, setDraftEmail] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftFulfilment, setDraftFulfilment] = useState("dropoff");
  const [draftAddress, setDraftAddress] = useState("");
  const [draftDeliveryFee, setDraftDeliveryFee] = useState(DELIVERY_FEE);
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
  const [draftExOptionId, setDraftExOptionId] = useState("");
  const [draftExQty, setDraftExQty] = useState(1);
  const [draftCustomServiceId, setDraftCustomServiceId] = useState("");
  const [draftCustomQty, setDraftCustomQty] = useState(1);
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
  const [historyDate, setHistoryDate] = useState("");
  const [expressQuoteRequests, setExpressQuoteRequests] = useState([]);
  const [expressQuotesLoading, setExpressQuotesLoading] = useState(false);
  const [editingExpressQuoteId, setEditingExpressQuoteId] = useState(null);
  const [expressQuotePriceDraft, setExpressQuotePriceDraft] = useState("");
  const [expressQuoteStatusDraft, setExpressQuoteStatusDraft] = useState("Quoted");
  const [savingExpressQuoteId, setSavingExpressQuoteId] = useState(null); // used only when historyRange === "custom"
  const [reportsRange, setReportsRange] = useState("month");

  // Turns the backend's "ADMIN" / "MANAGER" / "STAFF" (Java enum .name()) into the
  // "Admin" / "Manager" / "Staff" strings the rest of this dashboard's role checks
  // (canSeeOverview, canEditPricing, canSeeReports) already expect.
  const normalizeRole = (backendRole) => {
    if (!backendRole) return "Staff";
    return backendRole.charAt(0).toUpperCase() + backendRole.slice(1).toLowerCase();
  };

  const getExpressPricingOptions = (service) => {
    if (!service) return [];
    const configuredOptions = Array.isArray(service.expressPricingOptions)
      ? service.expressPricingOptions
      : [];
    const options = configuredOptions.length
      ? configuredOptions
      : [{
          id: `legacy-${service.id}`,
          turnaround: service.turnaround || "Same-day",
          pricingUnit: service.pricingUnit || "Per job",
          price: service.price,
          available: true,
        }];
    return options.filter((option) => option.available !== false);
  };

  const getExpressOptionKey = (option, index) =>
    String(option.id ?? `option-${index}`);

  const isExpressPerKg = (pricingUnit) =>
    String(pricingUnit || "").toLowerCase().replace(/[^a-z]/g, "").includes("kg");

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

  // Pricing (and Shop products) load from the backend a moment after this
  // page first renders — before that, walk-in draft pickers default to
  // whatever's available at that instant. Without this, a selection made (or
  // defaulted) before the real data arrives would silently point at nothing
  // once it does, and "Add" would just do nothing with no visible error. This
  // keeps every draft picker's selected id valid any time its underlying
  // price list changes, self-healing automatically rather than getting stuck.
  useEffect(() => {
    const source = draftCategory === "selfwash" ? selfWashRates : staffWashRates;
    if (source.length && !source.find((r) => String(r.id) === String(draftWashRateId))) setDraftWashRateId(source[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftCategory, selfWashRates, staffWashRates]);

  useEffect(() => {
    if (dryCleanItems.length && !dryCleanItems.find((i) => String(i.id) === String(draftDcItemId))) setDraftDcItemId(dryCleanItems[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryCleanItems]);

  useEffect(() => {
    if (shoeCareItems.length && !shoeCareItems.find((i) => String(i.id) === String(draftScItemId))) setDraftScItemId(shoeCareItems[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoeCareItems]);

  useEffect(() => {
    const availableServices = expressServices.filter((service) => service.available !== false);
    const selectedService =
      availableServices.find((service) => String(service.id) === String(draftExItemId)) ||
      availableServices[0];
    const nextServiceId = selectedService ? String(selectedService.id) : "";

    if (String(draftExItemId) !== nextServiceId) {
      setDraftExItemId(nextServiceId);
    }

    const options = getExpressPricingOptions(selectedService);
    const selectedOptionExists = options.some(
      (option, index) => getExpressOptionKey(option, index) === String(draftExOptionId)
    );
    if (!selectedOptionExists) {
      setDraftExOptionId(options.length ? getExpressOptionKey(options[0], 0) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expressServices, draftExItemId, draftExOptionId]);

  // This one was previously placed after the `if (!currentUser)` early return
  // below — a genuine Rules-of-Hooks violation, since React then saw a
  // different number of hooks depending on whether someone was logged in,
  // crashing with "Rendered fewer hooks than expected" on every login/logout
  // transition. Computed inline here (rather than depending on the
  // shopPickerItems variable defined further down) so it can safely live
  // above the early return alongside its four sibling effects.
  useEffect(() => {
    const pickerItems = [
      ...products.filter((p) => (p.status || "Active") === "Active").map((p) => ({ id: p.id })),
      ...addonProducts.map((a) => ({ id: a.id })),
    ];
    if (pickerItems.length && !pickerItems.find((p) => String(p.id) === String(draftProductId))) setDraftProductId(pickerItems[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, addonProducts]);

  const loadExpressQuoteRequests = async (quiet = false) => {
    setExpressQuotesLoading(true);
    try {
      const rows = await fetchExpressQuoteRequests();
      setExpressQuoteRequests(Array.isArray(rows) ? rows : []);
      return true;
    } catch (error) {
      if (!quiet) notify(error?.message || "Could not load Express quote requests");
      return false;
    } finally {
      setExpressQuotesLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) loadExpressQuoteRequests(true);
    else setExpressQuoteRequests([]);
  }, [currentUser]);

  const loadSubscriptionPlans = async (quiet = false) => {
    setSubscriptionLoading(true);
    try {
      const rows = await fetchManageSubscriptionPlans();
      setManagedSubscriptionPlans(Array.isArray(rows) ? rows : []);
      return true;
    } catch (error) {
      if (!quiet) notify(error?.message || "Could not load subscription plans");
      return false;
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadSubscriptionPurchases(true);
      if (tab === "subscriptions" && canEditPricing) loadSubscriptionPlans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, currentUser, canEditPricing]);

  const loadSubscriptionPurchases = async (quiet = false) => {
    setSubscriptionPurchaseLoading(true);
    try {
      const rows = await fetchSubscriptionPurchases();
      setSubscriptionPurchases(Array.isArray(rows) ? rows : []);
      return true;
    } catch (error) {
      if (!quiet) notify(error?.message || "Could not load subscription purchases");
      return false;
    } finally {
      setSubscriptionPurchaseLoading(false);
    }
  };

  const createWalkInSubscriptionPurchase = async () => {
    const customerName = subscriptionPurchaseDraft.customerName.trim();
    const customerPhone = subscriptionPurchaseDraft.customerPhone.trim();
    const planId = Number(subscriptionPurchaseDraft.planId);
    const { startDate, expiryDate, paymentMethod } = subscriptionPurchaseDraft;

    if (!customerName || !customerPhone || !subscriptionPurchaseDraft.planId || !startDate || !expiryDate) {
      notify("Please complete all required subscription purchase fields");
      return;
    }

    if (!Number.isFinite(planId) || !planId) {
      notify("Please select a valid subscription plan");
      return;
    }

    if (expiryDate <= startDate) {
      notify("The expiry date must be after the start date");
      return;
    }

    const selectedPlan = (subscriptionPlans || []).find(
      (plan) => Number(plan.id) === planId
    );

    if (!selectedPlan || selectedPlan.active === false || !(Number(selectedPlan.kgAllowance) > 0)) {
      notify("Please select an active subscription plan with a valid KG allowance");
      return;
    }

    setSubscriptionPurchaseSaving(true);
    try {
      const created = await createSubscriptionPurchase({
        customerName,
        customerPhone,
        planId,
        startDate,
        expiryDate,
        paymentMethod,
      });

      setSubscriptionPurchases((previous) => [created, ...previous]);
      setSubscriptionPurchaseDraft({
        customerName: "", customerPhone: "", planId: "", startDate: "", expiryDate: "", paymentMethod: "Transfer",
      });
      notify("Subscription purchase recorded successfully");
    } catch (error) {
      notify(error?.message || "Could not record subscription purchase");
    } finally {
      setSubscriptionPurchaseSaving(false);
    }
  };

  const updateWalkInSubscriptionPayment = async (purchase, paymentStatus) => {
    if (!purchase?.dbId) {
      notify("This subscription purchase is missing its database ID");
      return;
    }

    setUpdatingSubscriptionPurchaseId(purchase.dbId);
    try {
      const updated = await updateSubscriptionPurchasePaymentStatus(purchase.dbId, paymentStatus);
      setSubscriptionPurchases((previous) =>
        previous.map((item) => item.dbId === purchase.dbId ? updated : item)
      );
      notify("Subscription payment status updated");
    } catch (error) {
      notify(error?.message || "Could not update subscription payment status");
    } finally {
      setUpdatingSubscriptionPurchaseId(null);
    }
  };

  const printSubscriptionPurchase = (purchase) => {
    if (!purchase?.dbId) {
      notify("This subscription purchase is missing its database ID");
      return;
    }

    openSubscriptionPrintSlip(purchase, currentUser, async () => {
      try {
        await markSubscriptionPurchasePrinted(purchase.dbId);
        setSubscriptionPurchases((previous) =>
          previous.map((item) =>
            item.dbId === purchase.dbId ? { ...item, printed: true } : item
          )
        );
      } catch (error) {
        notify(error?.message || "Receipt printed, but its print status could not be saved");
      }
    });
  };

  const resetSubscriptionDraft = () => {
    setSubscriptionDraft({ name: "", price: "", duration: "", kgAllowance: "", covers: "", active: true });
    setEditingSubscriptionId(null);
  };

  const editSubscriptionPlan = (plan) => {
    setSubscriptionDraft({
      name: plan.name || "",
      price: String(plan.price ?? ""),
      duration: plan.duration || "",
      kgAllowance: plan.kgAllowance == null ? "" : String(plan.kgAllowance),
      covers: plan.covers || "",
      active: Boolean(plan.active),
    });
    setEditingSubscriptionId(plan.id);
    setConfirmDeleteSubscriptionId(null);
  };

  const saveSubscriptionPlan = async () => {
    const payload = {
      name: subscriptionDraft.name.trim(),
      price: Number(subscriptionDraft.price),
      duration: subscriptionDraft.duration.trim(),
      kgAllowance: Number(subscriptionDraft.kgAllowance),
      covers: subscriptionDraft.covers.trim(),
      active: Boolean(subscriptionDraft.active),
    };

    if (!payload.name || !payload.duration || !payload.covers ||
        !Number.isFinite(payload.price) || payload.price <= 0 ||
        !Number.isFinite(payload.kgAllowance) || payload.kgAllowance <= 0) {
      notify("Enter a plan name, valid price, duration, KG allowance and coverage.");
      return;
    }

    setSubscriptionSaving(true);
    try {
      if (editingSubscriptionId !== null) {
        await updateSubscriptionPlan(editingSubscriptionId, payload);
        notify("Subscription plan updated.");
      } else {
        await createSubscriptionPlan(payload);
        notify("Subscription plan added.");
      }
      resetSubscriptionDraft();
      await loadSubscriptionPlans(true);
      await refreshSubscriptionPlans();
    } catch (error) {
      notify(error?.message || "Could not save subscription plan");
    } finally {
      setSubscriptionSaving(false);
    }
  };

  const toggleSubscriptionPlan = async (plan) => {
    try {
      await updateSubscriptionPlan(plan.id, {
        name: plan.name,
        price: Number(plan.price),
        duration: plan.duration,
        kgAllowance: Number(plan.kgAllowance),
        covers: plan.covers,
        active: !plan.active,
      });
      await loadSubscriptionPlans(true);
      await refreshSubscriptionPlans();
      notify(plan.active ? "Subscription plan deactivated." : "Subscription plan activated.");
    } catch (error) {
      notify(error?.message || "Could not update subscription plan");
    }
  };

  const removeSubscriptionPlan = async (id) => {
    try {
      await deleteSubscriptionPlan(id);
      setConfirmDeleteSubscriptionId(null);
      if (editingSubscriptionId === id) resetSubscriptionDraft();
      await loadSubscriptionPlans(true);
      await refreshSubscriptionPlans();
      notify("Subscription plan deleted.");
    } catch (error) {
      notify(error?.message || "Could not delete subscription plan");
    }
  };

  const beginExpressQuoteEdit = (request) => {
    setEditingExpressQuoteId(request.dbId);
    setExpressQuotePriceDraft(
      request.quotedPrice == null ? "" : String(request.quotedPrice)
    );
    setExpressQuoteStatusDraft(
      request.status === "Pending Quote" ? "Quoted" : (request.status || "Quoted")
    );
  };

  const saveExpressQuote = async (request) => {
    const price = Number(expressQuotePriceDraft);
    if (!Number.isFinite(price) || price <= 0) {
      notify("Enter a quote price greater than zero before saving");
      return;
    }
    if (!request.dbId) {
      notify("Quote database ID missing. Refresh and try again.");
      return;
    }
    setSavingExpressQuoteId(request.dbId);
    try {
      const saved = await updateExpressQuoteRequest(request.dbId, {
        quotedPrice: price,
        status: expressQuoteStatusDraft,
      });
      setExpressQuoteRequests((previous) =>
        previous.map((item) => item.dbId === saved.dbId ? { ...item, ...saved } : item)
      );
      setEditingExpressQuoteId(null);
      notify("Express quote saved");
    } catch (error) {
      notify(error?.message || "Could not save the Express quote");
    } finally {
      setSavingExpressQuoteId(null);
    }
  };

  const markExpressQuotePrinted = async (request) => {
    if (!request.dbId) {
      notify("Quote database ID missing; printed status was not saved");
      return;
    }
    try {
      const saved = await updateExpressQuoteRequest(request.dbId, { printed: true });
      setExpressQuoteRequests((previous) =>
        previous.map((item) => item.dbId === saved.dbId ? { ...item, ...saved } : item)
      );
    } catch (error) {
      notify(error?.message || "Printed status could not be saved");
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

        </div>
      </div>
    );
  }

  const lowStock = products.filter((p) => p.stock <= 5).length;

  // Active lists exclude archived records. Keep these filters separate from
  // Overview counts so clearing a list never removes today's placed orders
  // from the daily totals.
  const todaysOrders = laundryOrders.filter((o) => !o.archived);
  const todaysBookings = bookings.filter((b) => !b.archived);
  const todaysShopOrders = shopOrders.filter((o) => !o.archived);

  const wasPlacedToday = (record) => {
    if (!record?.placedAt) return false;
    const placed = new Date(record.placedAt);
    const now = new Date();
    return !Number.isNaN(placed.getTime()) &&
      placed.getFullYear() === now.getFullYear() &&
      placed.getMonth() === now.getMonth() &&
      placed.getDate() === now.getDate();
  };

  const overviewOrdersToday = laundryOrders.filter(wasPlacedToday);
  const overviewBookingsToday = bookings.filter(wasPlacedToday);
  const overviewShopOrdersToday = shopOrders.filter(wasPlacedToday);
  const overviewSubscriptionsToday = subscriptionPurchases.filter(wasPlacedToday);

  const revenueToday =
    overviewOrdersToday.reduce((s, o) => s + (Number(o.total) || 0), 0) +
    overviewBookingsToday.reduce((s, b) => s + (Number(b.payable) || 0), 0) +
    overviewShopOrdersToday.reduce((s, o) => s + (Number(o.total) || 0), 0) +
    overviewSubscriptionsToday.reduce((s, purchase) => s + (Number(purchase.total) || 0), 0);

  // --- Laundry order field updates: optimistic local update, then persist to
  // the backend if this record actually has a real DB id (records that only
  // ever existed locally, e.g. from before the backend was wired up, or if an
  // API call failed at creation time, are simply skipped here, not an error). ---
  const persistOrder = (id, patch) => {
    const target = laundryOrders.find((o) => String(o.id) === String(id));
    if (!target?.dbId) return;
    updateOrder(target.dbId, patch).catch(() => notify("Saved locally, but failed to sync to the server"));
  };
  const updateOrderStatus = (id, status) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o))); persistOrder(id, { status }); };
  const updateOrderTotal = (id, total) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, total: Number(total) } : o))); persistOrder(id, { total: Number(total) }); };
  const updateOrderPayment = (id, paymentStatus) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentStatus } : o))); persistOrder(id, { paymentStatus }); };
  const updateOrderMethod = (id, paymentMethod) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentMethod } : o))); persistOrder(id, { paymentMethod }); };

  const persistBookingUpdate = (id, patch) => {
    const target = bookings.find((b) => String(b.id) === String(id));
    if (!target?.dbId) return;
    updateBooking(target.dbId, patch).catch(() => notify("Saved locally, but failed to sync to the server"));
  };
  const updateBookingStatus = (id, status) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, status } : b))); persistBookingUpdate(id, { status }); };
  const updateBookingPayable = (id, payable) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, payable: Number(payable) } : b))); persistBookingUpdate(id, { payable: Number(payable) }); };
  const updateBookingPayment = (id, paymentStatus) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, paymentStatus } : b))); persistBookingUpdate(id, { paymentStatus }); };
  const updateBookingMethod = (id, paymentMethod) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, paymentMethod } : b))); persistBookingUpdate(id, { paymentMethod }); };

  const persistShopOrder = (id, patch) => {
    const target = shopOrders.find((o) => String(o.id) === String(id));
    if (!target?.dbId) return;
    updateShopOrder(target.dbId, patch).catch(() => notify("Saved locally, but failed to sync to the server"));
  };
  const updateShopOrderStatus = (id, status) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o))); persistShopOrder(id, { status }); };
  const updateShopPayment = (id, paymentStatus) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentStatus } : o))); persistShopOrder(id, { paymentStatus }); };
  const updateShopMethod = (id, paymentMethod) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, paymentMethod } : o))); persistShopOrder(id, { paymentMethod }); };

  // --- Inventory: local field edits (as-you-type, no network call) ---
  // Shop products (this Inventory tab) and the Pricing tab's add-on catalog
  // are now two separate real systems (Product vs LaundryService) — no more
  // cross-syncing a Shop edit into the pricing catalog automatically.
  const updateProductField = (id, field, value) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
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
       const updated = { ...products.find((p) => String(p.id) === String(id)), status };
    setProducts((ps) => ps.map((p) => (p.id === id ? updated : p)));
    persistProduct(updated);
  };

  const restock = (id) => {
    const target = products.find((p) => String(p.id) === String(id));
    if (!target) return;
    const updated = { ...target, stock: target.stock + RESTOCK_STEP };
    setProducts((ps) => ps.map((p) => (p.id === id ? updated : p)));
    persistProduct(updated);
  };

  const removeProduct = async (id) => {
    try {
      await deleteProduct(id);
      setProducts((ps) => ps.filter((p) => p.id !== id));
    } catch (err) {
      notify("Failed to delete product");
    }
  };

  const archiveOrder = (id) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o))); persistOrder(id, { archived: true }); };
  const archiveBooking = (id) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, archived: true } : b))); persistBookingUpdate(id, { archived: true }); };
  const archiveShopOrder = (id) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, archived: true } : o))); persistShopOrder(id, { archived: true }); };

  // Manual clearing only — Manager/Admin decide when to archive everything
  // currently open (typically at the start of a new day), Staff cannot.
  // These bulk-clear actions previously only updated local state, never
  // telling the backend anything had changed — so the very next 20-second
  // background sync would fetch the still-unarchived backend data and
  // silently un-clear everything, making it look like the clear "went and
  // came back." Each item now gets the same real PATCH the individual
  // per-row archive button already sends, so the change actually sticks.
  const clearTodaysOrders = () => {
    laundryOrders.forEach((o) => { if (!o.archived) persistOrder(o.id, { archived: true }); });
    setLaundryOrders((os) => os.map((o) => (!o.archived ? { ...o, archived: true } : o)));
  };
  const clearTodaysBookings = () => {
    bookings.forEach((b) => { if (!b.archived) persistBookingUpdate(b.id, { archived: true }); });
    setBookings((bs) => bs.map((b) => (!b.archived ? { ...b, archived: true } : b)));
  };
  const clearTodaysShopOrders = () => {
    shopOrders.forEach((o) => { if (!o.archived) persistShopOrder(o.id, { archived: true }); });
    setShopOrders((os) => os.map((o) => (!o.archived ? { ...o, archived: true } : o)));
  };
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

  // Pricing edits remain local while typing; only blur saves to the API.
  const pricingKey = (category, id) => `${category}:${id}`;
  const editPricingField = (category, id, field, value) => {
    const key = pricingKey(category, id);
    setPricingDrafts((drafts) => ({
      ...drafts,
      [key]: { ...(drafts[key] || {}), [field]: value },
    }));
  };
  const pricingValue = (item, field, category) =>
    pricingDrafts[pricingKey(category, item.id)]?.[field] ?? item[field];

  const savePricingItem = async (item, category, fields) => {
    const key = pricingKey(category, item.id);
    const draft = pricingDrafts[key];
    if (!draft) return;

    const next = { ...item, ...draft };
    let payload;

    if (category === "Express") {
      const sourceOptions =
        Array.isArray(next.expressPricingOptions) && next.expressPricingOptions.length
          ? next.expressPricingOptions
          : [{
              turnaround: next.turnaround || "same-day",
              pricingUnit: next.pricingUnit || "PER_JOB",
              price: next.price,
              available: true,
            }];

      const options = sourceOptions.map((option) => ({
        turnaround: String(option.turnaround ?? "").trim(),
        pricingUnit: String(option.pricingUnit ?? "").trim(),
        price: Number(option.price),
        available: option.available !== false,
      }));

      if (
        !String(next.label ?? "").trim() ||
        options.length === 0 ||
        options.some((option) =>
          !option.turnaround ||
          !option.pricingUnit ||
          !Number.isFinite(option.price) ||
          option.price <= 0
        )
      ) {
        notify("Enter a service name and valid turnaround, pricing unit and positive price for every Express option.");
        return;
      }

      const firstOption = options[0];
      payload = {
        name: String(next.label).trim(),
        price: firstOption.price,
        category: "Express",
        stock: 5,
        available: next.available !== false,
        description: String(next.description ?? "").trim(),
        turnaround: firstOption.turnaround,
        pricingUnit: firstOption.pricingUnit,
        expressPricingOptions: options,
      };
    } else {
      const priceFields = fields.filter(
        (field) => !["label", "description", "turnaround", "pricingUnit"].includes(field)
      );

      if (
        !String(next.label ?? "").trim() ||
        priceFields.some((field) =>
          next[field] === "" ||
          !Number.isFinite(Number(next[field])) ||
          Number(next[field]) < 0
        )
      ) {
        notify("Enter a service name and valid non-negative prices before saving.");
        return;
      }

      payload = {
        name: String(next.label).trim(),
        price: Number(next.price ?? next.regular),
        category,
        stock: 5,
        available: true,
      };

      if (fields.includes("deep")) payload.deepPrice = Number(next.deep);
      if (fields.includes("repair")) payload.repairPrice = Number(next.repair);
    }

    try {
      await updateLaundryService(item.id, payload);
      setPricingDrafts((drafts) => {
        const copy = { ...drafts };
        delete copy[key];
        return copy;
      });
      await refreshServices();
      notify("Price changes saved.");
    } catch (err) {
      notify(err.message || "Failed to save. Your edits are still on screen.");
    }
  };

  const updateSelfWash = (id, field, value) => editPricingField("Self Wash", id, field, value);
  const updateStaffWash = (id, field, value) => editPricingField("Staff Wash", id, field, value);
  const updateDryClean = (id, field, value) => editPricingField("Dry Cleaning", id, field, value);
  const updateShoeCare = (id, field, value) => editPricingField("Shoe Care", id, field, value);
  const updateExpress = (id, field, value) => editPricingField("Express", id, field, value);
  const updateAddon = (id, field, value, category) => editPricingField(category, id, field, value);
  const deleteSelfWash = async (id) => {
    try { await deleteLaundryService(id); refreshServices(); } catch (err) { notify(err.message || "Failed to delete"); }
  };
  const addSelfWash = async () => {
    if (!newSelfWash.label.trim() || newSelfWash.price === "") return;
    try {
      await createLaundryService({ name: newSelfWash.label.trim(), price: Number(newSelfWash.price), category: "Self Wash", stock: 5, available: true });
      setNewSelfWash({ label: "", price: "" });
      refreshServices();
    } catch (err) { notify(err.message || "Failed to add"); }
  };

  const deleteStaffWash = async (id) => {
    try { await deleteLaundryService(id); refreshServices(); } catch (err) { notify(err.message || "Failed to delete"); }
  };
  const addStaffWash = async () => {
    if (!newStaffWash.label.trim() || newStaffWash.price === "") return;
    try {
      await createLaundryService({ name: newStaffWash.label.trim(), price: Number(newStaffWash.price), category: "Staff Wash", stock: 5, available: true });
      setNewStaffWash({ label: "", price: "" });
      refreshServices();
    } catch (err) { notify(err.message || "Failed to add"); }
  };

  const deleteDryClean = async (id) => {
    try { await deleteLaundryService(id); refreshServices(); } catch (err) { notify(err.message || "Failed to delete"); }
  };
  const addDryClean = async () => {
    if (!newDryClean.label.trim() || newDryClean.regular === "" || newDryClean.deep === "") return;
    try {
      await createLaundryService({ name: newDryClean.label.trim(), price: Number(newDryClean.regular), deepPrice: Number(newDryClean.deep), category: "Dry Cleaning", stock: 5, available: true });
      setNewDryClean({ label: "", regular: "", deep: "" });
      refreshServices();
    } catch (err) { notify(err.message || "Failed to add"); }
  };

  const deleteShoeCare = async (id) => {
    try { await deleteLaundryService(id); refreshServices(); } catch (err) { notify(err.message || "Failed to delete"); }
  };
  const addShoeCare = async () => {
    if (!newShoeCare.label.trim() || newShoeCare.regular === "" || newShoeCare.deep === "" || newShoeCare.repair === "") return;
    try {
      await createLaundryService({ name: newShoeCare.label.trim(), price: Number(newShoeCare.regular), deepPrice: Number(newShoeCare.deep), repairPrice: Number(newShoeCare.repair), category: "Shoe Care", stock: 5, available: true });
      setNewShoeCare({ label: "", regular: "", deep: "", repair: "" });
      refreshServices();
    } catch (err) { notify(err.message || "Failed to add"); }
  };

  const deleteExpress = async (id) => {
    try { await deleteLaundryService(id); refreshServices(); } catch (err) { notify(err.message || "Failed to delete"); }
  };
  const addExpress = async () => {
    const options = (newExpress.options || []).map((option) => ({
      turnaround: String(option.turnaround ?? "").trim(),
      pricingUnit: String(option.pricingUnit ?? "").trim(),
      price: Number(option.price),
      available: option.available !== false,
    }));

    if (
      !newExpress.label.trim() ||
      options.length === 0 ||
      options.some((option) =>
        !option.turnaround ||
        !option.pricingUnit ||
        !Number.isFinite(option.price) ||
        option.price <= 0
      )
    ) {
      notify("Enter an Express service name and at least one complete option with a positive price.");
      return;
    }

    const firstOption = options[0];

    try {
      await createLaundryService({
        name: newExpress.label.trim(),
        turnaround: firstOption.turnaround,
        pricingUnit: firstOption.pricingUnit,
        price: firstOption.price,
        expressPricingOptions: options,
        description: String(newExpress.description ?? "").trim(),
        category: "Express",
        stock: 5,
        available: true,
      });
      setNewExpress({
        label: "",
        description: "",
        options: [{
          turnaround: "Same-day",
          pricingUnit: "Per job",
          price: "",
          available: true,
        }],
      });
      await refreshServices();
      notify("Express service added.");
    } catch (err) {
      notify(err.message || "Failed to add Express service");
    }
  };

  const deleteAddon = async (id) => {
    try { await deleteLaundryService(id); refreshServices(); } catch (err) { notify(err.message || "Failed to delete"); }
  };
  const addAddon = async () => {
    if (!newAddon.label.trim() || newAddon.price === "") return;
    try {
      await createLaundryService({ name: newAddon.label.trim(), price: Number(newAddon.price), category: newAddon.group, stock: 5, available: true });
      setNewAddon({ label: "", price: "", group: ADDON_GROUPS[0] });
      refreshServices();
    } catch (err) { notify(err.message || "Failed to add"); }
  };

  const addCustomService = async () => {
    const category = String(newCustomService.category || "").trim();
    const name = String(newCustomService.name || "").trim();
    const price = Number(newCustomService.price);
    const reserved = ["Self Wash", "Staff Wash", "Dry Cleaning", "Shoe Care", "Express", ...ADDON_GROUPS, "Home Cleaning", "Office Cleaning", "Deep Cleaning", "Upholstery Cleaning"];
    if (!category || !name || newCustomService.price === "" || !Number.isFinite(price) || price <= 0) {
      notify("Enter a category, service name and a positive configured price.");
      return;
    }
    if (reserved.some((value) => value.toLowerCase() === category.toLowerCase())) {
      notify("That category name is already reserved. Choose a new Laundry category name.");
      return;
    }
    try {
      await createLaundryService({
        name, description: String(newCustomService.description || "").trim(),
        price, category, pricingUnit: String(newCustomService.pricingUnit || "Per item").trim(),
        stock: 5, available: true,
      });
      setNewCustomService((current) => ({ ...current, name: "", description: "", price: "" }));
      await refreshServices();
      notify(`Service added under ${category}.`);
    } catch (error) {
      notify(error.message || "Failed to add custom service.");
    }
  };

  const saveCustomService = async (service) => {
    const draft = customServiceDrafts[service.id];
    if (!draft) return;
    const next = { ...service, ...draft };
    const name = String(next.name || "").trim();
    const price = Number(next.price);
    if (!name || !Number.isFinite(price) || price <= 0 || !String(next.pricingUnit || "").trim()) {
      notify("Enter a service name, pricing unit and positive price before saving.");
      return;
    }
    try {
      await updateLaundryService(service.id, {
        name, description: String(next.description || "").trim(), price,
        category: service.category, pricingUnit: String(next.pricingUnit).trim(),
        stock: service.stock || 5, available: next.available !== false,
      });
      setCustomServiceDrafts((drafts) => { const copy = { ...drafts }; delete copy[service.id]; return copy; });
      await refreshServices();
      notify("Custom service updated.");
    } catch (error) {
      notify(error.message || "Failed to update custom service.");
    }
  };

  const deleteCustomService = async (service) => {
    if (!window.confirm(`Delete ${service.name} from ${service.category}?`)) return;
    try {
      await deleteLaundryService(service.id);
      await refreshServices();
      notify("Custom service deleted.");
    } catch (error) {
      notify(error.message || "Failed to delete custom service.");
    }
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


  // --- Order permissions (walk-in & web orders alike) ---
  // Admin, Manager, and Staff can print and reprint orders.
  // Clearing an active list archives records; History retains them.
  const canEditOrderContent = role !== "Staff";
  const canDeleteOrder = () => role === "Admin";
  const markLaundryPrinted = (id) => { setLaundryOrders((os) => os.map((o) => (o.id === id ? { ...o, printed: true } : o))); persistOrder(id, { printed: true }); };
  const markBookingPrinted = (id) => { setBookings((bs) => bs.map((b) => (b.id === id ? { ...b, printed: true } : b))); persistBookingUpdate(id, { printed: true }); };
  const markShopPrinted = (id) => { setShopOrders((os) => os.map((o) => (o.id === id ? { ...o, printed: true } : o))); persistShopOrder(id, { printed: true }); };

  // --- Walk-in order drafting ---
  const resetDraft = () => {
    setDraftType(null);
    setDraftItems([]);
    setDraftFullName("");
    setDraftPhone("");
    setDraftEmail("");
    setDraftDescription("");
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
    setDraftExOptionId("");
    setDraftExQty(1);
    setDraftCustomServiceId("");
    setDraftCustomQty(1);
  };

  const openDraft = (type) => {
    resetDraft();
    setDraftType(type);
    if (type === "shop" && products?.length) setDraftProductId(products[0].id);
    if (selfWashRates?.length) setDraftWashRateId(selfWashRates[0].id);
    if (dryCleanItems?.length) setDraftDcItemId(dryCleanItems[0].id);
    if (shoeCareItems?.length) setDraftScItemId(shoeCareItems[0].id);
    const availableExpress = expressServices.filter((service) => service.available !== false);
    if (availableExpress.length) {
      const firstService = availableExpress[0];
      const firstOption = getExpressPricingOptions(firstService)[0];
      setDraftExItemId(firstService.id);
      setDraftExOptionId(firstOption ? getExpressOptionKey(firstOption, 0) : "");
    }
  };

  const addDraftItem = (name, qty, price, unit) => {
    setDraftItems((its) => {
      const existing = its.find(
        (i) => i.name === name && i.unit === unit && Number(i.price) === Number(price)
      );
      if (existing) return its.map((i) => (i === existing ? { ...i, qty: i.qty + qty } : i));
      return [...its, { id: `${Date.now()}-${Math.random()}`, name, qty, price, unit }];
    });
  };
  const removeDraftItem = (id) => setDraftItems((its) => its.filter((i) => i.id !== id));

  const addDraftWashLine = () => {
    const isSelf = draftCategory === "selfwash";
    const rate = (isSelf ? selfWashRates : staffWashRates).find((r) => String(r.id) === String(draftWashRateId));
    if (!rate) { notify("Prices are still loading, try again in a moment"); return; }
    addDraftItem(`${isSelf ? "Self Wash" : "Staff Wash"}, ${rate.label}`, draftWashWeight, rate.price, "kg");
  };
  const addDraftDryCleanLine = () => {
    const item = dryCleanItems.find((i) => String(i.id) === String(draftDcItemId));
    if (!item) { notify("Prices are still loading, try again in a moment"); return; }
    const price = draftDcType === "deep" ? item.deep : item.regular;
    addDraftItem(`${item.label} (${draftDcType === "deep" ? "Deep Clean" : "Regular"})`, draftDcQty, price, "");
  };
  const addDraftShoeCareLine = () => {
    const item = shoeCareItems.find((i) => String(i.id) === String(draftScItemId));
    if (!item) { notify("Prices are still loading, try again in a moment"); return; }
    const price = draftScType === "deep" ? item.deep : draftScType === "repair" ? item.repair : item.regular;
    const typeLabel = draftScType === "deep" ? "Deep Clean" : draftScType === "repair" ? "Minor Repairs" : "Regular";
    addDraftItem(`${item.label} (${typeLabel})`, draftScQty, price, "");
  };
  const addDraftExpressLine = () => {
    const item = expressServices.find(
      (service) =>
        String(service.id) === String(draftExItemId) &&
        service.available !== false
    );
    if (!item) { notify("Express services are still loading, try again"); return; }

    const options = getExpressPricingOptions(item);
    const option = options.find(
      (current, index) => getExpressOptionKey(current, index) === String(draftExOptionId)
    );
    if (!option) {
      notify("This Express service has no available pricing option. Ask a Manager or Admin to update it.");
      return;
    }

    const price = Number(option.price);
    if (!Number.isFinite(price) || price <= 0) {
      notify("This Express service has no valid configured price. Ask a Manager or Admin to update it.");
      return;
    }

    const isPerKg = isExpressPerKg(option.pricingUnit);
    const quantity = Math.min(isPerKg ? 200 : 100, Math.max(1, Number(draftExQty) || 1));
    const turnaround = String(option.turnaround || "Express").trim();
    const pricingUnit = String(option.pricingUnit || "").trim();
    const lineName = `Express: ${item.label} (${turnaround}${pricingUnit ? `, ${pricingUnit}` : ""})`.slice(0, 160);
    addDraftItem(lineName, quantity, price, isPerKg ? "kg" : "");
  };
  const addDraftCustomServiceLine = () => {
    const categoryName = String(draftCategory).slice("custom:".length);
    const category = customServiceCategories.find((entry) => entry.name === categoryName);
    const available = (category?.services || []).filter((service) => service.available !== false);
    const service = available.find((entry) => String(entry.id) === String(draftCustomServiceId)) || available[0];
    if (!service) { notify("No available services in this category. Ask a Manager or Admin to configure one."); return; }
    const pricingUnit = String(service.pricingUnit || "Per item").trim();
    const perKg = /kg/i.test(pricingUnit);
    const qty = Math.min(perKg ? 200 : 100, Math.max(1, Number(draftCustomQty) || 1));
    const lineName = `${category.name} — ${service.name}${pricingUnit ? ` (${pricingUnit})` : ""}`;
    addDraftItem(lineName, qty, Number(service.price), perKg ? "kg" : "");
  };

  // Combines the real Shop inventory with the Pricing tab's add-on catalog —
  // from a walk-in customer's point of view these are all just "things we can
  // sell them right now", so anything added or edited in either place should
  // immediately be pickable here, not just items created through Inventory.
  const shopPickerItems = [
    ...products.filter((p) => (p.status || "Active") === "Active").map((p) => ({ id: p.id, name: p.name, price: p.price })),
    ...addonProducts.map((a) => ({ id: a.id, name: a.label, price: a.price })),
  ];

  const addDraftProductLine = () => {
    const product = shopPickerItems.find((p) => String(p.id) === String(draftProductId));
    if (!product) { notify("Products are still loading, try again in a moment"); return; }
    addDraftItem(product.name, draftProductQty, product.price, "");
  };

  const selectedDraftExpressService = expressServices.find(
    (service) => String(service.id) === String(draftExItemId)
  );
  const isExpressLaundry =
    draftCategory === "express" &&
    /laundry/i.test(selectedDraftExpressService?.label || "");
  const showDraftFulfilment =
    draftCategory !== "express" || isExpressLaundry;
  const effectiveDraftFulfilment =
    showDraftFulfilment ? draftFulfilment : "dropoff";

  const draftExpressGross = draftItems
    .filter((item) => String(item.name || "").startsWith("Express: "))
    .reduce((sum, item) => sum + item.qty * item.price, 0);
  const draftRegularSubtotal = draftItems
    .filter((item) => !String(item.name || "").startsWith("Express: "))
    .reduce((sum, item) => sum + item.qty * item.price, 0);
  const draftSubtotal = draftRegularSubtotal + draftExpressGross;
  const draftVat = draftSubtotal * VAT_RATE;
  const draftTotal = draftSubtotal + draftVat + (draftType === "laundry" && effectiveDraftFulfilment === "pickup" ? Math.max(DELIVERY_FEE, Number(draftDeliveryFee) || DELIVERY_FEE) : 0);
  const draftShopTotal = draftSubtotal + draftVat; // shop checkout has no delivery-fee concept, just VAT on top
  const draftDisplayTotals = roundedMoneyParts(
    draftSubtotal,
    draftVat,
    draftType === "laundry" && effectiveDraftFulfilment === "pickup"
      ? Math.max(DELIVERY_FEE, Number(draftDeliveryFee) || DELIVERY_FEE)
      : 0
  );
  const draftShopDisplayTotals = roundedMoneyParts(draftSubtotal, draftVat);

  const placeDraftLaundryOrder = async () => {
    if (draftItems.length === 0) { notify("Add at least one item first"); return; }
    if (!draftFullName.trim() || !draftPhone.trim()) { notify("Name and phone are required"); return; }
    const localOrder = {
      id: genRef("LND"),
      items: draftItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price, unit: i.unit })),
      fulfilment: effectiveDraftFulfilment, address: effectiveDraftFulfilment === "pickup" ? draftAddress : "", date: "", time: "",
      payment: "walk-in", paymentStatus: "Pending", transferNote: "",
      fullName: draftFullName.trim(), phone: draftPhone.trim(), email: draftEmail.trim(),
      description: draftDescription.trim(),
      placedAt: new Date().toISOString(), archived: false, locked: true, printed: false,
      deliveryFee: effectiveDraftFulfilment === "pickup" ? Math.max(DELIVERY_FEE, Number(draftDeliveryFee) || DELIVERY_FEE) : 0,
      total: draftTotal, status: "Received",
    };
    setPlacingDraft(true);
    try {
      const saved = await createOrder({
        items: draftItems.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, price: i.price })),
        fulfilment: effectiveDraftFulfilment, address: effectiveDraftFulfilment === "pickup" ? draftAddress : "",
        paymentMethod: "walk-in", deliveryFee: effectiveDraftFulfilment === "pickup" ? Math.max(DELIVERY_FEE, Number(draftDeliveryFee) || DELIVERY_FEE) : 0, total: draftTotal,
        fullName: draftFullName.trim(), phone: draftPhone.trim(), email: draftEmail.trim(),
        description: draftDescription.trim(), createdBy: currentUser?.name,
      });
      setLaundryOrders((os) => [saved, ...os]);
      notify(`Walk-in order ${saved.id || saved.referenceId} placed`);
      resetDraft();
    } finally {
      setPlacingDraft(false);
    }
  };

  const placeDraftBooking = async () => {
    if (!draftFullName.trim() || !draftPhone.trim()) { notify("Name and phone are required"); return; }
    if (!draftServiceId.trim()) { notify("Please enter a service"); return; }
    if (!draftSizeId.trim()) { notify("Please enter the size or scope"); return; }
    if (!draftBookingDate || !draftBookingTime) { notify("Please enter the booking date and time"); return; }
    if (!draftAddress.trim()) { notify("Please enter the address"); return; }

    const email = draftEmail.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.com$/i.test(email)) {
      notify("Enter a valid email ending in .com, or leave it blank");
      return;
    }

    const payable = draftPayable === "" ? 0 : Number(draftPayable);
    if (!Number.isFinite(payable) || payable <= 0) {
      notify("Confirmed price must be greater than zero");
      return;
    }

    setPlacingDraft(true);
    try {
      const localBooking = {
        id: genRef("CLN"),
        service: draftServiceId.trim(), size: draftSizeId.trim(),
        description: draftDescription.trim(),
        date: draftBookingDate, time: draftBookingTime, address: draftAddress.trim(),
        fullName: draftFullName.trim(), phone: draftPhone.trim(), email,
        price: payable, payType: "full", payable,
        paymentStatus: "Pending", status: "Confirmed",
        placedAt: new Date().toISOString(), archived: false, locked: true, printed: false,
      };
      const saved = await createBooking(localBooking);
      setBookings((bs) => [saved, ...bs]);
      notify(`Walk-in booking ${saved.id || saved.referenceId} placed`);
      resetDraft();
    } catch (error) {
      notify(error?.message || "Failed to place cleaning booking. Please try again.");
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
      description: draftDescription.trim(),
      total: draftShopTotal, status: "Received", paymentStatus: "Pending",
      placedAt: new Date().toISOString(), archived: false, locked: true, printed: false,
    };
    setPlacingDraft(true);
    try {
      const saved = await createShopOrder({
        items: draftItems.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        fullName: draftFullName.trim(), phone: draftPhone.trim(), mode: draftMode,
        description: draftDescription.trim(), total: draftShopTotal, createdBy: currentUser?.name,
      });
      setShopOrders((os) => [saved, ...os]);
      notify(`Walk-in sale ${saved.id || saved.referenceId} placed`);
      resetDraft();
    } finally {
      setPlacingDraft(false);
    }
  };

  const historyRows = [
    ...expressQuoteRequests.map((q) => ({
      key: `E-${q.id || q.referenceId}`,
      type: "Express Quote",
      ref: q.id || q.referenceId,
      placedAt: q.placedAt,
      name: q.fullName,
      phone: q.phone,
      email: q.email,
      details: [
        q.service,
        q.turnaround === "same-day" ? "Same day Express" :
          q.turnaround === "next-day" ? "Next day Express" : q.turnaround,
      ].filter(Boolean).join(" · "),
      description: q.description || "",
      total: q.quotedPrice,
      status: q.status || "Pending Quote",
      paymentStatus: "Not paid — quote only",
      record: q,
    })),
    ...laundryOrders.map((o) => ({
      key: `L-${o.id}`, type: "Laundry", ref: o.id, placedAt: o.placedAt, name: o.fullName, phone: o.phone, email: o.email,
      details: o.items ? o.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—",
      description: o.description || "",
      total: o.total, status: o.status, paymentStatus: o.paymentStatus, record: o,
    })),
    ...bookings.map((b) => ({
      key: `C-${b.id}`, type: "Cleaning", ref: b.id, placedAt: b.placedAt, name: b.fullName, phone: b.phone, email: b.email,
      details: `${b.service} · ${b.size}`,
      description: b.description || "",
      total: b.payable, status: b.status, paymentStatus: b.paymentStatus, record: b,
    })),
    ...shopOrders.map((o) => ({
      key: `S-${o.id}`, type: "Shop", ref: o.id, placedAt: o.placedAt, name: o.fullName, phone: o.phone, email: "",
      details: o.items.map((i) => `${i.name} ×${i.qty}`).join(", "),
      description: o.description || "",
      total: o.total, status: o.status, paymentStatus: o.paymentStatus, record: o,
    })),
    ...subscriptionPurchases.map((purchase) => ({
      key: `SUB-${purchase.dbId || purchase.id}`,
      type: "Subscription",
      ref: purchase.referenceId || purchase.id,
      placedAt: purchase.placedAt,
      name: purchase.customerName,
      phone: purchase.customerPhone,
      email: "",
      details: [
        purchase.planName,
        purchase.kgAllowance != null ? `${purchase.kgAllowance} KG` : "",
        purchase.planDuration,
        purchase.startDate ? `Start: ${purchase.startDate}` : "",
        purchase.expiryDate ? `Expires: ${purchase.expiryDate}` : "",
      ].filter(Boolean).join(" · "),
      total: purchase.total,
      status: purchase.status || "Recorded",
      paymentStatus: purchase.paymentStatus,
      record: purchase,
    })),
  ]
    .filter((r) => {
      if (historyRange === "custom") {
        if (!historyDate || !r.placedAt) return false;
        const d = new Date(r.placedAt);
        const picked = new Date(historyDate + "T00:00:00");
        return d.getFullYear() === picked.getFullYear() && d.getMonth() === picked.getMonth() && d.getDate() === picked.getDate();
      }
      return matchesRange(r.placedAt, historyRange);
    })
    .filter((r) => {
      const q = historyQuery.trim().toLowerCase();
      if (!q) return true;
      return [r.ref, r.name, r.phone, r.email, r.details, r.description].join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.placedAt || 0) - new Date(a.placedAt || 0));

  const allRecords = [
    ...laundryOrders.map((o) => ({ type: "Laundry", ref: o.id, dbId: o.dbId, total: o.total, placedAt: o.placedAt, paymentStatus: o.paymentStatus, name: o.fullName, phone: o.phone })),
    ...bookings.map((b) => ({ type: "Cleaning", ref: b.id, dbId: b.dbId, total: b.payable, placedAt: b.placedAt, paymentStatus: b.paymentStatus, name: b.fullName, phone: b.phone })),
    ...shopOrders.map((o) => ({ type: "Shop", ref: o.id, dbId: o.dbId, total: o.total, placedAt: o.placedAt, paymentStatus: o.paymentStatus, name: o.fullName, phone: o.phone })),
    ...subscriptionPurchases.map((purchase) => ({
      type: "Subscription",
      ref: purchase.referenceId || purchase.id,
      dbId: purchase.dbId,
      total: Number(purchase.total) || 0,
      placedAt: purchase.placedAt,
      paymentStatus: purchase.paymentStatus,
      name: purchase.customerName,
      phone: purchase.customerPhone,
    })),
  ].filter((r) => matchesRange(r.placedAt, reportsRange));

  const totalInvoiced = allRecords.reduce((s, r) => s + (r.total || 0), 0);
  const paidTotal = allRecords.filter((r) => r.paymentStatus === "Confirmed").reduce((s, r) => s + (r.total || 0), 0);
  const unpaidTotal = totalInvoiced - paidTotal;

  const clientMap = {};
  allRecords.forEach((r) => {
    const key = r.phone || r.name || "Unknown";
    if (!clientMap[key]) clientMap[key] = { name: r.name || "Unknown", phone: r.phone || "—", total: 0, count: 0, records: [] };
    clientMap[key].total += r.total || 0;
    clientMap[key].count += 1;
    clientMap[key].records.push(r);
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
    { id: "subscriptions", label: "Subscriptions", icon: Star },
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
        <button
          onClick={async () => {
            notify("Refreshing…");
            const results = await Promise.allSettled([
              refreshAll(),
              loadExpressQuoteRequests(true),
            ]);
            const ok = results.some((result) =>
              result.status === "fulfilled" && result.value
            );
            if (ok) notify("Up to date");
            else notify("Refresh failed. Please try again.");
          }}
          style={{ marginBottom: 6 }}
        >
          <RefreshCw size={16} /> Refresh Now
        </button>
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
              <div className="rw-stat-card"><b>{overviewOrdersToday.length}</b><span>Laundry orders today</span></div>
              <div className="rw-stat-card"><b>{overviewBookingsToday.length}</b><span>Cleaning bookings today</span></div>
              <div className="rw-stat-card"><b>{overviewShopOrdersToday.length}</b><span>Shop orders today</span></div>
              <div className="rw-stat-card"><b>{overviewSubscriptionsToday.length}</b><span>Subscription purchases today</span></div>
              <div className="rw-stat-card"><b>{money(revenueToday)}</b><span>Revenue today</span></div>
              <div className="rw-stat-card" style={{ background: lowStock ? "#fdece9" : "var(--ice)" }}>
                <b style={{ color: lowStock ? "var(--bad)" : "var(--navy)" }}>{lowStock}</b>
                <span>Low-stock products</span>
              </div>
            </div>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
              Overview counts all orders and bookings placed today, whether pending, completed, or archived from the active lists.
              Previous orders remain available in <b>History</b>, searchable by date.
            </p>
          </div>
        )}
                {tab === "orders" && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Laundry Orders</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Stays here until a Manager or Admin clears it, then it moves to History.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={() => openDraft(draftType === "laundry" ? null : "laundry")}>
                  {draftType === "laundry" ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Laundry Order</>}
                </button>
                {canClearLists && todaysOrders.length > 0 && (
                  <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysOrders}>
                    <RefreshCw size={14} /> Clear list
                  </button>
                )}
              </div>
            </div>

            {draftType === "laundry" && (
              <div className="rw-card" style={{ marginBottom: 20, background: "var(--ice)" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Laundry Order — Draft</h3>
                <div className="rw-pill-group" style={{ marginBottom: 14 }}>
                  {["selfwash", "staffwash", "dryclean", "shoecare", "express", ...customServiceCategories.map((category) => `custom:${category.name}`), "shop"].map((c) => (
                    <button key={c} className={`rw-pill ${draftCategory === c ? "active" : ""}`} onClick={() => setDraftCategory(c)}>
                      {c.startsWith("custom:") ? c.slice(7) : ({ selfwash: "Self Wash", staffwash: "Staff Wash", dryclean: "Dry Cleaning", shoecare: "Shoe Care", express: "Express", shop: "Shop Products" }[c])}
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
                      <div className="rw-stepper">
                        <button type="button" aria-label="Decrease weight" onClick={() => setDraftWashWeight((w) => Math.max(1, Math.round(((Number(w) || 1) - 0.5) * 2) / 2))}><Minus size={15} /></button>
                        <span style={{ fontWeight: 700, minWidth: 40, textAlign: "center" }}>{Math.max(1, Number(draftWashWeight) || 1)} kg</span>
                        <button type="button" aria-label="Increase weight" onClick={() => setDraftWashWeight((w) => Math.min(100, Math.round(((Number(w) || 1) + 0.5) * 2) / 2))}><Plus size={15} /></button>
                      </div>
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
                      <div className="rw-stepper">
                        <button type="button" aria-label="Decrease quantity" onClick={() => setDraftDcQty((q) => Math.max(1, (Number(q) || 1) - 1))}><Minus size={15} /></button>
                        <span style={{ fontWeight: 700, minWidth: 30, textAlign: "center" }}>{Math.max(1, Number(draftDcQty) || 1)}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => setDraftDcQty((q) => Math.min(100, (Number(q) || 1) + 1))}><Plus size={15} /></button>
                      </div>
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
                      <div className="rw-stepper">
                        <button type="button" aria-label="Decrease quantity" onClick={() => setDraftScQty((q) => Math.max(1, (Number(q) || 1) - 1))}><Minus size={15} /></button>
                        <span style={{ fontWeight: 700, minWidth: 30, textAlign: "center" }}>{Math.max(1, Number(draftScQty) || 1)}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => setDraftScQty((q) => Math.min(100, (Number(q) || 1) + 1))}><Plus size={15} /></button>
                      </div>
                    </div>
                    <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDraftShoeCareLine}><Plus size={13} /> Add</button>
                  </div>
                )}

                {draftCategory === "express" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                    {(() => {
                      const availableServices = expressServices.filter(
                        (service) => service.available !== false
                      );
                      const selected = availableServices.find(
                        (service) => String(service.id) === String(draftExItemId)
                      );
                      const options = getExpressPricingOptions(selected);
                      const selectedOption = options.find(
                        (option, index) =>
                          getExpressOptionKey(option, index) === String(draftExOptionId)
                      );
                      const isPerKg = isExpressPerKg(selectedOption?.pricingUnit);
                      const maxQuantity = isPerKg ? 200 : 100;
                      const quantity = Math.min(
                        maxQuantity,
                        Math.max(1, Number(draftExQty) || 1)
                      );

                      return (
                        <>
                          <div style={{ flex: "1 1 220px" }}>
                            <label>Express service</label>
                            <select
                              value={selected ? String(selected.id) : ""}
                              onChange={(e) => {
                                const nextItem = availableServices.find(
                                  (service) => String(service.id) === String(e.target.value)
                                );
                                const nextOptions = getExpressPricingOptions(nextItem);
                                setDraftExItemId(e.target.value);
                                setDraftExOptionId(
                                  nextOptions.length ? getExpressOptionKey(nextOptions[0], 0) : ""
                                );
                                setDraftExQty(1);
                              }}
                            >
                              {availableServices.length === 0 ? (
                                <option value="">No available Express services</option>
                              ) : (
                                availableServices.map((service) => (
                                  <option key={service.id} value={service.id}>
                                    {service.label}
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          <div style={{ flex: "1 1 145px" }}>
                            <label>Turnaround</label>
                            <div style={{ padding: "9px 10px", minHeight: 38, border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }}>
                              {selectedOption?.turnaround || "—"}
                            </div>
                          </div>

                          <div style={{ flex: "1 1 150px" }}>
                            <label>
                              Configured price
                            </label>
                            <div style={{ padding: "9px 10px", minHeight: 38, border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                              {selectedOption ? money(selectedOption.price) : "—"}
                            </div>
                          </div>

                          <div>
                            <label>{isPerKg ? "Weight (KG)" : "Jobs"}</label>
                            <div className="rw-stepper">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                disabled={!selectedOption}
                                onClick={() => setDraftExQty((q) => Math.max(1, (Number(q) || 1) - 1))}
                              >
                                <Minus size={15} />
                              </button>
                              <span style={{ fontWeight: 700, minWidth: 30, textAlign: "center" }}>
                                {quantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                disabled={!selectedOption}
                                onClick={() => setDraftExQty((q) => Math.min(maxQuantity, (Number(q) || 1) + 1))}
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          </div>

                          {!selected && (
                            <p style={{ width: "100%", margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>
                              No Express services are currently available. Ask a Manager or Admin to configure one.
                            </p>
                          )}
                          {selected && options.length === 0 && (
                            <p style={{ width: "100%", margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>
                              This service has no available pricing options. Ask a Manager or Admin to enable an option.
                            </p>
                          )}
                        </>
                      );
                    })()}
                    <button
                      className="rw-btn rw-btn-primary rw-btn-sm"
                      disabled={!expressServices.some(
                        (service) =>
                          String(service.id) === String(draftExItemId) &&
                          service.available !== false &&
                          getExpressPricingOptions(service).some(
                            (option, index) =>
                              getExpressOptionKey(option, index) === String(draftExOptionId)
                          )
                      )}
                      onClick={addDraftExpressLine}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                )}
                {draftCategory.startsWith("custom:") && (() => {
                  const categoryName = draftCategory.slice("custom:".length);
                  const category = customServiceCategories.find((entry) => entry.name === categoryName);
                  const available = (category?.services || []).filter((service) => service.available !== false);
                  const selected = available.find((service) => String(service.id) === String(draftCustomServiceId)) || available[0];
                  const perKg = /kg/i.test(String(selected?.pricingUnit || ""));
                  const quantity = Math.min(perKg ? 200 : 100, Math.max(1, Number(draftCustomQty) || 1));
                  return (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                      <div style={{ flex: "1 1 240px" }}>
                        <label>{categoryName} service</label>
                        <select value={selected ? String(selected.id) : ""} onChange={(e) => { setDraftCustomServiceId(e.target.value); setDraftCustomQty(1); }}>
                          {available.length ? available.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.price)} / {service.pricingUnit || "unit"}</option>) : <option value="">No available services</option>}
                        </select>
                      </div>
                      <div style={{ flex: "1 1 180px" }}>
                        <label>Configured price</label>
                        <div style={{ padding: "9px 10px", minHeight: 38, border: "1px solid var(--line)", borderRadius: 6, fontWeight: 700 }}>{selected ? `${money(selected.price)} / ${selected.pricingUnit || "unit"}` : "—"}</div>
                      </div>
                      <div>
                        <label>{perKg ? "Weight (KG)" : "Quantity"}</label>
                        <div className="rw-stepper">
                          <button type="button" aria-label="Decrease quantity" disabled={!selected} onClick={() => setDraftCustomQty((q) => Math.max(1, (Number(q) || 1) - 1))}><Minus size={15} /></button>
                          <span style={{ fontWeight: 700, minWidth: 30, textAlign: "center" }}>{quantity}{perKg ? " kg" : ""}</span>
                          <button type="button" aria-label="Increase quantity" disabled={!selected} onClick={() => setDraftCustomQty((q) => Math.min(perKg ? 200 : 100, (Number(q) || 1) + 1))}><Plus size={15} /></button>
                        </div>
                      </div>
                      <button className="rw-btn rw-btn-primary rw-btn-sm" disabled={!selected} onClick={addDraftCustomServiceLine}><Plus size={13} /> Add</button>
                      {!selected && <p style={{ width: "100%", margin: 0, fontSize: 12.5, color: "var(--ink-soft)" }}>Ask a Manager or Admin to add or enable a service in this category.</p>}
                    </div>
                  );
                })()}
                {draftCategory === "shop" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                    <div style={{ flex: "1 1 220px" }}>
                      <label>Shop product</label>
                      {shopPickerItems.length === 0 ? (
                        <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>No shop products yet, add some under Inventory or Pricing first.</p>
                      ) : (
                        <select
                          value={draftProductId || shopPickerItems[0]?.id || ""}
                          onChange={(e) => setDraftProductId(e.target.value)}
                        >
                          {shopPickerItems.map((p) => <option key={p.id} value={p.id}>{p.name}, {money(p.price)}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label>Qty</label>
                      <div className="rw-stepper">
                        <button type="button" aria-label="Decrease quantity" onClick={() => setDraftProductQty((q) => Math.max(1, (Number(q) || 1) - 1))}><Minus size={15} /></button>
                        <span style={{ fontWeight: 700, minWidth: 30, textAlign: "center" }}>{Math.max(1, Number(draftProductQty) || 1)}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => setDraftProductQty((q) => Math.min(100, (Number(q) || 1) + 1))}><Plus size={15} /></button>
                      </div>
                    </div>
                    <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDraftProductLine}><Plus size={13} /> Add</button>
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
                  <div><label>Email (optional)</label><input type="email" autoComplete="email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} placeholder="customer@example.com" /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label>Description (optional)</label><textarea rows={2} maxLength={1000} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} placeholder="e.g. White shirts — please remove collar stains." /></div>
                {showDraftFulfilment && (
                  <>
                    <div className="rw-pill-group" style={{ marginBottom: 12 }}>
                      <button className={`rw-pill ${draftFulfilment === "dropoff" ? "active" : ""}`} onClick={() => setDraftFulfilment("dropoff")}>Drop-off in store</button>
                      <button className={`rw-pill ${draftFulfilment === "pickup" ? "active" : ""}`} onClick={() => setDraftFulfilment("pickup")}>Pickup & deliver (from {money(DELIVERY_FEE)})</button>
                    </div>
                    {effectiveDraftFulfilment === "pickup" && (
                      <>
                        <div style={{ marginBottom: 12 }}><label>Address</label><input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} /></div>
                        <div style={{ marginBottom: 12 }}><label>Pickup & delivery fee (minimum {money(DELIVERY_FEE)}; staff can adjust for distance)</label><input type="number" min={DELIVERY_FEE} step="100" value={draftDeliveryFee} onChange={(e) => setDraftDeliveryFee(Math.max(DELIVERY_FEE, Number(e.target.value) || DELIVERY_FEE))} /></div>
                      </>
                    )}
                  </>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                    <div>Subtotal {money(draftDisplayTotals.subtotal)} + VAT ({VAT_RATE * 100}%) {money(draftDisplayTotals.vat)}</div>
                    {effectiveDraftFulfilment === "pickup" && (
                      <div>Delivery fee {money(draftDisplayTotals.other)}</div>
                    )}
                  </div>
                  <b style={{ fontSize: 15 }}>Total: {money(draftDisplayTotals.total)}</b>
                  <button className="rw-btn rw-btn-rainbow" onClick={placeDraftLaundryOrder}>Place Order</button>
                </div>
              </div>
            )}

            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Items</th><th>Fulfilment</th><th>Phone</th><th>Email</th><th>Total (₦)</th><th>Status</th><th>Method</th><th>Payment</th><th></th></tr></thead>
              <tbody>
                {todaysOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{formatPlacedAt(o.placedAt)}</td>
                    <td>{o.fullName || "—"}</td>
                    <td style={{ maxWidth: 220, fontSize: 13 }}>{o.items ? o.items.map((i) => `${i.name} ×${i.qty}${i.unit || ""}`).join(", ") : "—"}</td>
                    <td>{o.fulfilment === "pickup" ? "Pickup & deliver" : o.fulfilment === "dropoff" ? "Drop-off in store" : "—"}</td>
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
                      <select className="rw-status-select" value={o.paymentMethod || "Transfer"} onChange={(e) => updateOrderMethod(o.id, e.target.value)}>
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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
                  <tr><td colSpan={12} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No laundry orders placed today yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Cleaning Bookings</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Prices are internal, never shown to the customer; confirm and adjust here.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={() => openDraft(draftType === "cleaning" ? null : "cleaning")}>
                  {draftType === "cleaning" ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Booking</>}
                </button>
                {canClearLists && todaysBookings.length > 0 && (
                  <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysBookings}>
                    <RefreshCw size={14} /> Clear list
                  </button>
                )}
              </div>
            </div>

            {draftType === "cleaning" && (
              <div className="rw-card" style={{ marginBottom: 20, background: "var(--ice)" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Cleaning Booking — Draft</h3>
                <div className="rw-form-grid" style={{ marginBottom: 12 }}>
                  <div>
                    <label>Service</label>
                    <input placeholder="e.g. Home Cleaning" value={draftServiceId} onChange={(e) => setDraftServiceId(e.target.value)} />
                  </div>
                  <div>
                    <label>Size / scope</label>
                    <input placeholder="e.g. 3 - 4 Bedrooms" value={draftSizeId} onChange={(e) => setDraftSizeId(e.target.value)} />
                  </div>
                  <div><label>Date</label><input type="date" value={draftBookingDate} onChange={(e) => setDraftBookingDate(e.target.value)} /></div>
                  <div><label>Time</label><input type="time" value={draftBookingTime} onChange={(e) => setDraftBookingTime(e.target.value)} /></div>
                  <div><label>Customer name</label><input value={draftFullName} onChange={(e) => setDraftFullName(e.target.value)} /></div>
                  <div><label>Phone</label><input value={draftPhone} onChange={(e) => setDraftPhone(e.target.value)} /></div>
                  <div>
                    <label>Email (optional)</label>
                    <input type="email" autoComplete="email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} placeholder="customer@example.com" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}><label>Address</label><input value={draftAddress} onChange={(e) => setDraftAddress(e.target.value)} /></div>
                  <div>
                    <label>Confirmed price (₦)</label>
                    <input type="number" step="500" placeholder="0" value={draftPayable} onChange={(e) => setDraftPayable(e.target.value)} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}><label>Description (optional)</label><textarea rows={2} maxLength={1000} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} placeholder="e.g. Clean inside kitchen cabinets too." /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="rw-btn rw-btn-rainbow" onClick={placeDraftBooking} disabled={placingDraft}>
                    {placingDraft ? "Placing..." : "Place Booking"}
                  </button>
                </div>
              </div>
            )}

            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Service</th><th>Size</th><th>Date</th><th>Phone</th><th>Confirmed Price (₦)</th><th>Status</th><th>Method</th><th>Payment</th><th></th></tr></thead>
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
                      <select className="rw-status-select" value={b.paymentMethod || "Transfer"} onChange={(e) => updateBookingMethod(b.id, e.target.value)}>
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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
                  <tr><td colSpan={12} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No bookings requested today yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "shop" && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Shop Orders</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Stays here until a Manager or Admin clears it, then it moves to History.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="rw-btn rw-btn-primary rw-btn-sm" onClick={() => openDraft(draftType === "shop" ? null : "shop")}>
                  {draftType === "shop" ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Shop Sale</>}
                </button>
                {canClearLists && todaysShopOrders.length > 0 && (
                  <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={clearTodaysShopOrders}>
                    <RefreshCw size={14} /> Clear list
                  </button>
                )}
              </div>
            </div>

            {draftType === "shop" && (
              <div className="rw-card" style={{ marginBottom: 20, background: "var(--ice)" }}>
                <h3 style={{ fontSize: 15, marginBottom: 12 }}>Shop Sale — Draft</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                  <div style={{ flex: "1 1 240px" }}>
                    <label>Product</label>
                    {shopPickerItems.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>No shop products yet, add some under Inventory or Pricing first.</p>
                    ) : (
                      <select
                        value={draftProductId || shopPickerItems[0]?.id || ""}
                        onChange={(e) => setDraftProductId(e.target.value)}
                      >
                        {shopPickerItems.map((p) => <option key={p.id} value={p.id}>{p.name}, {money(p.price)}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label>Qty</label>
                    <div className="rw-stepper">
                        <button type="button" aria-label="Decrease quantity" onClick={() => setDraftProductQty((q) => Math.max(1, (Number(q) || 1) - 1))}><Minus size={15} /></button>
                        <span style={{ fontWeight: 700, minWidth: 30, textAlign: "center" }}>{Math.max(1, Number(draftProductQty) || 1)}</span>
                        <button type="button" aria-label="Increase quantity" onClick={() => setDraftProductQty((q) => Math.min(100, (Number(q) || 1) + 1))}><Plus size={15} /></button>
                      </div>
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
                <div style={{ marginBottom: 12 }}><label>Description (optional)</label><textarea rows={2} maxLength={1000} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} placeholder="e.g. Please pack each item separately." /></div>
                <div className="rw-pill-group" style={{ marginBottom: 12 }}>
                  <button className={`rw-pill ${draftMode === "pickup" ? "active" : ""}`} onClick={() => setDraftMode("pickup")}>Pickup in store</button>
                  <button className={`rw-pill ${draftMode === "delivery" ? "active" : ""}`} onClick={() => setDraftMode("delivery")}>Delivery</button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                    Subtotal {money(draftShopDisplayTotals.subtotal)} + VAT ({VAT_RATE * 100}%) {money(draftShopDisplayTotals.vat)}
                  </div>
                  <b style={{ fontSize: 15 }}>Total: {money(draftShopDisplayTotals.total)}</b>
                  <button className="rw-btn rw-btn-rainbow" onClick={placeDraftShopOrder}>Place Order</button>
                </div>
              </div>
            )}

            <table className="rw-table">
              <thead><tr><th>Ref</th><th>Placed</th><th>Name</th><th>Items</th><th>Fulfilment</th><th>Phone</th><th>Total</th><th>Status</th><th>Method</th><th>Payment</th><th></th></tr></thead>
              <tbody>
                {todaysShopOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{formatPlacedAt(o.placedAt)}</td>
                    <td>{o.fullName || "—"}</td>
                    <td>{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                    <td>{o.mode === "pickup" ? "Pickup in store" : o.mode === "delivery" ? "Delivery" : "—"}</td>
                    <td>{o.phone || "—"}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <select className="rw-status-select" value={o.status} onChange={(e) => updateShopOrderStatus(o.id, e.target.value)}>
                        {["Received", "Packed", "Out for Delivery", "Completed"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="rw-status-select" value={o.paymentMethod || "Transfer"} onChange={(e) => updateShopMethod(o.id, e.target.value)}>
                        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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
                  <tr><td colSpan={11} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No shop orders placed today yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === "history" && (
          <div>
            <h2 style={{ marginBottom: 6 }}>History</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 18 }}>
              Every laundry order, cleaning booking, shop purchase and subscription purchase, searchable and available for reprinting. Records are retained in the database.
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
              {historyRange === "custom" && (
                <input type="date" style={{ maxWidth: 180 }} value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} />
              )}
            </div>

            <table className="rw-table">
              <thead><tr><th>Type</th><th>Ref</th><th>Placed</th><th>Name</th><th>Phone</th><th>Email</th><th>Items / Service</th><th>Description</th><th>Total</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead>
              <tbody>
                {historyRows.map((r) => (
                  <tr key={r.key}>
                    <td><span className="rw-stock-badge rw-stock-ok" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Shirt size={11} /> {r.type}</span></td>
                    <td className="mono">{r.ref}</td>
                    <td>{formatPlacedAt(r.placedAt)}</td>
                    <td>{r.name || "—"}</td>
                    <td>{r.phone || "—"}</td>
                    <td>{r.email || "—"}</td>
                    <td>{r.details || "—"}</td>
                    <td>{r.description || "—"}</td>
                    <td>
                      {r.type === "Express Quote" && r.total == null
                        ? "Awaiting quote" : money(r.total)}
                      {r.type === "Express Quote" && editingExpressQuoteId === r.record?.dbId && (
                        <div style={{ marginTop: 6 }}>
                          <label style={{ display: "block", fontSize: 11 }}>Quote price (₦)</label>
                          <input type="number" min="0.01" step="0.01"
                            value={expressQuotePriceDraft}
                            onChange={(e) => setExpressQuotePriceDraft(e.target.value)}
                            style={{ width: 125, padding: 6 }} />
                        </div>
                      )}
                    </td>
                    <td>
                      {r.type === "Express Quote" && editingExpressQuoteId === r.record?.dbId ? (
                        <select value={expressQuoteStatusDraft}
                          onChange={(e) => setExpressQuoteStatusDraft(e.target.value)}
                          style={{ minWidth: 145, padding: 6 }}>
                          <option value="Pending Quote">Pending Quote</option>
                          <option value="Quoted">Quoted</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      ) : r.status}
                    </td>
                    <td>{r.paymentStatus || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {r.type === "Express Quote" && (
                          editingExpressQuoteId === r.record?.dbId ? (
                            <>
                              <button className="rw-btn rw-btn-primary rw-btn-sm"
                                onClick={() => saveExpressQuote(r.record)}
                                disabled={savingExpressQuoteId === r.record?.dbId}>
                                {savingExpressQuoteId === r.record?.dbId ? "Saving..." : "Save"}
                              </button>
                              <button className="rw-btn rw-btn-ghost rw-btn-sm"
                                onClick={() => setEditingExpressQuoteId(null)}
                                disabled={savingExpressQuoteId === r.record?.dbId}>Cancel</button>
                            </>
                          ) : (
                            <button className="rw-btn rw-btn-ghost rw-btn-sm"
                              onClick={() => beginExpressQuoteEdit(r.record)}
                              title="Edit quote price and status">Edit quote</button>
                          )
                        )}
                        <button className="rw-btn rw-btn-ghost rw-btn-sm"
                          onClick={() => {
                            if (r.type === "Laundry") openPrintSlip(r.record, currentUser, () => markLaundryPrinted(r.record.id));
                            else if (r.type === "Cleaning") openPrintSlip(r.record, currentUser, () => markBookingPrinted(r.record.id));
                            else if (r.type === "Shop") openPrintSlip(r.record, currentUser, () => markShopPrinted(r.record.id));
                            else if (r.type === "Subscription") printSubscriptionPurchase(r.record);
                            else if (r.type === "Express Quote") {
                              openExpressQuotePrintSlip(r.record, currentUser, () => markExpressQuotePrinted(r.record));
                            }
                          }}
                          title={r.type === "Express Quote"
                            ? (Number(r.record?.quotedPrice) > 0 ? "Print saved quote" : "Save a quote price before printing")
                            : "Reprint saved record"}
                          disabled={!r.record || (
                            r.type === "Express Quote" && !(Number(r.record?.quotedPrice) > 0)
                          )}>
                          <Printer size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {historyRows.length === 0 && (
                  <tr><td colSpan={12} style={{ color: "var(--ink-soft)", textAlign: "center", padding: 20 }}>No records match that search and time range.</td></tr>
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
              <div><label>Price (₦)</label><input type="text" inputMode="decimal" min="0" placeholder="2500" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} /></div>
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
                  <tr key={r.id} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) savePricingItem(r, "Self Wash", ["label", "price"]); }}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={pricingValue(r, "label", "Self Wash")} onChange={(e) => updateSelfWash(r.id, "label", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" step="100" style={{ width: 120, padding: "6px 8px" }} value={pricingValue(r, "price", "Self Wash")} onChange={(e) => updateSelfWash(r.id, "price", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteSelfWash(r.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New service name" style={{ width: "100%", padding: "6px 8px" }} value={newSelfWash.label} onChange={(e) => setNewSelfWash((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="text" inputMode="decimal" placeholder="Price" style={{ width: 120, padding: "6px 8px" }} value={newSelfWash.price} onChange={(e) => setNewSelfWash((s) => ({ ...s, price: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addSelfWash}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Staff-Wash Rates</h3>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Service Name</th><th>Price (₦/kg)</th><th></th></tr></thead>
              <tbody>
                {staffWashRates.map((r) => (
                  <tr key={r.id} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) savePricingItem(r, "Staff Wash", ["label", "price"]); }}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={pricingValue(r, "label", "Staff Wash")} onChange={(e) => updateStaffWash(r.id, "label", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" step="100" style={{ width: 120, padding: "6px 8px" }} value={pricingValue(r, "price", "Staff Wash")} onChange={(e) => updateStaffWash(r.id, "price", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteStaffWash(r.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New service name" style={{ width: "100%", padding: "6px 8px" }} value={newStaffWash.label} onChange={(e) => setNewStaffWash((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="text" inputMode="decimal" placeholder="Price" style={{ width: 120, padding: "6px 8px" }} value={newStaffWash.price} onChange={(e) => setNewStaffWash((s) => ({ ...s, price: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addStaffWash}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Dry Cleaning Items</h3>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Item Name</th><th>Regular (₦)</th><th>Deep Clean (₦)</th><th></th></tr></thead>
              <tbody>
                {dryCleanItems.map((item) => (
                  <tr key={item.id} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) savePricingItem(item, "Dry Cleaning", ["label", "regular", "deep"]); }}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={pricingValue(item, "label", "Dry Cleaning")} onChange={(e) => updateDryClean(item.id, "label", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" step="100" style={{ width: 110, padding: "6px 8px" }} value={pricingValue(item, "regular", "Dry Cleaning")} onChange={(e) => updateDryClean(item.id, "regular", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" step="100" style={{ width: 110, padding: "6px 8px" }} value={pricingValue(item, "deep", "Dry Cleaning")} onChange={(e) => updateDryClean(item.id, "deep", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteDryClean(item.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New item name" style={{ width: "100%", padding: "6px 8px" }} value={newDryClean.label} onChange={(e) => setNewDryClean((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="text" inputMode="decimal" placeholder="Regular" style={{ width: 110, padding: "6px 8px" }} value={newDryClean.regular} onChange={(e) => setNewDryClean((s) => ({ ...s, regular: e.target.value }))} /></td>
                  <td><input type="text" inputMode="decimal" placeholder="Deep" style={{ width: 110, padding: "6px 8px" }} value={newDryClean.deep} onChange={(e) => setNewDryClean((s) => ({ ...s, deep: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addDryClean}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Shoe Care Items</h3>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead><tr><th>Item Name</th><th>Regular (₦)</th><th>Deep Clean (₦)</th><th>Minor Repairs (₦)</th><th></th></tr></thead>
              <tbody>
                {shoeCareItems.map((item) => (
                  <tr key={item.id} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) savePricingItem(item, "Shoe Care", ["label", "regular", "deep", "repair"]); }}>
                    <td><input style={{ width: "100%", padding: "6px 8px" }} value={pricingValue(item, "label", "Shoe Care")} onChange={(e) => updateShoeCare(item.id, "label", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" step="100" style={{ width: 100, padding: "6px 8px" }} value={pricingValue(item, "regular", "Shoe Care")} onChange={(e) => updateShoeCare(item.id, "regular", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" step="100" style={{ width: 100, padding: "6px 8px" }} value={pricingValue(item, "deep", "Shoe Care")} onChange={(e) => updateShoeCare(item.id, "deep", e.target.value)} /></td>
                    <td><input type="text" inputMode="decimal" step="100" style={{ width: 100, padding: "6px 8px" }} value={pricingValue(item, "repair", "Shoe Care")} onChange={(e) => updateShoeCare(item.id, "repair", e.target.value)} /></td>
                    <td><button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => deleteShoeCare(item.id)}><Trash2 size={13} color="#e0473f" /></button></td>
                  </tr>
                ))}
                <tr>
                  <td><input placeholder="New item name" style={{ width: "100%", padding: "6px 8px" }} value={newShoeCare.label} onChange={(e) => setNewShoeCare((s) => ({ ...s, label: e.target.value }))} /></td>
                  <td><input type="text" inputMode="decimal" placeholder="Regular" style={{ width: 100, padding: "6px 8px" }} value={newShoeCare.regular} onChange={(e) => setNewShoeCare((s) => ({ ...s, regular: e.target.value }))} /></td>
                  <td><input type="text" inputMode="decimal" placeholder="Deep" style={{ width: 100, padding: "6px 8px" }} value={newShoeCare.deep} onChange={(e) => setNewShoeCare((s) => ({ ...s, deep: e.target.value }))} /></td>
                  <td><input type="text" inputMode="decimal" placeholder="Repair" style={{ width: 100, padding: "6px 8px" }} value={newShoeCare.repair} onChange={(e) => setNewShoeCare((s) => ({ ...s, repair: e.target.value }))} /></td>
                  <td><button className="rw-btn rw-btn-primary rw-btn-sm" onClick={addShoeCare}><Plus size={13} /></button></td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><Zap size={15} /> Express Services</h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -4, marginBottom: 10 }}>
              Configure each Express service and its pricing options. Turnaround labels, pricing units, prices and availability are editable. Staff can select the configured options for walk-in orders.
            </p>
            <table className="rw-table" style={{ marginBottom: 10 }}>
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Description</th>
                  <th>Pricing Options</th>
                  <th>Service Available</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expressServices.map((r) => {
                  const savedOptions = pricingValue(r, "expressPricingOptions", "Express");
                  const serviceOptions =
                    Array.isArray(savedOptions) && savedOptions.length
                      ? savedOptions
                      : [{
                          turnaround: pricingValue(r, "turnaround", "Express") || "Same-day",
                          pricingUnit: pricingValue(r, "pricingUnit", "Express") || "Per job",
                          price: pricingValue(r, "price", "Express"),
                          available: true,
                        }];

                  return (
                    <tr
                      key={r.id}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          savePricingItem(r, "Express", ["label", "description", "available", "expressPricingOptions"]);
                        }
                      }}
                    >
                      <td style={{ minWidth: 160 }}>
                        <input
                          style={{ width: 150, padding: "6px 8px" }}
                          value={pricingValue(r, "label", "Express")}
                          onChange={(e) => updateExpress(r.id, "label", e.target.value)}
                          placeholder="Service name"
                        />
                      </td>
                      <td style={{ minWidth: 220 }}>
                        <input
                          aria-label="Express service description"
                          style={{ width: "100%", minWidth: 190, padding: "6px 8px" }}
                          value={pricingValue(r, "description", "Express") ?? ""}
                          onChange={(e) => updateExpress(r.id, "description", e.target.value)}
                          placeholder="Service description"
                        />
                      </td>
                      <td style={{ minWidth: 420 }}>
                        <div style={{ display: "grid", gap: 10 }}>
                          {serviceOptions.map((option, optionIndex) => (
                            <div
                              key={option.id ?? optionIndex}
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                gap: 7,
                                padding: 8,
                                border: "1px solid var(--line)",
                                borderRadius: 6,
                              }}
                            >
                              <input
                                aria-label="Turnaround label"
                                style={{ width: 125, padding: "6px 8px" }}
                                value={option.turnaround ?? ""}
                                onChange={(e) => updateExpress(
                                  r.id,
                                  "expressPricingOptions",
                                  serviceOptions.map((current, index) =>
                                    index === optionIndex
                                      ? { ...current, turnaround: e.target.value }
                                      : current
                                  )
                                )}
                                placeholder="e.g. Same-day"
                              />
                              <input
                                aria-label="Pricing unit"
                                style={{ width: 115, padding: "6px 8px" }}
                                value={option.pricingUnit ?? ""}
                                onChange={(e) => updateExpress(
                                  r.id,
                                  "expressPricingOptions",
                                  serviceOptions.map((current, index) =>
                                    index === optionIndex
                                      ? { ...current, pricingUnit: e.target.value }
                                      : current
                                  )
                                )}
                                placeholder="e.g. Per kg"
                              />
                              <input
                                aria-label="Option price in naira"
                                type="number"
                                min="0.01"
                                step="0.01"
                                style={{ width: 115, padding: "6px 8px" }}
                                value={option.price ?? ""}
                                onChange={(e) => updateExpress(
                                  r.id,
                                  "expressPricingOptions",
                                  serviceOptions.map((current, index) =>
                                    index === optionIndex
                                      ? { ...current, price: e.target.value }
                                      : current
                                  )
                                )}
                                placeholder="Price (₦)"
                              />
                              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                                <input
                                  type="checkbox"
                                  checked={option.available !== false}
                                  onChange={(e) => updateExpress(
                                    r.id,
                                    "expressPricingOptions",
                                    serviceOptions.map((current, index) =>
                                      index === optionIndex
                                        ? { ...current, available: e.target.checked }
                                        : current
                                    )
                                  )}
                                />
                                Available
                              </label>
                              <button
                                type="button"
                                className="rw-btn rw-btn-ghost rw-btn-sm"
                                disabled={serviceOptions.length === 1}
                                title={serviceOptions.length === 1 ? "At least one option is required" : "Remove option"}
                                onClick={() => updateExpress(
                                  r.id,
                                  "expressPricingOptions",
                                  serviceOptions.filter((_, index) => index !== optionIndex)
                                )}
                              >
                                <Trash2 size={13} color="#e0473f" />
                              </button>
                            </div>
                          ))}
                          <div>
                            <button
                              type="button"
                              className="rw-btn rw-btn-ghost rw-btn-sm"
                              onClick={() => updateExpress(r.id, "expressPricingOptions", [
                                ...serviceOptions,
                                {
                                  turnaround: "Same-day",
                                  pricingUnit: "Per job",
                                  price: "",
                                  available: true,
                                },
                              ])}
                            >
                              <Plus size={13} /> Add pricing option
                            </button>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                          <input
                            type="checkbox"
                            checked={pricingValue(r, "available", "Express") !== false}
                            onChange={(e) => updateExpress(r.id, "available", e.target.checked)}
                          />
                          {pricingValue(r, "available", "Express") !== false ? "Active" : "Unavailable"}
                        </label>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="rw-btn rw-btn-ghost rw-btn-sm"
                          title="Delete Express service"
                          onClick={() => deleteExpress(r.id)}
                        >
                          <Trash2 size={13} color="#e0473f" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                <tr>
                  <td style={{ minWidth: 160 }}>
                    <input
                      placeholder="New service name"
                      style={{ width: 150, padding: "6px 8px" }}
                      value={newExpress.label}
                      onChange={(e) => setNewExpress((s) => ({ ...s, label: e.target.value }))}
                    />
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <input
                      aria-label="New Express service description"
                      style={{ width: "100%", minWidth: 190, padding: "6px 8px" }}
                      value={newExpress.description}
                      onChange={(e) => setNewExpress((s) => ({ ...s, description: e.target.value }))}
                      placeholder="Service description"
                    />
                  </td>
                  <td style={{ minWidth: 420 }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      {(newExpress.options || []).map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 7,
                            padding: 8,
                            border: "1px solid var(--line)",
                            borderRadius: 6,
                          }}
                        >
                          <input
                            aria-label="New option turnaround"
                            style={{ width: 125, padding: "6px 8px" }}
                            value={option.turnaround}
                            onChange={(e) => setNewExpress((s) => ({
                              ...s,
                              options: s.options.map((current, index) =>
                                index === optionIndex
                                  ? { ...current, turnaround: e.target.value }
                                  : current
                              ),
                            }))}
                            placeholder="e.g. Same-day"
                          />
                          <input
                            aria-label="New option pricing unit"
                            style={{ width: 115, padding: "6px 8px" }}
                            value={option.pricingUnit}
                            onChange={(e) => setNewExpress((s) => ({
                              ...s,
                              options: s.options.map((current, index) =>
                                index === optionIndex
                                  ? { ...current, pricingUnit: e.target.value }
                                  : current
                              ),
                            }))}
                            placeholder="e.g. Per kg"
                          />
                          <input
                            aria-label="New option price in naira"
                            type="number"
                            min="0.01"
                            step="0.01"
                            style={{ width: 115, padding: "6px 8px" }}
                            value={option.price}
                            onChange={(e) => setNewExpress((s) => ({
                              ...s,
                              options: s.options.map((current, index) =>
                                index === optionIndex
                                  ? { ...current, price: e.target.value }
                                  : current
                              ),
                            }))}
                            placeholder="Price (₦)"
                          />
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                            <input
                              type="checkbox"
                              checked={option.available !== false}
                              onChange={(e) => setNewExpress((s) => ({
                                ...s,
                                options: s.options.map((current, index) =>
                                  index === optionIndex
                                    ? { ...current, available: e.target.checked }
                                    : current
                                ),
                              }))}
                            />
                            Available
                          </label>
                          <button
                            type="button"
                            className="rw-btn rw-btn-ghost rw-btn-sm"
                            disabled={newExpress.options.length === 1}
                            title={newExpress.options.length === 1 ? "At least one option is required" : "Remove option"}
                            onClick={() => setNewExpress((s) => ({
                              ...s,
                              options: s.options.filter((_, index) => index !== optionIndex),
                            }))}
                          >
                            <Trash2 size={13} color="#e0473f" />
                          </button>
                        </div>
                      ))}
                      <div>
                        <button
                          type="button"
                          className="rw-btn rw-btn-ghost rw-btn-sm"
                          onClick={() => setNewExpress((s) => ({
                            ...s,
                            options: [
                              ...s.options,
                              {
                                turnaround: "Same-day",
                                pricingUnit: "Per job",
                                price: "",
                                available: true,
                              },
                            ],
                          }))}
                        >
                          <Plus size={13} /> Add pricing option
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", fontSize: 12, color: "var(--ink-soft)" }}>
                    Active on creation
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rw-btn rw-btn-primary rw-btn-sm"
                      onClick={addExpress}
                    >
                      <Plus size={13} /> Add service
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: 16, marginTop: 24, marginBottom: 8 }}>Custom Laundry Categories & Services</h3>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: -4, marginBottom: 10 }}>
              Create your own Laundry category by adding its first service. Each configured service appears as a selectable category/service in walk-in Laundry orders. Prices use the regular VAT calculation.
            </p>
            <div className="rw-form-grid" style={{ marginBottom: 18, alignItems: "end" }}>
              <div><label>Category name</label><input placeholder="e.g. Curtain Cleaning" value={newCustomService.category} onChange={(e) => setNewCustomService((s) => ({ ...s, category: e.target.value }))} /></div>
              <div><label>Service name</label><input placeholder="e.g. Standard curtain wash" value={newCustomService.name} onChange={(e) => setNewCustomService((s) => ({ ...s, name: e.target.value }))} /></div>
              <div><label>Pricing unit</label><input placeholder="Per item, Per kg, Per job" value={newCustomService.pricingUnit} onChange={(e) => setNewCustomService((s) => ({ ...s, pricingUnit: e.target.value }))} /></div>
              <div><label>Price (₦)</label><input type="number" min="0.01" step="0.01" placeholder="Price" value={newCustomService.price} onChange={(e) => setNewCustomService((s) => ({ ...s, price: e.target.value }))} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label>Service description (optional)</label><input maxLength={1000} placeholder="Describe what this service includes" value={newCustomService.description} onChange={(e) => setNewCustomService((s) => ({ ...s, description: e.target.value }))} /></div>
              <button className="rw-btn rw-btn-primary" onClick={addCustomService}><Plus size={14} /> Add Service / Category</button>
            </div>
            {customServiceCategories.map((category) => (
              <div key={category.name} style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, color: "var(--blue)", marginBottom: 8 }}>{category.name}</h4>
                <table className="rw-table" style={{ marginBottom: 8 }}>
                  <thead><tr><th>Service</th><th>Description</th><th>Pricing unit</th><th>Price (₦)</th><th>Available</th><th></th></tr></thead>
                  <tbody>
                    {category.services.map((service) => {
                      const draft = customServiceDrafts[service.id] || {};
                      const value = (field) => draft[field] ?? service[field] ?? "";
                      const change = (field, next) => setCustomServiceDrafts((items) => ({ ...items, [service.id]: { ...(items[service.id] || {}), [field]: next } }));
                      return (
                        <tr key={service.id} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) saveCustomService(service); }}>
                          <td><input style={{ width: 150, padding: "6px 8px" }} value={value("name")} onChange={(e) => change("name", e.target.value)} /></td>
                          <td><input style={{ width: 180, padding: "6px 8px" }} value={value("description")} onChange={(e) => change("description", e.target.value)} /></td>
                          <td><input style={{ width: 110, padding: "6px 8px" }} value={value("pricingUnit")} onChange={(e) => change("pricingUnit", e.target.value)} /></td>
                          <td><input type="number" min="0.01" step="0.01" style={{ width: 105, padding: "6px 8px" }} value={value("price")} onChange={(e) => change("price", e.target.value)} /></td>
                          <td><input type="checkbox" checked={value("available") !== false} onChange={(e) => change("available", e.target.checked)} /></td>
                          <td><button type="button" className="rw-btn rw-btn-ghost rw-btn-sm" title="Delete custom service" onClick={() => deleteCustomService(service)}><Trash2 size={13} color="#e0473f" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {customServiceCategories.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>No custom Laundry categories yet. Add the first service above to create one.</p>}

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
                        <tr key={ap.id} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) savePricingItem(ap, ap.group, ["label", "price"]); }}>
                          <td><input style={{ width: "100%", padding: "6px 8px" }} value={pricingValue(ap, "label", ap.group)} onChange={(e) => updateAddon(ap.id, "label", e.target.value, ap.group)} /></td>
                          <td><input type="text" inputMode="decimal" step="50" style={{ width: 110, padding: "6px 8px" }} value={pricingValue(ap, "price", ap.group)} onChange={(e) => updateAddon(ap.id, "price", e.target.value, ap.group)} /></td>
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
              <div><label>Price (₦)</label><input type="text" inputMode="decimal" placeholder="2500" value={newAddon.price} onChange={(e) => setNewAddon((s) => ({ ...s, price: e.target.value }))} /></div>
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

        {tab === "subscriptions" && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Walk-in Subscription Purchases</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>
                  Record customer subscription purchases, manage payment status and print receipts.
                </p>
              </div>
              <button
                className="rw-btn rw-btn-ghost rw-btn-sm"
                onClick={() => loadSubscriptionPurchases()}
                disabled={subscriptionPurchaseLoading}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <h4 style={{ fontSize: 14, marginBottom: 10 }}>Record a walk-in subscription</h4>
            <div className="rw-form-grid" style={{ marginBottom: 22, alignItems: "end" }}>
              <div>
                <label>Customer name</label>
                <input
                  value={subscriptionPurchaseDraft.customerName}
                  onChange={(e) => setSubscriptionPurchaseDraft((s) => ({ ...s, customerName: e.target.value }))}
                  placeholder="Customer full name"
                />
              </div>
              <div>
                <label>Customer phone</label>
                <input
                  type="tel"
                  value={subscriptionPurchaseDraft.customerPhone}
                  onChange={(e) => setSubscriptionPurchaseDraft((s) => ({ ...s, customerPhone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label>Subscription plan</label>
                <select
                  value={subscriptionPurchaseDraft.planId}
                  onChange={(e) => setSubscriptionPurchaseDraft((s) => ({ ...s, planId: e.target.value }))}
                >
                  <option value="">Select an active plan</option>
                  {(subscriptionPlans || [])
                    .filter((plan) => plan.active !== false && Number(plan.kgAllowance) > 0)
                    .map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {money(plan.price)} · {plan.kgAllowance} kg
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label>Start date</label>
                <input
                  type="date"
                  value={subscriptionPurchaseDraft.startDate}
                  onChange={(e) => setSubscriptionPurchaseDraft((s) => ({ ...s, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label>Expiry date</label>
                <input
                  type="date"
                  min={subscriptionPurchaseDraft.startDate || undefined}
                  value={subscriptionPurchaseDraft.expiryDate}
                  onChange={(e) => setSubscriptionPurchaseDraft((s) => ({ ...s, expiryDate: e.target.value }))}
                />
              </div>
              <div>
                <label>Payment method</label>
                <select
                  value={subscriptionPurchaseDraft.paymentMethod}
                  onChange={(e) => setSubscriptionPurchaseDraft((s) => ({ ...s, paymentMethod: e.target.value }))}
                >
                  <option value="Transfer">Transfer</option>
                  <option value="POS">POS</option>
                </select>
              </div>
              <div>
                <button
                  className="rw-btn rw-btn-primary"
                  onClick={createWalkInSubscriptionPurchase}
                  disabled={subscriptionPurchaseSaving}
                >
                  {subscriptionPurchaseSaving ? "Recording..." : "Record Subscription Purchase"}
                </button>
              </div>
            </div>

            <h4 style={{ fontSize: 14, marginBottom: 10 }}>Subscription purchase history</h4>
            {subscriptionPurchaseLoading ? (
              <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Loading subscription purchases...</p>
            ) : subscriptionPurchases.length === 0 ? (
              <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No subscription purchases found.</p>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: 28 }}>
                <table className="rw-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Customer</th>
                      <th>Plan</th>
                      <th>KG</th>
                      <th>Start date</th>
                      <th>Expiry date</th>
                      <th>Total</th>
                      <th>Payment method</th>
                      <th>Payment status</th>
                      <th>Recorded by</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptionPurchases.map((purchase) => (
                      <tr key={purchase.dbId || purchase.referenceId}>
                        <td>{purchase.referenceId || "—"}</td>
                        <td>
                          <strong>{purchase.customerName || "—"}</strong>
                          <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>{purchase.customerPhone || ""}</div>
                        </td>
                        <td>{purchase.planName || "—"}</td>
                        <td>{purchase.kgAllowance != null ? `${purchase.kgAllowance} kg` : "—"}</td>
                        <td>{purchase.startDate || "—"}</td>
                        <td>{purchase.expiryDate || "—"}</td>
                        <td>{money(purchase.total)}</td>
                        <td>{purchase.paymentMethod || "—"}</td>
                        <td>
                          <select
                            className="rw-status-select"
                            value={purchase.paymentStatus || "Pending"}
                            disabled={updatingSubscriptionPurchaseId === purchase.dbId}
                            onChange={(e) => updateWalkInSubscriptionPayment(purchase, e.target.value)}
                          >
                            {["Pending", "Sent", "Received", "Confirmed"].map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td>{purchase.createdByName || "—"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <button
                              className="rw-btn rw-btn-ghost rw-btn-sm"
                              onClick={() => printSubscriptionPurchase(purchase)}
                            >
                              Print
                            </button>
                            {purchase.printed && (
                              <span style={{ color: "var(--ink-soft)", fontSize: 11 }}>Printed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canEditPricing && (
              <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Subscription Plans</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>
                  Add, edit, activate or remove customer subscription plans.
                </p>
              </div>
            </div>

            <h4 style={{ fontSize: 14, marginBottom: 10 }}>
              {editingSubscriptionId !== null ? "Edit subscription plan" : "Add a subscription plan"}
            </h4>

            <div className="rw-form-grid" style={{ marginBottom: 16, alignItems: "end" }}>
              <div>
                <label>Plan name</label>
                <input
                  placeholder="e.g. Regular"
                  value={subscriptionDraft.name}
                  onChange={(e) => setSubscriptionDraft((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <label>Price (₦)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="50000"
                  value={subscriptionDraft.price}
                  onChange={(e) => setSubscriptionDraft((s) => ({ ...s, price: e.target.value }))}
                />
              </div>
              <div>
                <label>Duration</label>
                <input
                  placeholder="e.g. 2 weeks"
                  value={subscriptionDraft.duration}
                  onChange={(e) => setSubscriptionDraft((s) => ({ ...s, duration: e.target.value }))}
                />
              </div>
              <div>
                <label>KG allowance</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 20"
                  value={subscriptionDraft.kgAllowance}
                  onChange={(e) => setSubscriptionDraft((s) => ({ ...s, kgAllowance: e.target.value }))}
                />
              </div>
              <div>
                <label>What the plan covers</label>
                <input
                  placeholder="e.g. Regular clothes only"
                  value={subscriptionDraft.covers}
                  onChange={(e) => setSubscriptionDraft((s) => ({ ...s, covers: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={subscriptionDraft.active}
                    onChange={(e) => setSubscriptionDraft((s) => ({ ...s, active: e.target.checked }))}
                  />
                  Active plan
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="rw-btn rw-btn-primary"
                  onClick={saveSubscriptionPlan}
                  disabled={subscriptionSaving}
                >
                  {subscriptionSaving ? "Saving..." : editingSubscriptionId !== null ? "Save Changes" : "Add Plan"}
                </button>
                {editingSubscriptionId !== null && (
                  <button className="rw-btn rw-btn-ghost" onClick={resetSubscriptionDraft}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <h4 style={{ fontSize: 14, marginBottom: 10 }}>Existing subscription plans</h4>
            {subscriptionLoading ? (
              <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>Loading subscription plans...</p>
            ) : managedSubscriptionPlans.length === 0 ? (
              <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No subscription plans found.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="rw-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Price</th>
                      <th>Duration</th>
                      <th>KG Allowance</th>
                      <th>Covers</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedSubscriptionPlans.map((plan) => (
                      <tr key={plan.id}>
                        <td>{plan.name}</td>
                        <td>{money(plan.price)}</td>
                        <td>{plan.duration}</td>
                        <td>{plan.kgAllowance != null ? `${plan.kgAllowance} kg` : "—"}</td>
                        <td>{plan.covers}</td>
                        <td>{plan.active ? "Active" : "Inactive"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => editSubscriptionPlan(plan)}>
                              Edit
                            </button>
                            <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => toggleSubscriptionPlan(plan)}>
                              {plan.active ? "Deactivate" : "Activate"}
                            </button>
                            {confirmDeleteSubscriptionId === plan.id ? (
                              <>
                                <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => removeSubscriptionPlan(plan.id)}>
                                  Confirm Delete
                                </button>
                                <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => setConfirmDeleteSubscriptionId(null)}>
                                  Keep
                                </button>
                              </>
                            ) : (
                              <button className="rw-btn rw-btn-ghost rw-btn-sm" onClick={() => setConfirmDeleteSubscriptionId(plan.id)}>
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
              </div>
            )}
          </div>
        )}

             {tab === "reports" && canSeeReports && (
          <div>
            <div className="rw-admin-panel-head">
              <div>
                <h2 style={{ marginBottom: 4 }}>Reports & Financial Summary</h2>
                <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Detailed breakdown of all revenue streams and metrics.</p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div className="rw-pill-group">
                  {RANGES.filter((r) => r.id !== "custom").map((r) => (
                    <button key={r.id} className={`rw-pill ${reportsRange === r.id ? "active" : ""}`} onClick={() => setReportsRange(r.id)}>{r.label}</button>
                  ))}
                </div>
                <button
                  className="rw-btn rw-btn-ghost rw-btn-sm"
                  onClick={() => setReportsRange("month")}
                  title="Reset the report view to this month; records remain saved"
                >
                  <RefreshCw size={13} /> Reset report view
                </button>
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