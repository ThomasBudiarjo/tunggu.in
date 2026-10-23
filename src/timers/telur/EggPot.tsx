import { useRef, type RefObject } from "react";
import { clamp, hexToRgb, smoothstep, useCanvas } from "../../core/canvas";
import { position } from "../../core/engine";
import { getRun } from "../../core/runs";
import { isDark } from "../../core/settings";
import { DONENESS, donenessById, type DonenessId, type EggMeta } from "./data";
import { calibrate, CORE, EggSim, EH, EW, MASK, RIM, SHELL, WHITE, YOLK, YOLK_CX, YOLK_CY, YOLK_RX, YOLK_RY } from "./sim";

/**
 * Pixel-art pot on a stove with a halved egg in it. The egg is a live
 * heat-diffusion sim (see sim.ts) drawn cell-by-cell into an ImageData:
 * raw white is see-through, turns opaque as it sets; the yolk goes from
 * glossy orange to pale and crumbly. Ice bath swaps the pot water for
 * blue with floating ice cubes.
 */

type RGB = readonly [number, number, number];
const rgb = (h: string): RGB => hexToRgb(h).map((v) => Math.round(v * 255)) as unknown as RGB;

/** Scene height in art pixels; width follows the stage aspect ratio. */
const SH = 116;
const MAX_STEAM = 18;
const MAX_BUBBLES = 34;

const YOLK_STOPS: RGB[] = ["#ff780a", "#ffa020", "#ffbd3a", "#ffd256", "#f3dd85", "#dcd389"].map(rgb);
const GREEN_RING = rgb("#9c9d63");
const WHITE_SET = rgb("#fffaf0");
const WHITE_RAW = rgb("#eef6e4");
const SHELL_LIGHT = rgb("#f6dcb3");
const SHELL_DARK = rgb("#ddb88a");
const HEAT_STOPS: { t: number; c: RGB }[] = [
  { t: 0, c: rgb("#2b3fa0") },
  { t: 25, c: rgb("#6c4fd1") },
  { t: 50, c: rgb("#d2479a") },
  { t: 70, c: rgb("#ff6e45") },
  { t: 85, c: rgb("#ffaf3a") },
  { t: 100, c: rgb("#fff3a6") },
];

interface Theme {
  bg: RGB;
  tile: RGB;
  ink: RGB;
  waterTop: RGB;
  waterBot: RGB;
  iceTop: RGB;
  iceBot: RGB;
  stove: RGB;
  steam: RGB;
}
const LIGHT: Theme = {
  bg: rgb("#fbecd5"),
  tile: rgb("#f0dcbc"),
  ink: rgb("#1b1424"),
  waterTop: rgb("#9fd4e6"),
  waterBot: rgb("#5fa9cc"),
  iceTop: rgb("#cdeeff"),
  iceBot: rgb("#86c8f2"),
  stove: rgb("#3a3145"),
  steam: rgb("#ffffff"),
};
const DARK: Theme = {
  bg: rgb("#2a2236"),
  tile: rgb("#322940"),
  ink: rgb("#0c0912"),
  waterTop: rgb("#3b7193"),
  waterBot: rgb("#1f4766"),
  iceTop: rgb("#5d9fd6"),
  iceBot: rgb("#2c5f99"),
  stove: rgb("#120e18"),
  steam: rgb("#d9d2e6"),
};

let thresholds: number[] | null = null;
const getThresholds = () => (thresholds ??= calibrate(DONENESS.map((d) => d.base)));

/** Yolk set level 0 (runny) … 4 (crumbly), >4 overcooked. */
function yolkLevel(p: number, T: number[]) {
  if (p <= T[0]) return 0;
  for (let i = 0; i < T.length - 1; i++) {
    if (p <= T[i + 1]) return i + (p - T[i]) / (T[i + 1] - T[i]);
  }
  const n = T.length - 1;
  return Math.min(5.5, n + (p - T[n]) / (T[n] - T[n - 1]));
}

function ramp(stops: RGB[], v: number, out: number[]) {
  const x = clamp(v, 0, stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  out[0] = a[0] + (b[0] - a[0]) * f;
  out[1] = a[1] + (b[1] - a[1]) * f;
  out[2] = a[2] + (b[2] - a[2]) * f;
}

function heatColor(t: number, out: number[]) {
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    const a = HEAT_STOPS[i];
    const b = HEAT_STOPS[i + 1];
    if (t <= b.t || i === HEAT_STOPS.length - 2) {
      const f = clamp((t - a.t) / (b.t - a.t));
      out[0] = a.c[0] + (b.c[0] - a.c[0]) * f;
      out[1] = a.c[1] + (b.c[1] - a.c[1]) * f;
      out[2] = a.c[2] + (b.c[2] - a.c[2]) * f;
      return;
    }
  }
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Per-cell fixed noise for crumbly yolk / white texture. */
const NOISE = Float32Array.from({ length: EW * EH }, (_, i) => hash(i) * 2 - 1);

interface Bubble {
  x: number;
  y: number;
  vy: number;
  r: number;
  ph: number;
}
interface Steam {
  x: number;
  y: number;
  life: number;
  ph: number;
}

interface State {
  sim: EggSim;
  clock: number;
  img: ImageData | null;
  off: HTMLCanvasElement | null;
  bubbles: Bubble[];
  steam: Steam[];
  spawn: number;
  steamSpawn: number;
  coreShown: number;
  surf: Float32Array;
  col: number[];
}

export function EggPot({
  timerId,
  preview,
  thermal,
  accent,
  coreRef,
}: {
  timerId: string;
  /** Doneness to show while idle. */
  preview: DonenessId;
  thermal: boolean;
  accent: string;
  /** Element whose text shows the yolk-centre temperature. */
  coreRef: RefObject<HTMLSpanElement | null>;
}) {
  const st = useRef<State | null>(null);
  st.current ??= {
    sim: new EggSim(),
    clock: 0,
    img: null,
    off: null,
    bubbles: [],
    steam: [],
    spawn: 0,
    steamSpawn: 0,
    coreShown: -999,
    surf: new Float32Array(512),
    col: [0, 0, 0],
  };

  const ref = useCanvas((ctx, f) => {
    const s = st.current!;
    const T = getThresholds();
    const theme = isDark() ? DARK : LIGHT;
    const acc = rgb(accent);

    // ---- Where are we? -------------------------------------------------
    const run = getRun(timerId);
    let mode: "idle" | "cook" | "ice" | "done" = "idle";
    let paused = false;
    let iceLook = false;
    let cookRef = donenessById(preview).base;
    let iceRef = 0;
    if (run && run.segments.length) {
      const meta = (run.meta ?? {}) as Partial<EggMeta>;
      const done = donenessById(meta.done ?? preview);
      const pos = position(run);
      const cookSeg = run.segments[0];
      const ratio = done.base / Math.max(1, meta.cook ?? cookSeg.seconds);
      if (pos.segment.kind === "ice") {
        cookRef = cookSeg.seconds * ratio;
        iceRef = pos.segElapsed;
        iceLook = true;
      } else {
        cookRef = pos.segElapsed * ratio;
      }
      paused = pos.paused && !run.finished;
      mode = run.finished ? "done" : pos.segment.kind === "ice" ? "ice" : "cook";
    }
    s.sim.seek(Math.min(cookRef, 1800), Math.min(iceRef, 900));
    const { temp, peak } = s.sim;

    const dt = paused ? 0 : f.dt;
    s.clock += dt;
    const t = s.clock;
    const heat = mode === "cook" ? 1 : mode === "idle" ? 0.4 : 0;

    // ---- Buffer ---------------------------------------------------------
    const SW = Math.max(64, Math.min(260, Math.round((SH * f.cssWidth) / f.cssHeight)));
    if (!s.img || s.img.width !== SW) {
      s.img = new ImageData(SW, SH);
      s.off ??= document.createElement("canvas");
      s.off.width = SW;
      s.off.height = SH;
    }
    const d = s.img.data;
    const put = (x: number, y: number, r: number, g: number, b: number) => {
      if (x < 0 || y < 0 || x >= SW || y >= SH) return;
      const i = (y * SW + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    };
    const blend = (x: number, y: number, c: RGB | number[], a: number) => {
      if (x < 0 || y < 0 || x >= SW || y >= SH || a <= 0) return;
      const i = (y * SW + x) * 4;
      d[i] += (c[0] - d[i]) * a;
      d[i + 1] += (c[1] - d[i + 1]) * a;
      d[i + 2] += (c[2] - d[i + 2]) * a;
    };

    // ---- Layout ---------------------------------------------------------
    const cx = Math.floor(SW / 2);
    const half = Math.min(Math.floor(SW / 2) - 5, 60);
    const potL = cx - half;
    const potR = cx + half;
    const rimY = 11;
    const waterY = 16;
    const potBot = SH - 17;
    const wall = 3;

    // Kitchen tiles behind.
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const tileLine = x % 14 === 0 || y % 14 === 0;
        const c = tileLine ? theme.tile : theme.bg;
        put(x, y, c[0], c[1], c[2]);
      }
    }

    // Stove grate + flames under the pot.
    const stoveY = potBot + 8;
    for (let y = stoveY; y < SH; y++) {
      for (let x = potL - 4; x <= potR + 4; x++) put(x, y, theme.stove[0], theme.stove[1], theme.stove[2]);
    }
    if (heat > 0) {
      for (let x = potL + 4; x <= potR - 4; x++) {
        if ((x - potL) % 6 === 0) continue;
        const fl = (2.5 + 3 * (0.5 + 0.5 * Math.sin(x * 1.7 + t * 13 + Math.sin(x * 0.9 + t * 5)))) * heat;
        const hgt = Math.min(6, Math.round(fl));
        for (let k = 0; k < hgt; k++) {
          const y = stoveY - 1 - k;
          const tip = k / Math.max(1, hgt);
          if (tip > 0.66) put(x, y, 255, 120, 60);
          else if (tip > 0.3) put(x, y, acc[0], acc[1], acc[2]);
          else put(x, y, 120, 190, 255);
        }
      }
    }

    // Water surface profile.
    const amp = mode === "cook" ? 1.3 : mode === "ice" || iceLook ? 0.5 : mode === "idle" ? 0.7 : 0.35;
    for (let x = potL; x <= potR; x++) {
      s.surf[x] =
        waterY +
        amp * (Math.sin(x * 0.23 + t * 3.1) + 0.55 * Math.sin(x * 0.57 - t * 4.6) + 0.3 * Math.sin(x * 1.3 + t * 7));
    }

    // Water.
    const useIce = iceLook || (mode === "done" && run?.segments.some((g) => g.kind === "ice"));
    const top = useIce ? theme.iceTop : theme.waterTop;
    const bot = useIce ? theme.iceBot : theme.waterBot;
    for (let x = potL + wall; x <= potR - wall; x++) {
      const sy = Math.round(s.surf[x]);
      for (let y = sy; y <= potBot - wall; y++) {
        const v = (y - waterY) / (potBot - waterY);
        let r = top[0] + (bot[0] - top[0]) * v;
        let g = top[1] + (bot[1] - top[1]) * v;
        let b = top[2] + (bot[2] - top[2]) * v;
        // Warm glow near the flame.
        const glow = heat * 0.35 * v * v * v;
        r += (255 - r) * glow;
        g += (150 - g) * glow;
        b += (70 - b) * glow;
        // Pixel caustics.
        if (((x * 7 + y * 13 + Math.floor(t * (useIce ? 2 : 4))) & 31) === 0) {
          r += 14;
          g += 14;
          b += 14;
        }
        put(x, y, r, g, b);
      }
      // Foam line.
      blend(x, sy, theme.steam, 0.55);
    }

    // Bubbles (behind the egg).
    if (!paused) {
      const rate = mode === "cook" ? 22 : mode === "idle" ? 5 : 0;
      s.spawn += rate * dt;
      while (s.spawn >= 1) {
        s.spawn -= 1;
        if (s.bubbles.length < MAX_BUBBLES) {
          s.bubbles.push({
            x: potL + wall + 2 + Math.random() * (potR - potL - wall * 2 - 4),
            y: potBot - wall - 1,
            vy: 14 + Math.random() * 18,
            r: Math.random() < 0.25 ? 2 : Math.random() < 0.5 ? 1 : 0,
            ph: Math.random() * 6.28,
          });
        }
      }
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        const b = s.bubbles[i];
        b.y -= b.vy * dt;
        b.vy += 10 * dt;
        if (b.y <= s.surf[Math.round(b.x)] + 1 || mode === "ice" || mode === "done") s.bubbles.splice(i, 1);
      }
    }
    for (const b of s.bubbles) {
      const bx = Math.round(b.x + Math.sin(t * 6 + b.ph) * 0.7);
      const by = Math.round(b.y);
      if (b.r === 0) blend(bx, by, theme.steam, 0.75);
      else if (b.r === 1) {
        blend(bx - 1, by, theme.steam, 0.7);
        blend(bx + 1, by, theme.steam, 0.7);
        blend(bx, by - 1, theme.steam, 0.7);
        blend(bx, by + 1, theme.steam, 0.7);
      } else {
        for (let k = -1; k <= 1; k++) {
          blend(bx + k, by - 2, theme.steam, 0.75);
          blend(bx + k, by + 2, theme.steam, 0.75);
          blend(bx - 2, by + k, theme.steam, 0.75);
          blend(bx + 2, by + k, theme.steam, 0.75);
        }
        blend(bx - 1, by - 1, [255, 255, 255], 0.9);
      }
    }

    // Pot walls (cut-away) in the accent colour, with an inky outline.
    const potShade = [acc[0] * 0.78, acc[1] * 0.78, acc[2] * 0.7];
    for (let y = rimY; y <= potBot; y++) {
      for (let k = 0; k < wall; k++) {
        const c = k === 0 ? potShade : acc;
        put(potL + k, y, c[0], c[1], c[2]);
        put(potR - k, y, c[0], c[1], c[2]);
      }
      put(potL - 1, y, theme.ink[0], theme.ink[1], theme.ink[2]);
      put(potR + 1, y, theme.ink[0], theme.ink[1], theme.ink[2]);
    }
    for (let y = potBot - wall + 1; y <= potBot; y++) {
      for (let x = potL; x <= potR; x++) {
        const c = y === potBot ? potShade : acc;
        put(x, y, c[0], c[1], c[2]);
      }
    }
    for (let x = potL - 1; x <= potR + 1; x++) put(x, potBot + 1, theme.ink[0], theme.ink[1], theme.ink[2]);
    // Rim lip + handles.
    for (let x = potL - 2; x <= potR + 2; x++) {
      put(x, rimY - 1, theme.ink[0], theme.ink[1], theme.ink[2]);
      put(x, rimY, acc[0], acc[1], acc[2]);
      put(x, rimY + 1, theme.ink[0], theme.ink[1], theme.ink[2]);
    }
    for (let y = rimY + 4; y <= rimY + 7; y++) {
      for (let k = 2; k <= 4; k++) {
        const c = y === rimY + 4 || y === rimY + 7 || k === 4 ? theme.ink : acc;
        put(potL - k, y, c[0], c[1], c[2]);
        put(potR + k, y, c[0], c[1], c[2]);
      }
    }

    // Steam above the pot.
    if (!paused) {
      const steamRate = mode === "cook" ? 7 : mode === "idle" ? 2 : mode === "done" && !useIce ? 2 : 0;
      s.steamSpawn += steamRate * dt;
      while (s.steamSpawn >= 1) {
        s.steamSpawn -= 1;
        if (s.steam.length < MAX_STEAM) {
          s.steam.push({ x: potL + 6 + Math.random() * (potR - potL - 12), y: rimY - 2, life: 1, ph: Math.random() * 6.28 });
        }
      }
      for (let i = s.steam.length - 1; i >= 0; i--) {
        const p = s.steam[i];
        p.y -= 5 * dt;
        p.life -= dt / 2.2;
        if (p.life <= 0) s.steam.splice(i, 1);
      }
    }
    for (const p of s.steam) {
      const x = Math.round(p.x + Math.sin(p.y * 0.5 + p.ph) * 1.5);
      const y = Math.round(p.y);
      const a = 0.65 * p.life;
      blend(x, y, theme.steam, a);
      blend(x + 1, y, theme.steam, a * 0.6);
      blend(x, y - 1, theme.steam, a * 0.5);
    }

    // ---- Egg ------------------------------------------------------------
    const bob = mode === "cook" ? Math.round(Math.sin(t * 3.3) * 0.9) : mode === "ice" ? Math.round(Math.sin(t * 1.2) * 0.6) : 0;
    const ex0 = cx - Math.floor(EW / 2);
    const ey0 = Math.round(SH * 0.45 - EH / 2) + bob;
    const coreLevel = yolkLevel(peak[CORE], T);
    const gloss = clamp(1 - coreLevel / 1.8);
    const col = s.col;
    for (let ey = 0; ey < EH; ey++) {
      const sy = ey0 + ey;
      for (let ex = 0; ex < EW; ex++) {
        const i = ey * EW + ex;
        const m = MASK[i];
        if (!m) continue;
        const sx = ex0 + ex;
        if (m === RIM) {
          put(sx, sy, theme.ink[0], theme.ink[1], theme.ink[2]);
          continue;
        }
        if (m === SHELL) {
          const c = ex + ey > EW * 0.9 + EH * 0.55 ? SHELL_DARK : SHELL_LIGHT;
          put(sx, sy, c[0], c[1], c[2]);
          continue;
        }
        if (thermal) {
          heatColor(temp[i], col);
          const n = NOISE[i] * 4;
          put(sx, sy, col[0] + n, col[1] + n, col[2] + n);
          continue;
        }
        if (m === WHITE) {
          const set = smoothstep(52, 68, peak[i]);
          const n = NOISE[i] * 3 * set;
          const p = (sy * SW + sx) * 4;
          // Raw white: mostly see-through to the water behind.
          const rr = d[p] + (WHITE_RAW[0] - d[p]) * 0.38;
          const rg = d[p + 1] + (WHITE_RAW[1] - d[p + 1]) * 0.38;
          const rb = d[p + 2] + (WHITE_RAW[2] - d[p + 2]) * 0.38;
          put(
            sx,
            sy,
            rr + (WHITE_SET[0] - rr) * set + n,
            rg + (WHITE_SET[1] - rg) * set + n,
            rb + (WHITE_SET[2] - rb) * set + n,
          );
          continue;
        }
        if (m === YOLK) {
          const lv = yolkLevel(peak[i], T);
          ramp(YOLK_STOPS, lv, col);
          // Crumbly texture once it's well set.
          const crumb = NOISE[i] * Math.max(0, lv - 2.6) * 9;
          let r = col[0] + crumb;
          let g = col[1] + crumb;
          let b = col[2] + crumb * 0.6;
          // Grey-green ring when overcooked.
          const nx = (ex - YOLK_CX) / YOLK_RX;
          const ny = (ey - YOLK_CY) / YOLK_RY;
          const rr = Math.sqrt(nx * nx + ny * ny);
          if (lv > 4.4 && rr > 0.82) {
            const k = clamp((lv - 4.4) * 0.9);
            r += (GREEN_RING[0] - r) * k;
            g += (GREEN_RING[1] - g) * k;
            b += (GREEN_RING[2] - b) * k;
          }
          // Wet highlight on runny yolk.
          if (gloss > 0) {
            const arc = rr > 0.5 && rr < 0.72 && nx < -0.12 && ny < -0.12;
            const dot = Math.abs(nx + 0.22) < 0.1 && Math.abs(ny + 0.42) < 0.09;
            if (arc || dot) {
              const shimmer = 0.75 + 0.25 * Math.sin(t * 2.5 + ex * 0.4);
              const k = gloss * shimmer * (dot ? 0.9 : 0.55);
              r += (255 - r) * k;
              g += (250 - g) * k;
              b += (225 - b) * k;
            }
          }
          put(sx, sy, r, g, b);
        }
      }
    }

    // Cute face on the finished yolk.
    if (mode === "done" && !thermal) {
      const fx = ex0 + Math.round(YOLK_CX);
      const fy = ey0 + Math.round(YOLK_CY);
      const blink = (t % 3.2) < 0.14;
      const ink = theme.ink === DARK.ink ? LIGHT.ink : theme.ink;
      for (const side of [-1, 1]) {
        const x = fx + side * 4;
        put(x, fy - 2, ink[0], ink[1], ink[2]);
        if (!blink) put(x, fy - 3, ink[0], ink[1], ink[2]);
        blend(x + side * 2, fy, [255, 120, 120], 0.6);
        blend(x + side * 3, fy, [255, 120, 120], 0.6);
      }
      put(fx - 1, fy + 1, ink[0], ink[1], ink[2]);
      put(fx, fy + 2, ink[0], ink[1], ink[2]);
      put(fx + 1, fy + 1, ink[0], ink[1], ink[2]);
    }

    // Ice cubes bobbing on the surface.
    if (useIce) {
      const cubes = [0.13, 0.28, 0.73, 0.88];
      cubes.forEach((fxr, k) => {
        const size = 8 + (k % 2) * 2;
        const x0 = Math.round(potL + (potR - potL) * fxr - size / 2);
        const y0 = Math.round(waterY - 3 + Math.sin(t * 1.4 + k * 1.9) * 1.2 + (k % 2));
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
            if (edge && (x === 0 || x === size - 1) && (y === 0 || y === size - 1)) continue;
            if (edge) put(x0 + x, y0 + y, 46, 96, 150);
            else if (x + y < 5 && x > 0 && y > 0) put(x0 + x, y0 + y, 255, 255, 255);
            else if (x === size - 2 || y === size - 2) put(x0 + x, y0 + y, 170, 214, 245);
            else put(x0 + x, y0 + y, 236, 248, 255);
          }
        }
      });
    }

    // Sparkles when it's done.
    if (mode === "done") {
      const pts = [
        [-30, -20],
        [29, -26],
        [33, 8],
        [-34, 14],
        [-20, -38],
        [22, 30],
      ];
      pts.forEach(([ox, oy], k) => {
        const ph = (t * 1.6 + k * 0.37) % 1;
        const size = ph < 0.5 ? Math.round(ph * 6) : Math.round((1 - ph) * 6);
        const x = cx + ox;
        const y = Math.round(SH * 0.45) + oy;
        if (size <= 0) return;
        put(x, y, 255, 255, 255);
        for (let r = 1; r <= size; r++) {
          const c = r === size ? acc : [255, 255, 255];
          put(x + r, y, c[0], c[1], c[2]);
          put(x - r, y, c[0], c[1], c[2]);
          put(x, y + r, c[0], c[1], c[2]);
          put(x, y - r, c[0], c[1], c[2]);
        }
      });
    }

    // Paused: soft veil.
    if (paused) {
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if ((x + y) % 2 === 0) blend(x, y, theme.bg, 0.25);
    }

    // ---- Present ---------------------------------------------------------
    const off = s.off!;
    const octx = off.getContext("2d")!;
    octx.putImageData(s.img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, f.width, f.height);

    const core = Math.round(temp[CORE]);
    if (coreRef.current && core !== s.coreShown) {
      s.coreShown = core;
      coreRef.current.textContent = `${core}°C`;
    }
  });

  return <canvas ref={ref} aria-hidden />;
}
