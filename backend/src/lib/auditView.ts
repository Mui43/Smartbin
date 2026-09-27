import { thaiDateFilter } from "./thaiTime.js";

export function redactAuditDetails(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditDetails);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
      /password|secret|token|api.?key|authorization|cookie|credential/i.test(key)
        ? "[ซ่อนข้อมูล]" : redactAuditDetails(item),
    ]));
  }
  return value;
}

export function auditFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  for (const key of ["action", "binId", "email"]) {
    if (query[key]) filter[key] = String(query[key]).trim();
  }
  const dates = thaiDateFilter(query.startDate ? String(query.startDate) : undefined, query.endDate ? String(query.endDate) : undefined);
  if (Object.keys(dates).length) filter.timestamp = dates;
  return filter;
}

export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
