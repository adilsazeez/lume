/** Thread/category palette — subdued, graphite-friendly (Railway-adjacent), not billboard neon */
export const NEON_THREAD_SWATCHES = [
  { label: "Aqua", hex: "#527a94" },
  { label: "Sky", hex: "#5c6f86" },
  { label: "Violet", hex: "#6d6494" },
  { label: "Purple", hex: "#756892" },
  { label: "Rose", hex: "#926474" },
  { label: "Pink", hex: "#88607c" },
  { label: "Amber", hex: "#917a62" },
  { label: "Sage", hex: "#697f64" },
];

export function categoryPresetHex(index: number) {
  const i = Math.abs(index) % NEON_THREAD_SWATCHES.length;
  return NEON_THREAD_SWATCHES[i]!.hex;
}
