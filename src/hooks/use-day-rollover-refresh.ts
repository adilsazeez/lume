"use client";

import * as React from "react";

const FALLBACK_POLL_MS = 30_000;

type DayRolloverConfig = {
  dateTimezone: string;
  resolveDayISO: (reference?: Date) => string;
  msUntilNextChange: (reference?: Date) => number;
  activeDayISO: string;
  onRollover: () => void | Promise<void>;
  depsKey: string;
  enabled?: boolean;
  pollMs?: number;
};

/**
 * Detects a day label change and triggers a refresh.
 * Schedules the next transition, polls as a fallback, and checks on focus/visibility.
 */
export function useDayRolloverRefresh({
  dateTimezone,
  resolveDayISO,
  msUntilNextChange,
  activeDayISO,
  onRollover,
  depsKey,
  enabled = true,
  pollMs = FALLBACK_POLL_MS,
}: DayRolloverConfig) {
  const onRolloverRef = React.useRef(onRollover);
  const activeDayRef = React.useRef(activeDayISO);
  const resolveDayISORef = React.useRef(resolveDayISO);
  const msUntilNextChangeRef = React.useRef(msUntilNextChange);
  const inFlightRef = React.useRef(false);

  React.useEffect(() => {
    onRolloverRef.current = onRollover;
  }, [onRollover]);

  React.useEffect(() => {
    activeDayRef.current = activeDayISO;
  }, [activeDayISO]);

  React.useEffect(() => {
    resolveDayISORef.current = resolveDayISO;
    msUntilNextChangeRef.current = msUntilNextChange;
  }, [resolveDayISO, msUntilNextChange]);

  React.useEffect(() => {
    if (!enabled || !dateTimezone) return;

    let cancelled = false;
    let boundaryTimeoutId = 0;

    const check = () => {
      if (cancelled || inFlightRef.current) return;

      const nowDay = resolveDayISORef.current();
      if (nowDay === activeDayRef.current) return;

      inFlightRef.current = true;
      void Promise.resolve(onRolloverRef.current()).finally(() => {
        inFlightRef.current = false;
        if (!cancelled) scheduleBoundary();
      });
    };

    const scheduleBoundary = () => {
      if (cancelled) return;
      window.clearTimeout(boundaryTimeoutId);
      const delay = msUntilNextChangeRef.current();
      boundaryTimeoutId = window.setTimeout(check, delay);
    };

    check();
    scheduleBoundary();

    const intervalId = window.setInterval(check, pollMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onFocus = () => check();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearTimeout(boundaryTimeoutId);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [dateTimezone, depsKey, enabled, pollMs]);
}
