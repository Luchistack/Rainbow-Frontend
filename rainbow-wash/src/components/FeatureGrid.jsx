export default function FeatureGrid({ kicker, title, subtitle, items, bg }) {
  return (
    <div className="rw-section" style={bg ? { paddingTop: 0 } : { paddingTop: 0 }}>
      <div className="rw-section-head">
        {kicker && <div className="rw-kicker">{kicker}</div>}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="rw-grid-4">
        {items.map((f) => (
          <div className="rw-card rw-feature-card" key={f.title}>
            <div className="rw-card-icon" style={{ background: (f.color || "#1f6fb2") + "1c" }}>
              <f.icon size={22} color={f.color || "#1f6fb2"} />
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
