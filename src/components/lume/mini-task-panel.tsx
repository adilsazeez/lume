"use client";

import * as React from "react";

import type { MiniTaskFilter, MiniTaskPriority, MiniTaskRow, MiniTaskStatus, ThreadRow } from "@/types/lume";

import { MiniTaskList } from "@/components/lume/mini-task-list";
import { QuickAddMiniTask } from "@/components/lume/quick-add-mini-task";

import { filterMiniTasks, sortMiniTasks } from "@/lib/mini-tasks";
import { WORKFLOW_COPY } from "@/lib/lume-workflow";
import { isOnCanvas } from "@/lib/thread-placement";
import { cn } from "@/lib/utils";

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

  const openCount = tasks.filter((t) => t.status !== "done").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const isCompletedTab = filter === "done";

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
        "rounded-md border border-lume-border-strong bg-lume-panel",
      )}
    >
      <div className="shrink-0 border-b border-lume-border-strong bg-lume-panel/95 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[11px] font-medium tracking-[0.08em] text-foreground uppercase">Mini-tasks</h2>
            <p className="mt-0.5 text-[10px] leading-snug text-lume-text-muted">{WORKFLOW_COPY.miniTasks.hint}</p>
          </div>
          <span className="text-[10px] tabular-nums text-lume-text-secondary">
            {isCompletedTab ?
              <>
                <span className="font-medium text-foreground">{doneCount}</span> completed
              </>
            : <>
                <span className="font-medium text-foreground">{openCount}</span> open
              </>
            }
          </span>
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
      </div>
    </aside>
  );
}
