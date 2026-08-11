# Rainbow Wash — Frontend

A Vite + React frontend for Rainbow Wash Laundry and Cleaning Services.

## Why you saw "just code" last time

The first file you were given (`App.jsx`) was a single React **component** — it needs a build tool
(Vite) and an HTML entry point to actually render in a browser. Pasting a component file into VS Code
and opening it doesn't run it; VS Code just shows you the text. This project fixes that: it's a real,
runnable app.

## How to run it

You need [Node.js](https://nodejs.org) installed (v18 or later). Then, in this folder:

```bash
npm install
npm run dev
```

This starts a local dev server (usually at `http://localhost:5173`) and opens it in your browser
automatically. Changes you make to any file are reflected instantly.

To build a production-ready version (static files you can deploy anywhere):

```bash
npm run build
```

This creates a `dist/` folder — upload its contents to any static host (Netlify, Vercel, cPanel, etc.)
or serve it from your Java backend later.

## Project structure (separation of concerns)

```
src/
  assets/         Real image files (logo, hero photos cropped from your flyer)
  components/     Reusable UI: Navbar, Footer, Hero, CartDrawer, Toast, Layout, PageHeader
  pages/          One file per page: Home, About, Services, Shop, BookCleaning,
                   OrderLaundry, TrackOrder, Admin
  context/        AppContext.jsx — shared state (cart, orders, bookings, inventory)
  data/           constants.js — pricing tables, service lists, product catalog, business info
  utils/          format.js — money formatting, reference number generator
  styles/         variables.css (design tokens) + global.css (all component/page styles)
  App.jsx         Route definitions
  main.jsx        App entry point
index.html        The actual HTML page Vite serves
```

## What's implemented (frontend only — no backend yet)

- **Home / About / Services** — marketing pages built from your flyer's content and photos.
- **Order Laundry** — clothes type, weight-based price calculator (same logic as your in-store scale),
  service level, pickup/delivery + address/date/time, payment method selection, generates a reference number.
- **Book Cleaning** — service type, property size, date/time, address, deposit-or-full payment, live price estimate.
- **Shop** — product grid, low-stock badges, cart drawer, delivery/pickup checkout.
- **Track Order** — enter a reference number and see status move through
  Received → Washing → Ready → Out for Delivery.
- **Admin dashboard** (`/admin`) — demo staff login, orders table (editable weight + status),
  bookings table, inventory with restock button, revenue overview.

All data currently lives in React state (`src/context/AppContext.jsx`) and resets on page refresh.
Payments (Paystack/Flutterwave/bank), SMS/email notifications, real authentication, and persistent
storage all require the Java backend — the frontend is structured so that swapping the mock state
in `AppContext.jsx` for real API calls will be straightforward once that's ready.

## Next step

When you're ready to connect the backend, the cleanest place to start is `src/context/AppContext.jsx`
— replace the `useState` calls with API calls (e.g. `fetch`/`axios`) to your Java endpoints, and every
page automatically works off real data since they all read from this shared context.
