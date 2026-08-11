import { CheckCircle2 } from "lucide-react";

export default function PhotoFeature({ image, alt, kicker, title, text, points, reverse, cta }) {
  return (
    <div className="rw-section" style={{ paddingTop: 0 }}>
      <div className={`rw-photo-band ${reverse ? "reverse" : ""}`}>
        <img src={image} alt={alt} />
        <div>
          {kicker && <div className="rw-kicker">{kicker}</div>}
          <h2>{title}</h2>
          <p>{text}</p>
          {points && (
            <ul className="rw-check-list">
              {points.map((p) => (
                <li key={p}><CheckCircle2 size={18} /> {p}</li>
              ))}
            </ul>
          )}
          {cta}
        </div>
      </div>
    </div>
  );
}
