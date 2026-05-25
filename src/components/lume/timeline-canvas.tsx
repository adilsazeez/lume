"use client";

import { format } from "date-fns";
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  type TimelinePreset,
  enumerateIsoDaysInclusive,
  getTimelineRange,
  isoCalendarAdd,
  threadTouchesTimelineRange,
} from "@/lib/timeline";

import { Switch } from "@/components/ui/switch";

import type { TimelineThreadView } from "./thread-timeline";
import {
  ThreadTimelineTrack,
  timelineAxisPx,
  timelineDayWidthPx,
  timelineGridTemplateCols,
  timelineRowMaxPx,
  timelineTrackMinWidthPx,
} from "./thread-timeline";
import { ThreadInlineAddTaskButton } from "./thread-inline-add-task-button";
import { EllipsisText } from "./ellipsis-text";

const PRESETS = ["day", "year"] as const satisfies readonly TimelinePreset[];

const LABEL_GUTTER =
  "w-[clamp(12rem,22vw,18rem)] min-w-[12rem] max-w-[18rem] shrink-0";

const DAY_VIEW_INITIAL_BACK = 120;
const DAY_VIEW_INITIAL_FORWARD = 120;
const DAY_VIEW_EXPAND_BY = 90;
const DAY_VIEW_EXPAND_THRESHOLD_PX = 720;

function utcNoonParts(iso: string) {
  return new Date(`${iso.split("T")[0]}T12:00:00.000Z`);
}

type YearMonthBand = {
  ymKey: string;
  spanDays: number;
  firstISO: string;
  lastISO: string;
};

function yearMonthBandsFromDays(days: readonly string[]): YearMonthBand[] {
  const bands: YearMonthBand[] = [];
  let i = 0;
  while (i < days.length) {
    const firstISO = days[i]!;
    const ymKey = firstISO.slice(0, 7);
    let spanDays = 0;
    while (i + spanDays < days.length && days[i + spanDays]!.slice(0, 7) === ymKey) {
      spanDays += 1;
    }
    const lastISO = days[i + spanDays - 1]!;
    bands.push({ ymKey, spanDays, firstISO, lastISO });
    i += spanDays;
  }
  return bands;
}

function YearAxisBands({
  days,
  todayISO,
  axisMinH,
}: {
  days: readonly string[];
  todayISO: string;
  axisMinH: string;
}) {
  const bands = React.useMemo(() => yearMonthBandsFromDays(days), [days]);
  const todayYm = todayISO.slice(0, 7);

  return (
    <>
      {bands.map((band) => {
        const dt0 = utcNoonParts(band.firstISO);
        const label = format(dt0, "MMM yyyy");
        const isCurrentMonth = band.ymKey === todayYm;

        return (
          <div
            key={band.ymKey}
            role="presentation"
            style={{ gridColumn: `span ${band.spanDays}`, minHeight: axisMinH }}
            className={cn(
              "flex min-h-[inherit] items-center border-r border-white/[0.06] px-2 last:border-r-0",
              isCurrentMonth ? "text-foreground/80" : "text-muted-foreground/60",
            )}
          >
            <span className="text-[11px] font-medium">{label}</span>
          </div>
        );
      })}
    </>
  );
}

function AxisDayCell({
  d,
  todayISO,
  axisMinH,
}: {
  d: string;
  todayISO: string;
  axisMinH: string;
}) {
  const dt = utcNoonParts(d);
  const isToday = d === todayISO;
  const isMonthStart = Number(d.slice(8, 10)) === 1;

  const label = (
    <div className="flex flex-col items-center gap-0.5 py-2">
      {isMonthStart ?
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/55">
          {format(dt, "MMM")}
        </span>
      : null}
      <span
        className={cn(
          "text-[9px] font-medium uppercase",
          isToday ? "text-violet-300/90" : "text-muted-foreground/55",
        )}
      >
        {format(dt, "EEE")}
      </span>
      <span
        className={cn(
          "text-[11px] tabular-nums",
          isToday ? "font-semibold text-foreground" : "text-muted-foreground/70",
        )}
      >
        {format(dt, "d")}
      </span>
    </div>
  );

  return (
    <div
      role="presentation"
      style={{ minHeight: axisMinH }}
      className={cn(
        "flex min-h-0 shrink-0 items-end justify-center border-r border-white/[0.06] px-1 pb-1 last:border-r-0",
        isToday ? "bg-violet-500/[0.06]" : undefined,
      )}
    >
      {label}
    </div>
  );
}

function PresetSwitcher({
  value,
  onChange,
}: {
  value: TimelinePreset;
  onChange: (p: TimelinePreset) => void;
}) {
  const labels: Record<TimelinePreset, string> = {
    day: "Daily",
    year: "Year",
  };

  return (
    <div
      aria-label="Timeline scale"
      className="inline-flex rounded-md border border-white/[0.08] p-0.5"
      role="group"
    >
      {PRESETS.map((key) => (
        <button
          key={key}
          aria-pressed={key === value}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-medium",
            key === value ?
              "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}

function ThreadRailLabel({
  id,
  name,
  colorHex,
  categoryName,
  dimmed = false,
  focused = false,
}: {
  id: string;
  name: string;
  colorHex: string;
  categoryName?: string | null;
  dimmed?: boolean;
  focused?: boolean;
}) {
  return (
    <div id={id} className="flex min-w-0 items-start gap-2 px-3 py-1.5">
      <span
        aria-hidden
        className="mt-1 size-2 shrink-0 rounded-full"
        style={{
          backgroundColor: colorHex,
          opacity: dimmed ? 0.35 : focused ? 1 : 0.85,
        }}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] leading-snug",
            dimmed ? "text-foreground/38" : focused ? "text-foreground" : "text-foreground/88",
          )}
        >
          <EllipsisText text={name} lines={3} />
        </p>
        <p
          className={cn(
            "text-[10px] leading-tight",
            dimmed ? "text-muted-foreground/32" : "text-muted-foreground/72",
          )}
        >
          <EllipsisText text={categoryName ?? "Uncategorized"} lines={1} />
        </p>
      </div>
    </div>
  );
}

function ThreadRailGroup({
  tv,
  busy,
  rowHeightPx,
  onToggleToday,
  onAddMiniTask,
}: {
  tv: TimelineThreadView;
  busy: boolean;
  rowHeightPx: number;
  onToggleToday: (threadId: string, next: boolean) => void;
  onAddMiniTask?: (threadId: string) => void;
}) {
  const labelId = `lume-thread-${tv.thread.id}`;

  return (
    <div
      className="shrink-0 border-t border-white/[0.06]"
      style={{ height: rowHeightPx, minHeight: rowHeightPx }}
    >
      <div
        className={cn(
          "group/row flex h-full items-center border-l-2",
          tv.isSelectedToday ?
            "border-l-violet-400/75 bg-violet-500/[0.07]"
          : "border-l-transparent",
          tv.dimmed ? "bg-transparent" : undefined,
        )}
      >
        <button
          type="button"
          aria-labelledby={labelId}
          onClick={() => tv.onOpen()}
          className={cn(
            "flex h-full min-w-0 flex-1 cursor-pointer bg-transparent text-left outline-none",
            "hover:bg-white/[0.03] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-violet-500/40",
          )}
        >
          <ThreadRailLabel
            id={labelId}
            name={tv.thread.name}
            colorHex={tv.thread.color}
            categoryName={tv.thread.category?.name}
            dimmed={tv.dimmed}
            focused={tv.isSelectedToday}
          />
        </button>

        <div
          className={cn(
            "relative z-[21] flex w-[3.75rem] shrink-0 items-center justify-end gap-1.5 pr-2.5",
            tv.dimmed && "opacity-45",
          )}
        >
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
            aria-label={`Work on ${tv.thread.name} today`}
            onCheckedChange={(checked) => onToggleToday(tv.thread.id, checked === true)}
          />
        </div>
      </div>
    </div>
  );
}

function ThreadTrackGroup({
  tv,
  preset,
  days,
  todayISO,
  rowHeightPx,
}: {
  tv: TimelineThreadView;
  preset: TimelinePreset;
  days: readonly string[];
  todayISO: string;
  rowHeightPx: number;
}) {
  return (
    <div
      className="shrink-0 border-t border-white/[0.06]"
      style={{ height: rowHeightPx, minHeight: rowHeightPx }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${tv.thread.name}`}
        onClick={() => tv.onOpen()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tv.onOpen();
          }
        }}
        className={cn(
          "relative h-full cursor-pointer outline-none border-l-2",
          "hover:bg-white/[0.02] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-violet-500/40",
          tv.isSelectedToday ?
            "border-l-violet-400/75 bg-violet-500/[0.07]"
          : "border-l-transparent",
          tv.dimmed ? "bg-transparent" : undefined,
        )}
      >
        <ThreadTimelineTrack
          preset={preset}
          todayISO={todayISO}
          timelineDays={days}
          thread={tv.thread}
          dimmed={tv.dimmed}
          isSelectedToday={tv.isSelectedToday}
          laneHeightPx={rowHeightPx}
          integratedBoard
        />
      </div>
    </div>
  );
}

export function TimelineCanvas({
  threadViews,
  todayISO,
  busy,
  onToggleToday,
  onAddMiniTask,
}: {
  threadViews: TimelineThreadView[];
  todayISO: string;
  busy: boolean;
  onToggleToday: (threadId: string, next: boolean) => void;
  onAddMiniTask?: (threadId: string) => void;
}) {
  const [preset, setPreset] = React.useState<TimelinePreset>("day");
  const [dayWindow, setDayWindow] = React.useState({
    back: DAY_VIEW_INITIAL_BACK,
    forward: DAY_VIEW_INITIAL_FORWARD,
  });
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);
  const axisScrollRef = React.useRef<HTMLDivElement>(null);
  const threadsVScrollRef = React.useRef<HTMLDivElement>(null);
  const boardViewportRef = React.useRef<HTMLDivElement>(null);
  const boardRowRef = React.useRef<HTMLDivElement>(null);
  const expandingRef = React.useRef(false);
  const syncingHScrollRef = React.useRef(false);

  React.useEffect(() => {
    if (preset !== "day") return;
    setDayWindow({ back: DAY_VIEW_INITIAL_BACK, forward: DAY_VIEW_INITIAL_FORWARD });
  }, [preset, todayISO]);

  const range = React.useMemo(() => {
    if (preset === "day") {
      const startISO = isoCalendarAdd(todayISO, -dayWindow.back);
      const endISO = isoCalendarAdd(todayISO, dayWindow.forward);
      const days = enumerateIsoDaysInclusive(startISO, endISO);
      return { startISO, endISO, days };
    }
    return getTimelineRange(todayISO, preset);
  }, [preset, todayISO, dayWindow]);

  const { days, startISO, endISO } = range;

  const visibleThreadViews = React.useMemo(
    () =>
      threadViews.filter((tv) =>
        threadTouchesTimelineRange(tv.thread.start_date, tv.thread.due_date, startISO, endISO),
      ),
    [threadViews, startISO, endISO],
  );

  const focusCount = React.useMemo(
    () => threadViews.filter((tv) => tv.isSelectedToday).length,
    [threadViews],
  );
  const totalCount = threadViews.length;

  const axisMinH = timelineAxisPx(preset);
  const threadRowHeightPx = timelineRowMaxPx(preset);
  const todayIdx = days.indexOf(todayISO);
  const todayLineLeftPx =
    todayIdx >= 0 ? (todayIdx + 0.5) * timelineDayWidthPx(preset) : null;
  const trackMinWidth = timelineTrackMinWidthPx(days.length, preset);
  const trackGridStyle = React.useMemo(
    () => timelineGridTemplateCols(days.length, preset),
    [days.length, preset],
  );

  const syncHorizontalScroll = React.useCallback((source: "axis" | "tracks", scrollLeft: number) => {
    if (syncingHScrollRef.current) return;

    syncingHScrollRef.current = true;

    const axis = axisScrollRef.current;
    const tracks = timelineScrollRef.current;

    if (source === "axis" && tracks && tracks.scrollLeft !== scrollLeft) {
      tracks.scrollLeft = scrollLeft;
    }

    if (source === "tracks" && axis && axis.scrollLeft !== scrollLeft) {
      axis.scrollLeft = scrollLeft;
    }

    syncingHScrollRef.current = false;
  }, []);

  const scrollToToday = React.useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const scroller = timelineScrollRef.current;
      if (!scroller || todayIdx < 0) return;

      const dayW = timelineDayWidthPx(preset);
      const todayX = (todayIdx + 0.5) * dayW;
      const target = todayX - scroller.clientWidth / 2;

      scroller.scrollTo({ left: Math.max(0, target), behavior });
      syncHorizontalScroll("tracks", scroller.scrollLeft);
    },
    [preset, todayIdx, syncHorizontalScroll],
  );

  React.useEffect(() => {
    scrollToToday("auto");
  }, [preset, todayISO, scrollToToday]);

  const handleAxisScroll = React.useCallback(() => {
    const scroller = axisScrollRef.current;
    if (!scroller) return;
    syncHorizontalScroll("axis", scroller.scrollLeft);
  }, [syncHorizontalScroll]);

  const handleTimelineScroll = React.useCallback(() => {
    const scroller = timelineScrollRef.current;
    if (!scroller) return;

    syncHorizontalScroll("tracks", scroller.scrollLeft);

    if (preset !== "day" || expandingRef.current) return;

    const dayW = timelineDayWidthPx("day");
    const { scrollLeft, scrollWidth, clientWidth } = scroller;

    if (scrollLeft < DAY_VIEW_EXPAND_THRESHOLD_PX) {
      expandingRef.current = true;
      const prevScroll = scrollLeft;
      setDayWindow((w) => ({ ...w, back: w.back + DAY_VIEW_EXPAND_BY }));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (timelineScrollRef.current) {
            timelineScrollRef.current.scrollLeft = prevScroll + DAY_VIEW_EXPAND_BY * dayW;
            syncHorizontalScroll("tracks", timelineScrollRef.current.scrollLeft);
          }
          expandingRef.current = false;
        });
      });
      return;
    }

    if (scrollLeft + clientWidth > scrollWidth - DAY_VIEW_EXPAND_THRESHOLD_PX) {
      setDayWindow((w) => ({ ...w, forward: w.forward + DAY_VIEW_EXPAND_BY }));
    }
  }, [preset, syncHorizontalScroll]);

  React.useLayoutEffect(() => {
    const threadsV = threadsVScrollRef.current;
    const timeline = timelineScrollRef.current;
    if (!threadsV || !timeline) return;

    const normalizeDelta = (delta: number, mode: number, pageSize: number) => {
      if (mode === 1) return delta * 40;
      if (mode === 2) return delta * pageSize;
      return delta;
    };

    const onWheel = (event: WheelEvent) => {
      if (!timeline.contains(event.target as Node)) return;
      if (threadsV.scrollHeight <= threadsV.clientHeight) return;

      const deltaY = normalizeDelta(event.deltaY, event.deltaMode, threadsV.clientHeight);
      const deltaX = normalizeDelta(event.deltaX, event.deltaMode, threadsV.clientWidth);

      if (event.shiftKey) return;
      if (deltaY === 0) return;
      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.25 && Math.abs(deltaX) > 1) return;

      const maxTop = threadsV.scrollHeight - threadsV.clientHeight;
      const nextTop = Math.max(0, Math.min(maxTop, threadsV.scrollTop + deltaY));

      threadsV.scrollTop = nextTop;
      event.preventDefault();
    };

    threadsV.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => threadsV.removeEventListener("wheel", onWheel, { capture: true });
  }, [visibleThreadViews.length, threadRowHeightPx]);

  return (
    <section aria-label="Threads" className="flex min-h-0 min-w-0 flex-1 flex-col font-sans">
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md",
          "border border-white/[0.08] bg-muted/10",
        )}
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.08] bg-background/95 px-2 py-1.5">
          <PresetSwitcher value={preset} onChange={setPreset} />
          {preset === "day" ?
            <button
              type="button"
              onClick={() => scrollToToday("smooth")}
              className="text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Today
            </button>
          : null}
          <p className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            <span className="font-medium text-violet-300/90">{focusCount}</span>
            {" focus · "}
            <span className="font-medium text-foreground/85">{totalCount}</span>
            {" total"}
          </p>
        </div>

        <div
          ref={boardViewportRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div ref={boardRowRef} className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 border-b border-white/[0.08] bg-background/95">
              <aside
                className={cn(
                  LABEL_GUTTER,
                  "relative z-40 shrink-0 border-r border-white/[0.08] bg-background/95",
                )}
              >
                <div
                  className="flex h-full items-end justify-between gap-2 px-3 pb-2"
                  style={{ height: axisMinH, minHeight: axisMinH }}
                >
                  <span className="text-[11px] font-medium text-muted-foreground">Threads</span>
                  <div className="flex w-[3.75rem] shrink-0 items-center justify-end gap-1.5 pr-2.5">
                    <span className="w-6 text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground/55">
                      Task
                    </span>
                    <span className="w-6 text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground/55">
                      Today
                    </span>
                  </div>
                </div>
              </aside>

              <div
                ref={axisScrollRef}
                onScroll={handleAxisScroll}
                className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain scrollbar-x-hidden [-webkit-overflow-scrolling:touch]"
              >
                <div
                  role="presentation"
                  className={cn(
                    "grid w-full shrink-0 border-white/[0.08] bg-background/95 backdrop-blur-sm",
                  )}
                  style={{
                    ...trackGridStyle,
                    height: axisMinH,
                    minHeight: axisMinH,
                    minWidth: trackMinWidth,
                  }}
                >
                  {preset === "year" ?
                    <YearAxisBands days={days} todayISO={todayISO} axisMinH={axisMinH} />
                  : (
                    days.map((d) => (
                      <AxisDayCell
                        key={d}
                        d={d}
                        todayISO={todayISO}
                        axisMinH={axisMinH}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            <div
              ref={threadsVScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scrollbar-y-hover [-webkit-overflow-scrolling:touch]"
            >
              <div className="flex min-h-min w-full items-stretch">
                <aside
                  className={cn(
                    LABEL_GUTTER,
                    "relative z-40 shrink-0 border-r border-white/[0.08] bg-background/95",
                  )}
                >
                  {visibleThreadViews.length === 0 ?
                    <div className="px-4 py-6 text-[12px] text-muted-foreground/45">&nbsp;</div>
                  : (
                    visibleThreadViews.map((tv) => (
                      <ThreadRailGroup
                        key={tv.thread.id}
                        tv={tv}
                        busy={busy}
                        rowHeightPx={threadRowHeightPx}
                        onToggleToday={onToggleToday}
                        onAddMiniTask={onAddMiniTask}
                      />
                    ))
                  )}
                </aside>

                <div
                  ref={timelineScrollRef}
                  onScroll={handleTimelineScroll}
                  className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain scrollbar-x-hidden [-webkit-overflow-scrolling:touch]"
                >
                  <div className="relative" style={{ minWidth: trackMinWidth }}>
                    {visibleThreadViews.length === 0 ?
                      <div
                        className="flex items-center justify-center px-6 py-10 text-center"
                        style={{ height: threadRowHeightPx }}
                      >
                        <p className="text-[13px] text-muted-foreground">No threads in this range.</p>
                      </div>
                    : (
                      <div className="relative">
                        {todayLineLeftPx !== null ?
                          <div
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 z-[20] w-px -translate-x-1/2 bg-violet-400/60"
                            style={{ left: todayLineLeftPx }}
                          />
                        : null}
                        <div className="relative z-[12]">
                          {visibleThreadViews.map((tv) => (
                            <ThreadTrackGroup
                              key={tv.thread.id}
                              tv={tv}
                              preset={preset}
                              days={days}
                              todayISO={todayISO}
                              rowHeightPx={threadRowHeightPx}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
