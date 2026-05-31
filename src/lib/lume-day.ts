import { isoCalendarAdd } from "@/lib/timeline";
import { isoDateInTimeZone } from "@/lib/today-server";

import type { DayBoundarySettings } from "@/types/lume";

/** Default focus reset time (3:00 AM). */
export const DEFAULT_DAY_END_TIME = "03:00";

/** @deprecated Use {@link DEFAULT_DAY_END_TIME}. */
export const DEFAULT_DAY_BOUNDARY: DayBoundarySettings = {
  day_end_time: DEFAULT_DAY_END_TIME,
};

/** Normalize Postgres `time` (`HH:MM:SS`) or `HH:MM` to five-char `HH:MM`. */
export function normalizeTimeOfDay(value: string | null | undefined): string {
  if (!value?.trim()) return "00:00";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "00:00";
  const hh = Math.min(23, Math.max(0, Number(match[1])));
  const mm = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function parseTimeToMinutes(value: string): number {
  const normalized = normalizeTimeOfDay(value);
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + m;
}

/** Clock minutes (0–1439) for `reference` in the given IANA timezone. */
export function timeMinutesInTimeZone(reference: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(reference);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  return Number(map.hour) * 60 + Number(map.minute);
}

/**
 * Resolve the active focus day (`yyyy-MM-dd`) for today-selection pins.
 *
 * Focus resets when `day_end_time` is crossed. At midnight (00:00), focus follows
 * the calendar date. Otherwise focus for day D persists until `day_end_time` the next morning.
 */
export function getFocusDayISO(
  timeZone: string,
  boundary: DayBoundarySettings,
  reference: Date = new Date(),
): string {
  const calendarDate = isoDateInTimeZone(reference, timeZone);
  const endMin = parseTimeToMinutes(boundary.day_end_time);
  const nowMin = timeMinutesInTimeZone(reference, timeZone);

  if (endMin === 0) {
    return calendarDate;
  }

  if (nowMin < endMin) {
    return isoCalendarAdd(calendarDate, -1);
  }

  return calendarDate;
}

/** @deprecated Use {@link getFocusDayISO}. */
export const getLumeDayISO = getFocusDayISO;

const BOUNDARY_PROBE_MS = 15_000;
const MAX_BOUNDARY_LOOKAHEAD_MS = 48 * 60 * 60 * 1000;

/** Milliseconds until the focus-day label next changes (at boundary end). */
export function msUntilNextFocusDayBoundary(
  timeZone: string,
  boundary: DayBoundarySettings,
  reference: Date = new Date(),
): number {
  const current = getFocusDayISO(timeZone, boundary, reference);
  let probe = reference.getTime() + 1000;
  const limit = reference.getTime() + MAX_BOUNDARY_LOOKAHEAD_MS;

  while (probe <= limit) {
    if (getFocusDayISO(timeZone, boundary, new Date(probe)) !== current) {
      return Math.max(1000, probe - reference.getTime());
    }
    probe += BOUNDARY_PROBE_MS;
  }

  return 60_000;
}

/** @deprecated Use {@link msUntilNextFocusDayBoundary}. */
export const msUntilNextLumeDayBoundary = msUntilNextFocusDayBoundary;

export function dayBoundaryKey(boundary: DayBoundarySettings): string {
  return boundary.day_end_time;
}
