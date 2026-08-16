import { Star } from "lucide-react";

export default function Testimonials({ kicker, title, subtitle, items }) {
  return (
    <div className="rw-section" style={{ paddingTop: 0 }}>
      <div className="rw-section-head">
        {kicker && <div className="rw-kicker">{kicker}</div>}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="rw-testi-row">
        {items.map((t) => (
          <div className="rw-testi-card" key={t.name}>
            <div className="rw-testi-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
            <p className="rw-testi-quote">&ldquo;{t.quote}&rdquo;</p>
            <div className="rw-testi-name">{t.name}</div>
            <div className="rw-testi-role">{t.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
