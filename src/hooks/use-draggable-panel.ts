"use client";

import * as React from "react";

import {
  FLOATING_PANEL_HEIGHT_PX,
  FLOATING_PANEL_WIDTH_PX,
} from "@/lib/floating-panels";

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

export type DraggablePanelCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

function defaultPositionForCorner(
  corner: DraggablePanelCorner,
  boundsW: number,
  boundsH: number,
  panelW: number,
  panelH: number,
  margin: number,
  reserveRightPx = 0,
) {
  switch (corner) {
    case "top-left":
      return { x: margin, y: margin };
    case "top-right":
      return { x: boundsW - panelW - margin - reserveRightPx, y: margin };
    case "bottom-left":
      return { x: margin, y: boundsH - panelH - margin };
    case "bottom-right":
      return { x: boundsW - panelW - margin - reserveRightPx, y: boundsH - panelH - margin };
  }
}

export function useDraggablePanel({
  boundsRef,
  panelRef,
  initialPosition = null,
  onPersistPosition,
  margin = 12,
  defaultCorner = "bottom-right",
  reserveRightPx = 0,
}: {
  boundsRef: React.RefObject<HTMLElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;
  initialPosition?: { x: number; y: number } | null;
  onPersistPosition?: (position: { x: number; y: number }) => void;
  margin?: number;
  defaultCorner?: DraggablePanelCorner;
  /** Extra inset from the right edge (e.g. leave room for a sibling panel). */
  reserveRightPx?: number;
}) {
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const positionRef = React.useRef<{ x: number; y: number } | null>(null);
  const initialPositionRef = React.useRef(initialPosition);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  positionRef.current = position;
  initialPositionRef.current = initialPosition;

  const measure = React.useCallback(() => {
    const bounds = boundsRef.current;
    const panel = panelRef.current;
    if (!bounds || !panel) return null;

    const boundsW = bounds.clientWidth;
    const boundsH = bounds.clientHeight;
    const panelW = panel.offsetWidth || panel.getBoundingClientRect().width;
    const panelH = panel.offsetHeight || panel.getBoundingClientRect().height;

    return { boundsW, boundsH, panelW, panelH };
  }, [boundsRef, panelRef]);

  const reserveRightRef = React.useRef(reserveRightPx);
  reserveRightRef.current = reserveRightPx;

  const resolvePosition = React.useCallback(
    (measured: { boundsW: number; boundsH: number; panelW: number; panelH: number }) => {
      const panelW = measured.panelW > 0 ? measured.panelW : FLOATING_PANEL_WIDTH_PX;
      const panelH = measured.panelH > 0 ? measured.panelH : FLOATING_PANEL_HEIGHT_PX;
      const seed =
        initialPositionRef.current ??
        defaultPositionForCorner(
          defaultCorner,
          measured.boundsW,
          measured.boundsH,
          panelW,
          panelH,
          margin,
          reserveRightRef.current,
        );
      return clampPanelPosition(
        seed.x,
        seed.y,
        measured.boundsW,
        measured.boundsH,
        panelW,
        panelH,
        margin,
      );
    },
    [defaultCorner, margin],
  );

  const syncPosition = React.useCallback(() => {
    const measured = measure();
    if (!measured || measured.boundsW <= 0 || measured.boundsH <= 0) return false;

    const panelW = measured.panelW > 0 ? measured.panelW : FLOATING_PANEL_WIDTH_PX;
    const panelH = measured.panelH > 0 ? measured.panelH : FLOATING_PANEL_HEIGHT_PX;
    const current = positionRef.current;

    const next =
      current ?
        clampPanelPosition(current.x, current.y, measured.boundsW, measured.boundsH, panelW, panelH, margin)
      : resolvePosition({ ...measured, panelW, panelH });

    positionRef.current = next;
    setPosition(next);
    return true;
  }, [margin, measure, resolvePosition]);

  React.useLayoutEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const trySync = () => {
      if (cancelled) return;
      const ok = syncPosition();
      if (!ok && attempts < 30) {
        attempts += 1;
        requestAnimationFrame(trySync);
      }
    };

    trySync();

    const bounds = boundsRef.current;
    const panel = panelRef.current;
    const observer = new ResizeObserver(() => {
      syncPosition();
    });
    if (bounds) observer.observe(bounds);
    if (panel) observer.observe(panel);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [boundsRef, panelRef, syncPosition]);

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
      const measured = measure();
      if (!measured || measured.boundsW <= 0 || measured.boundsH <= 0) return;

      const next = clampPanelPosition(
        dragRef.current.originX + (event.clientX - dragRef.current.startX),
        dragRef.current.originY + (event.clientY - dragRef.current.startY),
        measured.boundsW,
        measured.boundsH,
        measured.panelW > 0 ? measured.panelW : FLOATING_PANEL_WIDTH_PX,
        measured.panelH > 0 ? measured.panelH : FLOATING_PANEL_HEIGHT_PX,
        margin,
      );
      positionRef.current = next;
      setPosition(next);
    },
    [margin, measure],
  );

  const onHandlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsDragging(false);
      if (positionRef.current) onPersistPosition?.(positionRef.current);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [onPersistPosition],
  );

  const resetPosition = React.useCallback(() => {
    initialPositionRef.current = null;

    const measured = measure();
    if (!measured || measured.boundsW <= 0 || measured.boundsH <= 0) return;

    const panelW = measured.panelW > 0 ? measured.panelW : FLOATING_PANEL_WIDTH_PX;
    const panelH = measured.panelH > 0 ? measured.panelH : FLOATING_PANEL_HEIGHT_PX;
    const seed = defaultPositionForCorner(
      defaultCorner,
      measured.boundsW,
      measured.boundsH,
      panelW,
      panelH,
      margin,
      reserveRightRef.current,
    );
    const next = clampPanelPosition(
      seed.x,
      seed.y,
      measured.boundsW,
      measured.boundsH,
      panelW,
      panelH,
      margin,
    );

    positionRef.current = next;
    setPosition(next);
  }, [defaultCorner, margin, measure]);

  return {
    position,
    isDragging,
    resetPosition,
    dragHandleProps: {
      onPointerDown: onHandlePointerDown,
      onPointerMove: onHandlePointerMove,
      onPointerUp: onHandlePointerUp,
      onPointerCancel: onHandlePointerUp,
    },
  };
}
