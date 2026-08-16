export default function Steps({ kicker, title, subtitle, steps }) {
  return (
    <div className="rw-section">
      <div className="rw-section-head">
        {kicker && <div className="rw-kicker">{kicker}</div>}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="rw-steps-row">
        {steps.map((s, idx) => (
          <div className="rw-step-card" key={s.title}>
            <div className="rw-step-num">{idx + 1}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
