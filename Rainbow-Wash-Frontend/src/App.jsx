import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Shop from "./pages/Shop";
import BookCleaning from "./pages/BookCleaning";
import OrderLaundry from "./pages/OrderLaundry";
import TrackOrder from "./pages/TrackOrder";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/book-cleaning" element={<BookCleaning />} />
          <Route path="/order-laundry" element={<OrderLaundry />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
