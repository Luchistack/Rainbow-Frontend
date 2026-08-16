import { MapPin, Phone, Mail, Instagram, Sparkles, ExternalLink } from "lucide-react";
import logo from "../assets/logo.png";
import { BUSINESS_INFO, MAPS_LINK } from "../data/constants";

export default function Footer() {
  return (
    <footer className="rw-footer">
      <div className="rw-footer-inner">
        <div className="rw-footer-brand">
          <img src={logo} alt="Rainbow Wash" />
          <p>Rainbow Wash Laundry and Cleaning Services, coloring your world with cleanliness.</p>
          <div className="rw-footer-social">
            <a href="#" aria-label="TikTok"><Sparkles size={16} /></a>
            <a href="#" aria-label="Instagram"><Instagram size={16} /></a>
            <a href={`mailto:${BUSINESS_INFO.email}`} aria-label="Email"><Mail size={16} /></a>
          </div>
        </div>

        <div>
          <h4>Opening Hours</h4>
          {BUSINESS_INFO.hours.map((h) => (
            <div className="rw-hours-row" key={h.days}>
              <span>{h.days}</span>
              <b>{h.time}</b>
            </div>
          ))}
        </div>

        <div>
          <h4>Contact</h4>
          <ul>
            <li><MapPin size={15} /> {BUSINESS_INFO.address}</li>
            {BUSINESS_INFO.phones.map((p) => (
              <li key={p}><Phone size={15} /> {p}</li>
            ))}
          </ul>
          <a
            href={MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="rw-btn rw-btn-ghost rw-btn-sm"
            style={{ background: "rgba(255,255,255,.08)", color: "#fff", borderColor: "rgba(255,255,255,.25)", marginTop: 14 }}
          >
            <MapPin size={14} /> Get Directions <ExternalLink size={13} />
          </a>
        </div>

        <div>
          <h4>Find Us Online</h4>
          <ul>
            <li><Sparkles size={15} /> TikTok: {BUSINESS_INFO.tiktok}</li>
            <li><Instagram size={15} /> {BUSINESS_INFO.instagram}</li>
            <li><Mail size={15} /> {BUSINESS_INFO.email}</li>
          </ul>
        </div>
      </div>
      <div className="rw-footer-bottom">
        © {new Date().getFullYear()} Rainbow Wash Laundry and Cleaning Services. All rights reserved.
      </div>
    </footer>
  );
}
