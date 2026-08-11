import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, ShoppingCart, Lock } from "lucide-react";
import { NAV_ITEMS, RAINBOW } from "../data/constants";
import logo from "../assets/logo.png";
import { useApp } from "../context/AppContext";

export default function Navbar({ onCartClick }) {
  const [open, setOpen] = useState(false);
  const { cartCount } = useApp();

  return (
    <div className="rw-nav">
      <div className="rw-nav-inner">
        <NavLink to="/" className="rw-brand">
          <img src={logo} alt="Rainbow Wash logo" />
          <span className="rw-brand-text"><span>R</span>ainbow Wash</span>
        </NavLink>

        <div className="rw-navlinks">
          {NAV_ITEMS.map((n) => (
            <NavLink key={n.path} to={n.path} className={({ isActive }) => (isActive ? "active" : "")} end={n.path === "/"}>
              {n.label}
            </NavLink>
          ))}
        </div>

        <div className="rw-navcta">
          <button className="rw-icon-btn" onClick={onCartClick} aria-label="Cart">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="rw-badge-count">{cartCount}</span>}
          </button>
          <NavLink to="/admin" className="rw-btn rw-btn-ghost rw-btn-sm">
            <Lock size={14} /> Staff
          </NavLink>
          <button className="rw-mobile-toggle rw-icon-btn" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <div className={`rw-mobile-menu ${open ? "open" : ""}`}>
        {NAV_ITEMS.map((n) => (
          <NavLink key={n.path} to={n.path} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? "active" : "")} end={n.path === "/"}>
            {n.label}
          </NavLink>
        ))}
      </div>

      <div className="rw-stripe">
        {RAINBOW.map((c) => (
          <span key={c} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}
