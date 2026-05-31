"use client";

import * as React from "react";
import type { FormEvent } from "react";

import type { UserSettingsRow } from "@/types/lume";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { normalizeTimeOfDay } from "@/lib/lume-day";
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
  onSave: (payload: { day_end_time: string }) => Promise<void>;
}) {
  const [dayEnd, setDayEnd] = React.useState(settings.day_end_time);

  React.useEffect(() => {
    if (!open) return;
    setDayEnd(normalizeTimeOfDay(settings.day_end_time));
  }, [open, settings.day_end_time]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await onSave({ day_end_time: normalizeTimeOfDay(dayEnd) });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden border-white/10 bg-background p-0 sm:max-w-sm">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <DialogHeader className="border-b border-lume-border-strong px-5 py-4 pr-12">
            <DialogTitle className="text-[15px] font-medium">Day boundary</DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5 px-5 py-4">
            <Label htmlFor="day-end-time" className="text-[11px] text-muted-foreground">
              Focus reset time
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

          <p className="px-5 pb-4 text-[11px] leading-relaxed text-muted-foreground">
            The header date follows your timezone at midnight. Focus threads reset at this time — use 12:00 AM to
            reset at midnight.
          </p>

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
