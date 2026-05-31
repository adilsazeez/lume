import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_DAY_BOUNDARY, normalizeTimeOfDay } from "@/lib/lume-day";
import type {
  DayBoundarySettings,
  PanelPosition,
  PanelPositionKey,
  PanelPositions,
  UserSettingsRow,
} from "@/types/lume";

/** Fixed id for the local-only singleton settings row. */
export const LOCAL_USER_SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

const PANEL_POSITION_KEYS: PanelPositionKey[] = ["mini_tasks", "dormant"];

function normalizePanelPosition(raw: unknown): PanelPosition | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as { x?: unknown; y?: unknown };
  if (
    typeof entry.x === "number" &&
    typeof entry.y === "number" &&
    Number.isFinite(entry.x) &&
    Number.isFinite(entry.y)
  ) {
    return { x: entry.x, y: entry.y };
  }
  return null;
}

export function normalizePanelPositions(raw: unknown): PanelPositions | null {
  if (!raw || typeof raw !== "object") return null;

  const result: PanelPositions = {};
  for (const key of PANEL_POSITION_KEYS) {
    const position = normalizePanelPosition((raw as Record<string, unknown>)[key]);
    if (position) result[key] = position;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function defaultUserSettingsRow(): UserSettingsRow {
  const now = new Date().toISOString();
  return {
    id: LOCAL_USER_SETTINGS_ID,
    day_start_time: DEFAULT_DAY_BOUNDARY.day_start_time,
    day_end_time: DEFAULT_DAY_BOUNDARY.day_end_time,
    panel_positions: null,
    created_at: now,
    updated_at: now,
  };
}

export function normalizeUserSettingsRow(raw: Record<string, unknown>): UserSettingsRow {
  return {
    id: String(raw.id ?? LOCAL_USER_SETTINGS_ID),
    day_start_time: normalizeTimeOfDay(String(raw.day_start_time ?? DEFAULT_DAY_BOUNDARY.day_start_time)),
    day_end_time: normalizeTimeOfDay(String(raw.day_end_time ?? DEFAULT_DAY_BOUNDARY.day_end_time)),
    panel_positions: normalizePanelPositions(raw.panel_positions),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function toDayBoundary(settings: UserSettingsRow): DayBoundarySettings {
  return {
    day_start_time: settings.day_start_time,
    day_end_time: settings.day_end_time,
  };
}

export async function fetchUserSettings(supabase: SupabaseClient): Promise<UserSettingsRow> {
  const { data, error } = await supabase.from("user_settings").select("*").limit(1).maybeSingle();

  if (error) {
    if (error.message.includes("user_settings") || error.code === "42P01") {
      return defaultUserSettingsRow();
    }
    throw error;
  }

  if (data) return normalizeUserSettingsRow(data as Record<string, unknown>);
  return defaultUserSettingsRow();
}

export function toPostgresTime(hhmm: string): string {
  return `${normalizeTimeOfDay(hhmm)}:00`;
}

function userSettingsUpsertBody(settings: UserSettingsRow) {
  return {
    id: settings.id,
    day_start_time: toPostgresTime(settings.day_start_time),
    day_end_time: toPostgresTime(settings.day_end_time),
    panel_positions: settings.panel_positions,
  };
}

export async function persistPanelPosition(
  supabase: SupabaseClient,
  settings: UserSettingsRow,
  key: PanelPositionKey,
  position: PanelPosition,
): Promise<UserSettingsRow> {
  const nextSettings: UserSettingsRow = {
    ...settings,
    panel_positions: {
      ...(settings.panel_positions ?? {}),
      [key]: position,
    },
  };

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(userSettingsUpsertBody(nextSettings), { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return normalizeUserSettingsRow(data as Record<string, unknown>);
}

export async function clearPanelPosition(
  supabase: SupabaseClient,
  settings: UserSettingsRow,
  key: PanelPositionKey,
): Promise<UserSettingsRow> {
  if (!settings.panel_positions?.[key]) return settings;

  const nextPositions = { ...settings.panel_positions };
  delete nextPositions[key];

  const nextSettings: UserSettingsRow = {
    ...settings,
    panel_positions: Object.keys(nextPositions).length > 0 ? nextPositions : null,
  };

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(userSettingsUpsertBody(nextSettings), { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return normalizeUserSettingsRow(data as Record<string, unknown>);
}
