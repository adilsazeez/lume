import type { ThreadCanvasPlacement, ThreadRow, ThreadStatus } from "@/types/lume";
import { compareTimelineThreadOrder, isNotStartedStatus, showsOnTimeline } from "@/lib/thread-status";

export const THREAD_DRAG_MIME = "application/x-lume-thread-id";

export function defaultCanvasPlacement(status: ThreadStatus): ThreadCanvasPlacement {
  return isNotStartedStatus(status) ? "dormant" : "active";
}

export function normalizeCanvasPlacement(
  placement: ThreadCanvasPlacement | null | undefined,
  status: ThreadStatus,
): ThreadCanvasPlacement {
  if (placement === "active" || placement === "dormant") return placement;
  return defaultCanvasPlacement(status);
}

export function isOnCanvas(thread: Pick<ThreadRow, "canvas_placement" | "status">): boolean {
  return normalizeCanvasPlacement(thread.canvas_placement, thread.status) === "active";
}

export function isDormantThread(thread: Pick<ThreadRow, "canvas_placement" | "status">): boolean {
  return normalizeCanvasPlacement(thread.canvas_placement, thread.status) === "dormant";
}

export function canShowInDormantDock(thread: Pick<ThreadRow, "canvas_placement" | "status">): boolean {
  if (thread.status === "completed" || thread.status === "archived") return false;
  return isDormantThread(thread);
}

export function compareDormantThreads(
  a: Pick<ThreadRow, "name" | "updated_at" | "status">,
  b: Pick<ThreadRow, "name" | "updated_at" | "status">,
): number {
  const aNew = isNotStartedStatus(a.status);
  const bNew = isNotStartedStatus(b.status);
  if (aNew !== bNew) return aNew ? -1 : 1;
  const byUpdate = b.updated_at.localeCompare(a.updated_at);
  if (byUpdate !== 0) return byUpdate;
  return a.name.localeCompare(b.name);
}

export function readThreadIdFromDragEvent(event: React.DragEvent): string | null {
  const fromCustom = event.dataTransfer.getData(THREAD_DRAG_MIME);
  if (fromCustom) return fromCustom;
  const plain = event.dataTransfer.getData("text/plain");
  return plain || null;
}

export function splitThreadLists(all: ThreadRow[]): {
  timelineThreads: ThreadRow[];
  dormantThreads: ThreadRow[];
} {
  const timelineThreads = all
    .filter((t) => showsOnTimeline(t.status) && isOnCanvas(t))
    .sort(compareTimelineThreadOrder);

  const dormantThreads = all.filter((t) => canShowInDormantDock(t)).sort(compareDormantThreads);

  return { timelineThreads, dormantThreads };
}
