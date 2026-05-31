"use client";

import * as React from "react";

import { dayBoundaryKey, getFocusDayISO, msUntilNextFocusDayBoundary } from "@/lib/lume-day";
import { getTodayISO, msUntilNextCalendarMidnight } from "@/lib/today-server";
import type { DayBoundarySettings } from "@/types/lume";

const FALLBACK_SYNC_MS = 30_000;

type LiveDayConfig = {
  dateTimezone: string;
  resolveDayISO: (reference?: Date) => string;
  msUntilNextChange: (reference?: Date) => number;
  depsKey: string;
};

function useLiveDayISO({
  dateTimezone,
  resolveDayISO,
  msUntilNextChange,
  depsKey,
}: LiveDayConfig): string {
  const [dayISO, setDayISO] = React.useState(() => resolveDayISO());

  React.useEffect(() => {
    if (!dateTimezone) return;

    let cancelled = false;
    let timeoutId = 0;

    const sync = () => {
      if (cancelled) return;
      setDayISO(resolveDayISO());
    };

    const schedule = () => {
      if (cancelled) return;
      window.clearTimeout(timeoutId);
      const delay = msUntilNextChange();
      timeoutId = window.setTimeout(() => {
        sync();
        schedule();
      }, delay);
    };

    sync();
    schedule();

    const intervalId = window.setInterval(sync, FALLBACK_SYNC_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onFocus = () => sync();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [dateTimezone, depsKey, msUntilNextChange, resolveDayISO]);

  return dayISO;
}

/** Calendar today in the given timezone — rolls at local midnight. */
export function useLiveCalendarTodayISO(dateTimezone: string): string {
  const resolveDayISO = React.useCallback(
    (reference?: Date) => getTodayISO(dateTimezone, reference),
    [dateTimezone],
  );
  const msUntilNextChange = React.useCallback(
    (reference?: Date) => msUntilNextCalendarMidnight(dateTimezone, reference),
    [dateTimezone],
  );

  return useLiveDayISO({
    dateTimezone,
    resolveDayISO,
    msUntilNextChange,
    depsKey: "calendar",
  });
}

/** Focus day — today-selection pins roll at day boundary end. */
export function useLiveFocusDayISO(dateTimezone: string, dayBoundary: DayBoundarySettings): string {
  const boundaryKey = dayBoundaryKey(dayBoundary);
  const resolveDayISO = React.useCallback(
    (reference?: Date) => getFocusDayISO(dateTimezone, dayBoundary, reference),
    [dateTimezone, dayBoundary],
  );
  const msUntilNextChange = React.useCallback(
    (reference?: Date) => msUntilNextFocusDayBoundary(dateTimezone, dayBoundary, reference),
    [dateTimezone, dayBoundary],
  );

  return useLiveDayISO({
    dateTimezone,
    resolveDayISO,
    msUntilNextChange,
    depsKey: boundaryKey,
  });
}

/** @deprecated Use {@link useLiveFocusDayISO} or {@link useLiveCalendarTodayISO}. */
export function useLiveLumeDayISO(dateTimezone: string, dayBoundary: DayBoundarySettings): string {
  return useLiveFocusDayISO(dateTimezone, dayBoundary);
}
