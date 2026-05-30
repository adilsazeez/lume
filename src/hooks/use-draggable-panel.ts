"use client";

import * as React from "react";

function clampPanelPosition(
  x: number,
  y: number,
  boundsW: number,
  boundsH: number,
  panelW: number,
  panelH: number,
  margin: number,
) {
  const maxX = Math.max(margin, boundsW - panelW - margin);
  const maxY = Math.max(margin, boundsH - panelH - margin);
  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY),
  };
}

function readStoredPosition(key: string): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeStoredPosition(key: string, position: { x: number; y: number }) {
  try {
    localStorage.setItem(key, JSON.stringify(position));
  } catch {
    /* ignore */
  }
}

export type DraggablePanelCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function defaultPositionForCorner(
  corner: DraggablePanelCorner,
  boundsW: number,
  boundsH: number,
  panelW: number,
  panelH: number,
  margin: number,
) {
  switch (corner) {
    case "top-left":
      return { x: margin, y: margin };
    case "top-right":
      return { x: boundsW - panelW - margin, y: margin };
    case "bottom-left":
      return { x: margin, y: boundsH - panelH - margin };
    case "bottom-right":
      return { x: boundsW - panelW - margin, y: boundsH - panelH - margin };
  }
}

export function useDraggablePanel({
  boundsRef,
  panelRef,
  storageKey,
  margin = 12,
  defaultCorner = "bottom-right",
}: {
  boundsRef: React.RefObject<HTMLElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;
  storageKey: string;
  margin?: number;
  defaultCorner?: DraggablePanelCorner;
}) {
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const positionRef = React.useRef<{ x: number; y: number } | null>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  positionRef.current = position;

  const measure = React.useCallback(() => {
    const bounds = boundsRef.current;
    const panel = panelRef.current;
    if (!bounds || !panel) return null;

    return {
      boundsW: bounds.clientWidth,
      boundsH: bounds.clientHeight,
      panelW: panel.offsetWidth,
      panelH: panel.offsetHeight,
    };
  }, [boundsRef, panelRef]);

  const setClampedPosition = React.useCallback(
    (x: number, y: number) => {
      const measured = measure();
      if (!measured || measured.boundsW <= 0 || measured.boundsH <= 0) return;
      const next = clampPanelPosition(
        x,
        y,
        measured.boundsW,
        measured.boundsH,
        measured.panelW,
        measured.panelH,
        margin,
      );
      setPosition(next);
    },
    [margin, measure],
  );

  React.useLayoutEffect(() => {
    const bounds = boundsRef.current;
    const panel = panelRef.current;
    if (!bounds || !panel) return;

    const sync = () => {
      const measured = measure();
      if (!measured || measured.boundsW <= 0 || measured.boundsH <= 0) return;

      const current = positionRef.current;
      if (!current) {
        const stored = readStoredPosition(storageKey);
        const start =
          stored ??
          defaultPositionForCorner(
            defaultCorner,
            measured.boundsW,
            measured.boundsH,
            measured.panelW,
            measured.panelH,
            margin,
          );
        setClampedPosition(start.x, start.y);
        return;
      }

      setClampedPosition(current.x, current.y);
    };

    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(bounds);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [boundsRef, defaultCorner, margin, measure, panelRef, setClampedPosition, storageKey]);

  const onHandlePointerDown = React.useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !positionRef.current) return;
    event.stopPropagation();

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onHandlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current) return;
      setClampedPosition(
        dragRef.current.originX + (event.clientX - dragRef.current.startX),
        dragRef.current.originY + (event.clientY - dragRef.current.startY),
      );
    },
    [setClampedPosition],
  );

  const onHandlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsDragging(false);
      if (positionRef.current) writeStoredPosition(storageKey, positionRef.current);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [storageKey],
  );

  return {
    position,
    isDragging,
    dragHandleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: onHandlePointerMove,
      onPointerUp: onHandlePointerUp,
      onPointerCancel: onHandlePointerUp,
    },
  };
}
