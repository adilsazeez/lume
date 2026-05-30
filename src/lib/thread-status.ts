import type { ThreadStatus } from "@/types/lume";

export const THREAD_STATUS_OPTIONS: ThreadStatus[] = [
  "not_started",
  "active",
  "paused",
  "completed",
  "archived",
];

const LABELS: Record<ThreadStatus, string> = {
  not_started: "Not started",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

/** Threads visible on the timeline and eligible for today focus / mini-tasks. */
export const TIMELINE_THREAD_STATUSES: ThreadStatus[] = ["not_started", "active", "paused"];

export function threadStatusLabel(status: ThreadStatus): string {
  return LABELS[status];
}

export function showsOnTimeline(status: ThreadStatus): boolean {
  return TIMELINE_THREAD_STATUSES.includes(status);
}

export function isNotStartedStatus(status: ThreadStatus): boolean {
  return status === "not_started";
}

export function placeholderThreadDates(todayISO: string): {
  start_date: string;
  due_date: string;
} {
  return { start_date: todayISO, due_date: todayISO };
}

/** Active/paused threads on canvas, sorted by due date. */
export function compareTimelineThreadOrder(
  a: { due_date: string; name: string },
  b: { due_date: string; name: string },
): number {
  if (a.due_date === b.due_date) return a.name.localeCompare(b.name);
  return a.due_date.localeCompare(b.due_date);
}
