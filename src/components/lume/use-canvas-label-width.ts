"use client";

import * as React from "react";

import {
  CANVAS_LABEL_W_DEFAULT,
  CANVAS_LABEL_W_MAX,
  CANVAS_LABEL_W_MIN,
} from "@/components/lume/thread-timeline";

const STORAGE_KEY = "lume:canvas-label-width";

function readStoredWidth() {
  if (typeof window === "undefined") return CANVAS_LABEL_W_DEFAULT;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return CANVAS_LABEL_W_DEFAULT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return CANVAS_LABEL_W_DEFAULT;
  return Math.min(CANVAS_LABEL_W_MAX, Math.max(CANVAS_LABEL_W_MIN, n));
}

export function useCanvasLabelWidth() {
  const [labelWidthPx, setLabelWidthPx] = React.useState(CANVAS_LABEL_W_DEFAULT);
  const dragRef = React.useRef<{ startX: number; startWidth: number } | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useEffect(() => {
    setLabelWidthPx(readStoredWidth());
  }, []);

  const persistWidth = React.useCallback((width: number) => {
    const clamped = Math.min(CANVAS_LABEL_W_MAX, Math.max(CANVAS_LABEL_W_MIN, Math.round(width)));
    setLabelWidthPx(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {
      /* quota / private mode */
    }
    return clamped;
  }, []);

  const onResizePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { startX: e.clientX, startWidth: labelWidthPx };
      setIsResizing(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [labelWidthPx],
  );

  const onResizePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      persistWidth(dragRef.current.startWidth + delta);
    },
    [persistWidth],
  );

  const endResize = React.useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsResizing(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  return {
    labelWidthPx,
    isResizing,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp: endResize,
    onResizePointerCancel: endResize,
  };
}
