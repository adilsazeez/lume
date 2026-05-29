"use client";

import * as React from "react";

import type { CategoryRow } from "@/types/lume";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { NEON_THREAD_SWATCHES } from "@/lib/neon-presets";
import { cn } from "@/lib/utils";

const EXTRA_SWATCH = { hex: "#cbd5f5", label: "Muted" };

export type CategoryHandlers = {
  onCreate: (name: string, color: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function CategoryEditorRow({
  category,
  busy,
  onRename,
  onDelete,
}: {
  category: CategoryRow;
  busy: boolean;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(category.name);

  async function save() {
    const trimmed = draft.trim();

    if (!trimmed || busy) return;

    await onRename(category.id, trimmed);
    setEditing(false);
  }

  async function remove() {
    if (
      !window.confirm(
        "Delete this category? Threads referencing it detach without losing history.",
      )
    )
      return;

    await onDelete(category.id);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-lume-border-strong bg-card px-3 py-2 text-[13px]">
      <span
        className="h-10 w-10 shrink-0 rounded-full border border-white/26"
        style={{ backgroundColor: category.color }}
        aria-hidden
      />

      <div className="min-w-[160px] flex-1">
        {editing ? (
          <Input
            disabled={busy}
            value={draft}
            onChange={(evt) => setDraft(evt.target.value)}
            onKeyDown={(evt) =>
              evt.key === "Enter"
                ? void save()
                : evt.key === "Escape"
                  ? (() => {
                      setDraft(category.name);
                      setEditing(false);
                    })()
                  : undefined
            }
            autoFocus={editing}
          />
        ) : (
          <button
            type="button"
            disabled={busy}
            className="w-full truncate text-left font-semibold tracking-tight text-foreground"
            title={category.name}
            onClick={() => {
              setDraft(category.name);
              setEditing(true);
            }}
          >
            {category.name}
          </button>
        )}
      </div>

      <div className="ml-auto flex shrink-0 flex-wrap gap-2">
        {editing ?
          <>
            <Button disabled={busy} size="sm" variant="outline" type="button" onClick={() => void save()}>
              Save
            </Button>

            <Button
              disabled={busy}
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => {
                setDraft(category.name);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </>
        : <>
            <Button
              disabled={busy}
              size="sm"
              variant="outline"
              type="button"
              onClick={() => {
                setDraft(category.name);
                setEditing(true);
              }}
            >
              Rename
            </Button>

            <Button disabled={busy} size="sm" variant="destructive" type="button" onClick={() => void remove()}>
              Delete
            </Button>
          </>
        }
      </div>
    </div>
  );
}

export function CategoryManagerDialog({
  categories,
  open,
  busy,
  onOpenChange,
  onCreate,
  onRename,
  onDelete,
}: {
  categories: CategoryRow[];
  busy: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
} & CategoryHandlers) {
  const [label, setLabel] = React.useState("");
  const [hue, setHue] = React.useState<string>(NEON_THREAD_SWATCHES[0]?.hex ?? "#94a3b8");

  const swatches = React.useMemo(() => [...NEON_THREAD_SWATCHES, EXTRA_SWATCH], []);

  async function submitCreate(evt: React.FormEvent) {
    evt.preventDefault();
    const trimmed = label.trim();

    if (!trimmed || busy) return;

    await onCreate(trimmed, hue);
    setLabel("");
  }

  const sorted = React.useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);

        if (!next) {
          setLabel("");
          setHue(NEON_THREAD_SWATCHES[0]?.hex ?? "#94a3b8");
        }
      }}
    >
      <DialogContent className="flex max-h-[min(640px,90dvh)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-white/26 bg-muted/92 p-0 sm:max-w-xl">
        <div className="shrink-0 space-y-6 p-6 pb-4">
          <DialogHeader>
            <DialogTitle>Category manager</DialogTitle>

            <DialogDescription className="text-[13px]">
              Threads stay luminous—categories are soft labels for organizing threads on the timeline.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(evt) => void submitCreate(evt)}
            className="space-y-5 rounded-xl border border-lume-border-strong bg-lume-surface p-[18px]"
          >
          <div className="space-y-2">
            <Label className="" htmlFor="cat-label">
              New label
            </Label>

            <Input
              disabled={busy}
              id="cat-label"
              value={label}
              placeholder="Interview microthemes"
              onChange={(evt) => setLabel(evt.target.value)}
            />
          </div>

          <div className="">
            <p className="text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
              Glow
            </p>

            <div className="mt-2 flex flex-wrap gap-3">
              {swatches.map(({ hex }) => (
                <button
                  aria-label={`Select ${hex}`}
                  aria-pressed={hex === hue}
                  key={hex}
                  type="button"
                  disabled={busy}
                  title={hex}
                  className={cn(
                    "h-10 w-10 rounded-full border border-lume-border",
                    hex === hue ?
                      "ring-2 ring-lume-focus ring-offset-2 ring-offset-background"
                    : "opacity-[0.93] hover:opacity-100",
                  )}
                  style={{ backgroundColor: hex }}
                  onClick={() => setHue(hex)}
                />
              ))}
            </div>
          </div>

            <div className="flex justify-end">
              <Button disabled={busy || !label.trim()} type="submit" size="sm">
                Save category
              </Button>
            </div>
          </form>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-lume-border-strong px-6 py-4 [-webkit-overflow-scrolling:touch]">
          <div className="space-y-3">
            {sorted.map((category) => (
              <CategoryEditorRow
                key={category.id}
                busy={busy}
                category={category}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}

            {sorted.length === 0 ?
              <p className="text-[13px] text-muted-foreground">
                No categories yet—create one above.
              </p>
            : null}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t-0 bg-transparent">
          <Button variant="outline" disabled={busy} type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
