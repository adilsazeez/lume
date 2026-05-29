/**
 * Canonical "today" boundary for SSR + DB queries aligned to a chosen IANA TZ.
 */
export function getServerTimezone(): string {
  const fromEnv = process.env.DATE_TZ;
  if (fromEnv?.trim()) return fromEnv.trim();
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function isoDateInTimeZone(reference: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  // en-US yields MM/DD? Actually parts type month/day/year numeric 2-digit
  const yyyy = map.year;
  const mm = map.month;
  const dd = map.day;
  return `${yyyy}-${mm}-${dd}`;
}

export function getServerTodayISO(): string {
  return getTodayISO(getServerTimezone());
}

/** Calendar today as `yyyy-MM-dd` in the given IANA timezone (client + server safe). */
export function getTodayISO(timeZone: string, reference: Date = new Date()): string {
  return isoDateInTimeZone(reference, timeZone);
}
