"use client";

import { cn } from "@/lib/utils";

export function ThreadOpenTaskCount({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      title={`${count} open task${count === 1 ? "" : "s"}`}
      className={cn(
        "inline-flex min-w-[1.125rem] shrink-0 items-center justify-center rounded-full",
        "border border-lume-border/80 bg-background/35 px-1 py-px",
        "text-[9px] font-medium tabular-nums text-lume-text-secondary",
        className,
      )}
    >
      {count}
    </span>
  );
}
