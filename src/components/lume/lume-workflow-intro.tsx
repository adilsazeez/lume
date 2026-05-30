"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WORKFLOW_COPY, WORKFLOW_INTRO_STORAGE_KEY } from "@/lib/lume-workflow";
import { cn } from "@/lib/utils";

function Concept({
  label,
  hint,
  accent,
}: {
  label: string;
  hint: string;
  accent?: "focus" | "next" | "default";
}) {
  return (
    <div className="min-w-0 flex-1 space-y-0.5">
      <p
        className={cn(
          "text-[11px] font-medium tracking-wide uppercase",
          accent === "focus" && "text-lume-accent",
          accent === "next" && "text-lume-text-secondary",
          !accent && "text-foreground",
        )}
      >
        {label}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

export function LumeWorkflowIntro({
  activeCount,
  focusCount,
  focusViewOn,
  onAddThread,
  className,
}: {
  activeCount: number;
  focusCount: number;
  focusViewOn: boolean;
  onAddThread?: () => void;
  className?: string;
}) {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(WORKFLOW_INTRO_STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(WORKFLOW_INTRO_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (dismissed) return null;

  const step =
    activeCount === 0
      ? "Add your first thread — an ongoing effort in your life."
      : focusCount === 0
        ? "Toggle Focus on one or two threads you're working today."
        : focusViewOn
          ? "You're set — Focus threads are pinned; Next threads wait until you want them."
          : "Turn on Focus view in the header to separate Focus from Next.";

  return (
    <div
      className={cn(
        "shrink-0 rounded-lg border border-lume-border-strong bg-lume-surface/80 px-3 py-2.5",
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-medium text-foreground">How Lume works</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{step}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground"
          aria-label="Dismiss intro"
          onClick={dismiss}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Concept label={WORKFLOW_COPY.active.label} hint={WORKFLOW_COPY.active.hint} />
        <Concept label={WORKFLOW_COPY.focus.label} hint={WORKFLOW_COPY.focus.hint} accent="focus" />
        <Concept label={WORKFLOW_COPY.next.label} hint={WORKFLOW_COPY.next.hint} accent="next" />
        <Concept label={WORKFLOW_COPY.dormant.label} hint={WORKFLOW_COPY.dormant.hint} />
      </div>

      {activeCount === 0 && onAddThread ?
        <Button type="button" size="sm" className="mt-3" onClick={onAddThread}>
          Add your first thread
        </Button>
      : null}
    </div>
  );
}
