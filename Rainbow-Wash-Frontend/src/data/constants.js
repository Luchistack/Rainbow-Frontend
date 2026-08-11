export const RAINBOW = ["#EF4136", "#F7941D", "#FFCE33", "#39B54A", "#27AAE1", "#8E44AD"];

export const NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/services", label: "Our Services" },
  { path: "/shop", label: "Shop" },
  { path: "/book-cleaning", label: "Book Cleaning" },
  { path: "/order-laundry", label: "Order Laundry" },
  { path: "/track-order", label: "Track Order" },
];

export const CLOTHING_RATES = [
  { id: "regular", label: "Everyday Wear (shirts, jeans, tees)", rate: 800 },
  { id: "bedding", label: "Bedding (duvets, bedsheets, blankets)", rate: 1400 },
  { id: "delicate", label: "Delicates (silk, lace, formal wear)", rate: 1600 },
  { id: "towels", label: "Towels & Robes", rate: 900 },
];

export const LAUNDRY_SERVICE_LEVELS = [
  { id: "washfold", label: "Wash & Fold", multiplier: 1 },
  { id: "washiron", label: "Wash & Iron", multiplier: 1.25 },
  { id: "dryclean", label: "Dry Cleaning", multiplier: 1.6 },
  { id: "express", label: "Express (same-day)", multiplier: 1.5 },
];

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

// Order/booking receipts send straight to this WhatsApp number as a copy for staff.
export const WHATSAPP_NUMBER = "2348136920900"; // ⚠️ double-check this — it's 12 digits, one short of the usual 13 (234 + 10-digit local number)
export const buildWhatsAppLink = (message) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const DELIVERY_FEE = 2500;
export const DELIVERY_COVERAGE_NOTE = "Currently covers the Maryland area only, other areas of Lagos may incur an additional fee, confirmed before you pay.";

export const MAPS_ADDRESS = "Rainbow Wash, 10 Prince Bode Oluwo Street, Mende, opposite Mende Town Hall, Maryland, Lagos";
export const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_ADDRESS)}`;

export const BUSINESS_INFO = {
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
