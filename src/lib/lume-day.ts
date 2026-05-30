import { isoCalendarAdd } from "@/lib/timeline";
import { isoDateInTimeZone } from "@/lib/today-server";

import type { DayBoundarySettings } from "@/types/lume";

/** Default: calendar day starts at midnight; rolls forward at 3:00 AM. */
export const DEFAULT_DAY_BOUNDARY: DayBoundarySettings = {
  day_start_time: "00:00",
  day_end_time: "03:00",
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
 * Resolve the active Lume day (`yyyy-MM-dd`) for focus, logs, and mini-task "today".
 *
 * Overnight model (typical): a day labeled D runs until `day_end_time` the next morning.
 * Between `day_end_time` and `day_start_time` (when start is later), the previous day still applies.
 *
 * When start === end, the boundary follows the calendar date (midnight rollover).
 */
export function getLumeDayISO(
  timeZone: string,
  boundary: DayBoundarySettings,
  reference: Date = new Date(),
): string {
  const calendarDate = isoDateInTimeZone(reference, timeZone);
  const startMin = parseTimeToMinutes(boundary.day_start_time);
  const endMin = parseTimeToMinutes(boundary.day_end_time);
  const nowMin = timeMinutesInTimeZone(reference, timeZone);

  if (startMin === endMin) {
    return calendarDate;
  }

  if (nowMin < endMin) {
    return isoCalendarAdd(calendarDate, -1);
  }

  if (startMin > endMin && nowMin < startMin) {
    return isoCalendarAdd(calendarDate, -1);
  }

  return calendarDate;
}

/** Human-readable summary for settings UI. */
export function describeDayBoundary(boundary: DayBoundarySettings): string {
  const start = normalizeTimeOfDay(boundary.day_start_time);
  const end = normalizeTimeOfDay(boundary.day_end_time);
  if (start === end) return "Follows the calendar day (midnight rollover).";
  return `Your Lume day runs until ${formatTime12h(end)}${start !== "00:00" ? ` and begins at ${formatTime12h(start)}` : ""}.`;
}

function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = normalizeTimeOfDay(hhmm).split(":");
  const h24 = Number(hStr);
  const m = Number(mStr);
  const ampm = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 || 12;
  return m === 0 ? `${hour12} ${ampm}` : `${hour12}:${mStr} ${ampm}`;
}
