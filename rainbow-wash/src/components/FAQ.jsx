import { useState } from "react";
import { ChevronDown } from "lucide-react";

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rw-faq-item">
      <button className="rw-faq-q" onClick={() => setOpen((o) => !o)}>
        {q}
        <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
      </button>
      {open && <div className="rw-faq-a">{a}</div>}
    </div>
  );
}

export default function FAQ({ kicker, title, subtitle, items }) {
  return (
    <div className="rw-section" style={{ paddingTop: 0 }}>
      <div className="rw-section-head">
        {kicker && <div className="rw-kicker">{kicker}</div>}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="rw-faq-list">
        {items.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}
