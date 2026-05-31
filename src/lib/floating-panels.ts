/** Fixed width/height for floating canvas panels (20rem × 20rem). */
export const FLOATING_PANEL_WIDTH_PX = 320;
export const FLOATING_PANEL_HEIGHT_PX = 320;

export const FLOATING_PANEL_SIZE_CLASS = "h-80 w-80";

export const FLOATING_PANEL_GAP_PX = 12;

/** Space to reserve right of Dormant so Mini-tasks can sit flush on the right edge. */
export const FLOATING_PANEL_MINI_TASKS_RESERVE_PX = FLOATING_PANEL_WIDTH_PX + FLOATING_PANEL_GAP_PX;

/** CSS `right` offset for Dormant before JS positioning (mini-tasks width + gap). */
export const FLOATING_PANEL_DORMANT_FALLBACK_RIGHT_CLASS = "right-[calc(20rem+1.5rem)]";
