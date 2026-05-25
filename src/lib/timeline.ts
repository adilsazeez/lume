export type TimelinePreset = "day" | "year";

function utcIsoSlice(iso: string) {
  return iso.includes("T") ? iso.slice(0, 10) : iso;
}

/** Add whole calendar days assuming `yyyy-MM-dd` is a UTC calendar date. */
export function isoCalendarAdd(iso: string, deltaDays: number) {
  const [yStr, moStr, dStr] = utcIsoSlice(iso).split("-");
  const y = Number(yStr);
  const mo = Number(moStr);
  const d = Number(dStr);

  const t = Date.UTC(y, mo - 1, d) + deltaDays * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

export function enumerateIsoDaysInclusive(startISO: string, endISO: string): string[] {
  const cur0 = utcIsoSlice(startISO);
  const stop = utcIsoSlice(endISO);

  if (diffUtcIsoDays(stop, cur0) < 0) return [];

  const days: string[] = [];

  let cur = cur0;
  for (let i = 0; i < 5000; i++) {
    days.push(cur);
    if (cur === stop) break;
    cur = isoCalendarAdd(cur, 1);
  }

  return days;
}

function calendarYearBounds(referenceISO: string) {
  const y = Number(utcIsoSlice(referenceISO).slice(0, 4));
  return { startISO: `${y}-01-01`, endISO: `${y}-12-31` };
}

export function getTimelineRange(referenceISO: string, preset: TimelinePreset) {
  const ref = utcIsoSlice(referenceISO);
  let startISO = ref;
  let endISO = ref;

  if (preset === "day") {
    startISO = isoCalendarAdd(ref, -90);
    endISO = isoCalendarAdd(ref, 90);
  } else {
    ({ startISO, endISO } = calendarYearBounds(ref));
  }

  const days = enumerateIsoDaysInclusive(startISO, endISO);

  return { startISO, endISO, days };
}

function utcDay(iso: string) {
  const s = utcIsoSlice(iso);
  const [yStr, moStr, dStr] = s.split("-");
  const y = Number(yStr);
  const mo = Number(moStr);
  const d = Number(dStr);

  return new Date(Date.UTC(y, mo - 1, d));
}

/** Calendar difference for ISO date-only strings in UTC framing (left − right). */
export function diffUtcIsoDays(leftISO: string, rightISO: string) {
  const l = utcDay(leftISO).getTime();
  const r = utcDay(rightISO).getTime();
  return Math.round((l - r) / 86400000);
}

/** @deprecated Prefer getTimelineRange with explicit preset */
export function getTimelineWindow(referenceISO: string) {
  return getTimelineRange(referenceISO, "day");
}

export function clampThreadSpanToRange(
  startISO: string,
  dueISO: string,
  rangeStartISO: string,
  rangeEndISO: string,
) {
  let visibleStartISO = utcIsoSlice(startISO);
  let visibleDueISO = utcIsoSlice(dueISO);

  // Entire thread span before window
  if (diffUtcIsoDays(visibleStartISO, rangeEndISO) > 0) return null;
  // Entire thread span after window
  if (diffUtcIsoDays(visibleDueISO, rangeStartISO) < 0) return null;

  if (diffUtcIsoDays(visibleStartISO, rangeStartISO) < 0) {
    visibleStartISO = utcIsoSlice(rangeStartISO);
  }

  if (diffUtcIsoDays(visibleDueISO, rangeEndISO) > 0) {
    visibleDueISO = utcIsoSlice(rangeEndISO);
  }

  return { visibleStartISO, visibleDueISO };
}

export function threadTouchesTimelineRange(
  startISO: string,
  dueISO: string,
  rangeStartISO: string,
  rangeEndISO: string,
) {
  return clampThreadSpanToRange(startISO, dueISO, rangeStartISO, rangeEndISO) !== null;
}

/** Inclusive span across precomputed UTC timeline day columns. */
export function timelineBarMetrics(
  visibleStartISO: string,
  visibleDueISO: string,
  timelineDaysISO: readonly string[],
) {
  const n = timelineDaysISO.length || 1;

  let startIdx = timelineDaysISO.indexOf(visibleStartISO);
  if (startIdx < 0) {
    startIdx = Math.min(
      Math.max(diffUtcIsoDays(visibleStartISO, timelineDaysISO[0]!), 0),
      n - 1,
    );
  }

  let endIdx = timelineDaysISO.indexOf(visibleDueISO);
  if (endIdx < 0) {
    endIdx = Math.min(
      Math.max(diffUtcIsoDays(visibleDueISO, timelineDaysISO[0]!), 0),
      n - 1,
    );
  }

  startIdx = Math.min(Math.max(startIdx, 0), n - 1);
  endIdx = Math.min(Math.max(endIdx, 0), n - 1);
  if (endIdx < startIdx) endIdx = startIdx;

  const pctStart = (startIdx / n) * 100;
  const pctWidth = ((endIdx - startIdx + 1) / n) * 100;
  const dueFrac = ((endIdx + 1) / n) * 100;

  return { startIdx, endIdx, pctStart, pctWidth, dueFrac };
}

export type Urgency = "silent" | "soon" | "hot";

export function urgencyForDueDate(dueISO: string, todayISO: string): Urgency {
  const remaining = diffUtcIsoDays(utcIsoSlice(dueISO), utcIsoSlice(todayISO));

  if (remaining <= 2) return "hot";
  if (remaining <= 7) return "soon";
  return "silent";
}
