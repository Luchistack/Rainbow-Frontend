import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, ShoppingCart, Lock, ChevronDown } from "lucide-react";
import { NAV_ITEMS, RAINBOW } from "../data/constants";
import logo from "../assets/logo.png";
import { useApp } from "../context/AppContext";

export default function Navbar({ onCartClick }) {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const { cartCount } = useApp();

  return (
    <div className="rw-nav">
      <div className="rw-nav-inner">
        {/* Left side: Hamburger menu button + Logo */}
        <div className="rw-nav-left">
          <button 
            className="rw-mobile-toggle rw-icon-btn" 
            onClick={() => setOpen((o) => !o)} 
            aria-label="Toggle Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to="/" className="rw-brand">
            <img src={logo} alt="Rainbow Wash logo" />
            <span className="rw-brand-text">
              <span className="rw-brand-main"><span>R</span>ainbow Wash</span>
              <span className="rw-brand-sub">Laundry And Cleaning Services</span>
            </span>
          </NavLink>
        </div>

        {/* Center: Desktop links with compact Services dropdown */}
        <div className="rw-navlinks">
          {NAV_ITEMS.map((n) => {
            if (n.label === "Services") {
              return (
                <div 
                  key={n.path} 
                  className="rw-dropdown-container"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  <NavLink to={n.path} className={({ isActive }) => (isActive ? "active" : "")}>
                    Services <ChevronDown size={14} style={{ display: "inline", marginLeft: "2px" }} />
                  </NavLink>
                  {servicesOpen && (
                    <div className="rw-dropdown-menu">
                      <NavLink to="/services">All Laundry Services</NavLink>
                      <NavLink to="/services#cleaning">Cleaning & Deep Clean</NavLink>
                      <NavLink to="/services#express">Express Delivery</NavLink>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink key={n.path} to={n.path} className={({ isActive }) => (isActive ? "active" : "")} end={n.path === "/"}>
                {n.label}
              </NavLink>
            );
          })}
        </div>

        {/* Right side: Cart and Login */}
        <div className="rw-navcta">
          <button className="rw-icon-btn" onClick={onCartClick} aria-label="Cart">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="rw-badge-count">{cartCount}</span>}
          </button>
          <NavLink to="/admin" className="rw-btn rw-btn-ghost rw-btn-sm">
            <Lock size={14} /> Login
          </NavLink>
        </div>
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      <div className={`rw-mobile-menu ${open ? "open" : ""}`}>
        {NAV_ITEMS.map((n) => (
          <NavLink key={n.path} to={n.path} onClick={() => setOpen(false)} className={({ isActive }) => (isActive ? "active" : "")} end={n.path === "/"}>
            {n.label}
          </NavLink>
        ))}
        <div style={{ padding: "8px 6px", fontSize: "15px", color: "var(--ink-soft)", fontWeight: "700" }}>
          + Cleaning & Specialty Services Available
        </div>
      </div>

      <div className="rw-stripe">
        {RAINBOW.map((c) => (
          <span key={c} style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}