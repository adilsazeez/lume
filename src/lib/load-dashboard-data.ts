import { createServerSupabase } from "@/lib/supabase/server";
import { getServerTimezone } from "@/lib/today-server";
import type { DashboardPayload } from "@/types/lume";

import { hydrateDashboardPayload } from "@/lib/hydrate-dashboard";

export async function loadDashboardData(): Promise<DashboardPayload | null> {
  try {
    const supabase = createServerSupabase();
    const dateTimezone = getServerTimezone();
    return await hydrateDashboardPayload(supabase, dateTimezone);
  } catch {
    return null;
  }
}
