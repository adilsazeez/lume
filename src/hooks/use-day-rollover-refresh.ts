"use client";

import * as React from "react";

import { getTodayISO } from "@/lib/today-server";

const DEFAULT_POLL_MS = 60_000;

/**
 * Detects calendar-day rollover in the app timezone and triggers a refresh.
 * Checks on an interval, when the tab becomes visible, and on window focus.
 */
export function useDayRolloverRefresh({
  dateTimezone,
  activeTodayISO,
  onRollover,
  pollMs = DEFAULT_POLL_MS,
  enabled = true,
}: {
  dateTimezone: string;
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

      const nowToday = getTodayISO(dateTimezone);
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
  }, [dateTimezone, enabled, pollMs]);
}
