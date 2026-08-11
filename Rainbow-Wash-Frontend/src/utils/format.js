export const money = (n) => `₦${Number(n).toLocaleString("en-NG")}`;

export const genRef = (prefix) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

// Formats an ISO timestamp (auto-captured at order/booking creation) into a
// short readable date + time for the staff dashboard, e.g. "9 Aug, 2:14 PM".
export const formatPlacedAt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

// Is this timestamp from today (local calendar day)? Used so the main
// dashboard tabs naturally show only "today's" orders without ever deleting
// anything — the moment the date rolls over, yesterday's entries simply stop
// matching and fall through to History instead.
export const isToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

// Range matcher for the History tab: "today" | "week" | "month" | "year" | "all"
export const matchesRange = (iso, range) => {
  if (range === "all") return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();

  if (range === "today") return isToday(iso);

  if (range === "week") {
    const msAgo = now.getTime() - d.getTime();
    return msAgo >= 0 && msAgo <= 7 * 24 * 60 * 60 * 1000;
  }

  if (range === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  if (range === "year") {
    return d.getFullYear() === now.getFullYear();
  }

  return true;
};
