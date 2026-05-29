"use client";

import * as React from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";

import type { MiniTaskPriority, ThreadRow } from "@/types/lume";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MINI_TASK_DUE_PRESETS } from "@/lib/mini-tasks";
import { isoCalendarAdd } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const selectFieldClass =
  "h-9 w-full rounded-[var(--radius-md)] border border-input bg-muted/80 px-3 text-[13px] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/14%)] outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/54 dark:border-input";

const DUE_PRESETS = MINI_TASK_DUE_PRESETS;

export type CreateMiniTaskPayload = {
  thread_id: string;
  title: string;
  note: string | null;
  due_date: string | null;
  priority: MiniTaskPriority | null;
};

export function CreateMiniTaskDialog({
  open,
  busy,
  threads,
  presetThreadId,
  todayISO,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  busy?: boolean;
  threads: ThreadRow[];
  presetThreadId?: string | null;
  todayISO: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateMiniTaskPayload) => Promise<void> | void;
}) {
  const [threadId, setThreadId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");
  const [duePreset, setDuePreset] = React.useState<(typeof DUE_PRESETS)[number]["key"]>("today");
  const [priority, setPriority] = React.useState<MiniTaskPriority | "none">("none");
  const [showNote, setShowNote] = React.useState(false);

  const lockedThread = presetThreadId ? threads.find((t) => t.id === presetThreadId) : null;

  React.useEffect(() => {
    if (!open) return;
    setThreadId(presetThreadId ?? threads[0]?.id ?? "");
    setTitle("");
    setNote("");
    setDuePreset("today");
    setPriority("none");
    setShowNote(false);
  }, [open, presetThreadId, threads]);

  const dueDate =
    duePreset === "none" ?
      null
    : isoCalendarAdd(todayISO, DUE_PRESETS.find((p) => p.key === duePreset)?.days ?? 0);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !threadId) return;

    await onSubmit({
      thread_id: threadId,
      title: trimmed,
      note: note.trim() || null,
      due_date: dueDate,
      priority: priority === "none" ? null : priority,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] max-w-md gap-0 overflow-auto border-white/10 bg-background p-0 sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader className="gap-1 border-b border-lume-border-strong px-5 py-4 pr-12">
            <DialogTitle className="text-[15px] font-medium">
              {lockedThread ? `Task · ${lockedThread.name}` : "New mini-task"}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground">
              {lockedThread ?
                "A short action inside this thread — not a new timeline bar."
              : "A short action inside an existing thread — not a new timeline bar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="mini-task-title" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Title
              </Label>
              <Input
                id="mini-task-title"
                autoFocus
                disabled={busy}
                value={title}
                placeholder="Complete take-home assessment"
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 border-white/10 bg-muted/30 text-[13px]"
              />
            </div>

            {lockedThread ?
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Parent thread</Label>
                <div className="flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-white/10 bg-muted/20 px-3">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: lockedThread.color }}
                  />
                  <span className="truncate text-[13px] text-foreground/90">{lockedThread.name}</span>
                </div>
              </div>
            : (
              <div className="space-y-1.5">
                <Label htmlFor="mini-task-thread" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Parent thread
                </Label>
                <select
                  id="mini-task-thread"
                  disabled={busy || threads.length === 0}
                  value={threadId}
                  onChange={(e) => setThreadId(e.target.value)}
                  className={cn(selectFieldClass)}
                >
                  {threads.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mini-task-due" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Due
                </Label>
                <select
                  id="mini-task-due"
                  disabled={busy}
                  value={duePreset}
                  onChange={(e) => setDuePreset(e.target.value as typeof duePreset)}
                  className={cn(selectFieldClass)}
                >
                  {DUE_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mini-task-priority" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Priority
                </Label>
                <select
                  id="mini-task-priority"
                  disabled={busy}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  className={cn(selectFieldClass)}
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {showNote ?
              <div className="space-y-1.5">
                <Label htmlFor="mini-task-note" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Note
                </Label>
                <Textarea
                  id="mini-task-note"
                  disabled={busy}
                  value={note}
                  rows={2}
                  placeholder="Optional context"
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[60px] resize-none border-white/10 bg-muted/30 text-[13px]"
                />
              </div>
            : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowNote(true)}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Add note
              </button>
            )}
          </div>

          <DialogFooter className="!m-0 gap-2 border-t border-lume-border-strong bg-transparent px-5 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy || !title.trim() || !threadId}>
              <Plus aria-hidden className="size-3.5" />
              Add task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
