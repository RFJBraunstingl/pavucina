const DAY_MS = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const weekdayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});
const rangeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function asDay(value: string) {
  if (!DATE_PATTERN.test(value)) return Number.NaN;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  return new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp / DAY_MS
    : Number.NaN;
}

const toDate = (value: string) => new Date(`${value}T00:00:00Z`);

export function isIsoDate(value: string) {
  return Number.isFinite(asDay(value));
}

export function todayIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value: string, amount: number) {
  const day = asDay(value);
  if (!Number.isFinite(day)) throw new Error(`Invalid ISO date: ${value}`);
  return new Date((day + amount) * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string) {
  return asDay(end) - asDay(start);
}

export function makeDateRange(start: string, length = 28) {
  return Array.from({ length }, (_, index) => addDays(start, index));
}

export function dayLabel(value: string) {
  return weekdayFormatter.format(toDate(value));
}

export function monthLabel(value: string) {
  return monthFormatter.format(toDate(value));
}

export function dayOfMonth(value: string) {
  return toDate(value).getUTCDate();
}

export function rangeLabel(start: string, end: string) {
  return `${rangeFormatter.format(toDate(start))} – ${rangeFormatter.format(toDate(end))}`;
}

export function isWeekend(value: string) {
  return [0, 6].includes(toDate(value).getUTCDay());
}
