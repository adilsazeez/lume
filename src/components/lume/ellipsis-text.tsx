import { cn } from "@/lib/utils";

export function EllipsisText({
  text,
  lines = 2,
  className,
}: {
  text: string;
  lines?: 1 | 2 | 3;
  className?: string;
}) {
  const clamp =
    lines === 1 ? "line-clamp-1"
    : lines === 3 ? "line-clamp-3"
    : "line-clamp-2";

  return (
    <span title={text} className={cn(clamp, "break-words [overflow-wrap:anywhere]", className)}>
      {text}
    </span>
  );
}
