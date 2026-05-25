"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, PencilIcon, Trash2 } from "lucide-react";

import type { ThreadRow } from "@/types/lume";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { urgencyForDueDate } from "@/lib/timeline";
import { cn } from "@/lib/utils";

function fmtDay(iso: string) {
  return format(parseISO(`${iso.slice(0, 10)}T12:00:00.000Z`), "d MMM yyyy");
}

export function ThreadDetailSheet(props: {
  open: boolean;
  busy: boolean;
  thread: ThreadRow | null;
  todayISO: string;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onCommitNoteNow: () => Promise<void>;
  isSelectedToday: boolean;
  onToggleTodayFocus: (next: boolean) => Promise<void>;
  onToggleSubthread: (subId: string, done: boolean) => Promise<void>;
  onAddSubthread: (title: string) => Promise<void>;
  onClose: () => void;
  onEditThread: () => void;
  onDeleteThread: () => Promise<void>;
}) {
  const {
    open,
    busy,
    thread,
    todayISO,
    noteDraft,
    onNoteDraftChange,
    onCommitNoteNow,
    isSelectedToday,
    onToggleTodayFocus,
    onToggleSubthread,
    onAddSubthread,
    onClose,
    onEditThread,
    onDeleteThread,
  } = props;

  const [subsOpen, setSubsOpen] = React.useState(true);
  const [subDraft, setSubDraft] = React.useState("");



  if (!thread) return null;

  const threadName = thread.name;

  const urgency = urgencyForDueDate(thread.due_date, todayISO);

  const subthreads = [...(thread.subthreads ?? [])].sort(
    (a, b) =>
      a.sort_order === b.sort_order
        ? a.name.localeCompare(b.name)
        : a.sort_order - b.sort_order,
  );

  async function submitSub(ev: React.FormEvent) {
    ev.preventDefault();
    const t = subDraft.trim();

    if (!t || busy) return;

    await onAddSubthread(t);
    setSubDraft("");
  }

  async function removeThread() {
    if (
      !window.confirm(
        `Delete "${threadName}"? Subthreads, notes, and today selections for this thread will be removed.`,
      )
    ) {
      return;
    }

    await onDeleteThread();
  }

  return (
    <Sheet
      open={open}
      key={`${thread.id}-${open ? "visible" : "hidden"}`}
      onOpenChange={(next) => {
        if (!next) {
          void onCommitNoteNow();
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          "flex w-full max-w-lg flex-col border-l border-white/14 bg-muted/95 p-0 sm:max-w-lg",
          "pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]",
        )}
      >
        <SheetHeader className="space-y-4 border-b border-white/13 p-6 text-start">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="mt-2 h-8 w-[3px] shrink-0 rounded-full"
              style={{
                backgroundColor: thread.color,
                boxShadow:
                  urgency === "hot"
                    ? "0 0 26px rgb(248 113 113 / .45)"
                    : "0 0 22px rgb(34 211 238 / .4)",
              }}
            />

            <div className="min-w-0 flex-1 space-y-2">
              <SheetTitle className="text-xl leading-tight">{thread.name}</SheetTitle>
              <SheetDescription className="sr-only">
                Inspect this thread spanning start to due anchors.
              </SheetDescription>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{thread.category?.name ?? "Uncategorized"}</Badge>
                <Badge variant="outline">{thread.status}</Badge>

                <Badge
                  variant="secondary"
                  className={cn(urgency === "hot" && "border-orange-900/72 text-orange-100")}
                >
                  urgency {urgency}
                </Badge>
              </div>

              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {thread.description || "Add a short signal line when you revisit this thread."}
              </p>
            </div>

            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onEditThread}>
              <PencilIcon className="mr-2 size-4" aria-hidden /> Edit thread
            </Button>
          </div>

          <Separator className="bg-white/[0.12]" />

          <dl className="grid gap-4 text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.22em]">Start anchor</dt>
              <dd className="font-mono text-sm text-foreground">{fmtDay(thread.start_date)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.22em]">Due horizon</dt>
              <dd className="font-mono text-[13px]" style={{ color: thread.color }}>
                {fmtDay(thread.due_date)}
              </dd>
            </div>
          </dl>
        </SheetHeader>

        <ScrollArea className="max-h-[min(620px,75vh)]">
          <div className="space-y-10 px-6 py-6">
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-6">
                <Label htmlFor={`today-focus-${thread.id}`}>Work on today</Label>
                <Switch
                  id={`today-focus-${thread.id}`}
                  checked={isSelectedToday}
                  disabled={busy}
                  aria-label="Toggle today-focus visibility for this thread"
                  onCheckedChange={(checked) =>
                    void onToggleTodayFocus(checked === true)
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Pairs with the Today focus mode switch in the cockpit header strip.
              </p>
            </section>

            <section className="space-y-2">
              <Label htmlFor={`note-${thread.id}`}>Progress ({todayISO})</Label>

              <Textarea
                id={`note-${thread.id}`}
                disabled={busy}
                rows={5}
                placeholder="Optional daily trace for this thread."
                value={noteDraft}
                onChange={(event) => onNoteDraftChange(event.target.value)}
                onBlur={() => void onCommitNoteNow()}
              />

              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void onCommitNoteNow()}>
                Persist note instantly
              </Button>
            </section>

            <Collapsible open={subsOpen} onOpenChange={(v) => setSubsOpen(v)}>
              <CollapsibleTrigger
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-white/17 bg-muted/70 px-3 py-2 text-left text-sm font-medium hover:bg-muted/85"
              >
                <span>Subthreads ({subthreads.length})</span>
                <ChevronDown className={cn("size-4 transition-transform", subsOpen && "rotate-180")} />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-4 space-y-4">
                  <ul className="space-y-3">
                    {subthreads.map((s) => (
                      <li key={s.id} className="flex items-start gap-3 text-sm">
                        <Checkbox
                          checked={s.done}
                          disabled={busy}
                          aria-label={`Complete ${s.name}`}
                          onCheckedChange={(v) => void onToggleSubthread(s.id, v === true)}
                        />
                        <span
                          className={cn(
                            "leading-snug",
                            s.done && "text-muted-foreground line-through",
                          )}
                        >
                          {s.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => void submitSub(e)}>
                    <Input
                      disabled={busy}
                      value={subDraft}
                      placeholder="Micro-thread (+ Enter)"
                      onChange={(e) => setSubDraft(e.target.value)}
                    />
                    <Button type="submit" size="sm" disabled={busy || !subDraft.trim()}>
                      Add subthread
                    </Button>
                  </form>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <section className="border-t border-white/[0.1] pt-6">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => void removeThread()}
              >
                <Trash2 className="mr-2 size-4" aria-hidden />
                Delete thread
              </Button>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
