import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_DAY_BOUNDARY, normalizeTimeOfDay } from "@/lib/lume-day";
import type { DayBoundarySettings, UserSettingsRow } from "@/types/lume";

/** Fixed id for the local-only singleton settings row. */
export const LOCAL_USER_SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

export function defaultUserSettingsRow(): UserSettingsRow {
  const now = new Date().toISOString();
  return {
    id: LOCAL_USER_SETTINGS_ID,
    day_start_time: DEFAULT_DAY_BOUNDARY.day_start_time,
    day_end_time: DEFAULT_DAY_BOUNDARY.day_end_time,
    created_at: now,
    updated_at: now,
  };
}

export function normalizeUserSettingsRow(raw: Record<string, unknown>): UserSettingsRow {
  return {
    id: String(raw.id ?? LOCAL_USER_SETTINGS_ID),
    day_start_time: normalizeTimeOfDay(String(raw.day_start_time ?? DEFAULT_DAY_BOUNDARY.day_start_time)),
    day_end_time: normalizeTimeOfDay(String(raw.day_end_time ?? DEFAULT_DAY_BOUNDARY.day_end_time)),
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
