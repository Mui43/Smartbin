export const THAI_TIME_ZONE = "Asia/Bangkok";
const DAY_MS = 86400000;
const OFFSET_MS = 7 * 3600000;

export function thaiDateKey(date = new Date()) {
  return new Date(date.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export function thaiDayStart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid date; use YYYY-MM-DD");
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime()) || thaiDateKey(date) !== value) throw new Error("Invalid date");
  return date;
}

export function thaiDateFilter(start?: string, end?: string) {
  const from = start ? thaiDayStart(start) : undefined;
  const until = end ? new Date(thaiDayStart(end).getTime() + DAY_MS) : undefined;
  if (from && until && from >= until) throw new Error("Start date must not be after end date");
  return { ...(from ? { $gte: from } : {}), ...(until ? { $lt: until } : {}) };
}

export function thaiPeriod(range: string, month?: string, now = new Date()) {
  let start = thaiDayStart(thaiDateKey(now));
  let end = new Date(start.getTime() + DAY_MS);
  if (range === "week") {
    const weekday = new Date(start.getTime() + OFFSET_MS).getUTCDay();
    start = new Date(start.getTime() - (weekday === 0 ? 6 : weekday - 1) * DAY_MS);
    end = new Date(start.getTime() + 7 * DAY_MS);
  } else if (range === "month") {
    const value = month || thaiDateKey(now).slice(0, 7);
    start = thaiDayStart(`${value}-01`);
    const shifted = new Date(start.getTime() + OFFSET_MS);
    end = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1) - OFFSET_MS);
  } else if (range !== "day") {
    throw new Error("Invalid range");
  }
  return { start, end };
}

export function thaiTimestamp(date: Date) {
  return new Date(date.getTime() + OFFSET_MS).toISOString().replace("Z", "+07:00");
}
