"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { PencilIcon, Trash2 } from "lucide-react";

import type { DailyLogRow, ThreadRow } from "@/types/lume";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { urgencyForDueDate } from "@/lib/timeline";
import { threadStatusLabel, isNotStartedStatus } from "@/lib/thread-status";
import { cn } from "@/lib/utils";

function fmtDay(iso: string) {
  return format(parseISO(`${iso.slice(0, 10)}T12:00:00.000Z`), "d MMM yyyy");
}

function fmtDayShort(iso: string) {
  return format(parseISO(`${iso.slice(0, 10)}T12:00:00.000Z`), "EEE, d MMM yyyy");
}

function ProgressHistory({
  logs,
  todayISO,
  threadColor,
}: {
  logs: DailyLogRow[];
  todayISO: string;
  threadColor: string;
}) {
  const history = logs.filter((log) => log.note.trim());

  if (history.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-lume-text-muted">
        No progress yet. Submit a note above to start the trail.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((log, index) => {
        const isToday = log.log_date === todayISO;
        return (
          <article
            key={log.id}
            className={cn(
              "rounded-lg border border-lume-border bg-lume-surface/40 px-3 py-2.5",
              index === 0 && "animate-in fade-in-0 slide-in-from-top-1 duration-200",
            )}
            style={{ boxShadow: `inset 2px 0 0 ${threadColor}66` }}
          >
            <time
              dateTime={log.log_date}
              className={cn(
                "mb-1 block text-[10px] font-medium tracking-wide uppercase",
                isToday ? "text-lume-accent" : "text-lume-text-muted",
              )}
            >
              {isToday ? "Today" : fmtDayShort(log.log_date)}
            </time>
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">{log.note}</p>
          </article>
        );
      })}
    </div>
  );
}

function ProgressHistoryFeed({
  logs,
  todayISO,
  threadColor,
  className,
}: {
  logs: DailyLogRow[];
  todayISO: string;
  threadColor: string;
  className?: string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const newestKey = logs[0] ? `${logs[0].id}:${logs[0].updated_at}` : "empty";

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [newestKey]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-[120px] overflow-y-auto rounded-lg border border-lume-border bg-lume-canvas/40 p-2 scrollbar-thin",
        className,
      )}
    >
      <ProgressHistory logs={logs} todayISO={todayISO} threadColor={threadColor} />
    </div>
  );
}

export function ThreadDetailSheet(props: {
  open: boolean;
  busy: boolean;
  thread: ThreadRow | null;
  todayISO: string;
  noteDraft: string;
  progressLogs: DailyLogRow[];
  onNoteDraftChange: (value: string) => void;
  onCommitNoteNow: () => Promise<void>;
  isSelectedToday: boolean;
  onToggleTodayFocus: (next: boolean) => Promise<void>;
  onClose: () => void;
  onEditThread: () => void;
  onDeleteThread: () => Promise<void>;
}) {
  const {
    open,
    busy,
    thread,
    todayISO,
    noteDraft,
    progressLogs,
    onNoteDraftChange,
    onCommitNoteNow,
    isSelectedToday,
    onToggleTodayFocus,
    onClose,
    onEditThread,
    onDeleteThread,
  } = props;

  if (!thread) return null;

  const threadName = thread.name;

  const urgency = urgencyForDueDate(thread.due_date, todayISO);
  const notStarted = isNotStartedStatus(thread.status);

  async function submitProgressNote(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || !noteDraft.trim()) return;
    await onCommitNoteNow();
  }

  async function removeThread() {
    if (
      !window.confirm(
        `Delete "${threadName}"? Notes and today selections for this thread will be removed.`,
      )
    ) {
      return;
    }

    await onDeleteThread();
  }

  return (
    <Sheet
      open={open}
      key={`${thread.id}-${open ? "visible" : "hidden"}`}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "flex h-full max-h-dvh w-full max-w-lg flex-col gap-0 overflow-hidden border-l border-white/14 bg-muted/95 p-0 sm:max-w-lg",
          "pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]",
        )}
      >
        <SheetHeader className="shrink-0 space-y-4 border-b border-white/13 p-6 text-start">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="mt-2 h-8 w-[3px] shrink-0 rounded-full"
              style={{
                backgroundColor: thread.color,
                boxShadow:
                  urgency === "hot"
                    ? "0 0 26px rgb(248 113 113 / .45)"
                    : "0 0 22px rgb(34 211 238 / .4)",
              }}
            />

            <div className="min-w-0 flex-1 space-y-2">
              <SheetTitle className="text-xl leading-tight">{thread.name}</SheetTitle>
              <SheetDescription className="sr-only">
                Inspect this thread spanning start to due anchors.
              </SheetDescription>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{thread.category?.name ?? "Uncategorized"}</Badge>
                <Badge variant="outline">{threadStatusLabel(thread.status)}</Badge>

                <Badge
                  variant="secondary"
                  className={cn(urgency === "hot" && "border-orange-900/72 text-orange-100")}
                >
                  urgency {urgency}
                </Badge>
              </div>

              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {thread.description || "Add a short signal line when you revisit this thread."}
              </p>
            </div>

            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onEditThread}>
              <PencilIcon className="mr-2 size-4" aria-hidden /> Edit thread
            </Button>
          </div>

          <Separator className="bg-lume-border-strong" />

          {!notStarted ?
            <dl className="grid gap-4 text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em]">Start anchor</dt>
                <dd className="font-mono text-sm text-foreground">{fmtDay(thread.start_date)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em]">Due horizon</dt>
                <dd className="font-mono text-[13px]" style={{ color: thread.color }}>
                  {fmtDay(thread.due_date)}
                </dd>
              </div>
            </dl>
          : (
            <p className="text-[12px] text-muted-foreground">
              Not started yet — set pace to Active in Edit thread to anchor start and due dates.
            </p>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-hidden px-6 py-6">
            <section className="shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-6">
                <Label htmlFor={`today-focus-${thread.id}`}>Work on today</Label>
                <Switch
                  id={`today-focus-${thread.id}`}
                  checked={isSelectedToday}
                  disabled={busy}
                  aria-label="Toggle today-focus visibility for this thread"
                  onCheckedChange={(checked) =>
                    void onToggleTodayFocus(checked === true)
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Pairs with the Today focus mode switch in the cockpit header strip.
              </p>
            </section>

            <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              <div className="shrink-0">
                <Label htmlFor={`note-${thread.id}`}>Progress note</Label>
                <p className="mt-0.5 text-xs text-lume-text-muted">Today · {fmtDay(todayISO)}</p>
              </div>

              <form className="shrink-0 space-y-2" onSubmit={(e) => void submitProgressNote(e)}>
                <Textarea
                  id={`note-${thread.id}`}
                  disabled={busy}
                  rows={3}
                  placeholder="What moved forward on this thread today?"
                  value={noteDraft}
                  onChange={(event) => onNoteDraftChange(event.target.value)}
                />

                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={busy || !noteDraft.trim()}>
                    Submit
                  </Button>
                </div>
              </form>

              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden pt-1">
                <p className="shrink-0 text-[11px] font-medium tracking-wide text-lume-text-secondary uppercase">
                  Progress history
                </p>
                <ProgressHistoryFeed
                  className="min-h-0 flex-1"
                  logs={progressLogs}
                  todayISO={todayISO}
                  threadColor={thread.color}
                />
              </div>
            </section>

            <section className="shrink-0 border-t border-lume-border-strong pt-4">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => void removeThread()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Delete thread
              </Button>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
