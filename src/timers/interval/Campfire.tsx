import { useMemo, useRef } from "react";
import { clamp, lerp, useCanvas } from "../../core/canvas";
import { position, type Segment } from "../../core/engine";
import { getRun } from "../../core/runs";
import { isDark } from "../../core/settings";

/**
 * A pixel campfire driven by the classic "Doom fire" cellular automaton.
 * Every frame each cell copies the heat of a random neighbour below it and
 * cools a little; how fast it cools decides how tall the flames get.
 *
 *  idle   → a small pilot flame
 *  prep   → the fire catches and grows
 *  work   → roaring, tall, sparks flying
 *  rest   → low, cool teal embers
 *  paused → almost out
 *  done   → goes out with a puff of smoke and sparks
 *
 * A white-hot flare bursts on every new segment and pulses on 3-2-1.
 * Everything is written pixel by pixel into an ImageData at ~1 cell per
 * 4 CSS px and upscaled with nearest-neighbour.
 */

const CELL = 4; // CSS px per sim cell
const MAX_SPARKS = 72;
const MAX_SMOKE = 40;

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Ordered-dither thresholds (4×4 Bayer), 0..1.
const BAYER = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16));

// Flame bands from coolest to hottest (index 0 = no flame). Slot 2 is the accent.
const HOT: (RGB | null)[] = [null, hex("#b0182b"), null, hex("#ff8a1c"), hex("#ffb52e"), hex("#ffd23f"), hex("#fff7d1")];
const COOL: RGB[] = [[0, 0, 0], hex("#1d4a7a"), hex("#1f7fa0"), hex("#22b0bf"), hex("#3ddbd0"), hex("#a6f6ec"), hex("#f0fffd")];
const BANDS = 6;

const THEMES = {
  light: {
    bg: hex("#fbecd5"),
    dot: hex("#efdcbd"),
    line: hex("#1b1424"),
    flameLine: hex("#1b1424"),
    track: hex("#f1dcbc"),
    smoke: hex("#a99b8e"),
    bark: hex("#8a4b2a"),
    barkDark: hex("#5e2f1a"),
    wood: hex("#e8bd84"),
    ring: hex("#b07a45"),
    ground: hex("#f0d9b5"),
  },
  dark: {
    bg: hex("#2a2236"),
    dot: hex("#362c45"),
    line: hex("#fbf1e1"),
    flameLine: hex("#120d18"),
    track: hex("#3a3048"),
    smoke: hex("#7a6e88"),
    bark: hex("#7a4326"),
    barkDark: hex("#4a2514"),
    wood: hex("#d4a06a"),
    ring: hex("#9a6638"),
    ground: hex("#241d2f"),
  },
};

const PHASE_COLORS = {
  prep: hex("#ffd23f"),
  rest: hex("#3ddbd0"),
  done: hex("#7bd88f"),
};

// Log mask values.
const L_LINE = 1;
const L_BARK = 2;
const L_DARK = 3;
const L_WOOD = 4;
const L_RING = 5;
const L_CRACK = 6;

// Fast xorshift PRNG — Math.random is noticeably slower in the hot loop.
let seed = 0x9e3779b9;
const rnd = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
};

interface Sim {
  w: number;
  h: number;
  base: number; // fire source row
  groundY: number;
  cx: number;
  heat: Float32Array;
  band: Uint8Array;
  logs: Uint8Array;
  glow: Float32Array;
  img: ImageData;
  // smoothed controls
  src: number;
  spread: number;
  height: number;
  cool: number;
  flare: number;
  ember: number;
  acc: number;
  // event tracking
  key: string;
  tick: number;
  wasDone: boolean;
  // timeline cache
  tlSegments: Segment[] | null;
  tlW: number;
  tlKind: Uint8Array; // per column: 0 gap, 1 prep, 2 work, 3 rest
  tlStart: Float32Array; // per column: time (s) at column start
  // particles: x, y, vx, vy, life
  sparks: Float32Array;
  smoke: Float32Array;
}

function createSim(ctx: CanvasRenderingContext2D, w: number, h: number): Sim {
  const cx = Math.floor(w / 2);
  const len = Math.max(9, Math.round(w * 0.22));
  const lr = Math.max(1.8, w * 0.028);
  const tilt = Math.round(len * 0.3);
  const cy = Math.round(h - 10 - tilt - lr);
  const base = Math.max(8, cy - 1);
  const logs = new Uint8Array(w * h);
  rasterLogs(logs, w, h, cx, cy, len, lr, tilt);
  const glow = new Float32Array(w * h);
  const gr = Math.max(w, h) * 0.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / gr;
      const dy = (y - base + h * 0.15) / (gr * 0.9);
      const d = Math.sqrt(dx * dx + dy * dy);
      glow[y * w + x] = clamp(1 - d) ** 1.6;
    }
  }
  return {
    w,
    h,
    base,
    groundY: cy + Math.round(tilt * 0.5),
    cx,
    heat: new Float32Array(w * h),
    band: new Uint8Array(w * h),
    logs,
    glow,
    img: ctx.createImageData(w, h),
    src: 0.8,
    spread: 0.35,
    height: 0.2,
    cool: 0,
    flare: 0,
    ember: 0.5,
    acc: 0,
    key: "",
    tick: 0,
    wasDone: false,
    tlSegments: null,
    tlW: 0,
    tlKind: new Uint8Array(w),
    tlStart: new Float32Array(w + 1),
    sparks: new Float32Array(MAX_SPARKS * 5),
    smoke: new Float32Array(MAX_SMOKE * 5),
  };
}

/** Two crossed logs, rasterised once per resize into a mask. */
function rasterLogs(mask: Uint8Array, w: number, h: number, cx: number, cy: number, len: number, r: number, tilt: number) {
  const logsDef = [
    // back log first, front log overrides
    [cx - len, cy - tilt, cx + len, cy + tilt],
    [cx - len, cy + tilt, cx + len, cy - tilt],
  ];
  for (const [ax, ay, bx, by] of logsDef) {
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy);
    const ux = dx / L;
    const uy = dy / L;
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 2));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + r + 2));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 2));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(ay, by) + r + 2));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - ax;
        const py = y + 0.5 - ay;
        const along = px * ux + py * uy;
        const perp = -px * uy + py * ux;
        const ap = Math.abs(perp);
        if (along < -1 || along > L + 1 || ap > r + 1) continue;
        const i = y * w + x;
        if (along < 0 || along > L || ap > r) {
          mask[i] = L_LINE;
          continue;
        }
        const fromEnd = Math.min(along, L - along);
        if (fromEnd < 1.6) {
          // cut end with a growth ring
          mask[i] = ap < r * 0.35 && fromEnd > 0.6 ? L_RING : L_WOOD;
        } else if (perp > r * 0.35) {
          mask[i] = L_DARK;
        } else if (Math.floor(along / 4) % 3 === 1 && ap < r * 0.45) {
          mask[i] = L_CRACK;
        } else {
          mask[i] = L_BARK;
        }
      }
    }
  }
}

function spawnSpark(s: Sim, x: number, y: number, vx: number, vy: number) {
  const p = s.sparks;
  for (let i = 0; i < p.length; i += 5) {
    if (p[i + 4] <= 0) {
      p[i] = x;
      p[i + 1] = y;
      p[i + 2] = vx;
      p[i + 3] = vy;
      p[i + 4] = 1;
      return;
    }
  }
}

function spawnSmoke(s: Sim, x: number, y: number) {
  const p = s.smoke;
  for (let i = 0; i < p.length; i += 5) {
    if (p[i + 4] <= 0) {
      p[i] = x;
      p[i + 1] = y;
      p[i + 2] = (rnd() - 0.5) * 3;
      p[i + 3] = -(5 + rnd() * 6);
      p[i + 4] = 1;
      return;
    }
  }
}

/** One cellular-automaton step: seed the source row, then let heat rise. */
function stepFire(s: Sim, wind: number) {
  const { w, base, heat, cx } = s;
  const half = Math.max(2, w * 0.3 * s.spread);
  const row = base * w;
  for (let x = 0; x < w; x++) {
    const d = Math.abs(x - cx) / half;
    const env = d >= 1 ? 0 : 1 - d * d * d;
    let v = s.src * env * (0.72 + 0.28 * rnd());
    if (rnd() < 0.04 * s.src) v = Math.min(1, v * 1.25);
    heat[row + x] = v;
  }
  const avg = 1 / Math.max(3, s.height * base);
  const decayScale = 2 * avg;
  const windChance = Math.abs(wind);
  const windDir = wind > 0 ? 1 : -1;
  for (let y = 0; y < base; y++) {
    const below = (y + 1) * w;
    const here = y * w;
    for (let x = 0; x < w; x++) {
      const r = rnd();
      // offsets -1, 0, 0, +1: mostly straight up, so flames form tongues
      let sx = x + ((r * 4) | 0) - 1;
      if (sx > x + 1) sx = x;
      if (r < windChance * 0.3) sx += windDir;
      if (sx < 0) sx = 0;
      else if (sx >= w) sx = w - 1;
      const v = heat[below + sx] - decayScale * rnd();
      heat[here + x] = v > 0 ? v : 0;
    }
  }
}

function buildTimeline(s: Sim, segments: Segment[]) {
  const x0 = 3;
  const x1 = s.w - 4;
  const span = x1 - x0;
  let total = 0;
  for (const seg of segments) total += seg.seconds;
  s.tlKind.fill(0);
  if (total <= 0 || span <= 0) return;
  const kinds = new Uint8Array(segments.length);
  const starts: number[] = [];
  let acc = 0;
  segments.forEach((seg, i) => {
    kinds[i] = seg.kind === "prep" ? 1 : seg.kind === "rest" ? 3 : 2;
    starts.push(acc);
    acc += seg.seconds;
  });
  const showGaps = span / segments.length >= 3;
  let si = 0;
  for (let c = 0; c <= span; c++) {
    const t = (c / (span + 1)) * total;
    while (si < segments.length - 1 && t >= starts[si] + segments[si].seconds) si++;
    const tNext = ((c + 1) / (span + 1)) * total;
    const boundary = showGaps && si < segments.length - 1 && tNext > starts[si] + segments[si].seconds;
    s.tlKind[x0 + c] = boundary ? 0 : kinds[si];
    s.tlStart[x0 + c] = t;
  }
}

export function Campfire({
  timerId,
  accent,
  preview,
}: {
  timerId: string;
  accent: string;
  /** Segments to draw on the timeline before a run starts. */
  preview: Segment[];
}) {
  const simRef = useRef<Sim | null>(null);
  const accentRgb = useMemo(() => hex(accent), [accent]);
  const resolution = useMemo(() => 1 / (Math.min(2, window.devicePixelRatio || 1) * CELL), []);
  // Scratch palette buffers, reused every frame.
  const pal = useMemo(() => ({ r: new Uint8Array(BANDS + 1), g: new Uint8Array(BANDS + 1), b: new Uint8Array(BANDS + 1) }), []);

  const ref = useCanvas(
    (ctx, f) => {
      const w = f.width;
      const h = f.height;
      if (w < 16 || h < 24) return;
      let s = simRef.current;
      if (!s || s.w !== w || s.h !== h) {
        s = createSim(ctx, w, h);
        simRef.current = s;
      }
      const dt = f.dt;
      const now = Date.now();
      const theme = isDark() ? THEMES.dark : THEMES.light;

      // ---- Read live timer state -----------------------------------------
      const run = getRun(timerId);
      let phase: "idle" | "prep" | "work" | "rest" | "done" = "idle";
      let paused = false;
      let segProgress = 0;
      let elapsed = 0;
      let remaining = 0;
      let index = -1;
      let countdown = false;
      if (run) {
        const pos = position(run, now);
        index = pos.index;
        elapsed = pos.totalElapsed;
        if (run.finished || pos.done) {
          phase = "done";
        } else {
          const k = pos.segment.kind;
          phase = k === "rest" ? "rest" : k === "prep" ? "prep" : "work";
          paused = pos.paused;
          segProgress = pos.segProgress;
          remaining = pos.segRemaining;
          countdown = !!pos.segment.countdown;
        }
      }
      const segments = run ? run.segments : preview;

      // ---- Events: new segment flare, 3-2-1 pulses, burn-out -------------
      const key = run ? `${run.startedAt}:${index}` : "";
      if (run && phase !== "done" && key !== s.key) {
        s.flare = 1;
        for (let i = 0; i < 18; i++) {
          spawnSpark(s, s.cx + (rnd() - 0.5) * w * 0.3, s.base - rnd() * 6, (rnd() - 0.5) * 24, -(30 + rnd() * 50));
        }
      }
      s.key = key;
      const left = Math.ceil(remaining);
      if (phase !== "idle" && phase !== "done" && !paused && countdown && left >= 1 && left <= 3 && left !== s.tick) {
        s.flare = Math.max(s.flare, 0.45);
      }
      s.tick = left;
      const done = phase === "done";
      if (done && !s.wasDone) {
        for (let i = 0; i < 28; i++) {
          spawnSpark(s, s.cx + (rnd() - 0.5) * w * 0.25, s.base - rnd() * 10, (rnd() - 0.5) * 40, -(40 + rnd() * 70));
        }
        for (let i = 0; i < 10; i++) spawnSmoke(s, s.cx + (rnd() - 0.5) * w * 0.2, s.base - rnd() * 8);
      }
      s.wasDone = done;

      // ---- Targets for the fire controls ---------------------------------
      const breathe = Math.sin(f.time * 1.4) * 0.5 + 0.5;
      let tSrc = 0.85;
      let tSpread = 0.42;
      let tHeight = 0.22 + breathe * 0.06;
      let tCool = 0;
      let tEmber = 0.6;
      let wind = Math.sin(f.time * 0.37) * 0.25;
      if (phase === "prep") {
        tSrc = 0.9;
        tSpread = lerp(0.45, 0.85, segProgress);
        tHeight = lerp(0.24, 0.45, segProgress);
        tEmber = 0.8;
      } else if (phase === "work") {
        tSrc = 1;
        tSpread = 1;
        tHeight = 0.62 + 0.12 * segProgress + Math.sin(f.time * 3.1) * 0.03;
        tEmber = 1;
        wind = Math.sin(f.time * 0.6) * 0.35;
      } else if (phase === "rest") {
        tSrc = 0.8;
        tSpread = 0.75;
        tHeight = 0.2 + breathe * 0.04;
        tCool = 1;
        tEmber = 0.7;
        // Last 3 s of a rest: the fire starts to reheat in anticipation.
        if (remaining < 3) {
          const k = 1 - remaining / 3;
          tCool = 1 - k * 0.6;
          tHeight = lerp(tHeight, 0.42, k);
        }
      } else if (done) {
        tSrc = 0;
        tSpread = 0.3;
        tHeight = 0.08;
        const since = run?.finishedAt ? (now - run.finishedAt) / 1000 : 99;
        tEmber = clamp(1 - since / 12) * 0.8;
        tCool = 0;
      }
      if (paused) {
        tSrc = 0.6;
        tSpread = 0.38;
        tHeight = 0.12 + breathe * 0.03;
        tEmber = 0.5;
      }

      const ease = (rate: number) => 1 - Math.exp(-dt * rate);
      s.src = lerp(s.src, tSrc, ease(done ? 1.2 : 4));
      s.spread = lerp(s.spread, tSpread, ease(3));
      s.height = lerp(s.height, tHeight + s.flare * 0.3, ease(6));
      s.cool = lerp(s.cool, tCool, ease(2.5));
      s.ember = lerp(s.ember, tEmber, ease(1.5));
      s.flare = Math.max(0, s.flare - dt * 1.6);

      // ---- Simulate (fixed 60 Hz steps) ----------------------------------
      s.acc += dt * 60;
      let steps = 0;
      while (s.acc >= 1 && steps < 3) {
        stepFire(s, wind);
        s.acc -= 1;
        steps++;
      }
      if (steps === 3) s.acc = 0;

      // Ambient sparks while burning.
      const sparkRate = phase === "work" && !paused ? 22 : phase === "prep" ? 6 : phase === "idle" ? 1.2 : 2;
      if (!done && rnd() < sparkRate * dt * s.src) {
        spawnSpark(s, s.cx + (rnd() - 0.5) * w * 0.4 * s.spread, s.base - s.height * s.base * rnd() * 0.6, (rnd() - 0.5) * 14, -(18 + rnd() * 30));
      }
      if (done) {
        const since = run?.finishedAt ? (now - run.finishedAt) / 1000 : 99;
        const rate = since < 5 ? 7 : 1.2;
        if (rnd() < rate * dt) spawnSmoke(s, s.cx + (rnd() - 0.5) * w * 0.12, s.base - 1);
      }

      // ---- Palette for this frame -----------------------------------------
      for (let b = 1; b <= BANDS; b++) {
        const hot = HOT[b] ?? accentRgb;
        const cool = COOL[b];
        pal.r[b] = lerp(hot[0], cool[0], s.cool);
        pal.g[b] = lerp(hot[1], cool[1], s.cool);
        pal.b[b] = lerp(hot[2], cool[2], s.cool);
      }
      const glowCol: RGB = [
        lerp(accentRgb[0], 61, s.cool),
        lerp(accentRgb[1], 219, s.cool),
        lerp(accentRgb[2], 208, s.cool),
      ];
      const glowAmt = clamp(s.src * (0.35 + s.height * 1.1) * (1 + s.flare * 0.6));
      const flareBoost = s.flare * 1.6;

      // ---- Heat → bands (posterised + Bayer dithered) --------------------
      const { heat, band, base } = s;
      for (let y = 0; y <= base; y++) {
        const by = (y & 3) << 2;
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const hv = Math.sqrt(heat[i]);
          const q = (hv * hv * 0.35 + hv * 0.65) * BANDS * 1.05 + flareBoost * hv + (BAYER[by | (x & 3)] - 0.5) * 0.5 - 0.35;
          band[i] = q < 1 ? 0 : q >= BANDS ? BANDS : q | 0;
        }
      }

      // ---- Compose pixels ------------------------------------------------
      const d = s.img.data;
      const { bg, dot, line, ground } = theme;
      const emberFlicker = s.ember * (0.6 + 0.4 * Math.sin(f.time * 7.3));
      for (let y = 0; y < h; y++) {
        const by = (y & 3) << 2;
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          const o = i * 4;
          let r: number;
          let g: number;
          let b: number;
          const m = s.logs[i];
          const bnd = y <= base ? band[i] : 0;
          if (m) {
            let c: RGB;
            if (m === L_LINE) c = line;
            else if (m === L_BARK) c = theme.bark;
            else if (m === L_DARK) c = theme.barkDark;
            else if (m === L_WOOD) c = theme.wood;
            else if (m === L_RING) c = theme.ring;
            else {
              // glowing crack in the bark
              const e = emberFlicker;
              r = lerp(theme.barkDark[0], glowCol[0], e);
              g = lerp(theme.barkDark[1], glowCol[1], e * 0.8);
              b = lerp(theme.barkDark[2], glowCol[2], e * 0.8);
              d[o] = r;
              d[o + 1] = g;
              d[o + 2] = b;
              d[o + 3] = 255;
              continue;
            }
            r = c[0];
            g = c[1];
            b = c[2];
          } else if (bnd > 0) {
            r = pal.r[bnd];
            g = pal.g[bnd];
            b = pal.b[bnd];
          } else {
            // outline around the flame silhouette
            const edge =
              (y <= base &&
                ((x > 0 && band[i - 1] > 0) || (x < w - 1 && band[i + 1] > 0) || (y < base && band[i + w] > 0))) ||
              (y > 0 && y - 1 <= base && band[i - w] > 0);
            if (edge) {
              r = theme.flameLine[0];
              g = theme.flameLine[1];
              b = theme.flameLine[2];
            } else {
              const isDot = x % 6 === 3 && y % 6 === 3;
              const c = y > s.groundY ? ground : isDot ? dot : bg;
              r = c[0];
              g = c[1];
              b = c[2];
              // dithered glow halo
              const gl = s.glow[i] * glowAmt;
              const th = BAYER[by | (x & 3)];
              if (gl > th) {
                const k = gl > th + 0.45 ? 0.26 : 0.13;
                r = lerp(r, glowCol[0], k);
                g = lerp(g, glowCol[1], k);
                b = lerp(b, glowCol[2], k);
              }
            }
          }
          d[o] = r;
          d[o + 1] = g;
          d[o + 2] = b;
          d[o + 3] = 255;
        }
      }

      // ---- Particles ------------------------------------------------------
      const put = (x: number, y: number, c: RGB | [number, number, number]) => {
        const xi = x | 0;
        const yi = y | 0;
        if (xi < 0 || yi < 0 || xi >= w || yi >= h - 8) return;
        const o = (yi * w + xi) * 4;
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
      };
      const sm = s.smoke;
      for (let i = 0; i < sm.length; i += 5) {
        if (sm[i + 4] <= 0) continue;
        sm[i + 4] -= dt / 4.5;
        sm[i] += sm[i + 2] * dt + Math.sin(f.time * 1.3 + i) * dt * 2;
        sm[i + 1] += sm[i + 3] * dt;
        const life = sm[i + 4];
        const rad = 1.5 + (1 - life) * 4;
        const alpha = life * 0.9;
        const r2 = rad * rad;
        for (let oy = -Math.ceil(rad); oy <= Math.ceil(rad); oy++) {
          for (let ox = -Math.ceil(rad); ox <= Math.ceil(rad); ox++) {
            if (ox * ox + oy * oy > r2) continue;
            const px = (sm[i] + ox) | 0;
            const py = (sm[i + 1] + oy) | 0;
            if (BAYER[((py & 3) << 2) | (px & 3)] < alpha) put(px, py, theme.smoke);
          }
        }
      }
      const sp = s.sparks;
      for (let i = 0; i < sp.length; i += 5) {
        if (sp[i + 4] <= 0) continue;
        sp[i + 4] -= dt * 0.9;
        sp[i + 2] += (rnd() - 0.5) * 60 * dt + wind * 8 * dt;
        sp[i + 3] += 6 * dt;
        sp[i] += sp[i + 2] * dt;
        sp[i + 1] += sp[i + 3] * dt;
        const life = sp[i + 4];
        if (life <= 0 || sp[i + 1] < 7) {
          sp[i + 4] = 0;
          continue;
        }
        const bandIdx = life > 0.6 ? 6 : life > 0.3 ? 5 : 4;
        if (life < 0.3 && rnd() < 0.4) continue; // flicker out
        put(sp[i], sp[i + 1], [pal.r[bandIdx], pal.g[bandIdx], pal.b[bandIdx]]);
      }

      // ---- Timeline strip (top) -------------------------------------------
      if (s.tlSegments !== segments || s.tlW !== w) {
        buildTimeline(s, segments);
        s.tlSegments = segments;
        s.tlW = w;
      }
      const blink = Math.sin(f.time * 8) > 0;
      for (let x = 3; x <= w - 4; x++) {
        const k = s.tlKind[x];
        if (!k) continue;
        const kc: RGB = k === 1 ? PHASE_COLORS.prep : k === 3 ? PHASE_COLORS.rest : accentRgb;
        const t0 = s.tlStart[x];
        const t1 = x + 1 <= w - 4 ? s.tlStart[x + 1] : Infinity;
        const passed = run && (done || t1 <= elapsed);
        const current = run && !done && t0 <= elapsed && elapsed < t1;
        const fade = passed ? 0 : current ? (blink ? 0 : 0.3) : 0.62;
        const c: RGB = [lerp(kc[0], bg[0], fade), lerp(kc[1], bg[1], fade), lerp(kc[2], bg[2], fade)];
        for (let y = 3; y <= 4; y++) {
          const o = (y * w + x) * 4;
          d[o] = c[0];
          d[o + 1] = c[1];
          d[o + 2] = c[2];
        }
      }

      // ---- Current-segment bar (bottom) -----------------------------------
      const bx0 = 2;
      const bx1 = w - 3;
      const by0 = h - 7;
      const by1 = h - 3;
      const fillC: RGB = done
        ? PHASE_COLORS.done
        : phase === "rest"
          ? PHASE_COLORS.rest
          : phase === "prep"
            ? PHASE_COLORS.prep
            : accentRgb;
      const prog = done ? 1 : phase === "idle" ? 0 : segProgress;
      const fillTo = bx0 + 1 + Math.round((bx1 - bx0 - 1) * prog);
      for (let y = by0; y <= by1; y++) {
        for (let x = bx0; x <= bx1; x++) {
          const o = (y * w + x) * 4;
          const border = y === by0 || y === by1 || x === bx0 || x === bx1;
          let c: RGB;
          if (border) c = line;
          else if (x < fillTo) {
            // a lighter stripe on the top row of the fill for a bit of shine
            c = y === by0 + 1 ? [lerp(fillC[0], 255, 0.35), lerp(fillC[1], 255, 0.35), lerp(fillC[2], 255, 0.35)] : fillC;
          } else c = theme.track;
          d[o] = c[0];
          d[o + 1] = c[1];
          d[o + 2] = c[2];
          d[o + 3] = 255;
        }
      }
      // rounded corners: knock out the four corner pixels
      for (const [x, y] of [
        [bx0, by0],
        [bx1, by0],
        [bx0, by1],
        [bx1, by1],
      ]) {
        const o = (y * w + x) * 4;
        d[o] = ground[0];
        d[o + 1] = ground[1];
        d[o + 2] = ground[2];
      }

      ctx.putImageData(s.img, 0, 0);
    },
    { resolution, pixelated: true },
  );

  return <canvas ref={ref} aria-hidden />;
}
