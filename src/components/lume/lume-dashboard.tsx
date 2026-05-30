"use client";

import * as React from "react";
import { format } from "date-fns";
import { Plus, Settings } from "lucide-react";

import type { DashboardPayload, DailyLogRow, MiniTaskPriority, MiniTaskRow, MiniTaskStatus, ThreadCanvasPlacement, ThreadRow, ThreadStatus } from "@/types/lume";

import { Button } from "@/components/ui/button";
import { CategoryManagerDialog } from "@/components/lume/category-manager-dialog";
import { CreateMiniTaskDialog, type CreateMiniTaskPayload } from "@/components/lume/create-mini-task-dialog";
import { DormantThreadsDock } from "@/components/lume/dormant-threads-dock";
import { DroppableCanvasZone } from "@/components/lume/droppable-canvas-zone";
import { LumeTopRail } from "@/components/lume/lume-top-rail";
import { LumeWorkflowIntro } from "@/components/lume/lume-workflow-intro";
import { MiniTaskPanel } from "@/components/lume/mini-task-panel";
import { PlacementToast } from "@/components/lume/placement-toast";
import { SettingsDialog } from "@/components/lume/settings-dialog";
import { ThreadDetailSheet } from "@/components/lume/thread-detail-sheet";
import { ThreadFormDialog } from "@/components/lume/thread-form-dialog";
import { TimelineCanvas } from "@/components/lume/timeline-canvas";
import type { TimelineThreadView } from "@/components/lume/thread-timeline";

import { hydrateDashboardPayload } from "@/lib/hydrate-dashboard";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { defaultCanvasPlacement, isOnCanvas, splitThreadLists } from "@/lib/thread-placement";
import { isNotStartedStatus, placeholderThreadDates } from "@/lib/thread-status";
import { isoCalendarAdd } from "@/lib/timeline";
import { getLumeDayISO } from "@/lib/lume-day";
import { LOCAL_USER_SETTINGS_ID, toDayBoundary, toPostgresTime } from "@/lib/user-settings";

import { ThreadDragProvider } from "@/hooks/use-thread-drag-state";
import { useDayRolloverRefresh } from "@/hooks/use-day-rollover-refresh";
import { useTodayFocusStore } from "@/stores/lume-store";

type PlacementUndo = {
  threadId: string;
  snapshot: {
    canvas_placement: ThreadCanvasPlacement;
    status: ThreadStatus;
    start_date: string;
    due_date: string;
  };
  hadTodaySelection: boolean;
};

function utcMiddayDate(iso: string) {
  return new Date(`${iso.split("T")[0]}T12:00:00.000Z`);
}
function MissingEnv() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="max-w-xl space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Configure Supabase</h1>
        <p className="text-sm text-muted-foreground">
          Copy <code>.env.example</code> to <code>.env.local</code>, add your Supabase URL and anon key,
          and execute <code>supabase/schema.sql</code>.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={() => window.location.reload()}>
        Reload
      </Button>
    </main>
  );
}

export function LumeDashboard(props: { initial: DashboardPayload | null }) {
  if (!props.initial) return <MissingEnv />;
  return (
    <ThreadDragProvider>
      <DashboardBody initial={props.initial} />
    </ThreadDragProvider>
  );
}

function DashboardBody({ initial }: { initial: DashboardPayload }) {
  const isoRef = React.useRef(initial.serverTodayISO);

  const [dash, setDash] = React.useState(initial);
  const [syncing, setSyncing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [threadFormOpen, setThreadFormOpen] = React.useState(false);
  const [editingThread, setEditingThread] = React.useState<ThreadRow | null>(null);
  const [composerNonce, setComposerNonce] = React.useState(0);

  const [catsOpen, setCatsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailDraft, setDetailDraft] = React.useState("");
  const [detailLogs, setDetailLogs] = React.useState<DailyLogRow[]>([]);

  const [miniTaskFormOpen, setMiniTaskFormOpen] = React.useState(false);
  const [miniTaskPresetThreadId, setMiniTaskPresetThreadId] = React.useState<string | null>(null);
  const [miniTaskFormNonce, setMiniTaskFormNonce] = React.useState(0);

  const [placementToast, setPlacementToast] = React.useState<{
    message: string;
    undo: PlacementUndo | null;
  } | null>(null);
  const placementUndoRef = React.useRef<PlacementUndo | null>(null);

  React.useEffect(() => {
    if (!placementToast) return;
    const timer = window.setTimeout(() => setPlacementToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [placementToast]);

  React.useEffect(() => {
    isoRef.current = dash.serverTodayISO;
  }, [dash.serverTodayISO]);

  const todayFocusActive = useTodayFocusStore((s) => s.todayFocusActive);

  const selectedToday = React.useMemo(
    () =>
      new Set<string>(dash.todaySelections.filter((row) => row.is_selected === true).map((row) => row.thread_id)),
    [dash.todaySelections],
  );
  const selectionCount = selectedToday.size;

  const dayBoundary = React.useMemo(
    () => toDayBoundary(dash.userSettings),
    [dash.userSettings],
  );

  const resolveLumeDayISO = React.useCallback(
    () => getLumeDayISO(dash.dateTimezone, dayBoundary),
    [dash.dateTimezone, dayBoundary],
  );

  const todayCue = React.useMemo(() => format(utcMiddayDate(dash.serverTodayISO), "EEE MMM d"), [dash.serverTodayISO]);
  const timelineOrder = React.useMemo(
    () => new Map<string, number>(dash.timelineThreads.map((t, idx) => [t.id, idx])),
    [dash.timelineThreads],
  );

  const activeThreadCount = dash.timelineThreads.length;

  const patchThreadsLocal = React.useCallback((threadId: string, patch: Partial<ThreadRow>) => {
    setDash((prev) => {
      const all = (prev.allThreads ?? prev.timelineThreads).map((t) =>
        t.id === threadId ? { ...t, ...patch } : t,
      );
      const { timelineThreads, dormantThreads } = splitThreadLists(all);
      return { ...prev, allThreads: all, timelineThreads, dormantThreads };
    });
  }, []);

  const threadViews = React.useMemo(() => {
    const views = dash.timelineThreads.map((thread: ThreadRow): TimelineThreadView => {
      const dim =
        todayFocusActive &&
        selectionCount > 0 &&
        !selectedToday.has(thread.id);

      return {
        thread,
        dimmed: Boolean(dim),
        glow: Boolean(!dim),
        isSelectedToday: selectedToday.has(thread.id),
        onOpen: () => {
          const noteSeed = dash.todayLogs.find((l) => l.thread_id === thread.id)?.note ?? "";
          setDetailDraft(noteSeed);
          setDetailId(thread.id);
        },
      };
    });

    const pinToday = todayFocusActive && selectionCount > 0;

    return views.slice().sort((u, v) => {
      if (pinToday) {
        const uSel = selectedToday.has(u.thread.id);
        const vSel = selectedToday.has(v.thread.id);
        if (uSel !== vSel) return uSel ? -1 : 1;
      }

      const iu = timelineOrder.get(u.thread.id) ?? 0;
      const iv = timelineOrder.get(v.thread.id) ?? 0;
      return iu - iv;
    });
  }, [
    dash.timelineThreads,
    dash.todayLogs,
    todayFocusActive,
    selectionCount,
    selectedToday,
    timelineOrder,
  ]);

  const detailRecord = dash.allThreads?.find((t) => t.id === detailId) ?? null;

  const openThreadDetail = React.useCallback(
    (threadId: string) => {
      const thread = dash.allThreads?.find((t) => t.id === threadId);
      if (!thread) return;
      const noteSeed = dash.todayLogs.find((l) => l.thread_id === threadId)?.note ?? "";
      setDetailDraft(noteSeed);
      setDetailId(threadId);
    },
    [dash.allThreads, dash.todayLogs],
  );

  const loadDetailLogs = React.useCallback(async (threadId: string) => {
    try {
      const sb = createBrowserSupabase();
      const { data, error } = await sb
        .from("daily_logs")
        .select("*")
        .eq("thread_id", threadId)
        .order("log_date", { ascending: false });

      if (error) throw error;
      setDetailLogs((data as DailyLogRow[]) ?? []);
    } catch {
      setDetailLogs([]);
    }
  }, []);

  React.useEffect(() => {
    if (!detailId) {
      setDetailLogs([]);
      return;
    }
    void loadDetailLogs(detailId);
  }, [detailId, loadDetailLogs]);

  const reload = React.useCallback(async () => {
    setSyncing(true);

    try {
      const sb = createBrowserSupabase();
      const next = await hydrateDashboardPayload(sb, dash.dateTimezone);
      isoRef.current = next.serverTodayISO;
      setDash(next);
    } catch {
      /* ignore */
    } finally {
      setSyncing(false);
    }
  }, [dash.dateTimezone]);

  useDayRolloverRefresh({
    dateTimezone: dash.dateTimezone,
    dayBoundary,
    activeTodayISO: dash.serverTodayISO,
    onRollover: reload,
  });

  const saveThread = async (payload: {
    id?: string;
    name: string;
    description: string | null;
    category_id: string | null;
    color: string;
    start_date: string;
    due_date: string;
    status: ThreadStatus;
  }) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const todayISO = dash.serverTodayISO || resolveLumeDayISO();
      const body: {
        name: string;
        description: string;
        category_id: string | null;
        color: string;
        status: ThreadStatus;
        canvas_placement: ThreadCanvasPlacement;
        start_date?: string;
        due_date?: string;
      } = {
        name: payload.name,
        description: payload.description ?? "",
        category_id: payload.category_id,
        color: payload.color,
        status: payload.status,
        canvas_placement: defaultCanvasPlacement(payload.status),
      };

      if (!payload.id) {
        const dates = isNotStartedStatus(payload.status)
          ? placeholderThreadDates(todayISO)
          : { start_date: payload.start_date, due_date: payload.due_date };

        if (!dates.start_date || !dates.due_date) {
          throw new Error("Start and due dates are required for this thread.");
        }

        body.start_date = dates.start_date;
        body.due_date = dates.due_date;
      } else if (!isNotStartedStatus(payload.status)) {
        body.start_date = payload.start_date;
        body.due_date = payload.due_date;
      }

      if (payload.id) {
        const { error } = await sb.from("threads").update(body).eq("id", payload.id);

        if (error) throw error;
      } else {
        const { error } = await sb.from("threads").insert(body);

        if (error) throw error;
      }

      await reload();
    } catch (err) {
      let message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not save this thread.";

      if (message.includes("threads_status_check")) {
        message =
          "Your database still needs the not_started status migration. In the Supabase SQL editor, run supabase/migrations/002_thread_not_started_status.sql, then try again.";
      }

      if (message.includes("canvas_placement")) {
        message =
          "Your database needs the canvas placement migration. Run supabase/migrations/004_thread_canvas_placement.sql in the Supabase SQL editor.";
      }

      throw new Error(message);
    } finally {
      setBusy(false);
    }
  };

  const deleteThread = async (threadId: string) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { error } = await sb.from("threads").delete().eq("id", threadId);

      if (error) throw error;

      setDetailId(null);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const toggleToday = async (threadId: string, nextFlag: boolean) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const iso = dash.serverTodayISO;

      if (nextFlag) {
        const { error } = await sb.from("today_selections").upsert(
          { thread_id: threadId, selected_date: iso, is_selected: true },
          { onConflict: "thread_id,selected_date" },
        );

        if (error) throw error;
      } else {
        const { error } = await sb.from("today_selections").delete().eq("thread_id", threadId).eq("selected_date", iso);

        if (error) throw error;
      }

      await reload();
    } finally {
      setBusy(false);
    }
  };

  const undoPlacement = React.useCallback(async () => {
    const undo = placementUndoRef.current;
    if (!undo) return;
    placementUndoRef.current = null;
    setPlacementToast(null);

    const { threadId, snapshot, hadTodaySelection } = undo;
    patchThreadsLocal(threadId, snapshot);

    setBusy(true);
    try {
      const sb = createBrowserSupabase();
      const { error } = await sb.from("threads").update(snapshot).eq("id", threadId);
      if (error) throw error;

      const iso = dash.serverTodayISO;
      if (hadTodaySelection) {
        await sb.from("today_selections").upsert(
          { thread_id: threadId, selected_date: iso, is_selected: true },
          { onConflict: "thread_id,selected_date" },
        );
      } else {
        await sb.from("today_selections").delete().eq("thread_id", threadId).eq("selected_date", iso);
      }

      await reload();
    } catch {
      await reload();
    } finally {
      setBusy(false);
    }
  }, [dash.serverTodayISO, patchThreadsLocal, reload]);

  const activateThread = React.useCallback(
    async (threadId: string) => {
      const thread = dash.allThreads?.find((t) => t.id === threadId);
      if (!thread || isOnCanvas(thread)) return;

      const todayISO = dash.serverTodayISO || resolveLumeDayISO();
      const snapshot = {
        canvas_placement: thread.canvas_placement,
        status: thread.status,
        start_date: thread.start_date,
        due_date: thread.due_date,
      };
      const hadTodaySelection = selectedToday.has(threadId);

      const updates: Partial<ThreadRow> = { canvas_placement: "active" };
      if (isNotStartedStatus(thread.status)) {
        updates.status = "active";
        updates.start_date = todayISO;
        updates.due_date = isoCalendarAdd(todayISO, 6);
      }

      patchThreadsLocal(threadId, updates);
      placementUndoRef.current = { threadId, snapshot, hadTodaySelection };
      setPlacementToast({ message: `"${thread.name}" is now on the canvas`, undo: placementUndoRef.current });

      setBusy(true);
      try {
        const sb = createBrowserSupabase();
        const { error } = await sb.from("threads").update(updates).eq("id", threadId);
        if (error) throw error;
        await reload();
      } catch {
        patchThreadsLocal(threadId, snapshot);
        setPlacementToast(null);
        placementUndoRef.current = null;
      } finally {
        setBusy(false);
      }
    },
    [dash.allThreads, dash.serverTodayISO, dash.dateTimezone, patchThreadsLocal, reload, selectedToday],
  );

  const parkThread = React.useCallback(
    async (threadId: string) => {
      const thread = dash.allThreads?.find((t) => t.id === threadId);
      if (!thread || !isOnCanvas(thread)) return;

      const snapshot = {
        canvas_placement: thread.canvas_placement,
        status: thread.status,
        start_date: thread.start_date,
        due_date: thread.due_date,
      };
      const hadTodaySelection = selectedToday.has(threadId);

      patchThreadsLocal(threadId, { canvas_placement: "dormant" });
      placementUndoRef.current = { threadId, snapshot, hadTodaySelection };
      setPlacementToast({ message: `"${thread.name}" moved to Dormant`, undo: placementUndoRef.current });

      setBusy(true);
      try {
        const sb = createBrowserSupabase();
        const iso = dash.serverTodayISO;
        const { error } = await sb.from("threads").update({ canvas_placement: "dormant" }).eq("id", threadId);
        if (error) throw error;

        if (hadTodaySelection) {
          await sb.from("today_selections").delete().eq("thread_id", threadId).eq("selected_date", iso);
        }

        if (detailId === threadId) setDetailId(null);
        await reload();
      } catch {
        patchThreadsLocal(threadId, snapshot);
        setPlacementToast(null);
        placementUndoRef.current = null;
      } finally {
        setBusy(false);
      }
    },
    [dash.allThreads, dash.serverTodayISO, detailId, patchThreadsLocal, reload, selectedToday],
  );

  async function persistNoteNow() {
    if (!detailId) return;

    const trimmed = detailDraft.trim();
    if (!trimmed) return;

    const threadId = detailId;
    const logDate = dash.serverTodayISO;
    const draftSnapshot = detailDraft;
    const now = new Date().toISOString();

    setDetailDraft("");

    setDetailLogs((prev) => {
      const existing = prev.find((l) => l.log_date === logDate);
      const entry: DailyLogRow = {
        id: existing?.id ?? `pending-${logDate}`,
        thread_id: threadId,
        log_date: logDate,
        note: trimmed,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      return [entry, ...prev.filter((l) => l.log_date !== logDate)].sort((a, b) =>
        b.log_date.localeCompare(a.log_date),
      );
    });

    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { data, error } = await sb
        .from("daily_logs")
        .upsert(
          {
            thread_id: threadId,
            log_date: logDate,
            note: trimmed,
          },
          { onConflict: "thread_id,log_date" },
        )
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const saved = data as DailyLogRow;
        setDetailLogs((prev) =>
          [saved, ...prev.filter((l) => l.log_date !== logDate && l.id !== saved.id)].sort((a, b) =>
            b.log_date.localeCompare(a.log_date),
          ),
        );
      }

      void reload();
    } catch {
      setDetailDraft(draftSnapshot);
      await loadDetailLogs(threadId);
    } finally {
      setBusy(false);
    }
  }

  const createCategoryFold = async (label: string, hue: string) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { data, error } = await sb
        .from("categories")
        .insert({ name: label, color: hue })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setDash((prev) => ({
          ...prev,
          categories: [...prev.categories, data as DashboardPayload["categories"][number]].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        }));
      } else {
        await reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const renameCategoryFold = async (id: string, label: string) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { error } = await sb.from("categories").update({ name: label }).eq("id", id);

      if (error) throw error;
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const deleteCategoryFold = async (id: string) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { error } = await sb.from("categories").delete().eq("id", id);

      if (error) throw error;
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const launchComposer = React.useCallback((thread: ThreadRow | null) => {
    setEditingThread(thread);
    setComposerNonce((n) => n + 1);
    setThreadFormOpen(true);
  }, []);

  const openComposer = React.useCallback(() => {
    launchComposer(null);
  }, [launchComposer]);

  const openMiniTaskComposer = React.useCallback((threadId: string | null = null) => {
    setMiniTaskPresetThreadId(threadId);
    setMiniTaskFormNonce((n) => n + 1);
    setMiniTaskFormOpen(true);
  }, []);

  const patchMiniTaskLocal = React.useCallback((taskId: string, patch: Partial<MiniTaskRow>) => {
    setDash((prev) => ({
      ...prev,
      miniTasks: prev.miniTasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
    }));
  }, []);

  const createMiniTask = async (payload: CreateMiniTaskPayload | { thread_id: string; title: string }) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const body = {
        thread_id: payload.thread_id,
        title: payload.title,
        note: "note" in payload ? (payload.note ?? null) : null,
        due_date: "due_date" in payload ? (payload.due_date ?? null) : dash.serverTodayISO,
        priority: "priority" in payload ? (payload.priority ?? null) : null,
        status: "open" as const,
      };

      const { error } = await sb.from("mini_tasks").insert(body);
      if (error) throw error;
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const updateMiniTaskStatus = async (taskId: string, status: MiniTaskStatus) => {
    const prev = dash.miniTasks.find((t) => t.id === taskId);
    if (!prev) return;

    const completed_at = status === "done" ? new Date().toISOString() : null;
    patchMiniTaskLocal(taskId, { status, completed_at });

    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { error } = await sb
        .from("mini_tasks")
        .update({ status, completed_at })
        .eq("id", taskId);

      if (error) throw error;
    } catch {
      patchMiniTaskLocal(taskId, { status: prev.status, completed_at: prev.completed_at });
    } finally {
      setBusy(false);
    }
  };

  const updateMiniTaskFields = async (
    taskId: string,
    patch: Partial<Pick<MiniTaskRow, "title" | "note" | "due_date" | "priority">>,
  ) => {
    const prev = dash.miniTasks.find((t) => t.id === taskId);
    if (!prev) return;

    patchMiniTaskLocal(taskId, patch);

    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { error } = await sb.from("mini_tasks").update(patch).eq("id", taskId);
      if (error) throw error;
    } catch {
      const revert: Partial<MiniTaskRow> = {};
      if ("title" in patch) revert.title = prev.title;
      if ("note" in patch) revert.note = prev.note;
      if ("due_date" in patch) revert.due_date = prev.due_date;
      if ("priority" in patch) revert.priority = prev.priority;
      patchMiniTaskLocal(taskId, revert);
    } finally {
      setBusy(false);
    }
  };

  const updateMiniTaskTitle = async (taskId: string, title: string) => {
    await updateMiniTaskFields(taskId, { title });
  };

  const updateMiniTaskNote = async (taskId: string, note: string | null) => {
    await updateMiniTaskFields(taskId, { note });
  };

  const updateMiniTaskDueDate = async (taskId: string, dueDate: string | null) => {
    await updateMiniTaskFields(taskId, { due_date: dueDate });
  };

  const updateMiniTaskPriority = async (taskId: string, priority: MiniTaskPriority | null) => {
    await updateMiniTaskFields(taskId, { priority });
  };

  const deleteMiniTask = async (taskId: string) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const { error } = await sb.from("mini_tasks").delete().eq("id", taskId);
      if (error) throw error;

      setDash((prev) => ({
        ...prev,
        miniTasks: prev.miniTasks.filter((t) => t.id !== taskId),
      }));
    } finally {
      setBusy(false);
    }
  };

  const saveUserSettings = async (payload: { day_start_time: string; day_end_time: string }) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const body = {
        id: LOCAL_USER_SETTINGS_ID,
        day_start_time: toPostgresTime(payload.day_start_time),
        day_end_time: toPostgresTime(payload.day_end_time),
      };
      const { error } = await sb.from("user_settings").upsert(body, { onConflict: "id" });
      if (error) throw error;
      await reload();
    } catch (err) {
      let message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not save settings.";

      if (message.includes("user_settings")) {
        message =
          "Your database needs the user settings migration. Run supabase/migrations/005_user_settings.sql in the Supabase SQL editor.";
      }

      window.alert(message);
    } finally {
      setBusy(false);
    }
  };

  const threadPickerRows = dash.timelineThreads;
  const hasAnyThreads = (dash.allThreads?.length ?? 0) > 0;

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        <LumeTopRail todayCue={todayCue} onRefresh={() => void reload()} syncing={syncing}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground"
            disabled={busy}
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings aria-hidden className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground"
            disabled={busy}
            onClick={() => setCatsOpen(true)}
          >
            Categories
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] text-muted-foreground"
            disabled={busy}
            onClick={() => openMiniTaskComposer()}
          >
            <Plus aria-hidden className="size-3.5" />
            Task
          </Button>
          <Button type="button" size="sm" className="h-7 px-2.5 text-[11px]" disabled={busy} onClick={() => openComposer()}>
            <Plus aria-hidden className="size-3.5" />
            New
          </Button>
        </LumeTopRail>

        <CategoryManagerDialog
          categories={dash.categories}
          busy={busy}
          open={catsOpen}
          onOpenChange={setCatsOpen}
          onCreate={(n, c) => createCategoryFold(n, c)}
          onRename={(id, n) => renameCategoryFold(id, n)}
          onDelete={(id) => deleteCategoryFold(id)}
        />

        <SettingsDialog
          settings={dash.userSettings}
          busy={busy}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSave={(payload) => saveUserSettings(payload)}
        />

        <ThreadFormDialog
          key={`thread-form-${composerNonce}`}
          categories={dash.categories}
          editing={editingThread}
          open={threadFormOpen}
          busy={busy}
          onSubmit={(p) => saveThread(p)}
          onOpenChange={(v) => {
            setThreadFormOpen(v);

            if (!v) setEditingThread(null);
          }}
        />

        <CreateMiniTaskDialog
          key={`mini-task-form-${miniTaskFormNonce}`}
          open={miniTaskFormOpen}
          busy={busy}
          threads={threadPickerRows}
          presetThreadId={miniTaskPresetThreadId}
          todayISO={dash.serverTodayISO}
          onSubmit={(p) => createMiniTask(p)}
          onOpenChange={(v) => {
            setMiniTaskFormOpen(v);
            if (!v) setMiniTaskPresetThreadId(null);
          }}
        />

        <div className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-hidden px-3 pb-3 pt-2 font-sans">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            <LumeWorkflowIntro
              activeCount={dash.timelineThreads.length}
              focusCount={selectionCount}
              focusViewOn={todayFocusActive}
              onAddThread={() => openComposer()}
            />

            {hasAnyThreads ?
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <DroppableCanvasZone disabled={busy} onDropActivate={(id) => void activateThread(id)}>
                  {dash.timelineThreads.length === 0 ?
                    <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-lume-border-strong bg-lume-surface/50 px-6 py-12 text-center">
                      <p className="text-[12px] text-muted-foreground">Drag from Dormant to activate a thread.</p>
                    </div>
                  : (
                    <TimelineCanvas
                      threadViews={threadViews}
                      todayISO={dash.serverTodayISO}
                      busy={busy}
                      focusViewOn={todayFocusActive}
                      focusCount={selectionCount}
                      activeCount={activeThreadCount}
                      onToggleToday={(threadId, next) => toggleToday(threadId, next)}
                      onAddMiniTask={(threadId) => openMiniTaskComposer(threadId)}
                    />
                  )}
                </DroppableCanvasZone>

                {(dash.dormantThreads ?? []).length > 0 ?
                  <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-end px-3">
                    <DormantThreadsDock
                      threads={dash.dormantThreads ?? []}
                      busy={busy}
                      onActivate={(id) => void activateThread(id)}
                      onOpenThread={openThreadDetail}
                      onDropToPark={(id) => {
                        const t = dash.allThreads?.find((x) => x.id === id);
                        if (t && isOnCanvas(t)) void parkThread(id);
                      }}
                    />
                  </div>
                : null}

                {placementToast ?
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-4">
                    <PlacementToast
                      className="pointer-events-auto max-w-md"
                      message={placementToast.message}
                      onUndo={placementToast.undo ? () => void undoPlacement() : undefined}
                      onDismiss={() => {
                        setPlacementToast(null);
                        placementUndoRef.current = null;
                      }}
                    />
                  </div>
                : null}
              </div>
            : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-lume-border-strong bg-lume-surface px-8 py-16 text-center">
                <p className="mb-1 text-sm font-medium text-foreground">Your life, as threads</p>
                <p className="mb-6 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                  A thread is an ongoing effort — a job search, a launch, training for a race.
                  Active threads live on the canvas; ideas waiting to begin stay in Dormant.
                </p>
                <Button size="lg" type="button" onClick={() => openComposer()} disabled={busy}>
                  Add your first thread
                </Button>
              </div>
            )}
          </div>

          <MiniTaskPanel
            tasks={dash.miniTasks}
            threads={threadPickerRows}
            todayISO={dash.serverTodayISO}
            busy={busy}
            onStatusChange={(taskId, status) => void updateMiniTaskStatus(taskId, status)}
            onTitleChange={(taskId, title) => void updateMiniTaskTitle(taskId, title)}
            onNoteChange={(taskId, note) => void updateMiniTaskNote(taskId, note)}
            onDueDateChange={(taskId, dueDate) => void updateMiniTaskDueDate(taskId, dueDate)}
            onPriorityChange={(taskId, priority) => void updateMiniTaskPriority(taskId, priority)}
            onDelete={(taskId) => void deleteMiniTask(taskId)}
            onQuickAdd={(p) => createMiniTask(p)}
          />
        </div>
      </div>

      <ThreadDetailSheet
        open={Boolean(detailRecord && detailId)}
        busy={busy}
        thread={detailRecord}
        todayISO={dash.serverTodayISO}
        noteDraft={detailDraft}
        onNoteDraftChange={setDetailDraft}
        progressLogs={detailLogs}
        onCommitNoteNow={() => persistNoteNow()}
        isSelectedToday={
          dash.todaySelections.some(
            (s) => s.thread_id === detailId && s.is_selected && s.selected_date === dash.serverTodayISO,
          )
        }
        onToggleTodayFocus={async (v) => {
          if (!detailRecord) return;
          await toggleToday(detailRecord.id, v);
        }}
        onClose={() => setDetailId(null)}
        onEditThread={() => {
          if (!detailRecord) return;
          launchComposer(detailRecord);
        }}
        onDeleteThread={async () => {
          if (!detailRecord) return;
          await deleteThread(detailRecord.id);
        }}
        showParkAction={Boolean(detailRecord && isOnCanvas(detailRecord))}
        onParkToDormant={async () => {
          if (!detailRecord) return;
          await parkThread(detailRecord.id);
        }}
      />
    </>
  );
}
