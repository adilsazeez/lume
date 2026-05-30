"use client";

import { GripVertical, Sparkles } from "lucide-react";

import type { ThreadRow } from "@/types/lume";

import { Button } from "@/components/ui/button";
import { isNotStartedStatus, threadStatusLabel } from "@/lib/thread-status";
import { cn } from "@/lib/utils";

import { useThreadDragState } from "@/hooks/use-thread-drag-state";

export function DormantThreadItem({
  thread,
  busy,
  isDragging,
  onActivate,
  onOpen,
}: {
  thread: ThreadRow;
  busy?: boolean;
  isDragging?: boolean;
  onActivate: (threadId: string) => void;
  onOpen?: (threadId: string) => void;
}) {
  const { beginDrag, endDrag } = useThreadDragState();
  const notStarted = isNotStartedStatus(thread.status);

  return (
    <div
      className={cn(
        "group/item flex min-w-0 items-center gap-1 rounded-lg border px-1 py-1 transition-all",
        notStarted
          ? "border-amber-400/35 bg-amber-500/10"
          : "border-lume-border bg-lume-surface/60",
        isDragging && "scale-[1.02] opacity-40 shadow-lg ring-2 ring-lume-accent/40",
        !isDragging && "hover:border-lume-border-strong hover:bg-lume-surface/90",
      )}
    >
      <button
        type="button"
        draggable={!busy}
        disabled={busy}
        aria-label={`Drag ${thread.name} to the canvas`}
        title="Drag to canvas"
        className={cn(
          "flex shrink-0 cursor-grab touch-none items-center rounded p-0.5 text-lume-text-muted",
          "active:cursor-grabbing hover:text-foreground",
          busy && "cursor-not-allowed opacity-40",
        )}
        onDragStart={(e) => beginDrag(thread.id, e)}
        onDragEnd={() => endDrag()}
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>

      <button
        type="button"
        disabled={busy}
        className="min-w-0 flex-1 truncate px-1 py-0.5 text-left text-[11px] font-medium text-foreground"
        onClick={() => onOpen?.(thread.id)}
        title={thread.name}
      >
        <span
          aria-hidden
          className="mr-1.5 inline-block size-1.5 rounded-full align-middle"
          style={{ backgroundColor: notStarted ? "#fbbf24" : thread.color }}
        />
        {thread.name}
      </button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        className={cn(
          "h-6 shrink-0 px-2 text-[10px] font-medium",
          notStarted ? "text-amber-200/90 hover:bg-amber-500/15" : "text-lume-accent hover:bg-lume-accent/10",
        )}
        aria-label={`Start ${thread.name} on canvas`}
        title={notStarted ? "Start on canvas" : "Activate on canvas"}
        onClick={() => onActivate(thread.id)}
      >
        <Sparkles className="mr-1 size-3" aria-hidden />
        {notStarted ? "Start" : "Activate"}
      </Button>
    </div>
  );
}
