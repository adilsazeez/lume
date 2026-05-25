"use client";

import type { MiniTaskPriority, MiniTaskRow, MiniTaskStatus } from "@/types/lume";

import { MiniTaskItem } from "@/components/lume/mini-task-item";

export function MiniTaskList({
  tasks,
  todayISO,
  busy,
  expandedTaskId,
  onExpandTask,
  onStatusChange,
  onTitleChange,
  onNoteChange,
  onDueDateChange,
  onPriorityChange,
  onDelete,
  emptyLabel = "No tasks here.",
}: {
  tasks: MiniTaskRow[];
  todayISO: string;
  busy?: boolean;
  expandedTaskId: string | null;
  onExpandTask: (taskId: string | null) => void;
  onStatusChange: (taskId: string, status: MiniTaskStatus) => void;
  onTitleChange?: (taskId: string, title: string) => void;
  onNoteChange?: (taskId: string, note: string | null) => void;
  onDueDateChange?: (taskId: string, dueDate: string | null) => void;
  onPriorityChange?: (taskId: string, priority: MiniTaskPriority | null) => void;
  onDelete?: (taskId: string) => void;
  emptyLabel?: string;
}) {
  if (tasks.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-muted-foreground/55">{emptyLabel}</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {tasks.map((task) => (
        <MiniTaskItem
          key={task.id}
          task={task}
          todayISO={todayISO}
          busy={busy}
          isExpanded={expandedTaskId === task.id}
          onExpand={onExpandTask}
          onStatusChange={onStatusChange}
          onTitleChange={onTitleChange}
          onNoteChange={onNoteChange}
          onDueDateChange={onDueDateChange}
          onPriorityChange={onPriorityChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
