"use client";

import type { CSSProperties } from "react";

import type { ScrollableTimelineScale } from "@/lib/timeline-scale";
import { getThreadSpanPxOnCanvas } from "@/lib/timeline-scale";
import { clampThreadSpanToRange, urgencyForDueDate, type Urgency } from "@/lib/timeline";

import { cn } from "@/lib/utils";
import type { ThreadRow } from "@/types/lume";

export const CANVAS_LABEL_W_MIN = 140;
export const CANVAS_LABEL_W_DEFAULT = 192;
export const CANVAS_LABEL_W_MAX = 280;
/** @deprecated Use CANVAS_LABEL_W_DEFAULT or dynamic label width from useCanvasLabelWidth */
export const CANVAS_LABEL_W = CANVAS_LABEL_W_DEFAULT;
export const CANVAS_LANE_PITCH = 64;
export const CANVAS_RULER_H = 52;

export type TimelineThreadView = {
  thread: ThreadRow;
  dimmed: boolean;
  glow: boolean;
  isSelectedToday: boolean;
  onOpen: () => void;
};

function dueMarkerClass(urgency: Urgency) {
  if (urgency === "hot") return "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.55)]";
  if (urgency === "soon") return "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.45)]";
  return "bg-white/35";
}

/** Flowing thread strand positioned via shared scrollable canvas scale. */
export function ThreadStrand({
  canvasScale,
  todayISO,
  thread,
  dimmed,
  isSelectedToday = false,
  onActivate,
}: {
  canvasScale: ScrollableTimelineScale;
  todayISO: string;
  thread: ThreadRow;
  dimmed: boolean;
  isSelectedToday?: boolean;
  onActivate?: () => void;
}) {
  const span = clampThreadSpanToRange(
    thread.start_date,
    thread.due_date,
    canvasScale.canvasStartISO,
    canvasScale.canvasEndISO,
  );

  if (!span || canvasScale.canvasWidthPx <= 0) return null;

  const { leftPx, widthPx, duePx } = getThreadSpanPxOnCanvas(
    span.visibleStartISO,
    span.visibleDueISO,
    canvasScale,
  );

  const urgency = urgencyForDueDate(thread.due_date, todayISO);
  const isPaused = thread.status === "paused";
  const c = thread.color;

  const opacity = dimmed ? 0.22 : isPaused ? 0.45 : isSelectedToday ? 1 : 0.82;
  const strandH = isSelectedToday && !dimmed ? 9 : 7;

  const strandStyle: CSSProperties = {
    left: leftPx,
    width: widthPx,
    height: strandH,
    opacity,
    background: `linear-gradient(90deg, ${c}00 0%, ${c}cc 8%, ${c} 50%, ${c}cc 92%, ${c}00 100%)`,
    boxShadow:
      isSelectedToday && !dimmed ?
        `0 0 18px ${c}55, 0 0 4px ${c}88 inset, 0 1px 0 rgb(255 255 255 / 0.12) inset`
      : `0 0 10px ${c}33, 0 0 2px ${c}44 inset`,
  };

  return (
    <div className="relative h-full w-full" aria-hidden={!onActivate}>
      <button
        type="button"
        aria-label={`Open ${thread.name}`}
        onClick={onActivate}
        className={cn(
          "group/strand absolute top-1/2 -translate-y-1/2 cursor-pointer outline-none",
          "rounded-full transition-[height,box-shadow,opacity] duration-200",
          isPaused && "opacity-60",
          "focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        )}
        style={strandStyle}
      >
        <span
          aria-hidden
          className="absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"
          style={{ backgroundColor: c }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 right-0 size-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"
          style={{ backgroundColor: c, opacity: 0.9 }}
        />
        <span
          aria-hidden
          className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-white/25 opacity-0 transition-opacity group-hover/strand:opacity-100 group-focus-visible/strand:opacity-100"
        />
      </button>

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 z-[2] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
          dueMarkerClass(urgency),
          dimmed && "opacity-25",
        )}
        style={{ left: duePx }}
      />
    </div>
  );
}
