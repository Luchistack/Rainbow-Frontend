export const RAINBOW = ["#EF4136", "#F7941D", "#FFCE33", "#39B54A", "#27AAE1", "#8E44AD"];

export const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/services", label: "Services" },
  { path: "/shop", label: "Shop" },
  { path: "/book-cleaning", label: "Cleaning" },
  { path: "/order-laundry", label: "Laundry" },
  { path: "/track-order", label: "Track Order" },
];

/* ============================================================
   LAUNDRY PRICING — seed defaults, editable by Manager/Admin
   in the dashboard's Pricing tab. Live values are stored in
   AppContext (and localStorage) once the app first loads.
   ============================================================ */

// Self Wash: customer washes it themselves using our machines.
// A 5% discount applies automatically once a single self-wash line hits 5kg or more.
export const SELF_WASH_DISCOUNT_KG = 5;
export const SELF_WASH_DISCOUNT_RATE = 0.05;
export const SELF_WASH_RATES = [
  { id: "sw-washdry", label: "Wash & Dry", unit: "kg", price: 1500 },
  { id: "sw-dryonly", label: "Drying Only", unit: "kg", price: 1000 },
  { id: "sw-washiron", label: "Wash & Iron", unit: "kg", price: 4000 },
];

// Staff Wash: our team washes it for you.
export const STAFF_WASH_RATES = [
  { id: "stw-washdry", label: "Wash & Dry", unit: "kg", price: 2000 },
  { id: "stw-ironingonly", label: "Ironing Only", unit: "kg", price: 2500 },
  { id: "stw-washiron", label: "Wash & Iron", unit: "kg", price: 4500 },
  { id: "stw-dryonly", label: "Drying Only", unit: "kg", price: 1500 },
];

// Dry Cleaning: priced per garment, Regular vs Deep Clean.
export const DRY_CLEAN_ITEMS = [
  { id: "dc-suit2", label: "Suit (2-piece)", regular: 5000, deep: 7000 },
  { id: "dc-suit3", label: "Suit (3-piece)", regular: 7000, deep: 10000 },
  { id: "dc-blazer", label: "Blazer", regular: 2000, deep: 4000 },
  { id: "dc-coat", label: "Coat", regular: 4000, deep: 5000 },
  { id: "dc-leatherjacket", label: "Leather Jacket", regular: 3000, deep: 4000 },
];

// Shoe & Leather Care: priced per pair/item, Regular / Deep Clean / Minor Repairs.
export const SHOE_CARE_ITEMS = [
  { id: "sc-sneakers", label: "Sneakers", regular: 4000, deep: 8000, repair: 2000 },
  { id: "sc-suedes", label: "Suedes", regular: 8000, deep: 10000, repair: 3000 },
  { id: "sc-heelsboots", label: "Heels & Boots", regular: 5000, deep: 7000, repair: 2000 },
  { id: "sc-leathershoes", label: "Leather Shoes", regular: 4000, deep: 5000, repair: 2000 },
];

// Add-on products, grouped into distinct category headers as requested:
// Detergents, Bags, Nylon, Starch, Bleach, Extras.
export const ADDON_GROUPS = ["Detergents", "Starch", "Bleach", "Nylon", "Bags", "Extras"];
export const ADDON_PRODUCTS = [
  { id: "ad-softener-small", label: "Fabric Softener (small)", price: 2500, group: "Detergents" },
  { id: "ad-softener-big", label: "Fabric Softener (big)", price: 25000, group: "Detergents" },
  { id: "ad-detergent-small", label: "Liquid Detergent (small)", price: 2500, group: "Detergents" },
  { id: "ad-detergent-big", label: "Liquid Detergent (big)", price: 25000, group: "Detergents" },
  { id: "ad-soklin-smart", label: "So Klin Smart", price: 500, group: "Detergents" },
  { id: "ad-soklin-detergent", label: "So Klin Detergent (small)", price: 1000, group: "Detergents" },
  { id: "ad-viva-small", label: "Viva Detergent (small)", price: 700, group: "Detergents" },
  { id: "ad-viva-big", label: "Viva Detergent (big)", price: 3000, group: "Detergents" },
  { id: "ad-starch-niagara", label: "Starch, Original Lavender Niagara (per cloth)", price: 500, group: "Starch" },
  { id: "ad-starch-faultless", label: "Starch, Heavy Lavender Faultless (per cloth)", price: 500, group: "Starch" },
  { id: "ad-starch-braxton", label: "Starch, Heavy Amindon Lourd Braxton5 (per cloth)", price: 500, group: "Starch" },
  { id: "ad-bleach-small", label: "Bleach (small)", price: 1500, group: "Bleach" },
  { id: "ad-bleach-big", label: "Bleach (big)", price: 4500, group: "Bleach" },
  { id: "ad-nylon-xl", label: "Nylon XL", price: 1500, group: "Nylon" },
  { id: "ad-nylon-l", label: "Nylon L", price: 1000, group: "Nylon" },
  { id: "ad-nylon-m", label: "Nylon M", price: 500, group: "Nylon" },
  { id: "ad-nylon-s", label: "Nylon S", price: 300, group: "Nylon" },
  { id: "ad-shoebag", label: "Shoe Bag", price: 1000, group: "Bags" },
  { id: "ad-suitebag", label: "Suite Bag", price: 4000, group: "Bags" },
  { id: "ad-bag", label: "Bag", price: 5500, group: "Bags" },
  { id: "ad-stain-minor", label: "Minor Stain Remover (per cloth)", price: 500, group: "Extras" },
  { id: "ad-stain-regular", label: "Regular Stain Remover (per cloth)", price: 1000, group: "Extras" },
  { id: "ad-stain-tuff", label: "Tuff Stain Remover (per cloth)", price: 2000, group: "Extras" },
  { id: "ad-scentbeads", label: "Scent Beads (per cap)", price: 500, group: "Extras" },
  { id: "ad-tiepod", label: "Tiepod", price: 1000, group: "Extras" },
];

// Express service — same category shape as Dry Cleaning/Shoe Care (a flat
// per-item/per-load surcharge), covering Laundry, Upholstery and Cleaning.
// Fully editable by Manager/Admin in the Pricing tab, same as everything else.
export const EXPRESS_SERVICES = [
  { id: "ex-laundry", label: "Express Laundry (same-day)", price: 2000 },
  { id: "ex-upholstery", label: "Express Upholstery (same-day)", price: 5000 },
  { id: "ex-cleaning", label: "Express Cleaning (same-day)", price: 5000 },
];

// Home/Office/Deep Clean/Upholstery — internal reference prices only.
// These are NEVER shown to customers on Book Cleaning or Services; the
// customer-facing copy always says "price confirmed via WhatsApp or call."
// Staff/Admin can see and edit these in the dashboard's Pricing tab.
export const CLEANING_SERVICES = [
  {
    id: "home",
    label: "Home Cleaning",
    sizes: [
      { id: "studio", label: "Studio / 1 Bed", price: 12000 },
      { id: "2bed", label: "2–3 Bedroom", price: 20000 },
      { id: "duplex", label: "Duplex / 4+ Bed", price: 32000 },
    ],
  },
  {
    id: "office",
    label: "Office Cleaning",
    sizes: [
      { id: "small", label: "Small office", price: 15000 },
      { id: "medium", label: "Medium office", price: 28000 },
      { id: "large", label: "Large office / floor", price: 45000 },
    ],
  },
  {
    id: "deep",
    label: "Deep Cleaning",
    sizes: [
      { id: "studio", label: "Studio / 1 Bed", price: 22000 },
      { id: "2bed", label: "2–3 Bedroom", price: 36000 },
      { id: "duplex", label: "Duplex / 4+ Bed", price: 55000 },
    ],
  },
  {
    id: "upholstery",
    label: "Upholstery Cleaning",
    sizes: [
      { id: "single", label: "Single item (chair/mattress)", price: 8000 },
      { id: "sofa", label: "3-seater sofa", price: 16000 },
      { id: "fullset", label: "Full living room set", price: 30000 },
    ],
  },
];

// Laundry subscription plans — customers subscribe via WhatsApp for now.
export const SUBSCRIPTION_PLANS = [
  { id: "regular", name: "Regular", price: 50000, duration: "2 weeks", covers: "Regular clothes only" },
  { id: "exclusive", name: "Exclusive", price: 100000, duration: "2 weeks", covers: "Duvets and regular clothes" },
  { id: "premium", name: "Premium", price: 200000, duration: "1 month", covers: "Everything, all laundry types" },
];

export const PRODUCTS = [
  { id: "p1", name: "Liquid Detergent 2L", price: 3500, stock: 24, status: "Active" },
  { id: "p2", name: "Fabric Softener 1L", price: 2200, stock: 6, status: "Active" },
  { id: "p3", name: "Stain Remover Spray", price: 2800, stock: 14, status: "Active" },
  { id: "p4", name: "Powder Detergent 1kg", price: 2600, stock: 3, status: "Active" },
  { id: "p5", name: "Starch Spray", price: 1900, stock: 18, status: "Active" },
  { id: "p6", name: "Laundry Bag (Mesh)", price: 1500, stock: 30, status: "Active" },
  { id: "p7", name: "Ironing Spray", price: 2100, stock: 8, status: "Active" },
  { id: "p8", name: "Colour Catcher Sheets (24pk)", price: 3200, stock: 2, status: "Active" },
];

export const TRACK_STAGES = ["Received", "Washing", "Completed", "Delivered"];
export const PAYMENT_STATUSES = ["Pending", "Sent", "Confirmed"];

// Order/booking receipts send straight to this WhatsApp number as a copy for staff.
export const WHATSAPP_NUMBER = "2348136920900"; // ⚠️ double-check this — it's 12 digits, one short of the usual 13 (234 + 10-digit local number)
export const buildWhatsAppLink = (message) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const DELIVERY_FEE = 2500;
// Applied to every order/booking's item subtotal, always ADDED on top (never
// backed out of a stored total) — 7.5% is Nigeria's standard VAT rate.
export const VAT_RATE = 0.075;
export const DELIVERY_COVERAGE_NOTE = "Currently covers the Maryland area only, other areas of Lagos may incur an additional fee, confirmed before you pay.";

export const MAPS_ADDRESS = "Rainbow Wash, 10 Prince Bode Oluwo Street, Mende, opposite Mende Town Hall, Maryland, Lagos";
export const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_ADDRESS)}`;

export const BANK_DETAILS = {
  accountNumber: "56789635343",
  bankName: "Providus Bank",
  accountName: "Rainbow Wash Laundry and Cleaning Services",
};

export const BUSINESS_INFO = {
  name: "Rainbow Wash Laundry And Cleaning Services",
  address: "10 Prince Bode Oluwo Street, Mende, opposite Mende Town Hall, Maryland, Lagos.",
  phones: ["0812 140 6293", "0916 589 6730"],
  email: "rainbowwashlaundrycleaningserv@gmail.com",
  tiktok: "@rainbowwashlaundry",
  instagram: "rainbowwashlaundryandcleanings",
  hours: [
    { days: "Mon – Wed", time: "9AM – 7PM" },
    { days: "Thursday", time: "10AM – 7PM" },
    { days: "Fri – Sat", time: "9AM – 7PM" },
    { days: "Sunday", time: "12PM – 6PM" },
  ],
};

// Dashboard roles. Staff: today's orders/bookings/shop + read-only History,
// no pricing, no inventory, no overview, no reports. Manager: everything
// Admin has except Overview and Reports. Admin: everything, full edit rights.
export const ROLES = ["Staff", "Manager", "Admin"];
