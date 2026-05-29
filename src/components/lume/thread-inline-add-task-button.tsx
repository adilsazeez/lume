"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThreadInlineAddTaskButton({
  threadName,
  disabled,
  onClick,
}: {
  threadName: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      disabled={disabled}
      aria-label={`Add mini-task to ${threadName}`}
      title={`Add task to ${threadName}`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "shrink-0 text-muted-foreground/55",
        "opacity-60 hover:opacity-100",
        "hover:bg-lume-hover hover:text-foreground",
      )}
    >
      <Plus aria-hidden className="size-3" />
    </Button>
  );
}
