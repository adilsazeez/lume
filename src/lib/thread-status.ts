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
