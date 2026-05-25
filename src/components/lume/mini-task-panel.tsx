"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { MiniTaskFilter, MiniTaskPriority, MiniTaskRow, MiniTaskStatus, ThreadRow } from "@/types/lume";

import { MiniTaskList } from "@/components/lume/mini-task-list";
import { QuickAddMiniTask } from "@/components/lume/quick-add-mini-task";
import { Button } from "@/components/ui/button";

import { filterMiniTasks, sortMiniTasks } from "@/lib/mini-tasks";
import { cn } from "@/lib/utils";

const FILTERS: { key: MiniTaskFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
];

export function MiniTaskPanel({
  tasks,
  threads,
  todayISO,
  busy,
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
  onStatusChange: (taskId: string, status: MiniTaskStatus) => void;
  onTitleChange: (taskId: string, title: string) => void;
  onNoteChange: (taskId: string, note: string | null) => void;
  onDueDateChange: (taskId: string, dueDate: string | null) => void;
  onPriorityChange: (taskId: string, priority: MiniTaskPriority | null) => void;
  onDelete: (taskId: string) => void;
  onQuickAdd: (payload: { thread_id: string; title: string }) => Promise<void> | void;
}) {
  const [filter, setFilter] = React.useState<MiniTaskFilter>("today");
  const [showDone, setShowDone] = React.useState(false);
  const [expandedTaskId, setExpandedTaskId] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    if (expandedTaskId && !tasks.some((t) => t.id === expandedTaskId)) {
      setExpandedTaskId(null);
    }
  }, [tasks, expandedTaskId]);

  const activeThreads = React.useMemo(
    () => threads.filter((t) => t.status === "active" || t.status === "paused"),
    [threads],
  );

  const visibleTasks = React.useMemo(() => {
    const filtered = filterMiniTasks(tasks, filter, todayISO);
    return sortMiniTasks(filtered, todayISO);
  }, [tasks, filter, todayISO]);

  const doneTasks = React.useMemo(() => {
    return sortMiniTasks(filterMiniTasks(tasks, "done", todayISO), todayISO);
  }, [tasks, todayISO]);

  const openCount = tasks.filter((t) => t.status !== "done").length;

  const emptyLabels: Record<MiniTaskFilter, string> = {
    all: "No open tasks. Capture ad hoc actions here.",
    today: "Nothing due today.",
    upcoming: "No upcoming due dates.",
    done: "No completed tasks yet.",
  };

  return (
    <aside
      aria-label="Mini-tasks"
      className={cn(
        "flex min-h-0 w-[clamp(15rem,22vw,18rem)] shrink-0 flex-col overflow-hidden",
        "rounded-md border border-white/[0.08] bg-muted/10",
      )}
    >
      <div className="shrink-0 border-b border-white/[0.08] bg-background/95 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[11px] font-medium tracking-[0.08em] text-foreground/90 uppercase">Tasks</h2>
            <p className="text-[10px] text-muted-foreground/65">Short actions inside threads</p>
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground/80">{openCount}</span> open
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Task filters"
          className="mt-2 inline-flex rounded-md border border-white/[0.08] p-0.5"
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
                  "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <QuickAddMiniTask threads={activeThreads} busy={busy} onSubmit={onQuickAdd} />

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-1.5 py-2 scrollbar-y-hover">
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

        {doneTasks.length > 0 ?
          <div className="mt-3 border-t border-white/[0.06] pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDone((v) => !v)}
              className="h-7 w-full justify-start gap-1.5 px-2 text-[10px] text-muted-foreground"
            >
              {showDone ?
                <ChevronDown aria-hidden className="size-3" />
              : <ChevronRight aria-hidden className="size-3" />}
              Done
              <span className="tabular-nums text-muted-foreground/70">({doneTasks.length})</span>
            </Button>

            {showDone ?
              <div className="mt-1">
                <MiniTaskList
                  tasks={doneTasks}
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
                />
              </div>
            : null}
          </div>
        : null}
      </div>
    </aside>
  );
}
