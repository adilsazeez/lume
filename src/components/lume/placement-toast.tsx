"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PlacementToast({
  message,
  undoLabel = "Undo",
  onUndo,
  onDismiss,
  className,
}: {
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-lume-border-strong bg-lume-panel/95 px-3 py-2 shadow-lg backdrop-blur-md",
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-[12px] text-foreground">{message}</p>
      {onUndo ?
        <Button type="button" size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-[11px]" onClick={onUndo}>
          {undoLabel}
        </Button>
      : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground"
        onClick={onDismiss}
      >
        Dismiss
      </Button>
    </div>
  );
}
