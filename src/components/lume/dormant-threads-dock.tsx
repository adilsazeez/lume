"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Moon } from "lucide-react";

import type { ThreadRow } from "@/types/lume";

import { DormantThreadChip, DormantThreadItem } from "@/components/lume/dormant-thread-item";
import { Button } from "@/components/ui/button";
import { readThreadIdFromDragEvent } from "@/lib/thread-placement";
import { cn } from "@/lib/utils";

import { useThreadDragState } from "@/hooks/use-thread-drag-state";

const DOCK_COLLAPSED_KEY = "lume:dormant-dock-collapsed";

export function DormantThreadsDock({
  threads,
  busy,
  onActivate,
  onOpenThread,
  onDropToPark,
}: {
  threads: ThreadRow[];
  busy?: boolean;
  onActivate: (threadId: string) => void;
  onOpenThread?: (threadId: string) => void;
  onDropToPark?: (threadId: string) => void;
}) {
  const { draggingThreadId, endDrag } = useThreadDragState();
  const [collapsed, setCollapsed] = React.useState(false);
  const [isOverDock, setIsOverDock] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(DOCK_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DOCK_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (threads.length === 0) return null;

  const preview = threads.slice(0, 3);

  return (
    <aside
      aria-label="Dormant threads dock"
      className={cn(
        "pointer-events-auto z-30 w-[min(100%,20rem)] rounded-xl border shadow-lg backdrop-blur-md",
        "border-amber-900/25 bg-lume-panel/92",
        "shadow-[0_8px_32px_rgb(0_0_0_/_0.35),inset_0_1px_0_rgb(255_255_255_/_0.06)]",
        isOverDock && "border-amber-400/45 ring-2 ring-amber-400/25",
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
      <div className="flex items-center gap-2 border-b border-lume-border/80 px-2.5 py-2">
        <Moon className="size-3.5 shrink-0 text-amber-400/80" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-foreground">
            Dormant
            <span className="ml-1.5 tabular-nums text-lume-text-muted">({threads.length})</span>
          </p>
          <p className="text-[10px] leading-snug text-lume-text-muted">Drag or tap Start to bring onto canvas</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand dormant dock" : "Collapse dormant dock"}
          onClick={toggleCollapsed}
        >
          {collapsed ?
            <ChevronUp className="size-3.5" aria-hidden />
          : <ChevronDown className="size-3.5" aria-hidden />}
        </Button>
      </div>

      {collapsed ?
        <div className="flex flex-wrap gap-1 px-2.5 py-2">
          {preview.map((t) => (
            <DormantThreadChip key={t.id} thread={t} onClick={() => onOpenThread?.(t.id)} />
          ))}
          {threads.length > preview.length ?
            <span className="self-center px-1 text-[10px] text-lume-text-muted">
              +{threads.length - preview.length}
            </span>
          : null}
        </div>
      : (
        <div className="max-h-[min(40vh,220px)] space-y-1 overflow-y-auto p-2 scrollbar-thin">
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
      )}
    </aside>
  );
}
