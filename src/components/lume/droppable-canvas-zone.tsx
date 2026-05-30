"use client";

import * as React from "react";

import { readThreadIdFromDragEvent } from "@/lib/thread-placement";
import { cn } from "@/lib/utils";

import { useThreadDragState } from "@/hooks/use-thread-drag-state";

export function DroppableCanvasZone({
  children,
  disabled,
  onDropActivate,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onDropActivate: (threadId: string) => void;
}) {
  const { isOverCanvas, setIsOverCanvas, endDrag } = useThreadDragState();

  const showHighlight = isOverCanvas && !disabled;

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl transition-shadow duration-150",
        showHighlight &&
          "ring-2 ring-lume-accent/55 ring-offset-2 ring-offset-lume-canvas shadow-[0_0_24px_rgb(34_211_238_/_0.12)]",
      )}
      onDragOver={(e) => {
        if (disabled) return;
        if (!e.dataTransfer.types.includes("application/x-lume-thread-id")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsOverCanvas(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setIsOverCanvas(false);
      }}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setIsOverCanvas(false);
        const threadId = readThreadIdFromDragEvent(e);
        if (threadId) onDropActivate(threadId);
        endDrag();
      }}
    >
      {showHighlight ?
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-xl border-2 border-dashed border-lume-accent/50 bg-lume-accent/5"
        />
      : null}
      {children}
    </div>
  );
}
