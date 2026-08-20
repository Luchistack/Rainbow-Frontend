import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  PRODUCTS, SELF_WASH_RATES, STAFF_WASH_RATES, DRY_CLEAN_ITEMS, SHOE_CARE_ITEMS,
  ADDON_PRODUCTS, CLEANING_SERVICES,
} from "../data/constants";
import { fetchCleaningServices } from "../api/api";

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

  // Shop inventory (existing)
  const [products, setProducts] = usePersistedState("products", PRODUCTS);

  // Service pricing — editable by Manager/Admin in the dashboard's Pricing
  // tab. Every customer-facing page reads these live from context instead
  // of the static constants, so a price edit reflects everywhere instantly.
  const [selfWashRates, setSelfWashRates] = usePersistedState("selfWashRates", SELF_WASH_RATES);
  const [staffWashRates, setStaffWashRates] = usePersistedState("staffWashRates", STAFF_WASH_RATES);
  const [dryCleanItems, setDryCleanItems] = usePersistedState("dryCleanItems", DRY_CLEAN_ITEMS);
  const [shoeCareItems, setShoeCareItems] = usePersistedState("shoeCareItems", SHOE_CARE_ITEMS);
  const [addonProducts, setAddonProducts] = usePersistedState("addonProducts", ADDON_PRODUCTS);
  const [cleaningServices, setCleaningServices] = usePersistedState("cleaningServices", CLEANING_SERVICES);

  const [laundryOrders, setLaundryOrders] = usePersistedState("laundryOrders", SEED_LAUNDRY_ORDERS);
  const [bookings, setBookings] = usePersistedState("bookings", SEED_BOOKINGS);
  const [shopOrders, setShopOrders] = usePersistedState("shopOrders", []);

  // Currently logged-in dashboard user: { name, role } or null when logged out.
  const [currentUser, setCurrentUser] = usePersistedState("currentUser", null);

  // Team accounts state persisted across sessions
  const [teamAccounts, setTeamAccounts] = usePersistedState("teamAccounts", DEFAULT_TEAM_ACCOUNTS);

  // Fetch live cleaning services from backend on mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const data = await fetchCleaningServices();
        if (data) {
          setCleaningServices(data);
        }
      } catch (error) {
        // Fallback gracefully to local storage / constants if backend is offline
      }
    };
    loadBackendData();
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const value = {
    cart, setCart, cartCount,
    toast, notify,
    products, setProducts,
    selfWashRates, setSelfWashRates,
    staffWashRates, setStaffWashRates,
    dryCleanItems, setDryCleanItems,
    shoeCareItems, setShoeCareItems,
    addonProducts, setAddonProducts,
    cleaningServices, setCleaningServices,
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