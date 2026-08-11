import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { PRODUCTS } from "../data/constants";

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
    clothType: "regular",
    weight: 4,
    qty: 1,
    level: "washfold",
    fulfilment: "pickup",
    address: "12 Palm Ave, Maryland",
    date: "2026-08-09",
    time: "10:00",
    payment: "paystack",
    fullName: "Bukola Adebayo",
    phone: "0803 000 1122",
    email: "bukola.a@example.com",
    placedAt: "2026-08-08T09:12:00.000Z",
    archived: false,
    total: 4200,
    status: "Washing",
  },
  {
    id: "LND-3390",
    clothType: "bedding",
    weight: 6,
    qty: 1,
    level: "washiron",
    fulfilment: "dropoff",
    address: "",
    date: "",
    time: "",
    payment: "bank",
    fullName: "Tunde Bakare",
    phone: "0705 555 9081",
    email: "",
    placedAt: "2026-08-07T15:40:00.000Z",
    archived: false,
    total: 10500,
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
    status: "Confirmed",
  },
];

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState("");
  const [products, setProducts] = usePersistedState("products", PRODUCTS);
  const [laundryOrders, setLaundryOrders] = usePersistedState("laundryOrders", SEED_LAUNDRY_ORDERS);
  const [bookings, setBookings] = usePersistedState("bookings", SEED_BOOKINGS);
  const [shopOrders, setShopOrders] = usePersistedState("shopOrders", []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const value = {
    cart, setCart, cartCount,
    toast, notify,
    products, setProducts,
    laundryOrders, setLaundryOrders,
    bookings, setBookings,
    shopOrders, setShopOrders,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
