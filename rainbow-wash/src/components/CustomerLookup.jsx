import { useEffect, useState } from "react";

export default function CustomerLookup({
  value,
  onChange,
  onSelect,
  searchCustomers,
  placeholder = "Customer full name",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const query = String(value || "").trim();
    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const matches = await searchCustomers(query);
        if (active) {
          setSuggestions(matches);
          setShowSuggestions(true);
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [value, searchCustomers]);

  const chooseCustomer = (customer) => {
    onSelect(customer);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <label>Customer name</label>
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => {
          if (String(value || "").trim().length >= 2 && suggestions.length) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showSuggestions && String(value || "").trim().length >= 2 &&
        (loading || suggestions.length > 0) && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 30,
          marginTop: 4,
          maxHeight: 240,
          overflowY: "auto",
          background: "var(--card, #fff)",
          border: "1px solid var(--line, #dce3ea)",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(7, 26, 47, .14)",
        }}>
          {loading && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--ink-soft)" }}>
              Searching saved customers...
            </div>
          )}
          {suggestions.map((customer, index) => (
            <button
              key={`${customer.phone || customer.fullName || "customer"}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseCustomer(customer)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 12px",
                border: 0,
                borderBottom: index < suggestions.length - 1
                  ? "1px solid var(--line, #e8edf2)" : 0,
                background: "transparent",
                color: "var(--ink)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "block", fontWeight: 700, fontSize: 13 }}>
                {customer.fullName || "Unnamed customer"}
              </span>
              <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "var(--ink-soft)" }}>
                {[customer.phone, customer.email].filter(Boolean).join(" · ") || "No saved phone or email"}
              </span>
              {customer.address && (
                <span style={{ display: "block", marginTop: 2, fontSize: 11, color: "var(--ink-soft)" }}>
                  {customer.address}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
