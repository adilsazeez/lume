"use client";

import * as React from "react";
import type { FormEvent } from "react";

import type { UserSettingsRow } from "@/types/lume";

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

import { describeDayBoundary, normalizeTimeOfDay } from "@/lib/lume-day";
import { cn } from "@/lib/utils";

const timeInputClass =
  "h-9 w-full rounded-[var(--radius-md)] border border-input bg-muted/80 px-3 text-[13px] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/14%)] outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/54 dark:border-input";

export function SettingsDialog({
  settings,
  busy,
  open,
  onOpenChange,
  onSave,
}: {
  settings: UserSettingsRow;
  busy?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: { day_start_time: string; day_end_time: string }) => Promise<void>;
}) {
  const [dayStart, setDayStart] = React.useState(settings.day_start_time);
  const [dayEnd, setDayEnd] = React.useState(settings.day_end_time);

  React.useEffect(() => {
    if (!open) return;
    setDayStart(normalizeTimeOfDay(settings.day_start_time));
    setDayEnd(normalizeTimeOfDay(settings.day_end_time));
  }, [open, settings.day_start_time, settings.day_end_time]);

  const preview = React.useMemo(
    () =>
      describeDayBoundary({
        day_start_time: normalizeTimeOfDay(dayStart),
        day_end_time: normalizeTimeOfDay(dayEnd),
      }),
    [dayStart, dayEnd],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      day_start_time: normalizeTimeOfDay(dayStart),
      day_end_time: normalizeTimeOfDay(dayEnd),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-white/10 bg-background p-0 sm:max-w-md">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader className="gap-1 border-b border-lume-border-strong px-5 py-4 pr-12">
            <DialogTitle className="text-[15px] font-medium">Settings</DialogTitle>
            <DialogDescription className="text-[12px] leading-relaxed text-muted-foreground">
              Your Lume day can extend past midnight. For example, set end time to 3:00 AM if late-night work
              should still count as the same day.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="day-start-time" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Day start
                </Label>
                <Input
                  id="day-start-time"
                  type="time"
                  disabled={busy}
                  value={dayStart}
                  onChange={(e) => setDayStart(e.target.value)}
                  className={cn(timeInputClass, "appearance-none")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="day-end-time" className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Day end
                </Label>
                <Input
                  id="day-end-time"
                  type="time"
                  disabled={busy}
                  value={dayEnd}
                  onChange={(e) => setDayEnd(e.target.value)}
                  className={cn(timeInputClass, "appearance-none")}
                />
              </div>
            </div>

            <p className="rounded-lg border border-lume-border bg-lume-surface/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {preview}
            </p>
          </div>

          <DialogFooter className="!m-0 gap-2 border-t border-lume-border-strong bg-transparent px-5 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
