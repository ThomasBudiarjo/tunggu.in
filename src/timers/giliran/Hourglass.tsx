import { useRef } from "react";
import { clamp, hexToRgb, smoothstep, useCanvas, type Frame } from "../../core/canvas";
import { isDark } from "../../core/settings";
import { DANGER } from "./game";

/**
 * Pixel hourglass driven by a falling-sand cellular automaton.
 *
 * The grid is a fixed 44×80 buffer. Grains fall straight down, then
 * diagonally (angle of repose), and pass the neck only while the top bulb
 * holds more sand than the active player's remaining fraction allows —
 * so the sand always matches the clock, whatever the time control. When
 * the turn changes the glass spins 180° and the grid is rotated with it,
 * the old bottom pile collapsing into the new top bulb.
 */

export type GlassPhase = "idle" | "running" | "paused" | "flagged" | "over";

export interface GlassState {
  /** 0 when no game is running. Changing it resets without a flip. */
  matchId: number;
  /** Bumped on every turn change; each bump = one flip. */
  switches: number;
  color: string;
  /** 0..1 sand that should be in the top bulb. */
  frac: number;
  phase: GlassPhase;
  /** Under 10 s and ticking. */
  low: boolean;
}

const W = 44;
const H = 80;
const MID = H / 2; // first row of the bottom half; the gate sits between MID-1 and MID
const CX = W / 2;
const N = W * H;
const WALL = 255;
const SHADES = 16;
const FILL = 0.8;

const K_OUT = 0;
const K_IN = 1;
const K_EDGE = 2;
const K_LINE = 3;
const K_WOOD_HI = 4;
const K_WOOD = 5;
const K_WOOD_LO = 6;
const K_SHINE = 7;

const isInside = (k: number) => k === K_IN || k === K_SHINE;

function halfWidth(y: number) {
  if (y < 5 || y > H - 6) return 0;
  const d = Math.abs(y + 0.5 - MID);
  const u = clamp((d - 1.5) / (MID - 5.5 - 1.5));
  const g = Math.pow(Math.sin(Math.min(1, u / 0.6) * (Math.PI / 2)), 0.9) * (1 - 0.24 * smoothstep(0.76, 1, u));
  return 1 + 13 * g;
}

/** Static geometry, 180°-symmetric so a flipped grid lines up exactly. */
const KIND = (() => {
  const k = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    const hw = halfWidth(y);
    for (let x = 0; x < W; x++) if (hw > 0 && Math.abs(x + 0.5 - CX) < hw) k[y * W + x] = K_IN;
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (k[i] !== K_OUT) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++)
        for (let dx = -1; dx <= 1; dx++) if (k[i + dy * W + dx] === K_IN) near = true;
      if (near) k[i] = K_EDGE;
    }
  }
  // Top cap + posts + glass shine (top half), then mirror by 180° rotation.
  for (let y = 0; y < 4; y++)
    for (let x = 2; x <= W - 3; x++)
      k[y * W + x] = y === 0 || y === 3 || x === 2 || x === W - 3 ? K_LINE : y === 1 ? K_WOOD_HI : K_WOOD;
  for (let y = 4; y < MID; y++) {
    for (const x0 of [3, W - 6]) {
      k[y * W + x0] = K_LINE;
      k[y * W + x0 + 1] = K_WOOD_LO;
      k[y * W + x0 + 2] = K_LINE;
    }
    if (y >= 9 && y <= MID - 9) {
      let first = -1;
      for (let x = 0; x < W; x++) if (k[y * W + x] === K_IN) { first = x; break; }
      if (first >= 0) k[y * W + first + 2] = K_SHINE;
    }
  }
  for (let i = 0; i < N / 2; i++) k[N - 1 - i] = k[i];
  return k;
})();

/** Columns ordered from the centre outwards, for tidy surfaces. */
const XORDER = (() => {
  const xs: number[] = [];
  for (let d = 0; d < CX; d++) xs.push(CX - 1 - d, CX + d);
  return xs;
})();

const TOP_CAP = (() => {
  let c = 0;
  for (let i = 0; i < MID * W; i++) if (isInside(KIND[i])) c++;
  return c;
})();
const GRAINS = Math.round(TOP_CAP * FILL);

const pack = (r: number, g: number, b: number, a = 255) =>
  ((a << 24) | (clamp(Math.round(b), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(r), 0, 255)) >>> 0;

const hex255 = (hex: string) => hexToRgb(hex).map((v) => v * 255) as [number, number, number];

const easeFlip = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const PMAX = 72;

interface Sim {
  g: Uint8Array;
  acc: number;
  steps: number;
  lastMatch: number;
  lastSwitches: number;
  lastPhase: GlassPhase | "";
  flipT: number;
  flipQueue: number;
  col: [number, number, number];
  cracks: Int16Array;
  crackLen: number;
  shake: number;
  dark: boolean | null;
  stat: Uint32Array;
  glass: number;
  glassShine: number;
  off: HTMLCanvasElement;
  offCtx: CanvasRenderingContext2D;
  img: ImageData;
  px: Uint32Array;
  pal: Uint32Array;
  palHi: Uint32Array;
  glow: HTMLCanvasElement;
  glowKey: string;
  pattern: CanvasPattern | null;
  patternKey: string;
  // particles
  p: Float32Array; // x, y, vx, vy, life per particle
  pc: string[];
  pn: number;
}

function createSim(): Sim {
  const g = new Uint8Array(N);
  for (let i = 0; i < N; i++) g[i] = isInside(KIND[i]) ? 0 : WALL;
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const offCtx = off.getContext("2d")!;
  const img = offCtx.createImageData(W, H);
  const sim: Sim = {
    g,
    acc: 0,
    steps: 0,
    lastMatch: -1,
    lastSwitches: 0,
    lastPhase: "",
    flipT: -1,
    flipQueue: 0,
    col: [76, 201, 240],
    cracks: new Int16Array(200),
    crackLen: 0,
    shake: 0,
    dark: null,
    stat: new Uint32Array(N),
    glass: 0,
    glassShine: 0,
    off,
    offCtx,
    img,
    px: new Uint32Array(img.data.buffer),
    pal: new Uint32Array(SHADES),
    palHi: new Uint32Array(SHADES),
    glow: document.createElement("canvas"),
    glowKey: "",
    pattern: null,
    patternKey: "",
    p: new Float32Array(PMAX * 5),
    pc: Array(PMAX).fill("#fff"),
    pn: 0,
  };
  fillTo(sim, GRAINS);
  return sim;
}

const grain = () => 1 + ((Math.random() * SHADES) | 0);

/** Lay `top` grains in the upper bulb and the rest in the lower one, flat. */
function fillTo(sim: Sim, top: number) {
  const { g } = sim;
  for (let i = 0; i < N; i++) if (g[i] !== WALL) g[i] = 0;
  let left = top;
  const lay = (y: number) => {
    for (const x of XORDER) {
      if (left > 0 && g[y * W + x] === 0) {
        g[y * W + x] = grain();
        left--;
      }
    }
  };
  for (let y = MID - 1; y >= 0 && left > 0; y--) lay(y);
  left = GRAINS - top;
  for (let y = H - 1; y >= MID && left > 0; y--) lay(y);
}

function countTop(g: Uint8Array) {
  let c = 0;
  for (let i = 0; i < MID * W; i++) {
    const v = g[i];
    if (v !== 0 && v !== WALL) c++;
  }
  return c;
}

function step(sim: Sim, gateOpen: boolean) {
  const { g } = sim;
  sim.steps++;
  for (let y = H - 2; y >= 1; y--) {
    if (y === MID - 1 && !gateOpen) continue;
    const ltr = ((y + sim.steps) & 1) === 0;
    for (let k = 0; k < W; k++) {
      const x = ltr ? k : W - 1 - k;
      const i = y * W + x;
      const v = g[i];
      if (v === 0 || v === WALL) continue;
      const b = i + W;
      if (g[b] === 0) {
        g[b] = v;
        g[i] = 0;
        continue;
      }
      if (Math.random() < 0.1) continue; // a little friction: lumpier slopes
      const d = Math.random() < 0.5 ? -1 : 1;
      if (g[b + d] === 0) {
        g[b + d] = v;
        g[i] = 0;
      } else if (g[b - d] === 0) {
        g[b - d] = v;
        g[i] = 0;
      }
    }
  }
}

/** Topmost grain in rows [y0, y1), centre-out. Returns index or -1. */
function topmost(g: Uint8Array, y0: number, y1: number) {
  for (let y = y0; y < y1; y++)
    for (const x of XORDER) {
      const v = g[y * W + x];
      if (v !== 0 && v !== WALL) return y * W + x;
    }
  return -1;
}

/** Nudge the top bulb toward `target` grains without waiting on gravity. */
function sync(sim: Sim, target: number) {
  const { g } = sim;
  const top = countTop(g);
  const diff = top - target;
  if (diff > 3) {
    // Clock is ahead of the sand: drain from the surface into the stream.
    for (let n = Math.min(diff - 3, 10); n > 0; n--) {
      const from = topmost(g, 0, MID);
      if (from < 0) break;
      let placed = false;
      for (let y = MID; y < MID + 8 && !placed; y++)
        for (const x of [CX - 1, CX]) {
          const j = y * W + x;
          if (!placed && g[j] === 0) {
            g[j] = g[from];
            placed = true;
          }
        }
      if (!placed) break;
      g[from] = 0;
    }
  } else if (diff < 0) {
    // Refill: lift grains off the lower pile and rain them in from the top.
    for (let n = Math.min(-diff, 14); n > 0; n--) {
      const from = topmost(g, MID, H);
      if (from < 0) break;
      let to = -1;
      for (let tries = 0; tries < 6 && to < 0; tries++) {
        const y = 5 + ((Math.random() * 4) | 0);
        const x = 6 + ((Math.random() * (W - 12)) | 0);
        if (g[y * W + x] === 0) to = y * W + x;
      }
      if (to < 0) {
        for (let i = 0; i < MID * W; i++) if (g[i] === 0) { to = i; break; }
      }
      if (to < 0) break;
      g[to] = g[from];
      g[from] = 0;
    }
  }
  return diff > 0;
}

function rotateGrid(g: Uint8Array) {
  for (let i = 0, j = N - 1; i < j; i++, j--) {
    const t = g[i];
    g[i] = g[j];
    g[j] = t;
  }
}

/** Random-walk cracks from an impact point on the upper glass. */
function crack(sim: Sim) {
  sim.crackLen = 0;
  const starts: number[] = [];
  for (let y = 10; y < MID - 6; y++)
    for (let x = 0; x < W; x++) if (KIND[y * W + x] === K_EDGE) starts.push(y * W + x);
  const origin = starts[(Math.random() * starts.length) | 0] ?? MID * W;
  const ox = origin % W;
  const dirX = ox < CX ? 1 : -1;
  for (let b = 0; b < 4; b++) {
    let x = ox;
    let y = (origin / W) | 0;
    const dy = b % 2 === 0 ? 1 : -1;
    const len = 9 + ((Math.random() * 10) | 0);
    for (let s = 0; s < len && sim.crackLen < sim.cracks.length; s++) {
      if (Math.random() < 0.7) x += dirX;
      if (Math.random() < 0.5) y += dy;
      if (x < 1 || x >= W - 1 || y < 4 || y >= H - 4) break;
      const i = y * W + x;
      if (KIND[i] === K_OUT || KIND[i] === K_LINE) break;
      sim.cracks[sim.crackLen++] = i;
    }
  }
}

function burst(sim: Sim, x: number, y: number, n: number, colors: string[], speed: number) {
  for (let k = 0; k < n; k++) {
    const idx = sim.pn < PMAX ? sim.pn++ : (Math.random() * PMAX) | 0;
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    const o = idx * 5;
    sim.p[o] = x;
    sim.p[o + 1] = y;
    sim.p[o + 2] = Math.cos(a) * v;
    sim.p[o + 3] = Math.sin(a) * v - speed * 0.5;
    sim.p[o + 4] = 0.7 + Math.random() * 0.6;
    sim.pc[idx] = colors[k % colors.length];
  }
}

function buildStatic(sim: Sim, dark: boolean) {
  const line = dark ? pack(251, 241, 225) : pack(27, 20, 36);
  const wood = hex255("#ff7eb6");
  const woodHi = pack(255, 186, 216);
  const woodMid = pack(wood[0], wood[1], wood[2]);
  const woodLo = pack(214, 84, 142);
  sim.glass = dark ? pack(255, 255, 255, 26) : pack(255, 255, 255, 140);
  sim.glassShine = dark ? pack(255, 255, 255, 90) : pack(255, 255, 255, 245);
  for (let i = 0; i < N; i++) {
    switch (KIND[i]) {
      case K_EDGE:
      case K_LINE:
        sim.stat[i] = line;
        break;
      case K_WOOD_HI:
        sim.stat[i] = woodHi;
        break;
      case K_WOOD:
        sim.stat[i] = woodMid;
        break;
      case K_WOOD_LO:
        sim.stat[i] = woodLo;
        break;
      case K_SHINE:
        sim.stat[i] = sim.glassShine;
        break;
      case K_IN:
        sim.stat[i] = sim.glass;
        break;
      default:
        sim.stat[i] = 0;
    }
  }
}

/** Bayer-dithered spotlight behind the glass, at pixel-cell resolution. */
function buildGlow(sim: Sim, gw: number, gh: number, cx: number, cy: number, hex: string) {
  const key = `${gw}x${gh}:${cx}:${cy}:${hex}`;
  if (key === sim.glowKey) return;
  sim.glowKey = key;
  const c = sim.glow;
  c.width = gw;
  c.height = gh;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(gw, gh);
  const px = new Uint32Array(img.data.buffer);
  const [r, g, b] = hex255(hex);
  const col = pack(r, g, b);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const R = H * 0.62;
  for (let y = 0; y < gh; y++)
    for (let x = 0; x < gw; x++) {
      const d = Math.hypot((x - cx) * 1.15, (y - cy) * 0.85) / R;
      const v = Math.pow(clamp(1 - d), 1.3);
      if (v > (bayer[(y & 3) * 4 + (x & 3)] + 0.5) / 16) px[y * gw + x] = col;
    }
  ctx.putImageData(img, 0, 0);
}

function buildPattern(sim: Sim, ctx: CanvasRenderingContext2D, cell: number, dark: boolean) {
  const key = `${cell}:${dark}`;
  if (key === sim.patternKey) return;
  sim.patternKey = key;
  const t = document.createElement("canvas");
  t.width = cell * 2;
  t.height = cell * 2;
  const c = t.getContext("2d")!;
  c.fillStyle = dark ? "#fbf1e1" : "#1b1424";
  c.fillRect(0, 0, cell, cell);
  c.fillRect(cell, cell, cell, cell);
  sim.pattern = ctx.createPattern(t, "repeat");
}

export function Hourglass({ read }: { read: () => GlassState }) {
  const simRef = useRef<Sim | null>(null);

  const ref = useCanvas((ctx, f: Frame) => {
    if (!simRef.current) simRef.current = createSim();
    const sim = simRef.current;
    const st = read();
    const dark = isDark();
    if (sim.dark !== dark) {
      buildStatic(sim, dark);
      sim.dark = dark;
    }

    // ---- layout -------------------------------------------------------
    const w = f.width;
    const h = f.height;
    let s = Math.min((h * 0.84) / H, (w * 0.44) / W);
    if (s >= 2) s = Math.floor(s);
    const cx = Math.round(w * (w / h > 1.5 ? 0.3 : 0.28));
    const cy = Math.round(h * 0.5);

    // ---- state transitions -------------------------------------------
    if (st.matchId !== sim.lastMatch) {
      const first = sim.lastMatch === -1;
      sim.lastMatch = st.matchId;
      sim.lastSwitches = st.switches;
      sim.flipQueue = 0;
      sim.flipT = -1;
      if (first) {
        fillTo(sim, Math.round(GRAINS * st.frac));
        sim.col = hex255(st.color);
      }
    } else if (st.switches !== sim.lastSwitches) {
      sim.flipQueue += Math.abs(st.switches - sim.lastSwitches) % 2 === 1 ? 1 : 2;
      sim.lastSwitches = st.switches;
    }
    const broken = st.phase === "flagged" || st.phase === "over";
    if (st.phase !== sim.lastPhase) {
      if (broken) {
        crack(sim);
        sim.shake = 1;
        burst(sim, cx, cy - (H / 4) * s, 26, [DANGER, "#ffffff", dark ? "#fbf1e1" : "#1b1424"], s * 2.6);
      } else sim.crackLen = 0;
      sim.lastPhase = st.phase;
    }

    // ---- simulate -----------------------------------------------------
    const target = Math.round(GRAINS * clamp(st.frac));
    if (sim.flipT < 0 && sim.flipQueue > 0) {
      sim.flipT = 0;
      sim.flipQueue--;
    }
    let angle = 0;
    if (sim.flipT >= 0) {
      sim.flipT += f.dt / (0.5 / (1 + sim.flipQueue));
      if (sim.flipT >= 1) {
        sim.flipT = -1;
        rotateGrid(sim.g);
        const c = `rgb(${sim.col.map(Math.round).join(",")})`;
        burst(sim, cx, cy, 22, [c, dark ? "#fbf1e1" : "#ffffff", st.color], s * 2.2);
      } else angle = Math.PI * easeFlip(sim.flipT);
    } else if (st.phase !== "paused") {
      sim.acc += f.dt;
      let n = 0;
      while (sim.acc >= 1 / 60 && n < 3) {
        const open = sync(sim, broken ? 0 : target);
        step(sim, open);
        sim.acc -= 1 / 60;
        n++;
      }
      if (n === 3) sim.acc = 0;
    }

    // ---- colours ------------------------------------------------------
    const want = hex255(st.color);
    const k = 1 - Math.exp(-f.dt * 8);
    for (let c = 0; c < 3; c++) sim.col[c] += (want[c] - sim.col[c]) * k;
    const pulse = 0.5 + 0.5 * Math.sin(f.time * 10);
    const red = hex255(DANGER);
    const redAmt = broken ? 0.35 + 0.45 * pulse : st.low ? 0.25 * pulse : 0;
    const dim = st.phase === "paused" ? 0.72 : 1;
    for (let i = 0; i < SHADES; i++) {
      const f0 = (0.74 + 0.36 * (i / (SHADES - 1))) * dim;
      const base = [0, 1, 2].map((c) => sim.col[c] * f0 * (1 - redAmt) + red[c] * redAmt);
      sim.pal[i] = pack(base[0], base[1], base[2]);
      sim.palHi[i] = pack(base[0] + 55, base[1] + 55, base[2] + 55);
    }

    // ---- paint the glass buffer --------------------------------------
    const { g, px, stat } = sim;
    const glassCol = broken ? pack(255, 77, 77, Math.round((dark ? 40 : 90) + 90 * pulse)) : sim.glass;
    for (let i = 0; i < N; i++) {
      const v = g[i];
      if (v === WALL) px[i] = stat[i];
      else if (v === 0) px[i] = KIND[i] === K_SHINE ? sim.glassShine : glassCol;
      else px[i] = KIND[i] === K_SHINE ? sim.palHi[v - 1] : sim.pal[v - 1];
    }
    if (sim.crackLen) {
      const cc = pack(255, 255, 255);
      for (let c = 0; c < sim.crackLen; c++) px[sim.cracks[c]] = cc;
    }
    sim.offCtx.putImageData(sim.img, 0, 0);

    // ---- compose ------------------------------------------------------
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;

    const cell = Math.max(4, Math.round(s * 7));
    buildPattern(sim, ctx, cell, dark);
    if (sim.pattern) {
      ctx.globalAlpha = dark ? 0.05 : 0.045;
      ctx.fillStyle = sim.pattern;
      ctx.fillRect(0, 0, w, h);
    }

    const gw = Math.ceil(w / s);
    const gh = Math.ceil(h / s);
    const hot = broken || st.low;
    buildGlow(sim, gw, gh, Math.round(cx / s), Math.round(cy / s), hot ? DANGER : st.color);
    const breathe = st.phase === "running" ? 0.06 * Math.sin(f.time * 2.2) : 0;
    ctx.globalAlpha = (hot ? 0.3 + 0.25 * pulse : dark ? 0.3 : 0.42) + breathe;
    ctx.drawImage(sim.glow, 0, 0, gw * s, gh * s);
    ctx.globalAlpha = 1;

    // Ground shadow.
    const hw = (W - 4) * s;
    const gy = cy + (H / 2) * s + s;
    ctx.fillStyle = dark ? "rgba(0,0,0,0.45)" : "rgba(27,20,36,0.16)";
    ctx.fillRect(cx - hw / 2, gy, hw, s);
    ctx.fillRect(cx - hw / 2 + s * 2, gy + s, hw - s * 4, s);

    // Wobble when low, shake on flag.
    sim.shake = Math.max(0, sim.shake - f.dt * 1.6);
    let tilt = sim.shake * 0.09 * Math.sin(f.time * 55);
    if (st.low && st.phase === "running") tilt += 0.035 * Math.sin(f.time * 18);
    const jx = sim.shake * s * 1.5 * Math.sin(f.time * 70);

    ctx.save();
    ctx.translate(cx + jx, cy);
    ctx.rotate(angle + tilt);
    ctx.drawImage(sim.off, -(W * s) / 2, -(H * s) / 2, W * s, H * s);
    ctx.restore();

    // Particles.
    const P = sim.p;
    for (let i = 0; i < sim.pn; i++) {
      const o = i * 5;
      if (P[o + 4] <= 0) continue;
      P[o + 3] += 9 * s * f.dt;
      P[o] += P[o + 2] * f.dt * 30;
      P[o + 1] += P[o + 3] * f.dt * 30;
      P[o + 4] -= f.dt;
      ctx.globalAlpha = clamp(P[o + 4] * 1.4);
      ctx.fillStyle = sim.pc[i];
      const sz = Math.max(2, Math.round(s));
      ctx.fillRect(Math.round(P[o]), Math.round(P[o + 1]), sz, sz);
    }
    ctx.globalAlpha = 1;
  });

  return <canvas ref={ref} aria-hidden />;
}
