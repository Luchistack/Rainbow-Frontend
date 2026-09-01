import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  PRODUCTS, SELF_WASH_RATES, STAFF_WASH_RATES, DRY_CLEAN_ITEMS, SHOE_CARE_ITEMS,
  ADDON_PRODUCTS, CLEANING_SERVICES, EXPRESS_SERVICES, ADDON_GROUPS,
} from "../data/constants";
import { fetchCleaningServices, fetchBookings, fetchProducts, fetchOrders, fetchShopOrders } from "../api/api";

const CLEANING_PARENT_LABELS = ["Home Cleaning", "Office Cleaning", "Deep Cleaning", "Upholstery Cleaning"];

// Every non-Shop price on the site (Self Wash, Staff Wash, Dry Cleaning, Shoe
// Care, Express, Add-ons, and Cleaning Service sizes) now lives as one flat,
// real, backend-synced list — the same `/api/services` catalog that was
// already built and working for Cleaning Services. Rather than build five
// more near-identical backend entities, everything is just tagged with a
// `category` and, where needed, `deepPrice`/`repairPrice`. These helpers turn
// that flat list into the exact shapes every page already expects, so
// OrderLaundry.jsx, BookCleaning.jsx, Services.jsx and Admin.jsx's Pricing
// tab don't need to change how they read this data at all.
function deriveGroupedServices(allServices) {
  const byCategory = (cat) => allServices.filter((s) => s.category === cat);

  const selfWashRates = byCategory("Self Wash").map((s) => ({ id: s.id, label: s.name, unit: "kg", price: s.price }));
  const staffWashRates = byCategory("Staff Wash").map((s) => ({ id: s.id, label: s.name, unit: "kg", price: s.price }));
  const dryCleanItems = byCategory("Dry Cleaning").map((s) => ({ id: s.id, label: s.name, regular: s.price, deep: s.deepPrice }));
  const shoeCareItems = byCategory("Shoe Care").map((s) => ({ id: s.id, label: s.name, regular: s.price, deep: s.deepPrice, repair: s.repairPrice }));
  const expressServices = byCategory("Express").map((s) => ({ id: s.id, label: s.name, price: s.price }));
  const addonProducts = allServices
    .filter((s) => ADDON_GROUPS.includes(s.category))
    .map((s) => ({ id: s.id, label: s.name, price: s.price, group: s.category }));
  const cleaningServices = CLEANING_PARENT_LABELS
    .map((label) => ({
      id: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      sizes: byCategory(label).map((s) => ({ id: s.id, label: s.name, price: s.price })),
    }))
    .filter((cs) => cs.sizes.length > 0);

  return { selfWashRates, staffWashRates, dryCleanItems, shoeCareItems, expressServices, addonProducts, cleaningServices };
}

// What's shown before the first successful fetch (or if the backend is briefly
// unreachable) — the same numbers that used to be hardcoded, just reshaped
// into the flat catalog format so the derive function above works on it too.
function buildFallbackServices() {
  const flat = [];
  SELF_WASH_RATES.forEach((r) => flat.push({ id: r.id, name: r.label, price: r.price, deepPrice: null, repairPrice: null, category: "Self Wash" }));
  STAFF_WASH_RATES.forEach((r) => flat.push({ id: r.id, name: r.label, price: r.price, deepPrice: null, repairPrice: null, category: "Staff Wash" }));
  DRY_CLEAN_ITEMS.forEach((i) => flat.push({ id: i.id, name: i.label, price: i.regular, deepPrice: i.deep, repairPrice: null, category: "Dry Cleaning" }));
  SHOE_CARE_ITEMS.forEach((i) => flat.push({ id: i.id, name: i.label, price: i.regular, deepPrice: i.deep, repairPrice: i.repair, category: "Shoe Care" }));
  EXPRESS_SERVICES.forEach((i) => flat.push({ id: i.id, name: i.label, price: i.price, deepPrice: null, repairPrice: null, category: "Express" }));
  ADDON_PRODUCTS.forEach((p) => flat.push({ id: p.id, name: p.label, price: p.price, deepPrice: null, repairPrice: null, category: p.group }));
  CLEANING_SERVICES.forEach((cs) => cs.sizes.forEach((sz) => flat.push({ id: `${cs.id}-${sz.id}`, name: sz.label, price: sz.price, deepPrice: null, repairPrice: null, category: cs.label })));
  return flat;
}

const AppContext = createContext(null);

const STORAGE_PREFIX = "rainbowwash:";

function loadPersisted(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function usePersistedState(key, initialValue) {
  const [state, setState] = useState(() => loadPersisted(key, initialValue));
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state));
    } catch {
      // storage unavailable (private browsing etc.) — fail silently, session still works
    }
  }, [key, state]);
  return [state, setState];
}

// A background refresh should NEVER be able to make an order/booking vanish.
// If something was placed while the backend save silently failed (a network
// blip, a validation hiccup, anything), it only exists in local state — it
// has no real `dbId` yet. Blindly replacing the whole list with whatever the
// backend returns would erase that record the moment the next poll runs,
// even though nothing was ever actually deleted. This keeps any not-yet-
// synced local record around until it genuinely appears in a fresh fetch.
// A background refresh should NEVER be able to make an order/booking vanish
// within the first couple of minutes after it's placed — that protects
// against a real, short network hiccup during the backend save. But keeping
// an unsynced local order alive *forever* backfires: it means anything that
// permanently failed to save (an old bug, a one-off backend error) becomes a
// "ghost" that piles up in that one browser's storage indefinitely, making
// that device's counts drift further and further from the real backend
// truth over time — exactly what was happening here. Past this grace
// window, if it still hasn't appeared in a fresh fetch, it's treated as
// genuinely gone rather than kept alive forever.
const UNSYNCED_GRACE_MS = 2 * 60 * 1000; // 2 minutes

function mergeKeepingUnsynced(prevList, freshList) {
  const cutoff = Date.now() - UNSYNCED_GRACE_MS;
  const stillUnsynced = prevList.filter((item) => {
    if (item.dbId) return false;
    const placedAtMs = item.placedAt ? new Date(item.placedAt).getTime() : 0;
    return placedAtMs > cutoff;
  });
  return [...stillUnsynced, ...freshList];
}
const SEED_LAUNDRY_ORDERS = [
  {
    id: "LND-4821",
    items: [{ name: "Staff Wash — Wash & Dry", qty: 4, price: 2000, unit: "kg" }],
    fulfilment: "pickup",
    address: "12 Palm Ave, Maryland",
    date: "2026-08-09",
    time: "10:00",
    payment: "paystack",
    paymentStatus: "Confirmed",
    transferNote: "",
    fullName: "Bukola Adebayo",
    phone: "0803 000 1122",
    email: "bukola.a@example.com",
    placedAt: "2026-08-08T09:12:00.000Z",
    archived: false,
    total: 10500,
    status: "Washing",
  },
  {
    id: "LND-3390",
    items: [{ name: "Self Wash — Wash & Iron", qty: 6, price: 4000, unit: "kg" }],
    fulfilment: "dropoff",
    address: "",
    date: "",
    time: "",
    payment: "bank",
    paymentStatus: "Pending",
    transferNote: "",
    fullName: "Tunde Bakare",
    phone: "0705 555 9081",
    email: "",
    placedAt: "2026-08-07T15:40:00.000Z",
    archived: false,
    total: 24000,
    status: "Ready",
  },
];

const SEED_BOOKINGS = [
  {
    id: "CLN-7712",
    service: "Home Cleaning",
    size: "2–3 Bedroom",
    date: "2026-08-12",
    time: "09:00",
    address: "5 Adisa Close, Maryland",
    fullName: "Emeka Obi",
    phone: "0812 222 3344",
    email: "emeka.o@example.com",
    placedAt: "2026-08-08T11:05:00.000Z",
    archived: false,
    price: 20000,
    payType: "deposit",
    payable: 6000,
    paymentStatus: "Confirmed",
    status: "Confirmed",
  },
];

const DEFAULT_TEAM_ACCOUNTS = [
  { name: "Default Manager", role: "Manager", password: "ManagerPass123" },
  { name: "Default Staff", role: "Staff", password: "StaffPass123" },
];

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState("");

  // Shop inventory — now backed by the real Postgres products table (see the
  // fetch effect below); the constant here is only the initial/fallback value
  // shown before the fetch resolves or if the backend is unreachable.
  const [products, setProducts] = usePersistedState("products", PRODUCTS);

  // Service pricing — Self Wash, Staff Wash, Dry Cleaning, Shoe Care, Express,
  // Add-ons, and Cleaning Service sizes are now all one real, backend-synced
  // catalog (see deriveGroupedServices above). Editable by Manager/Admin in
  // the dashboard's Pricing tab; every customer-facing page reads the derived
  // values below live, so a price edit reflects everywhere instantly, on
  // every device, not just the browser that made the change.
  const [allServices, setAllServices] = usePersistedState("allServices", buildFallbackServices());
  const {
    selfWashRates, staffWashRates, dryCleanItems, shoeCareItems, expressServices, addonProducts, cleaningServices,
  } = useMemo(() => deriveGroupedServices(allServices), [allServices]);

  const refreshServices = async () => {
    try {
      const data = await fetchCleaningServices(); // hits GET /api/services — the whole flat catalog
      if (data) setAllServices(data);
      return true;
    } catch (error) {
      return false;
    }
  };

  const [laundryOrders, setLaundryOrders] = usePersistedState("laundryOrders", SEED_LAUNDRY_ORDERS);
  const [bookings, setBookings] = usePersistedState("bookings", SEED_BOOKINGS);
  const [shopOrders, setShopOrders] = usePersistedState("shopOrders", []);

  // Currently logged-in dashboard user: { name, role } or null when logged out.
  const [currentUser, setCurrentUser] = usePersistedState("currentUser", null);

  // Team accounts state persisted across sessions
  const [teamAccounts, setTeamAccounts] = usePersistedState("teamAccounts", DEFAULT_TEAM_ACCOUNTS);

  // Fetch the full pricing catalog from the backend on mount — public
  // endpoint, so this works for anonymous customers browsing Order Laundry,
  // Services and Book Cleaning too, not just logged-in staff.
  useEffect(() => {
    refreshServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch real shop products from the backend on mount. GET /api/products is
  // public, so this works for anonymous customers on the Shop page too, not
  // just logged-in staff.
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        if (data) {
          setProducts(data);
        }
      } catch (error) {
        // Fallback gracefully to local storage / constants if backend is offline
      }
    };
    loadProducts();
  }, []);

  // Fetch real cleaning bookings from the backend once staff are logged in.
  // GET /api/bookings requires a JWT, so this only fires after currentUser
  // is set (i.e. after a successful staff/manager/admin login).
  useEffect(() => {
    if (!currentUser) return;
    const loadBookings = async () => {
      try {
        const data = await fetchBookings();
        if (data) {
          setBookings((prev) => mergeKeepingUnsynced(prev, data));
        }
      } catch (error) {
        // Falls back to whatever's already loaded if the backend call fails
      }
    };
    loadBookings();
    const interval = setInterval(loadBookings, 20000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Fetch real laundry orders and shop orders from the backend once staff are
  // logged in, and keep re-fetching every 20 seconds while the dashboard is
  // open. This is what makes an order placed by one staff member (or a
  // customer on the public site) show up for everyone else without them
  // having to log out and back in — a real-time WebSocket feed would be the
  // "proper" version of this, but polling every 20s gets the same practical
  // result with far less to build and maintain right now.
  useEffect(() => {
    if (!currentUser) return;

    const loadOrders = async () => {
      try {
        const data = await fetchOrders();
        if (data) setLaundryOrders((prev) => mergeKeepingUnsynced(prev, data));
      } catch (error) {
        // Falls back to whatever's already loaded if the backend call fails
      }
    };
    const loadShopOrders = async () => {
      try {
        const data = await fetchShopOrders();
        if (data) setShopOrders((prev) => mergeKeepingUnsynced(prev, data));
      } catch (error) {
        // Falls back to whatever's already loaded if the backend call fails
      }
    };

    loadOrders();
    loadShopOrders();

    const interval = setInterval(() => {
      loadOrders();
      loadShopOrders();
    }, 20000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

   // Browsers throttle or fully pause background-tab timers to save battery,
  // so the 20-second poll above can silently stretch out much longer while a
  // dashboard tab isn't the active one (switched away on desktop, phone
  // screen locked/backgrounded, etc). Rather than waiting for a possibly
  // delayed timer to catch up, this fires an immediate refresh the moment
  // the tab becomes visible again — so coming back to the dashboard always
  // shows what's actually true right now, not what it last happened to fetch.
  useEffect(() => {
    if (!currentUser) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const value = {
    refreshAll,
    cart, setCart, cartCount,
    toast, notify,
    products, setProducts,
    allServices, refreshServices,
    selfWashRates, staffWashRates, dryCleanItems, shoeCareItems, addonProducts, cleaningServices, expressServices,
    laundryOrders, setLaundryOrders,
    bookings, setBookings,
    shopOrders, setShopOrders,
    currentUser, setCurrentUser,
    teamAccounts, setTeamAccounts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}