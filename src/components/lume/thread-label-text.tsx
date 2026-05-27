"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ThreadLabelTextProps = {
  text: string;
  className?: string;
  /** Fires when 2-line clamp hides remaining content. */
  onTruncatedChange?: (truncated: boolean) => void;
};

/** Canvas thread title — wraps up to 2 lines, reports overflow to parent. */
export function ThreadLabelText({ text, className, onTruncatedChange }: ThreadLabelTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const truncated = el.scrollHeight > el.clientHeight + 1;
      onTruncatedChange?.(truncated);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, onTruncatedChange]);

  return (
    <span
      ref={ref}
      className={cn(
        "block text-pretty break-words [overflow-wrap:anywhere]",
        "line-clamp-2 leading-snug",
        className,
      )}
    >
      {text}
    </span>
  );
}
