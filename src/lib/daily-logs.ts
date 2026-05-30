/** Separates multiple progress entries saved on the same Lume day. */
export const PROGRESS_NOTE_DELIMITER = " · ";

export function appendProgressNote(existingNote: string | null | undefined, addition: string): string {
  const prior = existingNote?.trim() ?? "";
  const next = addition.trim();
  if (!prior) return next;
  if (!next) return prior;
  return `${prior}${PROGRESS_NOTE_DELIMITER}${next}`;
}
