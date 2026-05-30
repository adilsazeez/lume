"use client";

import * as React from "react";
import { CheckSquare, GripVertical, Info } from "lucide-react";

import type { MiniTaskFilter, MiniTaskPriority, MiniTaskRow, MiniTaskStatus, ThreadRow } from "@/types/lume";

import { MiniTaskList } from "@/components/lume/mini-task-list";
import { QuickAddMiniTask } from "@/components/lume/quick-add-mini-task";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { filterMiniTasks, sortMiniTasks } from "@/lib/mini-tasks";
import { WORKFLOW_COPY } from "@/lib/lume-workflow";
import { isOnCanvas } from "@/lib/thread-placement";
import { cn } from "@/lib/utils";

import { useDraggablePanel } from "@/hooks/use-draggable-panel";

const MINI_TASKS_POSITION_KEY = "lume:mini-tasks-dock-position";

const FILTERS: { key: MiniTaskFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Completed" },
];

export function MiniTaskPanel({
  tasks,
  threads,
  todayISO,
  busy,
  boundsRef,
  onStatusChange,
  onTitleChange,
  onNoteChange,
  onDueDateChange,
  onPriorityChange,
  onDelete,
  onQuickAdd,
}: {
  tasks: MiniTaskRow[];
  threads: ThreadRow[];
  todayISO: string;
  busy?: boolean;
  boundsRef: React.RefObject<HTMLElement | null>;
  onStatusChange: (taskId: string, status: MiniTaskStatus) => void;
  onTitleChange: (taskId: string, title: string) => void;
  onNoteChange: (taskId: string, note: string | null) => void;
  onDueDateChange: (taskId: string, dueDate: string | null) => void;
  onPriorityChange: (taskId: string, priority: MiniTaskPriority | null) => void;
  onDelete: (taskId: string) => void;
  onQuickAdd: (payload: { thread_id: string; title: string }) => Promise<void> | void;
}) {
  const [filter, setFilter] = React.useState<MiniTaskFilter>("today");
  const [expandedTaskId, setExpandedTaskId] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const { position, isDragging, dragHandleProps } = useDraggablePanel({
    boundsRef,
    panelRef,
    storageKey: MINI_TASKS_POSITION_KEY,
    defaultCorner: "top-right",
  });

  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(
          "[data-slot='popover-content'], [data-slot='popover-trigger'], [data-slot='select-content']",
        )
      ) {
        return;
      }
      if (!listRef.current?.contains(target)) {
        setExpandedTaskId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const activeThreads = React.useMemo(
    () => threads.filter((t) => isOnCanvas(t)),
    [threads],
  );

  const visibleTasks = React.useMemo(() => {
    const filtered = filterMiniTasks(tasks, filter, todayISO);
    if (filter === "done") {
      return filtered.slice().sort((a, b) => {
        const ac = a.completed_at ?? a.updated_at;
        const bc = b.completed_at ?? b.updated_at;
        return bc.localeCompare(ac);
      });
    }
    return sortMiniTasks(filtered, todayISO);
  }, [tasks, filter, todayISO]);

  React.useEffect(() => {
    if (expandedTaskId && !visibleTasks.some((t) => t.id === expandedTaskId)) {
      setExpandedTaskId(null);
    }
  }, [visibleTasks, expandedTaskId]);

  const isCompletedTab = filter === "done";

  const emptyLabels: Record<MiniTaskFilter, string> = {
    all: "No open tasks. Capture ad hoc actions here.",
    today: "Nothing due today.",
    upcoming: "No upcoming due dates.",
    done: "No completed tasks yet.",
  };

  return (
    <aside
      ref={panelRef}
      aria-label="Mini-tasks"
      data-no-pan
      style={position ? { left: position.x, top: position.y } : undefined}
      className={cn(
        "pointer-events-auto absolute z-50 flex w-[min(100%,20rem)] flex-col overflow-hidden rounded-xl border shadow-lg backdrop-blur-md",
        "border-lume-border-strong bg-lume-panel/92",
        "shadow-[0_8px_32px_rgb(0_0_0_/_0.35),inset_0_1px_0_rgb(255_255_255_/_0.06)]",
        !position && "top-3 right-3 opacity-0",
        position && "opacity-100",
        isDragging && "select-none",
      )}
    >
      <div className="shrink-0 border-b border-lume-border/80 bg-lume-panel/95 px-2 py-2">
        <div className="flex items-center gap-1">
          <div
            {...dragHandleProps}
            className={cn(
              "flex min-w-0 flex-1 touch-none items-center gap-1.5",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
          >
            <GripVertical className="size-3.5 shrink-0 text-lume-text-muted/55" aria-hidden />
            <CheckSquare className="size-3.5 shrink-0 text-lume-accent/85" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium tracking-[0.08em] text-foreground uppercase">Mini-tasks</p>
            </div>
            <p className="flex shrink-0 items-baseline gap-1 pr-1 text-[10px] tabular-nums text-lume-text-secondary">
              <span className="inline-block min-w-[1.5rem] text-right font-medium text-foreground">
                {visibleTasks.length}
              </span>
              <span className="inline-block w-[2.125rem]">tasks</span>
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 text-lume-text-muted outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-lume-focus"
                  aria-label="About mini-tasks"
                >
                  <Info className="size-3" aria-hidden />
                </button>
              }
            />
            <TooltipContent side="top" align="end" className="max-w-[220px] text-pretty">
              {WORKFLOW_COPY.miniTasks.hint}
            </TooltipContent>
          </Tooltip>
        </div>

        <div
          role="tablist"
          aria-label="Task filters"
          className="mt-2 flex flex-wrap gap-0.5 rounded-md border border-lume-border-strong p-0.5"
        >
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium",
                filter === key ?
                  "bg-lume-surface text-foreground"
                : "text-lume-text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isCompletedTab ? null : (
        <QuickAddMiniTask threads={activeThreads} busy={busy} onSubmit={onQuickAdd} />
      )}

      <div
        ref={listRef}
        className="max-h-[min(40vh,280px)] overflow-y-auto overscroll-y-contain px-1.5 py-2 scrollbar-y-hover"
      >
        <MiniTaskList
          tasks={visibleTasks}
          todayISO={todayISO}
          busy={busy}
          expandedTaskId={expandedTaskId}
          onExpandTask={setExpandedTaskId}
          onStatusChange={onStatusChange}
          onTitleChange={onTitleChange}
          onNoteChange={onNoteChange}
          onDueDateChange={onDueDateChange}
          onPriorityChange={onPriorityChange}
          onDelete={onDelete}
          emptyLabel={emptyLabels[filter]}
        />
      </div>
    </aside>
  );
}
