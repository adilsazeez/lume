"use client";

import * as React from "react";
import type { FormEvent } from "react";

import type { DashboardPayload, ThreadRow, ThreadStatus } from "@/types/lume";

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

import { NEON_THREAD_SWATCHES } from "@/lib/neon-presets";
import { isoCalendarAdd } from "@/lib/timeline";
import { THREAD_STATUS_OPTIONS, isNotStartedStatus, threadStatusLabel } from "@/lib/thread-status";
import { cn } from "@/lib/utils";

const STATUS_ITEMS = THREAD_STATUS_OPTIONS;

type DurationPreset = "week" | "month" | "3month";

const DURATION_PRESETS = [
  { key: "week" as const, label: "1 week", spanDays: 6 },
  { key: "month" as const, label: "1 month", spanDays: 30 },
  { key: "3month" as const, label: "3 months", spanDays: 90 },
] as const;

function dueFromStart(startISO: string, preset: DurationPreset) {
  const spanDays = DURATION_PRESETS.find((p) => p.key === preset)?.spanDays ?? 6;
  return isoCalendarAdd(startISO, spanDays);
}

function defaultColor(): string {
  return NEON_THREAD_SWATCHES[1]?.hex ?? "#5c6f86";
}

function isoTodayLocalCalendar() {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const selectFieldClass =
  "h-[39px] w-full rounded-[var(--radius-md)] border border-input bg-muted/80 px-[12px] text-[13px] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/14%)] outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/54 dark:border-input";

function DurationPresetSwitcher({
  value,
  disabled,
  onChange,
}: {
  value: DurationPreset;
  disabled?: boolean;
  onChange: (preset: DurationPreset) => void;
}) {
  return (
    <div
      aria-label="Thread duration"
      className="inline-flex rounded-md border border-lume-border-strong p-0.5"
      role="group"
    >
      {DURATION_PRESETS.map(({ key, label }) => (
        <button
          key={key}
          aria-pressed={key === value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(key)}
          className={cn(
            "rounded px-2.5 py-1.5 text-[11px] font-medium",
            key === value ?
              "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function ThreadFormDialog({
  open,
  onOpenChange,
  categories,
  editing,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  categories: DashboardPayload["categories"];
  editing: ThreadRow | null;
  busy: boolean;
  onSubmit: (payload: {
    id?: string;
    name: string;
    description: string | null;
    category_id: string | null;
    color: string;
    start_date: string | null;
    due_date: string | null;
    status: ThreadStatus;
  }) => Promise<void>;
}) {
  const localTodayISO = isoTodayLocalCalendar();
  const isEditing = Boolean(editing);

  const [name, setName] = React.useState(() => editing?.name ?? "");
  const [description, setDescription] = React.useState(() => editing?.description ?? "");
  const [categoryId, setCategoryId] = React.useState<string>(() => editing?.category_id ?? "");
  const [color, setColor] = React.useState(() => editing?.color ?? defaultColor());
  const [durationPreset, setDurationPreset] = React.useState<DurationPreset>("week");
  const [startDate, setStartDate] = React.useState(
    () => editing?.start_date.split("T")[0] ?? localTodayISO,
  );
  const [dueDate, setDueDate] = React.useState(
    () => editing?.due_date.split("T")[0] ?? dueFromStart(localTodayISO, "week"),
  );
  const [status, setStatus] = React.useState<ThreadStatus>(() => editing?.status ?? "active");

  const isNotStarted = isNotStartedStatus(status);

  function handleStatusChange(next: ThreadStatus) {
    if (isNotStartedStatus(status) && !isNotStartedStatus(next)) {
      setStartDate(localTodayISO);
      setDueDate(dueFromStart(localTodayISO, durationPreset));
    }
    setStatus(next);
  }

  function applyDurationPreset(preset: DurationPreset, anchorStart = startDate) {
    setDurationPreset(preset);
    setDueDate(dueFromStart(anchorStart, preset));
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();

    if (!name.trim() || busy) return;

    if (!isNotStarted && dueDate.localeCompare(startDate) < 0) {
      alert("Due anchor must stay on/beyond the start date.");
      return;
    }

    await onSubmit({
      id: editing?.id,
      name: name.trim(),
      description: description.trim().length ? description.trim() : null,
      category_id: categoryId ? categoryId : null,
      color,
      start_date: isNotStarted ? null : startDate,
      due_date: isNotStarted ? null : dueDate,
      status,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh_-_4rem)] max-w-xl gap-8 overflow-auto border-white/31 bg-muted/92 sm:max-w-xl">
        <form className="space-y-[22px]" onSubmit={handleSubmit}>
          <DialogHeader className="space-y-2 gap-5">
            <DialogTitle className="text-[18px]">
              {(editing ?? null) ? "Edit thread" : "Bring a thread to life"}
            </DialogTitle>

            <DialogDescription className="text-[13px] leading-snug">
              Give this effort a clear thread—you’ll see active spans together every morning instead of juggling lists.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-[18px]">
            <div className="space-y-[13px]">
              <Label className="text-[13px]" htmlFor="lume-thread-name">
                Thread title
              </Label>

              <Input
                required
                id="lume-thread-name"
                value={name}
                disabled={busy}
                autoFocus={!editing}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  "h-[41px] border-white/43 bg-muted/78 text-[14px]",
                )}
              />
            </div>

            <div className="space-y-[13px]">
              <Label className="text-[13px]" htmlFor="lume-thread-detail">
                One-line description
              </Label>

              <Textarea
                id="lume-thread-detail"
                rows={4}
                value={description}
                disabled={busy}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why this deserves its own thread on the timeline..."
                className="border-white/43 bg-muted/78 text-[14px]"
              />

              <div className="space-y-[13px]">
                <Label className="text-[13px]">Neon pigment</Label>

                <div className="flex flex-wrap gap-[12px]">
                  {NEON_THREAD_SWATCHES.map(({ hex, label }) => (
                    <button
                      aria-label={`${label} pigment ${hex}`}
                      disabled={busy}
                      key={`${label}-${hex}`}
                      title={hex}
                      type="button"
                      className={cn(
                        "size-[28px] rounded-full border-[1px] outline-none transition-opacity",
                        color === hex
                          ? "ring-2 ring-lume-focus ring-offset-2 ring-offset-background"
                          : "border-white/32 opacity-94 hover:opacity-100",
                      )}
                      onClick={() => setColor(hex)}
                      style={{
                        backgroundColor: hex,
                        borderColor:
                          hex === color ? `${hex}BB` : "rgba(248,254,254,.43)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-[17px] sm:grid-cols-12">
              <div className="space-y-[10px] sm:col-span-6">
                <Label className="text-[13px]" htmlFor="lume-thread-category">
                  Category
                </Label>

                <select
                  id="lume-thread-category"
                  disabled={busy}
                  value={categoryId}
                  aria-label="Thread category"
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={cn(selectFieldClass)}
                >
                  <option key="__thread_none_cat__" value="">
                    Tagless focus
                  </option>

                  {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-[13px] sm:col-span-6">
                <Label className="text-[13px]" htmlFor="lume-thread-status">
                  Pace
                </Label>

                <select
                  id="lume-thread-status"
                  value={status}
                  disabled={busy}
                  onChange={(e) => handleStatusChange(e.target.value as ThreadStatus)}
                  aria-label="Thread status"
                  className={cn(selectFieldClass)}
                >
                  {STATUS_ITEMS.map((state) => (
                    <option key={state} value={state}>
                      {threadStatusLabel(state)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!isNotStarted ?
              <div className="grid gap-[16px] sm:grid-cols-12">
                {!isEditing ?
                  <div className="space-y-2 sm:col-span-12">
                    <Label className="text-[13px]">Duration</Label>
                    <DurationPresetSwitcher
                      value={durationPreset}
                      disabled={busy}
                      onChange={(preset) => applyDurationPreset(preset)}
                    />
                  </div>
                : null}

                <div className="grid gap-[10px] sm:col-span-6 md:grid-cols-2">
                  <div className="space-y-[9px]">
                    <Label className="text-[13px]" htmlFor="lume-thread-start">
                      Start anchor
                    </Label>
                    <Input
                      type="date"
                      id="lume-thread-start"
                      required
                      value={startDate}
                      disabled={busy}
                      onChange={(e) => {
                        const next = e.target.value;
                        setStartDate(next);

                        if (!isEditing) {
                          setDueDate(dueFromStart(next, durationPreset));
                        }
                      }}
                      className="border-white/41 bg-muted/78 text-[13px]"
                    />
                  </div>
                  <div className="space-y-[11px]">
                    <Label className="text-[13px]" htmlFor="lume-thread-due">
                      Due horizon
                    </Label>
                    <Input
                      type="date"
                      id="lume-thread-due"
                      required
                      value={dueDate}
                      disabled={busy}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="border-white/45 bg-muted/78 text-[13px]"
                    />
                  </div>
                </div>
              </div>
            : (
              <p className="text-[12px] leading-snug text-muted-foreground">
                Start and due dates unlock when you move this thread out of Not started.
              </p>
            )}
          </div>

          <DialogFooter className="flex flex-row flex-wrap-reverse items-center gap-[13px] sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="w-full shrink-0 sm:w-auto sm:justify-self-auto"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button
              className={cn(
                "w-[max(148px,min(228px,_44vw))] bg-primary text-[14px]",
              )}
              type="submit"
              disabled={Boolean(busy || !name.trim())}
            >
              {(editing ?? null) ? "Save thread" : "Create thread"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
