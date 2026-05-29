"use client";

import * as React from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import type { DashboardPayload, DailyLogRow, MiniTaskPriority, MiniTaskRow, MiniTaskStatus, ThreadRow, ThreadStatus } from "@/types/lume";

import { Button } from "@/components/ui/button";
import { CategoryManagerDialog } from "@/components/lume/category-manager-dialog";
import { CreateMiniTaskDialog, type CreateMiniTaskPayload } from "@/components/lume/create-mini-task-dialog";
import { LumeTopRail } from "@/components/lume/lume-top-rail";
import { MiniTaskPanel } from "@/components/lume/mini-task-panel";
import { ThreadDetailSheet } from "@/components/lume/thread-detail-sheet";
import { ThreadFormDialog } from "@/components/lume/thread-form-dialog";
import { TimelineCanvas } from "@/components/lume/timeline-canvas";
import type { TimelineThreadView } from "@/components/lume/thread-timeline";

import { hydrateDashboardPayload } from "@/lib/hydrate-dashboard";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { showsOnTimeline } from "@/lib/thread-status";
import { getTodayISO } from "@/lib/today-server";

import { useTodayFocusStore } from "@/stores/lume-store";
import { useDayRolloverRefresh } from "@/hooks/use-day-rollover-refresh";

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
  return <DashboardBody initial={props.initial} />;
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

  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailDraft, setDetailDraft] = React.useState("");
  const [detailLogs, setDetailLogs] = React.useState<DailyLogRow[]>([]);

  const [miniTaskFormOpen, setMiniTaskFormOpen] = React.useState(false);
  const [miniTaskPresetThreadId, setMiniTaskPresetThreadId] = React.useState<string | null>(null);
  const [miniTaskFormNonce, setMiniTaskFormNonce] = React.useState(0);

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

  const todayCue = React.useMemo(() => format(utcMiddayDate(dash.serverTodayISO), "EEE MMM d"), [dash.serverTodayISO]);

  /** Original timeline order — used as stable tie-breaker when pinning today picks */
  const timelineOrder = React.useMemo(
    () => new Map<string, number>(dash.timelineThreads.map((t, idx) => [t.id, idx])),
    [dash.timelineThreads],
  );

  const threadViews = React.useMemo(() => {
    const views = dash.timelineThreads.map((thread: ThreadRow): TimelineThreadView => {
      const dim =
        todayFocusActive &&
        selectionCount > 0 &&
        !selectedToday.has(thread.id) &&
        showsOnTimeline(thread.status);

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

    if (!pinToday) return views;

    return views.slice().sort((u, v) => {
      const uSel = selectedToday.has(u.thread.id);
      const vSel = selectedToday.has(v.thread.id);

      if (uSel !== vSel) return uSel ? -1 : 1;

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

  const detailRecord =
    dash.allThreads?.find((t) => t.id === detailId) ?? dash.timelineThreads.find((t) => t.id === detailId) ?? null;

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
      const todayISO = getTodayISO(dash.dateTimezone);
      isoRef.current = todayISO;
      const next = await hydrateDashboardPayload(sb, todayISO, dash.dateTimezone);
      setDash(next);
    } catch {
      /* ignore */
    } finally {
      setSyncing(false);
    }
  }, [dash.dateTimezone]);

  useDayRolloverRefresh({
    dateTimezone: dash.dateTimezone,
    activeTodayISO: dash.serverTodayISO,
    onRollover: reload,
  });

  const saveThread = async (payload: {
    id?: string;
    name: string;
    description: string | null;
    category_id: string | null;
    color: string;
    start_date: string | null;
    due_date: string | null;
    status: ThreadStatus;
  }) => {
    setBusy(true);

    try {
      const sb = createBrowserSupabase();
      const todayISO = dash.serverTodayISO;
      const body: {
        name: string;
        description: string;
        category_id: string | null;
        color: string;
        status: ThreadStatus;
        start_date?: string;
        due_date?: string;
      } = {
        name: payload.name,
        description: payload.description ?? "",
        category_id: payload.category_id,
        color: payload.color,
        status: payload.status,
      };

      if (payload.status === "not_started") {
        if (!payload.id) {
          body.start_date = todayISO;
          body.due_date = todayISO;
        }
      } else if (payload.start_date && payload.due_date) {
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

  const threadPickerRows = dash.allThreads ?? dash.timelineThreads;

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

        <ThreadFormDialog
          key={composerNonce}
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
          key={miniTaskFormNonce}
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
            {todayFocusActive && selectionCount === 0 && dash.timelineThreads.length > 0 ?
              <p className="shrink-0 rounded-md border border-amber-900/40 bg-amber-950/35 px-2.5 py-1.5 text-[11px] text-amber-100/95 leading-snug">
                Mark threads for today using the toggles on the timeline.
              </p>
            : null}

            {dash.timelineThreads.length === 0 ?
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-lume-border-strong bg-lume-surface py-20">
                <p className="mb-10 max-w-md px-8 text-center text-sm text-muted-foreground">
                  No active timelines yet. Bring threads into Lume once and they glow across mornings so nothing quietly stalls.
                </p>
                <Button size="lg" type="button" onClick={() => openComposer()} disabled={busy}>
                  Bring a thread to life
                </Button>
              </div>
            : (
              <TimelineCanvas
                threadViews={threadViews}
                todayISO={dash.serverTodayISO}
                busy={busy}
                onToggleToday={(threadId, next) => toggleToday(threadId, next)}
                onAddMiniTask={(threadId) => openMiniTaskComposer(threadId)}
              />
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
      />
    </>
  );
}
