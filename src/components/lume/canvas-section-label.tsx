"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function CanvasSectionLabel({
  label,
  hint,
  variant = "default",
}: {
  label: string;
  hint: string;
  variant?: "default" | "focus" | "next" | "muted";
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "flex h-full items-center border-b border-lume-border/60 px-2",
              variant === "focus" && "border-lume-accent/25 bg-lume-accent/5",
              variant === "next" && "bg-lume-surface/30",
              variant === "muted" && "bg-amber-500/5",
            )}
          >
            <span
              className={cn(
                "text-[9px] font-semibold tracking-[0.16em] uppercase",
                variant === "focus" && "text-lume-accent",
                variant === "next" && "text-lume-text-secondary",
                variant === "muted" && "text-amber-400/90",
                variant === "default" && "text-lume-text-muted",
              )}
            >
              {label}
            </span>
          </div>
        }
      />
      <TooltipContent side="right" className="max-w-[220px] text-pretty">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
