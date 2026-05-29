/**
 * Lume dark-theme semantic tokens (defined in globals.css `.dark`).
 * Use Tailwind utilities: bg-lume-canvas, border-lume-border, text-lume-accent, etc.
 */
export const lumeThemeTokens = {
  app: "--lume-app",
  canvas: "--lume-canvas",
  canvasBar: "--lume-canvas-bar",
  canvasLabel: "--lume-canvas-label",
  panel: "--lume-panel",
  surface: "--lume-surface",
  surfaceElevated: "--lume-surface-elevated",
  hover: "--lume-hover",
  border: "--lume-border",
  borderStrong: "--lume-border-strong",
  grid: "--lume-grid",
  gridStrong: "--lume-grid-strong",
  textSecondary: "--lume-text-secondary",
  textMuted: "--lume-text-muted",
  accent: "--lume-accent",
  accentSoft: "--lume-accent-soft",
  today: "--lume-today",
  todayBg: "--lume-today-bg",
  todayLine: "--lume-today-line",
  selection: "--lume-selection",
  focus: "--lume-focus",
  overlay: "--lume-overlay",
} as const;
