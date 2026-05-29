"use client";

import * as React from "react";
import { Calendar } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  formatMiniTaskDueLabel,
  MINI_TASK_DUE_EDIT_PRESETS,
  miniTaskDueUrgency,
} from "@/lib/mini-tasks";
import { isoCalendarAdd } from "@/lib/timeline";
import { cn } from "@/lib/utils";

export function MiniTaskDuePicker({
  dueDate,
  todayISO,
  disabled,
  isDone,
  onChange,
}: {
  dueDate: string | null;
  todayISO: string;
  disabled?: boolean;
  isDone?: boolean;
  onChange: (dueDate: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const urgency = miniTaskDueUrgency(dueDate, todayISO);
  const dueLabel = formatMiniTaskDueLabel(dueDate, todayISO);

  const applyDue = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled || isDone}
        aria-label={dueDate ? `Due ${dueLabel}. Click to edit.` : "Add due date"}
        className={cn(
          "inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] tabular-nums outline-none",
          "hover:bg-lume-hover focus-visible:ring-1 focus-visible:ring-lume-focus",
          dueDate ?
            cn(
              urgency === "hot" && !isDone && "font-medium text-rose-300/90",
              urgency === "soon" && !isDone && "text-amber-200/80",
              urgency === "silent" && "text-muted-foreground/60",
              isDone && "text-muted-foreground/45",
            )
          : "text-muted-foreground/45 hover:text-muted-foreground/70",
        )}
      >
        <Calendar aria-hidden className="size-2.5 shrink-0 opacity-70" />
        {dueLabel ?? "Add due"}
      </PopoverTrigger>

      <PopoverContent align="end" side="left" sideOffset={6} className="w-52 gap-2 p-2">
        <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Due date</p>

        <div className="grid grid-cols-2 gap-1">
          {MINI_TASK_DUE_EDIT_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyDue(isoCalendarAdd(todayISO, preset.days!))}
              className={cn(
                "rounded-md px-2 py-1.5 text-[11px] text-foreground/90",
                "hover:bg-lume-hover focus-visible:ring-1 focus-visible:ring-lume-focus",
                dueDate === isoCalendarAdd(todayISO, preset.days!) && "bg-muted text-foreground",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 px-1">
          <span className="text-[10px] text-muted-foreground/70">Custom</span>
          <input
            type="date"
            value={dueDate ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              applyDue(v || null);
            }}
            className="h-8 w-full rounded-md border border-lume-border bg-lume-surface px-2 text-[12px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-lume-focus"
          />
        </label>

        {dueDate ?
          <button
            type="button"
            onClick={() => applyDue(null)}
            className="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-lume-text-muted hover:bg-lume-hover hover:text-foreground"
          >
            Clear due date
          </button>
        : null}
      </PopoverContent>
    </Popover>
  );
}
