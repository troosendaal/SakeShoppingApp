// Lightweight date helpers for the meal planner. Pure functions — safe to
// use in Client and Server Components.

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Returns the local-time Monday at 00:00 of the week containing the given date.
export function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Sun goes back 6, others go back to Mon
  date.setDate(date.getDate() + diff);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// YYYY-MM-DD in the LOCAL timezone — matches what Postgres `date` columns
// store. toISOString() shifts to UTC which can land on the wrong day.
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dayName(d: Date): string {
  return DAY_NAMES_EN[d.getDay()] ?? "";
}

// Week 21 · May 18 – 24 (handles month-crossing: "Apr 28 – May 4")
export function formatWeekRange(start: Date): {
  weekNumber: number;
  range: string;
} {
  const end = addDays(start, 6);
  const startMonth = MONTHS_EN[start.getMonth()] ?? "";
  const endMonth = MONTHS_EN[end.getMonth()] ?? "";
  const range =
    startMonth === endMonth
      ? `${startMonth} ${start.getDate()} – ${end.getDate()}`
      : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
  return { weekNumber: isoWeekNumber(start), range };
}

// ISO 8601 week number (Mon-based). Good enough for display.
function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
