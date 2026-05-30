"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  buildScrollableTimelineScale,
  getCenteredPeriodIndex,
  getXOnCanvas,
  scrollLeftForPeriodIndex,
  scrollLeftForDateAtTrackStart,
  type ScrollableTimelineScale,
  type TimelineScale,
  type TimelineUnit,
} from "@/lib/timeline-scale";
import { type TimelinePreset, isoCalendarAdd, threadTouchesTimelineRange } from "@/lib/timeline";
import { isNotStartedStatus } from "@/lib/thread-status";
import { buildCanvasLanes, layoutCanvasLanes, WORKFLOW_COPY } from "@/lib/lume-workflow";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { CanvasSectionLabel } from "./canvas-section-label";
import { ThreadInlineAddTaskButton } from "./thread-inline-add-task-button";
import { ThreadLabelText } from "./thread-label-text";
import { ThreadOpenTaskCount } from "./thread-open-task-count";
import {
  CANVAS_LANE_PITCH,
  CANVAS_RULER_H,
  ThreadStrand,
  type TimelineThreadView,
} from "./thread-timeline";
import { useCanvasLabelWidth } from "./use-canvas-label-width";

const PRESETS = ["month", "week", "year"] as const satisfies readonly TimelinePreset[];

/** Padding from the track's left edge when snapping a date into view. */
const TRACK_DATE_INSET_PX = 20;

/** On first load (and preset change), anchor this many days before today at the left edge. */
const DEFAULT_VIEW_LEAD_DAYS = 2;

function utcNoonParts(iso: string) {
  return new Date(`${iso.split("T")[0]}T12:00:00.000Z`);
}

function periodLabelForScale(scale: TimelineScale) {
  if (scale.preset === "month") {
    return format(utcNoonParts(scale.referenceISO), "MMM yyyy");
  }
  if (scale.preset === "week") {
    const a = utcNoonParts(scale.rangeStartISO);
    const b = utcNoonParts(scale.rangeEndISO);
    return `${format(a, "MMM d")} – ${format(b, "d")}`;
  }
  return format(utcNoonParts(scale.referenceISO), "yyyy");
}

/** Measure viewport track width from the scroll container (minus label column). */
function useViewportTrackWidth(
  scrollRef: React.RefObject<HTMLElement | null>,
  labelWidthPx: number,
) {
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      const next = Math.max(0, Math.floor(el.clientWidth - labelWidthPx));
      setWidth((prev) => (prev === next ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [scrollRef, labelWidthPx]);

  return width;
}

function useCanvasPanScroll(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const dragRef = React.useRef<{ active: boolean; startX: number; startScrollLeft: number }>({
    active: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const [isDragging, setIsDragging] = React.useState(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollRef]);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, [role='switch'], [data-no-pan]")) return;

      dragRef.current = {
        active: true,
        startX: e.clientX,
        startScrollLeft: scrollRef.current?.scrollLeft ?? 0,
      };
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [scrollRef],
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current.active || !scrollRef.current) return;
      scrollRef.current.scrollLeft =
        dragRef.current.startScrollLeft - (e.clientX - dragRef.current.startX);
    },
    [scrollRef],
  );

  const endDrag = React.useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  return { isDragging, onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag };
}

function PresetSwitcher({
  value,
  onChange,
}: {
  value: TimelinePreset;
  onChange: (p: TimelinePreset) => void;
}) {
  const labels: Record<TimelinePreset, string> = {
    month: "Month",
    week: "Week",
    year: "Year",
  };

  return (
    <div
      aria-label="Timeline scale"
      className="inline-flex rounded-md border border-lume-border bg-lume-surface p-0.5"
      role="group"
    >
      {PRESETS.map((key) => (
        <button
          key={key}
          aria-pressed={key === value}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded px-2.5 py-0.5 text-[10px] font-medium tracking-wide",
            key === value ?
              "bg-lume-hover text-foreground"
            : "text-lume-text-muted hover:text-foreground",
          )}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}

function PeriodNav({
  onPrev,
  onNext,
  onToday,
  disabled,
}: {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={disabled}
        aria-label="Previous period"
        onClick={onPrev}
        className="text-lume-text-muted hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onToday}
        className="h-6 px-2 text-[10px] text-lume-text-secondary hover:text-foreground"
      >
        Today
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={disabled}
        aria-label="Next period"
        onClick={onNext}
        className="text-lume-text-muted hover:text-foreground"
      >
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}

function CanvasTimeGrid({
  canvasScale,
  todayISO,
  canvasHeightPx,
}: {
  canvasScale: ScrollableTimelineScale;
  todayISO: string;
  canvasHeightPx: number;
}) {
  const todayX = getXOnCanvas(todayISO, canvasScale);
  const todayInRange =
    todayISO >= canvasScale.canvasStartISO && todayISO <= canvasScale.canvasEndISO;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ height: canvasHeightPx, width: canvasScale.canvasWidthPx }}
    >
      {canvasScale.periods.map((period) => (
        <div
          key={period.anchorISO}
          className="absolute top-0 h-full border-r border-lume-grid-strong"
          style={{ left: period.offsetPx, width: period.widthPx }}
        >
          {period.scale.units.map((unit, i) => {
            const left = i * period.scale.unitWidthPx;
            const isTodayUnit =
              unit.kind === "day" ? unit.iso === todayISO
              : todayISO >= unit.startISO && todayISO <= unit.endISO;

            return (
              <div
                key={unit.kind === "day" ? unit.iso : unit.ymKey}
                className={cn(
                  "absolute top-0 border-r border-lume-grid",
                  isTodayUnit && "bg-lume-today-bg",
                  unit.kind === "month" && "border-r-lume-grid-strong",
                )}
                style={{
                  left,
                  width: period.scale.unitWidthPx,
                  height: canvasHeightPx,
                }}
              />
            );
          })}
        </div>
      ))}

      {todayInRange ?
        <div
          className="absolute top-0 z-[2] w-px -translate-x-1/2 bg-lume-today-line shadow-[0_0_10px_var(--lume-today-line)]"
          style={{ left: todayX, height: canvasHeightPx }}
        />
      : null}
    </div>
  );
}

function RulerUnitCell({
  unit,
  scale,
  todayISO,
}: {
  unit: TimelineUnit;
  scale: TimelineScale;
  todayISO: string;
}) {
  if (unit.kind === "month") {
    const dt = utcNoonParts(unit.startISO);
    const isCurrentMonth = unit.ymKey === todayISO.slice(0, 7);

    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-end border-r border-lume-grid-strong pb-2",
          isCurrentMonth ? "text-foreground" : "text-lume-text-muted",
        )}
        style={{ width: scale.unitWidthPx, flexShrink: 0 }}
      >
        <span className="text-[11px] font-medium">{format(dt, "MMM")}</span>
      </div>
    );
  }

  const dt = utcNoonParts(unit.iso);
  const isToday = unit.iso === todayISO;

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-end border-r border-lume-grid pb-1.5",
        isToday && "bg-lume-today-bg",
      )}
      style={{ width: scale.unitWidthPx, flexShrink: 0 }}
    >
      <span
        className={cn(
          "text-[10px] tabular-nums",
          isToday ? "font-semibold text-lume-today" : "text-lume-text-secondary",
        )}
      >
        {format(dt, scale.preset === "week" ? "EEE d" : "d")}
      </span>
    </div>
  );
}

function PeriodRuler({
  scale,
  todayISO,
}: {
  scale: TimelineScale;
  todayISO: string;
}) {
  const periodLabel = periodLabelForScale(scale);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div className="pointer-events-none absolute top-1.5 left-2 z-10">
        <span className="text-[10px] font-medium tracking-wide text-lume-text-secondary uppercase">
          {periodLabel}
        </span>
      </div>
      <div className="flex h-full w-full items-end pt-4">
        {scale.units.map((unit) => (
          <RulerUnitCell
            key={unit.kind === "day" ? unit.iso : unit.ymKey}
            unit={unit}
            scale={scale}
            todayISO={todayISO}
          />
        ))}
      </div>
    </div>
  );
}

function LabelRailResizeHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize thread labels"
      data-no-pan
      className={cn(
        "absolute top-0 -right-px z-30 h-full w-2 cursor-col-resize",
        "touch-none before:absolute before:inset-y-3 before:left-1/2 before:w-px",
        "before:-translate-x-1/2 before:bg-lume-border-strong before:transition-colors",
        "hover:before:bg-lume-accent/45 active:before:bg-lume-accent/60",
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}

function ThreadCategoryTag({ name, color }: { name: string; color: string }) {
  return (
    <span className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-sm border border-lume-border bg-lume-surface/50 px-1 py-px">
      <span
        aria-hidden
        className="size-1 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate text-[9px] leading-none text-lume-text-muted">{name}</span>
    </span>
  );
}

function FloatingThreadLabel({
  tv,
  busy,
  onToggleToday,
  onAddMiniTask,
}: {
  tv: TimelineThreadView;
  busy: boolean;
  onToggleToday: (threadId: string, next: boolean) => void;
  onAddMiniTask?: (threadId: string) => void;
}) {
  const [truncated, setTruncated] = React.useState(false);
  const onTruncatedChange = React.useCallback((next: boolean) => {
    setTruncated(next);
  }, []);

  const category = tv.thread.category;
  const notStarted = isNotStartedStatus(tv.thread.status);

  const openButton = (
    <button
      type="button"
      aria-label={
        tv.openTaskCount > 0
          ? `${tv.thread.name}, ${tv.openTaskCount} open task${tv.openTaskCount === 1 ? "" : "s"}${category ? `, ${category.name}` : ""}`
          : category
            ? `${tv.thread.name}, ${category.name}`
            : tv.thread.name
      }
      onClick={() => tv.onOpen()}
      className={cn(
        "flex min-w-0 flex-1 items-start gap-1.5 text-left outline-none",
        "rounded-md py-1.5 pr-1 pl-0.5 transition-colors",
        "hover:bg-lume-hover focus-visible:ring-1 focus-visible:ring-lume-focus",
        tv.isSelectedToday && !notStarted && "bg-lume-selection",
        notStarted &&
          "border border-amber-400/55 bg-amber-500/12 shadow-[0_0_14px_rgb(251_191_36_/_0.22)] hover:bg-amber-500/18",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1 size-1.5 shrink-0 rounded-full",
          tv.isSelectedToday && "shadow-[0_0_8px_currentColor]",
        )}
        style={{
          backgroundColor: notStarted ? "#fbbf24" : tv.thread.color,
          color: notStarted ? "#fbbf24" : tv.thread.color,
          opacity: tv.isSelectedToday ? 1 : notStarted ? 1 : 0.85,
        }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-1">
          <ThreadLabelText
            text={tv.thread.name}
            onTruncatedChange={onTruncatedChange}
            className="min-w-0 flex-1 text-[11px] text-foreground"
          />
          <ThreadOpenTaskCount count={tv.openTaskCount} className="mt-0.5 shrink-0" />
        </span>
        {category ?
          <ThreadCategoryTag name={category.name} color={category.color} />
        : null}
      </span>
    </button>
  );

  return (
    <div
      className={cn(
        "group/label flex h-full items-center gap-0.5 pr-1 pl-1.5",
        tv.dimmed && "opacity-40",
      )}
      data-no-pan
    >
      {truncated ?
        <Tooltip>
          <TooltipTrigger render={openButton} />
          <TooltipContent side="right" align="start" className="max-w-[240px] text-pretty">
            {tv.thread.name}
          </TooltipContent>
        </Tooltip>
      : openButton}

      <div className="flex shrink-0 items-center gap-0.5 self-center opacity-70 transition-opacity group-hover/label:opacity-100">
        {onAddMiniTask ?
          <ThreadInlineAddTaskButton
            threadName={tv.thread.name}
            disabled={busy}
            onClick={() => onAddMiniTask(tv.thread.id)}
          />
        : null}
        <Switch
          size="sm"
          checked={tv.isSelectedToday}
          disabled={busy}
          aria-label={`Add ${tv.thread.name} to today's focus`}
          title="Today's focus"
          onCheckedChange={(checked) => onToggleToday(tv.thread.id, checked === true)}
        />
      </div>
    </div>
  );
}

export function TimelineCanvas({
  threadViews,
  todayISO,
  busy,
  focusViewOn,
  focusCount,
  activeCount,
  onToggleToday,
  onAddMiniTask,
}: {
  threadViews: TimelineThreadView[];
  todayISO: string;
  busy: boolean;
  focusViewOn: boolean;
  focusCount: number;
  activeCount: number;
  onToggleToday: (threadId: string, next: boolean) => void;
  onAddMiniTask?: (threadId: string) => void;
}) {
  const [preset, setPreset] = React.useState<TimelinePreset>("month");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const labelRail = useCanvasLabelWidth();
  const viewportWidthPx = useViewportTrackWidth(scrollRef, labelRail.labelWidthPx);
  const pan = useCanvasPanScroll(scrollRef);

  const canvasScale = React.useMemo(
    () => buildScrollableTimelineScale(preset, todayISO, viewportWidthPx),
    [preset, todayISO, viewportWidthPx],
  );

  const visibleThreadViews = React.useMemo(
    () =>
      threadViews.filter(
        (tv) =>
          isNotStartedStatus(tv.thread.status) ||
          threadTouchesTimelineRange(
            tv.thread.start_date,
            tv.thread.due_date,
            canvasScale.canvasStartISO,
            canvasScale.canvasEndISO,
          ),
      ),
    [threadViews, canvasScale.canvasStartISO, canvasScale.canvasEndISO],
  );

  const laneItems = React.useMemo(
    () => buildCanvasLanes(visibleThreadViews, focusViewOn, focusCount),
    [visibleThreadViews, focusViewOn, focusCount],
  );

  const laidOutLanes = React.useMemo(() => layoutCanvasLanes(laneItems), [laneItems]);

  const canvasBodyHeightPx =
    laidOutLanes.length > 0
      ? laidOutLanes[laidOutLanes.length - 1]!.top + laidOutLanes[laidOutLanes.length - 1]!.height + 16
      : CANVAS_LANE_PITCH + 32;

  const sectionVariant = (id: string) => {
    if (id === "focus") return "focus" as const;
    if (id === "next") return "next" as const;
    if (id === "not-started") return "muted" as const;
    return "default" as const;
  };

  const scrollToPeriodIndex = React.useCallback(
    (periodIndex: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el || viewportWidthPx <= 0) return;
      el.scrollTo({
        left: scrollLeftForPeriodIndex(periodIndex, canvasScale),
        behavior,
      });
    },
    [canvasScale, viewportWidthPx],
  );

  const scrollToToday = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el || viewportWidthPx <= 0) return;
      el.scrollTo({
        left: scrollLeftForDateAtTrackStart(todayISO, canvasScale, TRACK_DATE_INSET_PX),
        behavior,
      });
    },
    [canvasScale, todayISO, viewportWidthPx],
  );

  const scrollToDefaultView = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el || viewportWidthPx <= 0) return;
      const anchorISO = isoCalendarAdd(todayISO, -DEFAULT_VIEW_LEAD_DAYS);
      el.scrollTo({
        left: scrollLeftForDateAtTrackStart(anchorISO, canvasScale, TRACK_DATE_INSET_PX),
        behavior,
      });
    },
    [canvasScale, todayISO, viewportWidthPx],
  );

  const presetRef = React.useRef(preset);
  const didInitialScroll = React.useRef(false);

  React.useLayoutEffect(() => {
    if (viewportWidthPx <= 0) return;

    const presetChanged = presetRef.current !== preset;
    if (presetChanged) presetRef.current = preset;

    if (presetChanged || !didInitialScroll.current) {
      scrollToDefaultView("auto");
      didInitialScroll.current = true;
    }
  }, [preset, viewportWidthPx, scrollToDefaultView]);

  const handlePrev = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = getCenteredPeriodIndex(el.scrollLeft, canvasScale);
    scrollToPeriodIndex(Math.max(0, idx - 1));
  }, [canvasScale, scrollToPeriodIndex]);

  const handleNext = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = getCenteredPeriodIndex(el.scrollLeft, canvasScale);
    scrollToPeriodIndex(Math.min(canvasScale.periodCount - 1, idx + 1));
  }, [canvasScale, scrollToPeriodIndex]);

  const navDisabled = viewportWidthPx <= 0;

  return (
    <TooltipProvider delay={400}>
      <section aria-label="Thread canvas" className="flex min-h-0 min-w-0 flex-1 flex-col font-sans">
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl",
            "border border-lume-border bg-lume-canvas",
            "shadow-[inset_0_1px_0_var(--lume-border)]",
            labelRail.isResizing && "select-none",
          )}
        >
        <div className="flex shrink-0 items-center gap-2 border-b border-lume-border bg-lume-canvas-bar/95 px-3 py-2 backdrop-blur-sm">
          <PresetSwitcher value={preset} onChange={setPreset} />
          <PeriodNav
            disabled={navDisabled}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={() => scrollToToday()}
          />
          <div className="ml-auto hidden items-center gap-1 sm:flex">
            <p className="text-[10px] text-lume-text-muted">
              <span className="font-medium text-foreground">{activeCount}</span> active
              {focusCount > 0 ?
                <>
                  {" · "}
                  <span className="font-medium text-lume-accent">{focusCount}</span> focus
                </>
              : null}
            </p>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="rounded p-0.5 text-lume-text-muted outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-lume-focus"
                    aria-label="About active and focus threads"
                  >
                    <Info className="size-3" aria-hidden />
                  </button>
                }
              />
              <TooltipContent side="bottom" align="end" className="max-w-[240px] space-y-1.5 text-pretty">
                <p>
                  {WORKFLOW_COPY.active.label}: {WORKFLOW_COPY.active.hint}
                </p>
                <p>
                  {WORKFLOW_COPY.focus.label}: {WORKFLOW_COPY.focus.hint}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={cn(
            "min-h-0 flex-1 overflow-auto scrollbar-thin",
            pan.isDragging ? "cursor-grabbing select-none" : "cursor-grab",
          )}
          onPointerDown={pan.onPointerDown}
          onPointerMove={pan.onPointerMove}
          onPointerUp={pan.onPointerUp}
          onPointerCancel={pan.onPointerCancel}
        >
          <div
            style={{
              width: labelRail.labelWidthPx + canvasScale.canvasWidthPx,
              minHeight: CANVAS_RULER_H + canvasBodyHeightPx,
            }}
          >
            <div
              className="sticky top-0 z-30 flex border-b border-lume-border bg-lume-canvas-bar/95 backdrop-blur-md"
              style={{ height: CANVAS_RULER_H }}
            >
              <div
                className="relative sticky left-0 z-40 flex shrink-0 flex-col justify-end border-r border-lume-border bg-lume-canvas-label pb-1.5 pl-2 pr-1"
                style={{ width: labelRail.labelWidthPx, height: CANVAS_RULER_H }}
                data-no-pan
              >
                <div className="flex items-end justify-between gap-1 pe-0.5">
                  <span className="text-[9px] font-medium tracking-wide text-lume-text-muted uppercase">
                    Thread
                  </span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="cursor-default text-[8px] font-semibold tracking-wide text-lume-accent uppercase">
                          Focus
                        </span>
                      }
                    />
                    <TooltipContent side="bottom" className="max-w-[200px] text-pretty">
                      {WORKFLOW_COPY.focus.hint}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <LabelRailResizeHandle
                  onPointerDown={labelRail.onResizePointerDown}
                  onPointerMove={labelRail.onResizePointerMove}
                  onPointerUp={labelRail.onResizePointerUp}
                  onPointerCancel={labelRail.onResizePointerCancel}
                />
              </div>

              {viewportWidthPx > 0 ?
                <div
                  className="relative flex shrink-0"
                  style={{ width: canvasScale.canvasWidthPx, height: CANVAS_RULER_H }}
                >
                  {canvasScale.periods.map((period) => (
                    <div
                      key={period.anchorISO}
                      className="h-full shrink-0 border-r border-lume-grid-strong"
                      style={{ width: period.widthPx }}
                    >
                      <PeriodRuler scale={period.scale} todayISO={todayISO} />
                    </div>
                  ))}
                </div>
              : null}
            </div>

            <div className="flex">
              <div
                className="relative sticky left-0 z-20 shrink-0 border-r border-lume-border bg-lume-canvas-label backdrop-blur-[2px]"
                style={{ width: labelRail.labelWidthPx, height: canvasBodyHeightPx }}
                data-no-pan
              >
                <LabelRailResizeHandle
                  onPointerDown={labelRail.onResizePointerDown}
                  onPointerMove={labelRail.onResizePointerMove}
                  onPointerUp={labelRail.onResizePointerUp}
                  onPointerCancel={labelRail.onResizePointerCancel}
                />
                {laidOutLanes.map(({ item, top, height }) =>
                  item.kind === "section" ?
                    <div
                      key={item.id}
                      className="absolute left-0 w-full"
                      style={{ top, height }}
                    >
                      <CanvasSectionLabel
                        label={item.label}
                        hint={item.hint}
                        variant={sectionVariant(item.id)}
                      />
                    </div>
                  : <div
                      key={item.view.thread.id}
                      className="absolute left-0 w-full"
                      style={{ top, height }}
                    >
                      <FloatingThreadLabel
                        tv={item.view}
                        busy={busy}
                        onToggleToday={onToggleToday}
                        onAddMiniTask={onAddMiniTask}
                      />
                    </div>,
                )}
              </div>

              <div
                className="relative shrink-0"
                style={{ width: canvasScale.canvasWidthPx, height: canvasBodyHeightPx }}
              >
                {viewportWidthPx > 0 ?
                  <>
                    <CanvasTimeGrid
                      canvasScale={canvasScale}
                      todayISO={todayISO}
                      canvasHeightPx={canvasBodyHeightPx}
                    />

                    {visibleThreadViews.length === 0 ?
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-[12px] text-lume-text-muted">
                          No threads in this time range.
                        </p>
                      </div>
                    : (
                      laidOutLanes.map(({ item, top, height }) =>
                        item.kind === "thread" ?
                          <div
                            key={item.view.thread.id}
                            className="absolute left-0"
                            style={{
                              top,
                              height: height - 4,
                              width: canvasScale.canvasWidthPx,
                            }}
                          >
                            {isNotStartedStatus(item.view.thread.status) ? null : (
                              <ThreadStrand
                                canvasScale={canvasScale}
                                todayISO={todayISO}
                                thread={item.view.thread}
                                dimmed={item.view.dimmed}
                                isSelectedToday={item.view.isSelectedToday}
                                onActivate={() => item.view.onOpen()}
                              />
                            )}
                          </div>
                        : null,
                      )
                    )}
                  </>
                : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </TooltipProvider>
  );
}
