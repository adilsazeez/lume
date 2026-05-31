"use client";

import * as React from "react";
import { ArrowDownRight, GripVertical, Info, Moon } from "lucide-react";

import type { ThreadRow } from "@/types/lume";

import { DormantThreadItem } from "@/components/lume/dormant-thread-item";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WORKFLOW_COPY } from "@/lib/lume-workflow";
import {
  FLOATING_PANEL_DORMANT_FALLBACK_RIGHT_CLASS,
  FLOATING_PANEL_MINI_TASKS_RESERVE_PX,
  FLOATING_PANEL_SIZE_CLASS,
} from "@/lib/floating-panels";
import { readThreadIdFromDragEvent } from "@/lib/thread-placement";
import { cn } from "@/lib/utils";

import { useDraggablePanel } from "@/hooks/use-draggable-panel";
import { useThreadDragState } from "@/hooks/use-thread-drag-state";

export function DormantThreadsDock({
  threads,
  busy,
  boundsRef,
  initialPosition = null,
  onPersistPosition,
  onResetPosition,
  onActivate,
  onOpenThread,
  onDropToPark,
}: {
  threads: ThreadRow[];
  busy?: boolean;
  boundsRef: React.RefObject<HTMLElement | null>;
  initialPosition?: { x: number; y: number } | null;
  onPersistPosition?: (position: { x: number; y: number }) => void;
  onResetPosition?: () => void;
  onActivate: (threadId: string) => void;
  onOpenThread?: (threadId: string) => void;
  onDropToPark?: (threadId: string) => void;
}) {
  const { draggingThreadId, endDrag } = useThreadDragState();
  const [isOverDock, setIsOverDock] = React.useState(false);
  const panelRef = React.useRef<HTMLElement>(null);
  const { position, isDragging, resetPosition, dragHandleProps } = useDraggablePanel({
    boundsRef,
    panelRef,
    initialPosition,
    onPersistPosition,
    defaultCorner: "bottom-right",
    reserveRightPx: FLOATING_PANEL_MINI_TASKS_RESERVE_PX,
  });

  if (threads.length === 0) return null;

  return (
    <aside
      ref={panelRef}
      aria-label="Dormant threads dock"
      data-no-pan
      style={
        position ?
          { left: position.x, top: position.y, right: "auto", bottom: "auto" }
        : undefined
      }
      className={cn(
        "pointer-events-auto absolute z-50 flex flex-col overflow-hidden rounded-xl border shadow-lg backdrop-blur-md",
        FLOATING_PANEL_SIZE_CLASS,
        "border-amber-900/25 bg-lume-panel/92",
        "shadow-[0_8px_32px_rgb(0_0_0_/_0.35),inset_0_1px_0_rgb(255_255_255_/_0.06)]",
        !position && cn("bottom-3", FLOATING_PANEL_DORMANT_FALLBACK_RIGHT_CLASS),
        isOverDock && "border-amber-400/45 ring-2 ring-amber-400/25",
        isDragging && "select-none",
      )}
      onDragOver={(e) => {
        if (!onDropToPark) return;
        const id = e.dataTransfer.types.includes("application/x-lume-thread-id");
        if (!id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsOverDock(true);
      }}
      onDragLeave={() => setIsOverDock(false)}
      onDrop={(e) => {
        if (!onDropToPark) return;
        e.preventDefault();
        setIsOverDock(false);
        const threadId = readThreadIdFromDragEvent(e);
        if (threadId) onDropToPark(threadId);
        endDrag();
      }}
    >
      <div className="flex items-center gap-1 border-b border-lume-border/80 px-2 py-2">
        <div
          {...dragHandleProps}
          className={cn(
            "flex min-w-0 flex-1 touch-none items-center gap-1.5",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <GripVertical className="size-3.5 shrink-0 text-lume-text-muted/55" aria-hidden />
          <Moon className="size-3.5 shrink-0 text-amber-400/80" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground">
              Dormant
              <span className="ml-1.5 tabular-nums text-lume-text-muted">({threads.length})</span>
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-lume-text-muted outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-lume-focus"
                aria-label="Reset position"
                onClick={() => {
                  resetPosition();
                  onResetPosition?.();
                }}
              >
                <ArrowDownRight className="size-3" aria-hidden />
              </button>
            }
          />
          <TooltipContent side="top" align="end">
            Reset position
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-lume-text-muted outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-lume-focus"
                aria-label="About dormant threads"
              >
                <Info className="size-3" aria-hidden />
              </button>
            }
          />
          <TooltipContent side="top" align="end" className="max-w-[220px] text-pretty">
            {WORKFLOW_COPY.dormant.hint}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
        {threads.map((thread) => (
          <DormantThreadItem
            key={thread.id}
            thread={thread}
            busy={busy}
            isDragging={draggingThreadId === thread.id}
            onActivate={onActivate}
            onOpen={onOpenThread}
          />
        ))}
      </div>
    </aside>
  );
}
