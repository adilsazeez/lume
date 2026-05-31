/**
 * IANA timezone for Lume day-boundary calculations (see user_settings + lume-day.ts).
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

/** Browser IANA timezone; falls back when `Intl` is unavailable (SSR). */
export function getBrowserTimezone(fallback?: string): string {
  if (typeof Intl === "undefined") {
    return fallback?.trim() || "UTC";
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz?.trim() || fallback?.trim() || "UTC";
  } catch {
    return fallback?.trim() || "UTC";
  }
}

const CALENDAR_PROBE_MS = 15_000;
const MAX_CALENDAR_LOOKAHEAD_MS = 48 * 60 * 60 * 1000;

/** Milliseconds until the calendar date next changes in the given timezone (local midnight). */
export function msUntilNextCalendarMidnight(timeZone: string, reference: Date = new Date()): number {
  const current = isoDateInTimeZone(reference, timeZone);
  let probe = reference.getTime() + 1000;
  const limit = reference.getTime() + MAX_CALENDAR_LOOKAHEAD_MS;

  while (probe <= limit) {
    if (isoDateInTimeZone(new Date(probe), timeZone) !== current) {
      return Math.max(1000, probe - reference.getTime());
    }
    probe += CALENDAR_PROBE_MS;
  }

  return 60_000;
}
