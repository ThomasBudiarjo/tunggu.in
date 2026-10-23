import type { LapInfo } from "./state";

/** Planet colours — shared by the canvas and the lap list so they match. */
export const FAST_COLOR = "#58d36a";
export const SLOW_COLOR = "#ff5a5a";
export const PLANET_COLORS = ["#ffd23f", "#b69cff", "#ff7eb6", "#4cc9f0", "#ff9f1c"];

export function planetColor(l: LapInfo) {
  return l.kind === "fast" ? FAST_COLOR : l.kind === "slow" ? SLOW_COLOR : PLANET_COLORS[(l.n - 1) % PLANET_COLORS.length];
}
