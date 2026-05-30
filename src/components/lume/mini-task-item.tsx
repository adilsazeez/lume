"use client";

import * as React from "react";
import { Circle, CircleDot, CheckCircle2, Trash2, X } from "lucide-react";

import type { MiniTaskPriority, MiniTaskRow, MiniTaskStatus } from "@/types/lume";

import { MiniTaskDuePicker } from "@/components/lume/mini-task-due-picker";
import { EllipsisText } from "@/components/lume/ellipsis-text";
import { formatMiniTaskDueLabel, miniTaskStatusLabel, nextMiniTaskStatus } from "@/lib/mini-tasks";
import { cn } from "@/lib/utils";

function StatusIcon({ status }: { status: MiniTaskStatus }) {
  if (status === "done") {
    return <CheckCircle2 aria-hidden className="size-3.5 text-muted-foreground/50" />;
  }
  if (status === "in_progress") {
    return <CircleDot aria-hidden className="size-3.5 text-lume-accent" />;
  }
  return <Circle aria-hidden className="size-3.5 text-muted-foreground/55" />;
}

const prioritySelectClass =
  "h-6 max-w-[5.5rem] rounded border border-lume-border bg-lume-surface px-1.5 text-[10px] text-lume-text-secondary outline-none focus-visible:ring-1 focus-visible:ring-lume-focus";

export function MiniTaskItem({
  task,
  todayISO,
  busy,
  isExpanded,
  onExpand,
  onStatusChange,
  onTitleChange,
  onNoteChange,
  onDueDateChange,
  onPriorityChange,
  onDelete,
  hideThreadLabel = false,
}: {
  task: MiniTaskRow;
  todayISO: string;
  busy?: boolean;
  isExpanded: boolean;
  onExpand: (taskId: string | null) => void;
  onStatusChange: (taskId: string, status: MiniTaskStatus) => void;
  onTitleChange?: (taskId: string, title: string) => void;
  onNoteChange?: (taskId: string, note: string | null) => void;
  onDueDateChange?: (taskId: string, dueDate: string | null) => void;
  onPriorityChange?: (taskId: string, priority: MiniTaskPriority | null) => void;
  onDelete?: (taskId: string) => void;
  hideThreadLabel?: boolean;
}) {
  const titleRef = React.useRef<HTMLInputElement>(null);
  const noteRef = React.useRef<HTMLTextAreaElement>(null);

  const [titleDraft, setTitleDraft] = React.useState(task.title);
  const [noteDraft, setNoteDraft] = React.useState(task.note ?? "");

  React.useEffect(() => {
    setTitleDraft(task.title);
  }, [task.title]);

  React.useEffect(() => {
    setNoteDraft(task.note ?? "");
  }, [task.note]);

  React.useEffect(() => {
    if (!isExpanded) return;
    window.requestAnimationFrame(() => {
      titleRef.current?.focus();
      const len = titleRef.current?.value.length ?? 0;
      titleRef.current?.setSelectionRange(len, len);
    });
  }, [isExpanded]);

  const isDone = task.status === "done";
  const threadName = task.thread?.name ?? "Unknown thread";
  const threadColor = task.thread?.color ?? "#5c6f86";
  const dueLabel = formatMiniTaskDueLabel(task.due_date, todayISO);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(task.title);
      return;
    }
    if (trimmed !== task.title) onTitleChange?.(task.id, trimmed);
  };

  const commitNote = () => {
    const trimmed = noteDraft.trim();
    const next = trimmed || null;
    const prev = task.note?.trim() || null;
    if (next !== prev) onNoteChange?.(task.id, next);
  };

  const handleRowClick = () => {
    if (isExpanded) return;
    onExpand(task.id);
  };

  const closeExpanded = (save = true) => {
    if (save) {
      commitTitle();
      commitNote();
    }
    onExpand(null);
  };

  return (
    <article
      data-expanded={isExpanded ? "true" : undefined}
      className={cn(
        "rounded-lg border transition-colors",
        isExpanded ?
          "border-lume-border-strong bg-lume-hover shadow-[inset_0_1px_0_var(--lume-border)]"
        : "border-transparent hover:border-lume-border hover:bg-lume-hover/60",
        isDone && !isExpanded && "opacity-45",
        isDone && isExpanded && "opacity-80",
      )}
    >
      <div className="flex items-start gap-2 px-2 py-2">
        <button
          type="button"
          disabled={busy}
          aria-label={`${miniTaskStatusLabel(task.status)} — ${task.title}. Click to advance status.`}
          title={miniTaskStatusLabel(task.status)}
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(task.id, nextMiniTaskStatus(task.status));
          }}
          className={cn(
            "mt-0.5 shrink-0 rounded p-0.5 outline-none",
            "hover:bg-lume-hover focus-visible:ring-1 focus-visible:ring-lume-focus",
          )}
        >
          <StatusIcon status={task.status} />
        </button>

        <div className="min-w-0 flex-1">
          {isExpanded ?
            <div className="relative space-y-2 pr-7" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={busy}
                aria-label="Done editing"
                title="Done"
                onClick={() => closeExpanded(true)}
                className={cn(
                  "absolute top-0 right-0 rounded p-0.5 text-muted-foreground/60 outline-none",
                  "hover:bg-lume-hover hover:text-foreground",
                  "focus-visible:ring-1 focus-visible:ring-lume-focus",
                )}
              >
                <X aria-hidden className="size-3.5" />
              </button>

              <input
                ref={titleRef}
                disabled={busy}
                value={titleDraft}
                placeholder="Task title"
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                    noteRef.current?.focus();
                  }
                  if (e.key === "Escape") {
                    setTitleDraft(task.title);
                    setNoteDraft(task.note ?? "");
                    closeExpanded(false);
                  }
                }}
                className={cn(
                  "w-full bg-transparent text-[13px] leading-snug text-foreground outline-none",
                  "placeholder:text-muted-foreground/40",
                  isDone && "text-muted-foreground line-through",
                )}
              />

              <textarea
                ref={noteRef}
                disabled={busy}
                value={noteDraft}
                rows={2}
                placeholder="Notes"
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={commitNote}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNoteDraft(task.note ?? "");
                    closeExpanded(false);
                  }
                }}
                className={cn(
                  "w-full resize-none bg-transparent text-[11px] leading-relaxed text-muted-foreground outline-none",
                  "placeholder:text-muted-foreground/35",
                )}
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <MiniTaskDuePicker
                  dueDate={task.due_date}
                  todayISO={todayISO}
                  disabled={busy}
                  isDone={false}
                  onChange={(dueDate) => onDueDateChange?.(task.id, dueDate)}
                />

                <select
                  disabled={busy}
                  aria-label="Priority"
                  value={task.priority ?? "none"}
                  onChange={(e) => {
                    const v = e.target.value;
                    onPriorityChange?.(task.id, v === "none" ? null : (v as MiniTaskPriority));
                  }}
                  className={prioritySelectClass}
                >
                  <option value="none">Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div
                className={cn(
                  "flex min-w-0 items-center gap-2 pt-0.5",
                  hideThreadLabel ? "justify-end" : "justify-between",
                )}
              >
                {!hideThreadLabel ?
                  <div className="flex min-w-0 items-center gap-1">
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: threadColor, opacity: 0.85 }}
                    />
                    <EllipsisText text={threadName} lines={2} className="min-w-0 text-[10px] text-muted-foreground/65" />
                  </div>
                : null}

                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Delete ${task.title}`}
                  title="Delete task"
                  onClick={() => {
                    if (window.confirm(`Delete "${task.title}"?`)) onDelete?.(task.id);
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-rose-300/75 outline-none",
                    "hover:bg-rose-500/10 hover:text-rose-300",
                    "focus-visible:ring-1 focus-visible:ring-rose-400/40",
                  )}
                >
                  <Trash2 aria-hidden className="size-3" />
                  Delete
                </button>
              </div>
            </div>
          : (
            <button
              type="button"
              disabled={busy}
              onClick={handleRowClick}
              className="block w-full text-left outline-none focus-visible:ring-1 focus-visible:ring-lume-focus rounded-sm"
            >
              <p
                className={cn(
                  "text-[12px] leading-snug",
                  isDone ? "text-muted-foreground line-through" : "text-foreground/90",
                )}
              >
                {task.title}
              </p>

              {task.note ?
                <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-muted-foreground/55">{task.note}</p>
              : null}

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {!hideThreadLabel ?
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: threadColor, opacity: isDone ? 0.4 : 0.85 }}
                    />
                    <EllipsisText text={threadName} lines={2} className="min-w-0 text-[10px] text-muted-foreground/75" />
                  </span>
                : null}

                {dueLabel ?
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">{dueLabel}</span>
                : null}

                {task.priority === "high" && !isDone ?
                  <span className="text-[9px] font-medium uppercase tracking-wide text-rose-300/75">High</span>
                : null}
              </div>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
