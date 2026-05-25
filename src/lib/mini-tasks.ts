import { diffUtcIsoDays, urgencyForDueDate, type Urgency } from "@/lib/timeline";
import type { MiniTaskFilter, MiniTaskRow, MiniTaskStatus } from "@/types/lume";

export function nextMiniTaskStatus(current: MiniTaskStatus): MiniTaskStatus {
  if (current === "open") return "in_progress";
  if (current === "in_progress") return "done";
  return "open";
}

export function miniTaskStatusLabel(status: MiniTaskStatus) {
  if (status === "open") return "Open";
  if (status === "in_progress") return "In progress";
  return "Done";
}

export function miniTaskDueUrgency(
  dueDate: string | null | undefined,
  todayISO: string,
): Urgency {
  if (!dueDate) return "silent";
  return urgencyForDueDate(dueDate, todayISO);
}

function isActionableToday(task: MiniTaskRow, todayISO: string) {
  if (task.status === "done") return false;
  if (!task.due_date) return false;
  return diffUtcIsoDays(task.due_date, todayISO) <= 0;
}

function isUpcoming(task: MiniTaskRow, todayISO: string) {
  if (task.status === "done") return false;
  if (!task.due_date) return false;
  return diffUtcIsoDays(task.due_date, todayISO) > 0;
}

export function filterMiniTasks(
  tasks: MiniTaskRow[],
  filter: MiniTaskFilter,
  todayISO: string,
): MiniTaskRow[] {
  switch (filter) {
    case "done":
      return tasks.filter((t) => t.status === "done");
    case "today":
      return tasks.filter((t) => isActionableToday(t, todayISO));
    case "upcoming":
      return tasks.filter((t) => isUpcoming(t, todayISO));
    default:
      return tasks.filter((t) => t.status !== "done");
  }
}

export function sortMiniTasks(tasks: MiniTaskRow[], todayISO: string): MiniTaskRow[] {
  const urgencyRank: Record<Urgency, number> = { hot: 0, soon: 1, silent: 2 };

  return tasks.slice().sort((a, b) => {
    const au = miniTaskDueUrgency(a.due_date, todayISO);
    const bu = miniTaskDueUrgency(b.due_date, todayISO);
    if (urgencyRank[au] !== urgencyRank[bu]) return urgencyRank[au] - urgencyRank[bu];

    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }
    if (a.due_date && !b.due_date) return -1;
    if (!a.due_date && b.due_date) return 1;

    return b.created_at.localeCompare(a.created_at);
  });
}

export function formatMiniTaskDueLabel(dueDate: string | null, todayISO: string) {
  if (!dueDate) return null;

  const delta = diffUtcIsoDays(dueDate, todayISO);
  if (delta < 0) return `${Math.abs(delta)}d overdue`;
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta <= 7) return `${delta}d`;
  return dueDate.slice(5).replace("-", "/");
}

export const MINI_TASK_DUE_PRESETS = [
  { key: "none", label: "No due date", days: null },
  { key: "today", label: "Today", days: 0 },
  { key: "tomorrow", label: "Tomorrow", days: 1 },
  { key: "3d", label: "In 3 days", days: 3 },
  { key: "week", label: "In 1 week", days: 7 },
] as const;

export const MINI_TASK_DUE_EDIT_PRESETS = MINI_TASK_DUE_PRESETS.filter((p) => p.days !== null);
