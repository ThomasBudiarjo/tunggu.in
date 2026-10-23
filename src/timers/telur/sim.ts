/**
 * A tiny 2D heat-diffusion model of a halved egg.
 *
 * The egg is a grid of cells (shell / white / yolk). While cooking, the
 * shell is clamped to 100 °C and heat spreads inward with an explicit
 * finite-difference step; during the ice bath the shell is clamped to 2 °C.
 * Every cell remembers its peak temperature — that's what decides how
 * "set" the protein looks (coagulation doesn't undo when it cools).
 *
 * The sim is always a reference egg (L, straight from the fridge) running
 * on "reference seconds". The page maps the real elapsed time of the cook
 * segment onto reference seconds, so a smaller or warmer egg cooked for
 * fewer real seconds ends up looking exactly like the chosen doneness.
 */

export const EW = 48;
export const EH = 62;

export const OUT = 0;
export const SHELL = 1;
export const WHITE = 2;
export const YOLK = 3;
export const RIM = 4; // outline ring just outside the shell

/** Diffusion per sub-step, sub-steps per reference second. */
const K = 0.14;
const SUBSTEPS = 2;
export const START_TEMP = 5;
export const BOIL_TEMP = 100;
export const ICE_TEMP = 2;

export const CX = (EW - 1) / 2;
export const CY = (EH - 1) / 2;
export const YOLK_CX = CX;
export const YOLK_CY = CY + 3;
export const YOLK_RX = 12.5;
export const YOLK_RY = 13;

function buildMask() {
  const m = new Uint8Array(EW * EH);
  const a = (EW - 4) / 2;
  const b = (EH - 4) / 2;
  const inside = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= EW || y >= EH) return false;
    const v = (y - CY) / b;
    if (v <= -1 || v >= 1) return false;
    const half = a * Math.sqrt(1 - v * v) * (1 + 0.13 * v);
    return Math.abs(x - CX) <= half;
  };
  for (let y = 0; y < EH; y++) {
    for (let x = 0; x < EW; x++) {
      if (!inside(x, y)) continue;
      const i = y * EW + x;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) m[i] = SHELL;
      else {
        const dx = (x - YOLK_CX) / YOLK_RX;
        const dy = (y - YOLK_CY) / YOLK_RY;
        m[i] = dx * dx + dy * dy <= 1 ? YOLK : WHITE;
      }
    }
  }
  // Outline ring.
  for (let y = 0; y < EH; y++) {
    for (let x = 0; x < EW; x++) {
      const i = y * EW + x;
      if (m[i] !== OUT) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= EW || ny >= EH) continue;
          if (m[ny * EW + nx] === SHELL) m[i] = RIM;
        }
      }
    }
  }
  return m;
}

export const MASK = buildMask();
const INTERIOR = (() => {
  const list: number[] = [];
  for (let i = 0; i < MASK.length; i++) if (MASK[i] === WHITE || MASK[i] === YOLK) list.push(i);
  return Int32Array.from(list);
})();
const SHELLS = (() => {
  const list: number[] = [];
  for (let i = 0; i < MASK.length; i++) if (MASK[i] === SHELL) list.push(i);
  return Int32Array.from(list);
})();
export const CORE = Math.round(YOLK_CY) * EW + Math.round(YOLK_CX);

export class EggSim {
  temp = new Float32Array(EW * EH);
  peak = new Float32Array(EW * EH);
  private next = new Float32Array(EW * EH);
  /** Reference sub-steps done in each phase. */
  cookSteps = 0;
  iceSteps = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.temp.fill(START_TEMP);
    this.peak.fill(START_TEMP);
    this.cookSteps = 0;
    this.iceSteps = 0;
  }

  private step(boundary: number, trackPeak: boolean) {
    const t = this.temp;
    const n = this.next;
    for (let s = 0; s < SHELLS.length; s++) t[SHELLS[s]] = boundary;
    for (let s = 0; s < INTERIOR.length; s++) {
      const i = INTERIOR[s];
      const c = t[i];
      n[i] = c + K * (t[i - 1] + t[i + 1] + t[i - EW] + t[i + EW] - 4 * c);
    }
    for (let s = 0; s < INTERIOR.length; s++) {
      const i = INTERIOR[s];
      t[i] = n[i];
      if (trackPeak && n[i] > this.peak[i]) this.peak[i] = n[i];
    }
    if (trackPeak) for (let s = 0; s < SHELLS.length; s++) this.peak[SHELLS[s]] = boundary;
  }

  /**
   * Bring the sim to exactly `cookSec` reference seconds of boiling,
   * followed by `iceSec` seconds in ice water. Steps forward when it can,
   * replays from raw when asked to go back in time.
   */
  seek(cookSec: number, iceSec: number) {
    const wantCook = Math.max(0, Math.floor(cookSec * SUBSTEPS));
    const wantIce = Math.max(0, Math.floor(iceSec * SUBSTEPS));
    const behind =
      wantCook < this.cookSteps ||
      (wantIce > 0 && this.cookSteps !== wantCook && this.iceSteps > 0) ||
      wantIce < this.iceSteps;
    if (behind) this.reset();
    if (this.iceSteps === 0) {
      while (this.cookSteps < wantCook) {
        this.step(BOIL_TEMP, true);
        this.cookSteps++;
      }
    }
    while (this.iceSteps < wantIce) {
      this.step(ICE_TEMP, false);
      this.iceSteps++;
    }
  }
}

/** Peak temperatures of yolk cells, sorted, at `sec` reference seconds. */
function yolkPeaksAt(sim: EggSim, sec: number) {
  sim.seek(sec, 0);
  const vals: number[] = [];
  for (let i = 0; i < MASK.length; i++) if (MASK[i] === YOLK) vals.push(sim.peak[i]);
  return vals.sort((a, b) => a - b);
}

/**
 * Yolk "set level" thresholds: the yolk temperature reached by the inner
 * part of the yolk at each doneness's reference time. A yolk cell whose
 * peak equals thresholds[i] is drawn at doneness level i.
 */
export function calibrate(refTimes: readonly number[], quantile = 0.3) {
  const sim = new EggSim();
  return refTimes.map((t) => {
    const v = yolkPeaksAt(sim, t);
    return v[Math.floor(v.length * quantile)];
  });
}
