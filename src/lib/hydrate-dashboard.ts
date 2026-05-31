import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryRow, DailyLogRow, DashboardPayload, MiniTaskRow, ThreadCanvasPlacement, ThreadRow, TodaySelectionRow } from "@/types/lume";
import { getFocusDayISO } from "@/lib/lume-day";
import { compareTimelineThreadOrder, showsOnTimeline } from "@/lib/thread-status";
import { canShowInDormantDock, compareDormantThreads, isOnCanvas, normalizeCanvasPlacement } from "@/lib/thread-placement";
import { fetchUserSettings, toDayBoundary } from "@/lib/user-settings";
import { getServerTimezone, getTodayISO } from "@/lib/today-server";

async function hydratePayload(
  supabase: SupabaseClient,
  dateTimezone: string,
  reference: Date,
): Promise<DashboardPayload> {
  const userSettings = await fetchUserSettings(supabase);
  const dayBoundary = toDayBoundary(userSettings);
  const calendarTodayISO = getTodayISO(dateTimezone, reference);
  const focusDayISO = getFocusDayISO(dateTimezone, dayBoundary, reference);

  const [catRes, threadRes, miniTaskRes] = await Promise.all([
    supabase.from("categories").select("*").order("name", { ascending: true }),
    supabase.from("threads").select("*").order("due_date", { ascending: true }),
    supabase.from("mini_tasks").select("*").order("created_at", { ascending: false }),
  ]);

  if (catRes.error) throw catRes.error;
  if (threadRes.error) throw threadRes.error;
  if (miniTaskRes.error) throw miniTaskRes.error;

  const categoriesRows = ((catRes.data as CategoryRow[] | null) ?? []).slice();

  const categoriesById = new Map<string, CategoryRow>(
    categoriesRows.map((c) => [c.id, c]),
  );

  const threadRows = (threadRes.data as ThreadRow[] | null) ?? [];

  const threadsById = new Map<string, ThreadRow>(
    threadRows.map((t) => [t.id, t]),
  );

  const miniTasks: MiniTaskRow[] = ((miniTaskRes.data as MiniTaskRow[] | null) ?? []).map(
    (task) => {
      const thread = threadsById.get(task.thread_id);
      return {
        ...task,
        thread: thread ?
          { id: thread.id, name: thread.name, color: thread.color }
        : null,
      };
    },
  );

  const hydrateThread = (t: ThreadRow): ThreadRow => ({
    ...t,
    canvas_placement: normalizeCanvasPlacement(
      (t as ThreadRow & { canvas_placement?: ThreadCanvasPlacement }).canvas_placement,
      t.status,
    ),
    category:
      t.category_id ? (categoriesById.get(t.category_id) ?? null) : null,
  });

  const allThreadsHydrated = threadRows
    .map(hydrateThread)
    .sort((a, b) => {
      if (a.due_date === b.due_date) return a.name.localeCompare(b.name);
      return a.due_date.localeCompare(b.due_date);
    });

  const timelineThreads = allThreadsHydrated
    .filter((t) => showsOnTimeline(t.status) && isOnCanvas(t))
    .sort(compareTimelineThreadOrder);

  const dormantThreads = allThreadsHydrated
    .filter((t) => canShowInDormantDock(t))
    .sort(compareDormantThreads);

  const timelineIds = [...new Set(timelineThreads.map((t) => t.id))];

  let todaySelections: TodaySelectionRow[] = [];

  let todayLogs: DailyLogRow[] = [];

  if (timelineIds.length > 0) {
    const [todaySelRes, logsRes] = await Promise.all([
      supabase
        .from("today_selections")
        .select("*")
        .eq("selected_date", focusDayISO)
        .eq("is_selected", true)
        .in("thread_id", timelineIds),
      supabase
        .from("daily_logs")
        .select("*")
        .eq("log_date", calendarTodayISO)
        .in("thread_id", timelineIds),
    ]);

    todaySelections =
      todaySelRes.error ? [] : ((todaySelRes.data as TodaySelectionRow[]) ?? []);

    todayLogs = logsRes.error ? [] : ((logsRes.data as DailyLogRow[]) ?? []);
  }

  return {
    categories: categoriesRows,
    timelineThreads,
    dormantThreads,
    allThreads: allThreadsHydrated,
    todaySelections,
    todayLogs,
    miniTasks,
    serverTodayISO: calendarTodayISO,
    serverFocusDayISO: focusDayISO,
    dateTimezone,
    userSettings,
  };
}

export async function hydrateDashboardPayload(
  supabase: SupabaseClient,
  dateTimezone?: string,
  reference: Date = new Date(),
): Promise<DashboardPayload> {
  const tz = dateTimezone ?? getServerTimezone();
  return hydratePayload(supabase, tz, reference);
}
