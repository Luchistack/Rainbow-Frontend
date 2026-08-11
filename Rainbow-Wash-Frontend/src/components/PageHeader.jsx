export default function PageHeader({ title, subtitle }) {
  return (
    <div className="rw-page-hero">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}
