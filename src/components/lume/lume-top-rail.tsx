"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { WORKFLOW_COPY } from "@/lib/lume-workflow";
import { useTodayFocusStore } from "@/stores/lume-store";

export function LumeTopRail({
  todayCue,
  onRefresh,
  syncing,
  children,
}: {
  todayCue?: string;
  syncing?: boolean;
  onRefresh?: () => Promise<void> | void;
  children?: ReactNode;
}) {
  const todayFocusActive = useTodayFocusStore((s) => s.todayFocusActive);
  const setTodayFocusActive = useTodayFocusStore((s) => s.setTodayFocusActive);

  return (
    <header className="z-30 shrink-0 border-b border-lume-border-strong bg-lume-app/95 backdrop-blur-md">
      <div className="flex h-11 items-center gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="flex min-w-0 items-center gap-2 truncate text-[13px] font-medium tracking-[0.12em] text-foreground uppercase">
            <img
              src="/lume-icon.svg"
              alt=""
              aria-hidden
              className="size-[18px] shrink-0"
            />
            Lume
          </h1>
          {todayCue ?
            <span className="hidden text-[11px] tabular-nums text-lume-text-secondary sm:inline">
              {todayCue}
            </span>
          : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <label className="flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5">
                  <span className="text-[10px] font-medium tracking-wide text-lume-text-muted uppercase">
                    Focus view
                  </span>
                  <Switch
                    size="sm"
                    checked={todayFocusActive}
                    aria-label="Focus view — separate Focus from Next on the canvas"
                    onCheckedChange={setTodayFocusActive}
                  />
                </label>
              }
            />
            <TooltipContent side="bottom" className="max-w-[240px] text-pretty">
              When on, threads in today&apos;s Focus stay bright; Next threads dim until you want them.
            </TooltipContent>
          </Tooltip>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-muted-foreground"
            disabled={Boolean(syncing) || !Boolean(onRefresh)}
            onClick={() => {
              void Promise.resolve(onRefresh?.());
            }}
            title="Pull latest from Supabase"
          >
            {syncing ? "Sync…" : "Sync"}
          </Button>

          {children}
        </div>
      </div>

      <span aria-live="polite" className="sr-only" />
    </header>
  );
}
