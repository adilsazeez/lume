"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import type { ThreadRow } from "@/types/lume";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const soleThread = threads.length === 1 ? threads[0]! : null;
  const selectedThread = threads.find((t) => t.id === threadId) ?? null;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !threadId) return;

    await onSubmit({ thread_id: threadId, title: trimmed });
    setTitle("");
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex shrink-0 items-center gap-1 border-b border-lume-border/80 px-2 py-1"
    >
      {threads.length > 1 ?
        <Select
          value={threadId}
          items={threadItems}
          disabled={busy}
          onValueChange={(v) => setThreadId(v ?? "")}
        >
          <SelectTrigger
            size="sm"
            aria-label="Thread for new task"
            title={selectedThread?.name}
            className={cn(
              "h-7 min-w-[5.25rem] max-w-[7.5rem] shrink-0 gap-0.5 rounded-md border-lume-border-strong bg-lume-surface/80 px-1 py-0",
              "text-[10px] leading-none font-normal text-lume-text-muted shadow-none",
              "[&_svg]:size-2.5 [&_svg]:opacity-50",
              "*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate *:data-[slot=select-value]:text-[10px]",
            )}
          >
            {selectedThread ?
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: selectedThread.color, opacity: 0.85 }}
              />
            : null}
            <SelectValue placeholder="Thread" />
          </SelectTrigger>
          <SelectContent
            align="start"
            alignItemWithTrigger={false}
            className="w-auto min-w-[12rem] max-w-[min(16rem,calc(100vw-2rem))]"
          >
            {threads.map((t) => (
              <SelectItem
                key={t.id}
                value={t.id}
                className="py-1.5 pl-1.5 text-[11px] leading-snug [&_[data-slot=select-item-text]]:whitespace-normal [&_[data-slot=select-item-text]]:break-words"
              >
                <span className="flex items-start gap-1.5">
                  <span
                    aria-hidden
                    className="mt-1 size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color, opacity: 0.85 }}
                  />
                  <span>{t.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      : soleThread ?
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: soleThread.color, opacity: 0.85 }}
          title={soleThread.name}
        />
      : null}

      <Input
        value={title}
        disabled={busy || threads.length === 0}
        placeholder={threads.length === 0 ? "No active threads" : "Add task…"}
        onChange={(e) => setTitle(e.target.value)}
        className="h-7 min-w-0 flex-1 border-lume-border-strong bg-lume-surface/80 px-2 text-[11px] placeholder:text-lume-text-muted"
      />

      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        disabled={busy || !title.trim() || !threadId}
        className="size-7 shrink-0 text-lume-text-muted hover:text-foreground"
        aria-label="Add task"
      >
        <Plus aria-hidden className="size-3.5" />
      </Button>
    </form>
  );
}
