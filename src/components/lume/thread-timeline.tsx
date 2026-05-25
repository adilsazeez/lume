"use client";

import type { CSSProperties } from "react";

import type { TimelinePreset } from "@/lib/timeline";

import { cn } from "@/lib/utils";
import type { ThreadRow } from "@/types/lume";
import {
  clampThreadSpanToRange,
  timelineBarMetrics,
  urgencyForDueDate,
  type Urgency,
} from "@/lib/timeline";

export function timelineRowPx(preset: TimelinePreset) {
  return `${timelineRowMaxPx(preset)}px`;
}

export function timelineRowMaxPx(preset: TimelinePreset) {
  if (preset === "year") return 72;
  return 96;
}

export function timelineRowMinPx(preset: TimelinePreset) {
  if (preset === "year") return 40;
  return 44;
}

export function timelineAxisHeightPx(preset: TimelinePreset) {
  if (preset === "year") return 56;
  return 72;
}

export function timelineAxisPx(preset: TimelinePreset) {
  return `${timelineAxisHeightPx(preset)}px`;
}

export function resolveTimelineLaneHeightPx(
  threadCount: number,
  viewportHeightPx: number,
  preset: TimelinePreset,
): number {
  const max = timelineRowMaxPx(preset);
  const axis = timelineAxisHeightPx(preset);

  if (threadCount <= 0) return max;

  const laneBudget = Math.max(viewportHeightPx - axis, 1);
  const ideal = laneBudget / threadCount;

  return Math.min(max, Math.floor(ideal));
}

export function threadBarLayout(laneHeightPx: number) {
  const barHPx = Math.max(2, Math.round(laneHeightPx * 0.14));
  const barTopPx = Math.max(1, Math.round((laneHeightPx - barHPx) / 2));
  return { barTopPx, barHPx };
}

export function threadBarLayoutPercent() {
  return { barTop: "42%", barHeight: "16%" } as const;
}

export type TimelineThreadView = {
  thread: ThreadRow;
  dimmed: boolean;
  glow: boolean;
  isSelectedToday: boolean;
  onOpen: () => void;
};

export function timelineDayWidthPx(preset: TimelinePreset) {
  if (preset === "day") return 36;
  return 9;
}

export function timelineTrackMinWidthPx(days: number, preset: TimelinePreset) {
  return Math.max(days, 1) * timelineDayWidthPx(preset);
}

export function timelineGridTemplateCols(days: number, preset: TimelinePreset): CSSProperties {
  const n = Math.max(days, 1);
  const dayW = timelineDayWidthPx(preset);
  return { gridTemplateColumns: `repeat(${n}, ${dayW}px)` };
}

function dueMarkerClass(urgency: Urgency) {
  if (urgency === "hot") return "bg-rose-400";
  if (urgency === "soon") return "bg-amber-400";
  return "bg-muted-foreground/50";
}

function DueMarker({
  urgency,
  dueFrac,
  pctStart,
  barTop,
  dimmed = false,
}: {
  urgency: Urgency;
  dueFrac: number;
  pctStart: number;
  barTop: string;
  dimmed?: boolean;
}) {
  const pos = `${Math.min(100, Math.max(dueFrac, pctStart))}%`;

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[3] size-1.5 -translate-x-1/2 rounded-full sm:size-2",
        dueMarkerClass(urgency),
        dimmed && "opacity-30",
      )}
      style={{
        left: pos,
        top: barTop,
      }}
    />
  );
}

/** Flat span bar for start→due on the shared timeline grid. */
export function ThreadTimelineTrack({
  timelineDays,
  todayISO,
  preset,
  thread,
  dimmed,
  isSelectedToday = false,
  laneHeightPx,
  integratedBoard = false,
}: {
  timelineDays: readonly string[];
  todayISO: string;
  preset: TimelinePreset;
  thread: ThreadRow;
  dimmed: boolean;
  isSelectedToday?: boolean;
  laneHeightPx?: number;
  glow?: boolean;
  /** Omit per-row mini-grid when the canvas draws one shared timeline grid underneath. */
  integratedBoard?: boolean;
}) {
  const rangeStartISO = timelineDays[0]!;
  const rangeEndISO = timelineDays.at(-1)!;

  const span = clampThreadSpanToRange(
    thread.start_date,
    thread.due_date,
    rangeStartISO,
    rangeEndISO,
  );

  if (!span) return null;

  const { pctStart, pctWidth, dueFrac } = timelineBarMetrics(
    span.visibleStartISO,
    span.visibleDueISO,
    timelineDays,
  );

  const urgency = urgencyForDueDate(thread.due_date, todayISO);
  const isPaused = thread.status === "paused";

  const c = thread.color;
  const opacity = dimmed ? 0.26 : isPaused ? 0.5 : isSelectedToday ? 1 : 0.78;

  const percentLayout = threadBarLayoutPercent();
  const pixelLayout = laneHeightPx ? threadBarLayout(laneHeightPx) : null;
  const barTop = pixelLayout ? `${pixelLayout.barTopPx}px` : percentLayout.barTop;
  const barHeight = pixelLayout ? `${pixelLayout.barHPx}px` : percentLayout.barHeight;

  const barStyle: CSSProperties = {
    left: `${pctStart}%`,
    width: `${Math.max(pctWidth, (1 / timelineDays.length) * 100)}%`,
    top: barTop,
    height: barHeight,
    minHeight: dimmed ? 2 : isSelectedToday ? 3 : 2,
    opacity,
    backgroundColor: c,
    boxShadow:
      isSelectedToday && !dimmed ? `0 0 10px ${c}55` : undefined,
  };

  return (
    <div className="relative h-full min-h-0 w-full" aria-hidden>
      {integratedBoard ? null : (
        <div
          className={cn(
            "absolute inset-x-0 grid rounded-md border border-white/[0.06] bg-muted/20",
            preset === "year" ? "top-[18px] bottom-[18px]" : "top-[20px] bottom-[20px]",
          )}
          style={{ ...timelineGridTemplateCols(timelineDays.length, preset), display: "grid" }}
        >
          {timelineDays.map((d) => (
            <div
              key={d}
              className={cn(
                "relative min-w-0 border-l border-white/[0.04] first:border-l-0",
                d === todayISO && "bg-white/[0.025]",
                preset === "year" && Number(d.slice(8, 10)) === 1 && "border-l-white/[0.08]",
              )}
            />
          ))}
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none absolute z-[2] rounded-full",
          isPaused && "outline outline-dashed outline-1 outline-offset-2 outline-white/20",
        )}
        style={barStyle}
      />

      <DueMarker
        urgency={urgency}
        dueFrac={dueFrac}
        pctStart={pctStart}
        barTop={barTop}
        dimmed={dimmed}
      />
    </div>
  );
}
