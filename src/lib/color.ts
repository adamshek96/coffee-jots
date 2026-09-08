/** Nudge a hex colour lighter (positive) or darker (negative), clamped. */
export function shiftHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
