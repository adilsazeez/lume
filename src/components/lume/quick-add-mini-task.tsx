"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import type { ThreadRow } from "@/types/lume";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EllipsisText } from "@/components/lume/ellipsis-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

export function QuickAddMiniTask({
  threads,
  busy,
  onSubmit,
}: {
  threads: ThreadRow[];
  busy?: boolean;
  onSubmit: (payload: { thread_id: string; title: string }) => Promise<void> | void;
}) {
  const [title, setTitle] = React.useState("");
  const [threadId, setThreadId] = React.useState("");

  React.useEffect(() => {
    if (threads.length === 0) {
      setThreadId("");
      return;
    }
    setThreadId((prev) => (prev && threads.some((t) => t.id === prev) ? prev : threads[0]!.id));
  }, [threads]);

  const threadItems = React.useMemo(
    () => threads.map((t) => ({ value: t.id, label: t.name })),
    [threads],
  );

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !threadId) return;

    await onSubmit({ thread_id: threadId, title: trimmed });
    setTitle("");
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2 border-b border-white/[0.06] px-2.5 pb-3 pt-1">
      <div className="flex gap-1.5">
        <Input
          value={title}
          disabled={busy || threads.length === 0}
          placeholder="Quick add task…"
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 flex-1 border-white/[0.08] bg-muted/20 text-[12px] placeholder:text-muted-foreground/45"
        />
        <Button
          type="submit"
          size="sm"
          disabled={busy || !title.trim() || !threadId}
          className="h-8 shrink-0 px-2"
          aria-label="Add task"
        >
          <Plus aria-hidden className="size-3.5" />
        </Button>
      </div>

      {threads.length > 1 ?
        <Select
          value={threadId}
          items={threadItems}
          disabled={busy}
          onValueChange={(v) => setThreadId(v ?? "")}
        >
          <SelectTrigger
            className={cn(
              "h-7 w-full border-white/[0.08] bg-transparent text-[10px] text-muted-foreground",
            )}
          >
            <SelectValue placeholder="Thread" />
          </SelectTrigger>
          <SelectContent>
            {threads.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      : threads.length === 1 ?
        <p className="min-w-0 px-0.5">
          <EllipsisText text={threads[0]!.name} lines={2} className="text-[10px] text-muted-foreground/60" />
        </p>
      : null}
    </form>
  );
}
