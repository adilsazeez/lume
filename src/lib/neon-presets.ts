/** Thread/category palette — visible on dark canvas, restrained chroma (not billboard neon). */
export const NEON_THREAD_SWATCHES = [
  { label: "Aqua", hex: "#6ec4e8" },
  { label: "Sky", hex: "#7eb3e8" },
  { label: "Violet", hex: "#a898e8" },
  { label: "Purple", hex: "#b090d8" },
  { label: "Rose", hex: "#e89aaa" },
  { label: "Pink", hex: "#d888b8" },
  { label: "Amber", hex: "#e4b888" },
  { label: "Sage", hex: "#8ec898" },
];

export function categoryPresetHex(index: number) {
  const i = Math.abs(index) % NEON_THREAD_SWATCHES.length;
  return NEON_THREAD_SWATCHES[i]!.hex;
}
