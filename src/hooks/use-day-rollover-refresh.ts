"use client";

import * as React from "react";

import { getLumeDayISO } from "@/lib/lume-day";
import type { DayBoundarySettings } from "@/types/lume";

const DEFAULT_POLL_MS = 60_000;

/**
 * Detects Lume-day rollover (custom boundary) and triggers a refresh.
 * Checks on an interval, when the tab becomes visible, and on window focus.
 */
export function useDayRolloverRefresh({
  dateTimezone,
  dayBoundary,
  activeTodayISO,
  onRollover,
  pollMs = DEFAULT_POLL_MS,
  enabled = true,
}: {
  dateTimezone: string;
  dayBoundary: DayBoundarySettings;
  activeTodayISO: string;
  onRollover: () => void | Promise<void>;
  pollMs?: number;
  enabled?: boolean;
}) {
  const onRolloverRef = React.useRef(onRollover);
  const activeTodayRef = React.useRef(activeTodayISO);
  const inFlightRef = React.useRef(false);

  React.useEffect(() => {
    onRolloverRef.current = onRollover;
  }, [onRollover]);

  React.useEffect(() => {
    activeTodayRef.current = activeTodayISO;
  }, [activeTodayISO]);

  React.useEffect(() => {
    if (!enabled || !dateTimezone) return;

    const check = () => {
      if (inFlightRef.current) return;

      const nowToday = getLumeDayISO(dateTimezone, dayBoundary);
      if (nowToday === activeTodayRef.current) return;

      inFlightRef.current = true;
      void Promise.resolve(onRolloverRef.current()).finally(() => {
        inFlightRef.current = false;
      });
    };

    check();

    const intervalId = window.setInterval(check, pollMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onFocus = () => check();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [dateTimezone, dayBoundary, enabled, pollMs]);
}
