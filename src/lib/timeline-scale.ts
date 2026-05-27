import type { TimelinePreset } from "@/lib/timeline";
import {
  diffUtcIsoDays,
  getTimelineRange,
  isoCalendarAdd,
  periodAnchorISO,
  shiftPeriodAnchor,
} from "@/lib/timeline";

export type TimelineDayUnit = {
  kind: "day";
  iso: string;
};

export type TimelineMonthUnit = {
  kind: "month";
  ymKey: string;
  startISO: string;
  endISO: string;
  monthIndex: number;
};

export type TimelineUnit = TimelineDayUnit | TimelineMonthUnit;

export type TimelineScale = {
  preset: TimelinePreset;
  referenceISO: string;
  rangeStartISO: string;
  rangeEndISO: string;
  units: TimelineUnit[];
  unitCount: number;
  trackWidthPx: number;
  unitWidthPx: number;
};

function utcIsoSlice(iso: string) {
  return iso.includes("T") ? iso.slice(0, 10) : iso;
}

function yearBounds(referenceISO: string) {
  const y = utcIsoSlice(referenceISO).slice(0, 4);
  return { startISO: `${y}-01-01`, endISO: `${y}-12-31` };
}

function monthUnitsForYear(referenceISO: string): TimelineMonthUnit[] {
  const y = utcIsoSlice(referenceISO).slice(0, 4);
  const units: TimelineMonthUnit[] = [];

  for (let mo = 1; mo <= 12; mo++) {
    const ymKey = `${y}-${String(mo).padStart(2, "0")}`;
    const startISO = `${ymKey}-01`;
    const lastDay = new Date(Date.UTC(Number(y), mo, 0)).getUTCDate();
    const endISO = `${ymKey}-${String(lastDay).padStart(2, "0")}`;
    units.push({ kind: "month", ymKey, startISO, endISO, monthIndex: mo - 1 });
  }

  return units;
}

/** Visible ruler/grid units for the active mode. */
export function getVisibleUnits(preset: TimelinePreset, referenceISO: string): TimelineUnit[] {
  if (preset === "year") return monthUnitsForYear(referenceISO);

  const { days } = getTimelineRange(referenceISO, preset);
  return days.map((iso) => ({ kind: "day" as const, iso }));
}

/** Primary unit count: 7 · month-days · 12. */
export function getUnitCount(preset: TimelinePreset, referenceISO: string): number {
  return getVisibleUnits(preset, referenceISO).length;
}

/** Inclusive range used for thread clamping and continuous date mapping. */
export function getRangeBounds(preset: TimelinePreset, referenceISO: string) {
  if (preset === "year") return yearBounds(referenceISO);
  const { startISO, endISO } = getTimelineRange(referenceISO, preset);
  return { startISO, endISO };
}

export function getUnitWidth(trackWidthPx: number, unitCount: number) {
  if (trackWidthPx <= 0 || unitCount <= 0) return 0;
  return trackWidthPx / unitCount;
}

export function buildTimelineScale(
  preset: TimelinePreset,
  referenceISO: string,
  trackWidthPx: number,
): TimelineScale {
  const units = getVisibleUnits(preset, referenceISO);
  const { startISO, endISO } = getRangeBounds(preset, referenceISO);
  const unitCount = units.length;

  return {
    preset,
    referenceISO,
    rangeStartISO: startISO,
    rangeEndISO: endISO,
    units,
    unitCount,
    trackWidthPx,
    unitWidthPx: getUnitWidth(trackWidthPx, unitCount),
  };
}

/** Total inclusive days in the visible range (for continuous mapping). */
export function rangeDayCount(rangeStartISO: string, rangeEndISO: string) {
  return diffUtcIsoDays(rangeEndISO, rangeStartISO) + 1;
}

/** Continuous 0→1 fraction for a date within [rangeStart, rangeEnd] (inclusive days). */
export function getDateFraction(iso: string, rangeStartISO: string, rangeEndISO: string) {
  const total = rangeDayCount(rangeStartISO, rangeEndISO);
  if (total <= 0) return 0;

  const offset = diffUtcIsoDays(utcIsoSlice(iso), rangeStartISO);
  const clamped = Math.max(0, Math.min(total - 1, offset));
  return clamped / total;
}

/** Left edge of an inclusive day span as pixels. */
export function getSpanStartPx(iso: string, scale: TimelineScale) {
  const total = rangeDayCount(scale.rangeStartISO, scale.rangeEndISO);
  const offset = diffUtcIsoDays(utcIsoSlice(iso), scale.rangeStartISO);
  const clamped = Math.max(0, Math.min(total, offset));
  return (clamped / total) * scale.trackWidthPx;
}

/** Right edge of an inclusive day span as pixels. */
export function getSpanEndPx(iso: string, scale: TimelineScale) {
  const total = rangeDayCount(scale.rangeStartISO, scale.rangeEndISO);
  const offset = diffUtcIsoDays(utcIsoSlice(iso), scale.rangeStartISO);
  const clamped = Math.max(0, Math.min(total - 1, offset));
  return ((clamped + 1) / total) * scale.trackWidthPx;
}

/** Center x for a date marker. */
export function getXPositionForDate(iso: string, scale: TimelineScale) {
  const total = rangeDayCount(scale.rangeStartISO, scale.rangeEndISO);
  const offset = diffUtcIsoDays(utcIsoSlice(iso), scale.rangeStartISO);
  const clamped = Math.max(0, Math.min(total - 1, offset));
  return ((clamped + 0.5) / total) * scale.trackWidthPx;
}

/** Unit boundary positions for grid/ruler ticks (length = unitCount + 1). */
export function getUnitBoundaryPx(scale: TimelineScale) {
  const boundaries: number[] = [];
  for (let i = 0; i <= scale.unitCount; i++) {
    boundaries.push(i * scale.unitWidthPx);
  }
  return boundaries;
}

/** Day ISO list for thread metrics in week/month modes. */
export function getDayListForScale(scale: TimelineScale): string[] {
  if (scale.preset === "year") {
    return enumerateDaysInclusive(scale.rangeStartISO, scale.rangeEndISO);
  }
  return scale.units.filter((u): u is TimelineDayUnit => u.kind === "day").map((u) => u.iso);
}

function enumerateDaysInclusive(startISO: string, endISO: string): string[] {
  const days: string[] = [];
  let cur = utcIsoSlice(startISO);
  const stop = utcIsoSlice(endISO);

  for (let i = 0; i < 5000; i++) {
    days.push(cur);
    if (cur === stop) break;
    cur = isoCalendarAdd(cur, 1);
  }

  return days;
}

export type ThreadSpanPx = {
  leftPx: number;
  widthPx: number;
  duePx: number;
};

export function getThreadSpanPx(
  visibleStartISO: string,
  visibleDueISO: string,
  scale: TimelineScale,
): ThreadSpanPx {
  const leftPx = getSpanStartPx(visibleStartISO, scale);
  const rightPx = getSpanEndPx(visibleDueISO, scale);
  const duePx = getXPositionForDate(visibleDueISO, scale);

  return {
    leftPx,
    widthPx: Math.max(rightPx - leftPx, 8),
    duePx,
  };
}

// ─── Scrollable multi-period canvas ───────────────────────────────────────────

export type TimelinePeriodSlice = {
  index: number;
  anchorISO: string;
  offsetPx: number;
  widthPx: number;
  scale: TimelineScale;
};

export type ScrollableTimelineScale = {
  preset: TimelinePreset;
  focusISO: string;
  viewportWidthPx: number;
  periodWidthPx: number;
  periodCount: number;
  canvasWidthPx: number;
  canvasStartISO: string;
  canvasEndISO: string;
  focusPeriodIndex: number;
  periods: TimelinePeriodSlice[];
};

export const DEFAULT_PERIODS_BEFORE = 12;
export const DEFAULT_PERIODS_AFTER = 12;

function findPeriodForDate(iso: string, canvas: ScrollableTimelineScale): TimelinePeriodSlice | null {
  const d = utcIsoSlice(iso);
  for (const period of canvas.periods) {
    const { rangeStartISO, rangeEndISO } = period.scale;
    if (d >= rangeStartISO && d <= rangeEndISO) return period;
  }
  return null;
}

/** Absolute x on the full scrollable canvas for a date marker center. */
export function getXOnCanvas(iso: string, canvas: ScrollableTimelineScale) {
  const period = findPeriodForDate(iso, canvas);
  if (!period) {
    if (utcIsoSlice(iso) < canvas.canvasStartISO) return 0;
    return canvas.canvasWidthPx;
  }
  return period.offsetPx + getXPositionForDate(iso, period.scale);
}

function getSpanStartPxOnCanvas(iso: string, canvas: ScrollableTimelineScale) {
  const period = findPeriodForDate(iso, canvas);
  if (!period) {
    if (utcIsoSlice(iso) < canvas.canvasStartISO) return 0;
    return canvas.canvasWidthPx;
  }
  return period.offsetPx + getSpanStartPx(iso, period.scale);
}

function getSpanEndPxOnCanvas(iso: string, canvas: ScrollableTimelineScale) {
  const period = findPeriodForDate(iso, canvas);
  if (!period) {
    if (utcIsoSlice(iso) < canvas.canvasStartISO) return 0;
    return canvas.canvasWidthPx;
  }
  return period.offsetPx + getSpanEndPx(iso, period.scale);
}

/** Thread bar metrics in full-canvas coordinates. */
export function getThreadSpanPxOnCanvas(
  visibleStartISO: string,
  visibleDueISO: string,
  canvas: ScrollableTimelineScale,
): ThreadSpanPx {
  const leftPx = getSpanStartPxOnCanvas(visibleStartISO, canvas);
  const rightPx = getSpanEndPxOnCanvas(visibleDueISO, canvas);
  const duePx = getXOnCanvas(visibleDueISO, canvas);

  return {
    leftPx,
    widthPx: Math.max(rightPx - leftPx, 8),
    duePx,
  };
}

/** Period index whose column is most centered in the viewport at scrollLeft. */
export function getCenteredPeriodIndex(
  scrollLeftPx: number,
  canvas: ScrollableTimelineScale,
) {
  const centerX = scrollLeftPx + canvas.viewportWidthPx / 2;
  for (let i = canvas.periods.length - 1; i >= 0; i--) {
    if (centerX >= canvas.periods[i]!.offsetPx) return i;
  }
  return 0;
}

/** Scroll offset to align a period's left edge with the viewport track. */
export function scrollLeftForPeriodIndex(
  periodIndex: number,
  canvas: ScrollableTimelineScale,
) {
  const period = canvas.periods[periodIndex];
  return period ? period.offsetPx : 0;
}

/** Scroll offset to center a date within the viewport track. */
export function scrollLeftForDate(iso: string, canvas: ScrollableTimelineScale) {
  const x = getXOnCanvas(iso, canvas);
  return Math.max(0, x - canvas.viewportWidthPx / 2);
}

export function buildScrollableTimelineScale(
  preset: TimelinePreset,
  focusISO: string,
  viewportWidthPx: number,
  periodsBefore = DEFAULT_PERIODS_BEFORE,
  periodsAfter = DEFAULT_PERIODS_AFTER,
): ScrollableTimelineScale {
  const focusAnchor = periodAnchorISO(focusISO, preset);
  const periodCount = periodsBefore + 1 + periodsAfter;
  const periods: TimelinePeriodSlice[] = [];

  for (let i = -periodsBefore; i <= periodsAfter; i++) {
    const anchorISO = shiftPeriodAnchor(preset, focusAnchor, i);
    const scale = buildTimelineScale(preset, anchorISO, viewportWidthPx);
    const index = i + periodsBefore;
    periods.push({
      index,
      anchorISO,
      offsetPx: index * viewportWidthPx,
      widthPx: viewportWidthPx,
      scale,
    });
  }

  const focusPeriodIndex = periodsBefore;
  const canvasStartISO = periods[0]!.scale.rangeStartISO;
  const canvasEndISO = periods[periods.length - 1]!.scale.rangeEndISO;

  return {
    preset,
    focusISO,
    viewportWidthPx,
    periodWidthPx: viewportWidthPx,
    periodCount,
    canvasWidthPx: viewportWidthPx * periodCount,
    canvasStartISO,
    canvasEndISO,
    focusPeriodIndex,
    periods,
  };
}
