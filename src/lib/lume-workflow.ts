import type { TimelineThreadView } from "@/components/lume/thread-timeline";

export const WORKFLOW_INTRO_STORAGE_KEY = "lume:workflow-intro-dismissed-v1";

export const WORKFLOW_COPY = {
  active: {
    label: "Active",
    hint: "Threads alive in your life — on this canvas.",
  },
  focus: {
    label: "Focus",
    hint: "The subset you choose to work on today.",
  },
  next: {
    label: "Next",
    hint: "Still active, but not today's focus — pick up when ready.",
  },
  dormant: {
    label: "Dormant",
    hint: "Not on the canvas yet — drag or Start when you're ready.",
  },
  miniTasks: {
    label: "Mini-tasks",
    hint: "Small steps attached to a thread — not on the canvas.",
  },
} as const;

export type CanvasLaneItem =
  | { kind: "section"; id: string; label: string; hint: string }
  | { kind: "thread"; view: TimelineThreadView };

export const CANVAS_SECTION_PITCH = 26;

export function buildCanvasLanes(
  views: TimelineThreadView[],
  focusViewOn: boolean,
  focusCount: number,
): CanvasLaneItem[] {
  if (views.length === 0) return [];

  const focus = views.filter((v) => v.isSelectedToday);
  const next = views.filter((v) => !v.isSelectedToday);

  const items: CanvasLaneItem[] = [];

  if (focusViewOn && focusCount > 0) {
    if (focus.length > 0) {
      items.push({
        kind: "section",
        id: "focus",
        label: WORKFLOW_COPY.focus.label,
        hint: WORKFLOW_COPY.focus.hint,
      });
      focus.forEach((view) => items.push({ kind: "thread", view }));
    }

    if (next.length > 0) {
      items.push({
        kind: "section",
        id: "next",
        label: WORKFLOW_COPY.next.label,
        hint: WORKFLOW_COPY.next.hint,
      });
      next.forEach((view) => items.push({ kind: "thread", view }));
    }
  } else if (views.length > 0) {
    items.push({
      kind: "section",
      id: "active",
      label: WORKFLOW_COPY.active.label,
      hint: WORKFLOW_COPY.active.hint,
    });
    views.forEach((view) => items.push({ kind: "thread", view }));
  }

  if (items.length === 0) {
    views.forEach((view) => items.push({ kind: "thread", view }));
  }

  return items;
}

export function layoutCanvasLanes(items: CanvasLaneItem[]): {
  item: CanvasLaneItem;
  top: number;
  height: number;
}[] {
  let y = 8;
  const laidOut: { item: CanvasLaneItem; top: number; height: number }[] = [];

  for (const item of items) {
    if (item.kind === "section") {
      laidOut.push({ item, top: y, height: CANVAS_SECTION_PITCH - 6 });
      y += CANVAS_SECTION_PITCH;
    } else {
      laidOut.push({ item, top: y, height: 72 - 4 });
      y += 72;
    }
  }

  return laidOut;
}
