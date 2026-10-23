import { useRef } from "react";
import { clamp, smoothstep, useCanvas, type Frame } from "../../core/canvas";
import { position } from "../../core/engine";
import { getRun } from "../../core/runs";
import { isDark } from "../../core/settings";

/**
 * A little hill with a procedurally grown tree. Growth = focused time so far
 * over all focus time in the plan: the trunk thickens, branches stretch out
 * and leaf clusters pop in. Breaks bring wind, falling leaves and
 * butterflies; pausing desaturates everything and the tree snoozes; finishing
 * makes it bloom. Every completed session plants a flower on the hill.
 */

// ───────────────────────────── tree generation ─────────────────────────────

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Branch {
  parent: number;
  depth: number;
  /** Where on the parent it sprouts (0 base … 1 tip). */
  at: number;
  /** Angle relative to the parent, radians (0 = straight on). */
  ang: number;
  /** Full-grown length in scene units (1 = min(stage w, h)). */
  len: number;
  /** Relative thickness (trunk = 1). */
  w: number;
  born: number;
  span: number;
  phase: number;
}

interface Cluster {
  branch: number;
  along: number;
  off: number;
  r: number;
  born: number;
  tone: number;
  /** 0 nothing, 1 flower, 2 fruit — shown when the run is finished. */
  bloom: number;
  bloomDelay: number;
  bloomDx: number;
  bloomDy: number;
}

interface Tree {
  branches: Branch[];
  clusters: Cluster[];
  leafGrow: number;
  // Per-frame scratch buffers (no allocation in the draw loop).
  x0: Float32Array;
  y0: Float32Array;
  x1: Float32Array;
  y1: Float32Array;
  abs: Float32Array;
  g: Float32Array;
  cx: Float32Array;
  cy: Float32Array;
  cr: Float32Array;
}

const MAX_DEPTH = 4;
const MAX_BRANCHES = 72;

function makeTree(seed: number): Tree {
  const rnd = mulberry32(seed);
  const branches: Branch[] = [];
  const clusters: Cluster[] = [];
  const absAng: number[] = [];

  // Breadth-first so the branch cap trims evenly instead of lopsidedly.
  const queue: Array<{ parent: number; depth: number; at: number; ang: number; len: number; w: number; born: number }> = [
    { parent: -1, depth: 0, at: 0, ang: (rnd() - 0.5) * 0.08, len: 0.15, w: 1, born: 0 },
  ];
  while (queue.length && branches.length < MAX_BRANCHES) {
    const q = queue.shift()!;
    const i = branches.length;
    const span = q.depth === 0 ? 0.2 : 0.15 + rnd() * 0.07;
    branches.push({ ...q, span, phase: rnd() * Math.PI * 2 });
    absAng[i] = (q.parent >= 0 ? absAng[q.parent] : 0) + q.ang;

    // Every branch carries leaves soon after it sprouts, so the tree looks
    // alive at every stage — not a bare stick until the last session.
    if (q.depth >= 1) {
      const count = q.depth === MAX_DEPTH && rnd() < 0.4 ? 2 : 1;
      for (let c = 0; c < count; c++) {
        const roll = rnd();
        clusters.push({
          branch: i,
          along: c === 0 ? 0.92 + rnd() * 0.12 : 0.45 + rnd() * 0.3,
          off: (rnd() - 0.5) * 0.05,
          r: 0.05 - q.depth * 0.0045 + rnd() * 0.018,
          born: q.born + span * (0.35 + rnd() * 0.3),
          tone: rnd() < 0.45 ? 0 : 1,
          bloom: roll < 0.45 ? 1 : roll < 0.56 ? 2 : 0,
          bloomDelay: rnd() * 1.6,
          bloomDx: (rnd() - 0.5) * 0.9,
          bloomDy: (rnd() - 0.5) * 0.9,
        });
      }
    }
    if (q.depth === MAX_DEPTH) continue;
    const kids = q.depth === 0 ? 3 : rnd() < 0.6 ? 2 : 3;
    for (let k = 0; k < kids; k++) {
      const leader = k === 0;
      const side = k % 2 === 1 ? -1 : 1;
      let a = leader ? (rnd() - 0.5) * 0.4 : side * (0.5 + rnd() * 0.45);
      // Gravitropism: nothing points down.
      const abs = absAng[i] + a;
      if (abs > 1.3) a -= abs - 1.3;
      if (abs < -1.3) a += -1.3 - abs;
      const at = leader ? 1 : q.depth === 0 ? 0.55 + rnd() * 0.35 : 0.45 + rnd() * 0.5;
      queue.push({
        parent: i,
        depth: q.depth + 1,
        at,
        ang: a,
        len: q.len * (leader ? 0.74 + rnd() * 0.1 : 0.6 + rnd() * 0.16),
        w: q.w * (leader ? 0.7 : 0.56),
        born: q.born + span * (leader ? 0.6 : 0.25 + at * 0.4),
      });
    }
  }

  // Normalise the timeline so the last leaf finishes exactly at growth = 1.
  const leafGrow = 0.1;
  let end = 0;
  for (const b of branches) end = Math.max(end, b.born + b.span);
  for (const c of clusters) end = Math.max(end, c.born + leafGrow);
  for (const b of branches) {
    b.born /= end;
    b.span /= end;
  }
  for (const c of clusters) c.born /= end;

  // Fit the full-grown silhouette into a fixed box (0.56 tall, 0.9 wide).
  const n = branches.length;
  const x0 = new Float32Array(n);
  const y0 = new Float32Array(n);
  const x1 = new Float32Array(n);
  const y1 = new Float32Array(n);
  const abs = new Float32Array(n);
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  for (let i = 0; i < n; i++) {
    const b = branches[i];
    const p = b.parent;
    const sx = p < 0 ? 0 : x0[p] + (x1[p] - x0[p]) * b.at;
    const sy = p < 0 ? 0 : y0[p] + (y1[p] - y0[p]) * b.at;
    abs[i] = (p < 0 ? 0 : abs[p]) + b.ang;
    x0[i] = sx;
    y0[i] = sy;
    x1[i] = sx + Math.sin(abs[i]) * b.len;
    y1[i] = sy - Math.cos(abs[i]) * b.len;
  }
  for (const c of clusters) {
    const i = c.branch;
    const x = x0[i] + (x1[i] - x0[i]) * c.along;
    const y = y0[i] + (y1[i] - y0[i]) * c.along;
    minX = Math.min(minX, x - c.r);
    maxX = Math.max(maxX, x + c.r);
    minY = Math.min(minY, y - c.r);
  }
  const k = Math.min(0.56 / -minY, 0.9 / Math.max(0.01, maxX - minX), 1.5);
  for (const b of branches) b.len *= k;
  for (const c of clusters) {
    c.r *= k;
    c.off *= k;
  }

  const m = clusters.length;
  return {
    branches,
    clusters,
    leafGrow: leafGrow / end,
    x0,
    y0,
    x1,
    y1,
    abs,
    g: new Float32Array(n),
    cx: new Float32Array(m),
    cy: new Float32Array(m),
    cr: new Float32Array(m),
  };
}

// ───────────────────────────── colours ─────────────────────────────

const LIGHT = {
  skyTop: "#ffe2b6",
  skyBot: "#fff6e6",
  skyBreak: "#ffd0a0",
  skyLong: "#ffb28f",
  ink: "#1b1424",
  hillBack: "#b9e8a8",
  hill: "#63c477",
  hillDark: "#4aa760",
  bark: "#9a6239",
  leaf: "#7bd88f",
  leafDark: "#41a95f",
  leafLight: "#d2f8d6",
  sun: "#ffd23f",
  cloud: "#ffffff",
  petal: "#ff8fc0",
  petal2: "#ffffff",
  fruit: "#ff5a36",
  center: "#ffd23f",
  seed: "#8a5a3b",
  fly1: "#ffd23f",
  fly2: "#ff7eb6",
  leafFall: "#e9c046",
};

const DARK: typeof LIGHT = {
  skyTop: "#0f0b16",
  skyBot: "#2a2236",
  skyBreak: "#33264a",
  skyLong: "#4a2a4d",
  ink: "#fbf1e1",
  hillBack: "#2c4733",
  hill: "#2f7a49",
  hillDark: "#24603a",
  bark: "#8a5636",
  leaf: "#7bd88f",
  leafDark: "#3a9555",
  leafLight: "#c4f3cb",
  sun: "#fff1c4",
  cloud: "#3a3049",
  petal: "#ff8fc0",
  petal2: "#ffffff",
  fruit: "#ff6a45",
  center: "#ffd23f",
  seed: "#a0704c",
  fly1: "#ffd23f",
  fly2: "#ff7eb6",
  leafFall: "#e9c046",
};

type Palette = typeof LIGHT;

const parse = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const rgb = (r: number, g: number, b: number) => `rgb(${r | 0},${g | 0},${b | 0})`;

/** Top-of-sky colour: warmer in breaks, sunset-ish in long breaks, grey when paused. */
function skyColor(dark: boolean, brk: number, lng: number, desat: number) {
  const base = dark ? DARK : LIGHT;
  const a = parse(base.skyTop);
  const b = parse(base.skyBreak);
  const c = parse(base.skyLong);
  const ch = (i: number) => {
    const v = a[i] + (b[i] - a[i]) * brk;
    return v + (c[i] - v) * lng;
  };
  let r = ch(0);
  let g = ch(1);
  let bl = ch(2);
  const l = 0.3 * r + 0.59 * g + 0.11 * bl;
  const k = desat * 0.85;
  r += (l - r) * k;
  g += (l - g) * k;
  bl += (l - bl) * k;
  return rgb(r, g, bl);
}

const paletteCache = new Map<string, Palette>();
/** Palette with `desat` (0..1) of the colour drained out, cached in steps. */
function palette(dark: boolean, desat: number): Palette {
  const q = Math.round(clamp(desat) * 12);
  const key = `${dark ? 1 : 0}:${q}`;
  let p = paletteCache.get(key);
  if (!p) {
    const base = dark ? DARK : LIGHT;
    const amt = (q / 12) * 0.85;
    const out = {} as Record<keyof Palette, string>;
    for (const k of Object.keys(base) as (keyof Palette)[]) {
      const [r, g, b] = parse(base[k]);
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      out[k] = k === "ink" ? base[k] : rgb(r + (l - r) * amt, g + (l - g) * amt, b + (l - b) * amt);
    }
    p = out as Palette;
    paletteCache.set(key, p);
  }
  return p;
}

// ───────────────────────────── particles ─────────────────────────────

const MAX_P = 80;
const KIND_LEAF = 0;
const KIND_PETAL = 1;
const KIND_CONFETTI = 2;
const KIND_SPARKLE = 3;
const CONFETTI = ["#ff8fc0", "#ffd23f", "#7bd88f", "#4cc9f0", "#ff9f1c", "#b69cff"];

interface Particles {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  rot: Float32Array;
  vr: Float32Array;
  life: Float32Array;
  max: Float32Array;
  kind: Uint8Array;
  col: Uint8Array;
  alive: Uint8Array;
}

const makeParticles = (): Particles => ({
  x: new Float32Array(MAX_P),
  y: new Float32Array(MAX_P),
  vx: new Float32Array(MAX_P),
  vy: new Float32Array(MAX_P),
  rot: new Float32Array(MAX_P),
  vr: new Float32Array(MAX_P),
  life: new Float32Array(MAX_P),
  max: new Float32Array(MAX_P),
  kind: new Uint8Array(MAX_P),
  col: new Uint8Array(MAX_P),
  alive: new Uint8Array(MAX_P),
});

function spawn(p: Particles, kind: number, x: number, y: number, vx: number, vy: number, max: number, col = 0) {
  for (let i = 0; i < MAX_P; i++) {
    if (p.alive[i]) continue;
    p.alive[i] = 1;
    p.kind[i] = kind;
    p.x[i] = x;
    p.y[i] = y;
    p.vx[i] = vx;
    p.vy[i] = vy;
    p.rot[i] = Math.random() * Math.PI * 2;
    p.vr[i] = (Math.random() - 0.5) * 6;
    p.life[i] = 0;
    p.max[i] = max;
    p.col[i] = col;
    return;
  }
}

// ───────────────────────────── scene state ─────────────────────────────

interface SceneState {
  seed: number;
  tree: Tree;
  growth: number;
  breakness: number;
  longness: number;
  pausedness: number;
  done: number;
  windT: number;
  flowers: Float32Array;
  seeds: Float32Array;
  particles: Particles;
  spawnAcc: number;
  lastFinishedAt: number | null;
  stars: Float32Array;
}

const IDLE_SEED = 20251;
/** Growth shown before any focus has happened: a little sprout. */
const SEEDLING = 0.07;
const HILL_SPOTS = [-0.24, 0.22, -0.34, 0.33, -0.15, 0.13, -0.42, 0.41];

function capsule(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, r0: number, r1: number) {
  const th = Math.atan2(by - ay, bx - ax);
  const h = Math.PI / 2;
  ctx.moveTo(ax + Math.cos(th - h) * r0, ay + Math.sin(th - h) * r0);
  ctx.lineTo(bx + Math.cos(th - h) * r1, by + Math.sin(th - h) * r1);
  ctx.arc(bx, by, r1, th - h, th + h);
  ctx.lineTo(ax + Math.cos(th + h) * r0, ay + Math.sin(th + h) * r0);
  ctx.arc(ax, ay, r0, th + h, th + 3 * h);
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  if (r <= 0) return;
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

const easeOutBack = (t: number) => {
  const c = 1.9;
  const u = t - 1;
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + (c + 1) * u * u * u + c * u * u;
};

export function TreeScene({ timerId, idleSessions }: { timerId: string; idleSessions: number }) {
  const state = useRef<SceneState | null>(null);

  const ref = useCanvas((ctx: CanvasRenderingContext2D, f: Frame) => {
    const run = getRun(timerId);
    const now = Date.now();
    const seed = run ? (run.startedAt % 1000003) + 11 : IDLE_SEED;

    if (!state.current) {
      const starRnd = mulberry32(99);
      const stars = new Float32Array(36 * 3);
      for (let i = 0; i < stars.length; i++) stars[i] = starRnd();
      state.current = {
        seed,
        tree: makeTree(seed),
        growth: 0,
        breakness: 0,
        longness: 0,
        pausedness: 0,
        done: 0,
        windT: 0,
        flowers: new Float32Array(8),
        seeds: new Float32Array(8),
        particles: makeParticles(),
        spawnAcc: 0,
        lastFinishedAt: run?.finishedAt ?? null,
        stars,
      };
    }
    const s = state.current;
    if (s.seed !== seed) {
      s.seed = seed;
      s.tree = makeTree(seed);
    }
    const tree = s.tree;

    // ── read live state ──
    let growthTarget = SEEDLING;
    let isBreak = false;
    let isLong = false;
    let paused = false;
    let finished = false;
    let completed = 0;
    let planned = idleSessions;
    let sinceFinish = 0;
    if (run) {
      const pos = position(run, now);
      let total = 0;
      let doneSec = 0;
      planned = 0;
      run.segments.forEach((seg, i) => {
        if (seg.kind !== "focus") return;
        planned++;
        total += seg.seconds;
        if (pos.done || i < pos.index) {
          doneSec += seg.seconds;
          completed++;
        } else if (i === pos.index) doneSec += pos.segElapsed;
      });
      const frac = total > 0 ? doneSec / total : 1;
      growthTarget = SEEDLING + (1 - SEEDLING) * frac;
      finished = run.finished || pos.done;
      isBreak = !finished && pos.segment.kind !== "focus";
      isLong = isBreak && pos.segment.kind === "long";
      paused = pos.paused && !finished;
      if (finished) sinceFinish = run.finishedAt ? (now - run.finishedAt) / 1000 : 99;
    }

    const dt = f.dt;
    const ease = (rate: number) => 1 - Math.exp(-dt * rate);
    s.growth += (growthTarget - s.growth) * ease(growthTarget < s.growth ? 4 : 2.2);
    s.breakness += ((isBreak || finished ? 1 : 0) - s.breakness) * ease(2);
    s.longness += ((isLong ? 1 : 0) - s.longness) * ease(1.5);
    s.pausedness += ((paused ? 1 : 0) - s.pausedness) * ease(3);
    s.done += ((finished ? 1 : 0) - s.done) * ease(2);
    const windSpeed = (0.7 + s.breakness * 1.6) * (1 - s.pausedness * 0.92);
    s.windT += dt * windSpeed;

    const dark = isDark();
    const P = palette(dark, s.pausedness);
    const W = f.width;
    const H = f.height;
    const S = Math.min(W * 1.08, H);
    const U = f.scale; // device px per CSS px
    const O = Math.max(2, 2.4 * U); // outline width
    const t = f.time;
    const G = s.growth;

    // ── sky ──
    const sky = skyColor(dark, s.breakness, s.longness, s.pausedness);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, sky);
    grad.addColorStop(1, P.skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Dotted paper texture, like the page background.
    ctx.fillStyle = dark ? "rgba(255,255,255,0.05)" : "rgba(27,20,36,0.06)";
    const step = 22 * U;
    ctx.beginPath();
    for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) circle(ctx, x, y, 1.2 * U);
    ctx.fill();

    const sunX = W * 0.86;
    const sunY = H * 0.16;
    const sunR = S * 0.065;
    if (dark) {
      // Stars + crescent moon.
      for (let i = 0; i < 36; i++) {
        const sx = s.stars[i * 3] * W;
        const sy = s.stars[i * 3 + 1] * H * 0.62;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + s.stars[i * 3 + 2]) + i));
        ctx.globalAlpha = tw * 0.8;
        ctx.fillStyle = "#fff6d8";
        const r = (0.8 + s.stars[i * 3 + 2] * 1.3) * U;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      circle(ctx, sunX, sunY, sunR + O);
      ctx.fill();
      ctx.fillStyle = P.sun;
      ctx.beginPath();
      circle(ctx, sunX, sunY, sunR);
      ctx.fill();
      ctx.fillStyle = sky;
      ctx.beginPath();
      circle(ctx, sunX + sunR * 0.45, sunY - sunR * 0.3, sunR * 0.82);
      ctx.fill();
    } else {
      // Sun with slowly turning rays.
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = O;
      ctx.lineCap = "round";
      ctx.beginPath();
      const rot = s.windT * 0.15;
      for (let i = 0; i < 10; i++) {
        const a = rot + (i / 10) * Math.PI * 2;
        const r0 = sunR * 1.3;
        const r1 = sunR * (i % 2 ? 1.55 : 1.75);
        ctx.moveTo(sunX + Math.cos(a) * r0, sunY + Math.sin(a) * r0);
        ctx.lineTo(sunX + Math.cos(a) * r1, sunY + Math.sin(a) * r1);
      }
      ctx.stroke();
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      circle(ctx, sunX, sunY, sunR + O);
      ctx.fill();
      ctx.fillStyle = P.sun;
      ctx.beginPath();
      circle(ctx, sunX, sunY, sunR);
      ctx.fill();
    }

    // Clouds drift; faster in the break breeze.
    for (let i = 0; i < 3; i++) {
      const cw = S * (0.16 + i * 0.03);
      const span = W + cw * 2;
      const cx = ((i * 0.37 + s.windT * (0.012 + i * 0.004)) % 1) * span - cw;
      const cy = H * (0.36 + i * 0.09) - (i === 1 ? H * 0.2 : 0);
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? P.cloud : P.ink;
        ctx.globalAlpha = dark && pass ? 0.9 : 1;
        const e = pass ? 0 : O;
        ctx.beginPath();
        circle(ctx, cx, cy, cw * 0.28 + e);
        circle(ctx, cx + cw * 0.3, cy - cw * 0.12, cw * 0.34 + e);
        circle(ctx, cx + cw * 0.62, cy, cw * 0.26 + e);
        ctx.rect(cx - e, cy - e, cw * 0.62 + e * 2, cw * 0.26 + e * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Wind streaks during breaks.
    if (s.breakness > 0.02 && s.pausedness < 0.98) {
      ctx.strokeStyle = dark ? "rgba(251,241,225,0.5)" : "rgba(27,20,36,0.35)";
      ctx.lineWidth = 2 * U;
      ctx.globalAlpha = s.breakness * (1 - s.pausedness);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const p = (s.windT * (0.22 + i * 0.05) + i * 0.29) % 1;
        const x = p * (W + S * 0.4) - S * 0.2;
        const y = H * (0.3 + i * 0.12);
        const len = S * 0.12;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + len * 0.3, y - 6 * U, x + len * 0.6, y + 6 * U, x + len, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // ── hills ──
    const baseX = W * 0.5;
    const hillCy = H * 1.3;
    const hillRx = Math.max(W * 0.78, S * 0.8);
    const hillRy = H * 0.47;
    const groundY = hillCy - hillRy;
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.ellipse(W * 0.12, H * 1.12, W * 0.5 + O, H * 0.32 + O, 0, 0, Math.PI * 2);
    ctx.ellipse(W * 0.95, H * 1.14, W * 0.42 + O, H * 0.3 + O, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.hillBack;
    ctx.beginPath();
    ctx.ellipse(W * 0.12, H * 1.12, W * 0.5, H * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(W * 0.95, H * 1.14, W * 0.42, H * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.ellipse(baseX, hillCy, hillRx + O, hillRy + O, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.hill;
    ctx.beginPath();
    ctx.ellipse(baseX, hillCy, hillRx, hillRy, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hill shading: a darker ellipse clipped to the hill.
    ctx.save();
    ctx.clip();
    ctx.fillStyle = P.hillDark;
    ctx.beginPath();
    ctx.ellipse(baseX + hillRx * 0.35, hillCy + hillRy * 0.08, hillRx * 0.85, hillRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const hillY = (dx: number) => hillCy - hillRy * Math.sqrt(Math.max(0, 1 - (dx / hillRx) ** 2));

    // Grass tufts.
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = O * 0.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const dx = (i / 6 - 0.5) * hillRx * 1.3 + (i % 2 ? 0.03 : -0.02) * W;
      if (Math.abs(dx) < S * 0.06) continue;
      const gx = baseX + dx;
      const gy = hillY(dx) + S * 0.035;
      const sw = Math.sin(s.windT * 2 + i) * S * 0.006 * (1 + s.breakness * 2);
      const h = S * 0.022;
      ctx.moveTo(gx - h * 0.6, gy);
      ctx.lineTo(gx - h * 0.3 + sw, gy - h);
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + sw, gy - h * 1.3);
      ctx.moveTo(gx + h * 0.6, gy);
      ctx.lineTo(gx + h * 0.35 + sw, gy - h);
    }
    ctx.stroke();

    // ── session flowers on the hill: one per completed focus session ──
    for (let k = 0; k < 8; k++) {
      const want = k < completed ? 1 : 0;
      s.flowers[k] += (want - s.flowers[k]) * ease(want ? 3 : 6);
      const seedWant = k < planned && k >= completed ? 1 : 0;
      s.seeds[k] += (seedWant - s.seeds[k]) * ease(6);
    }
    for (let k = 0; k < 8; k++) {
      const dx = HILL_SPOTS[k] * Math.min(W, S * 1.25);
      const fx = baseX + dx;
      const fy = hillY(dx) + S * 0.05;
      const seedA = s.seeds[k];
      if (seedA > 0.02) {
        // A little dirt mound for each session still to come.
        const r = S * 0.018 * seedA;
        ctx.fillStyle = P.ink;
        ctx.beginPath();
        ctx.ellipse(fx, fy, r * 1.5 + O * 0.7, r + O * 0.7, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = P.seed;
        ctx.beginPath();
        ctx.ellipse(fx, fy, r * 1.5, r, 0, Math.PI, 0);
        ctx.fill();
      }
      const a = easeOutBack(s.flowers[k]);
      if (a <= 0.01) continue;
      const stem = S * 0.07 * a;
      const sway = Math.sin(s.windT * 2.2 + k * 1.7) * S * 0.01 * (0.4 + s.breakness);
      const hx = fx + sway;
      const hy = fy - stem;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = O * 1.6;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx, fy - stem * 0.5, hx, hy);
      ctx.stroke();
      ctx.strokeStyle = P.leafDark;
      ctx.lineWidth = O * 0.7;
      ctx.stroke();
      const pr = S * 0.017 * a;
      const pc = k % 3 === 0 ? P.petal : k % 3 === 1 ? P.fly1 : P.petal2;
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? pc : P.ink;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const ang = (j / 5) * Math.PI * 2 + t * 0.4 + k;
          circle(ctx, hx + Math.cos(ang) * pr, hy + Math.sin(ang) * pr, pr * 0.75 + (pass ? 0 : O));
        }
        ctx.fill();
      }
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      circle(ctx, hx, hy, pr * 0.6 + O * 0.5);
      ctx.fill();
      ctx.fillStyle = k % 3 === 1 ? P.fruit : P.center;
      ctx.beginPath();
      circle(ctx, hx, hy, pr * 0.6);
      ctx.fill();
    }

    // ── tree layout for this frame ──
    const ty = groundY + S * 0.012;
    const B = tree.branches;
    const n = B.length;
    const amp = (0.012 + s.breakness * 0.05) * (1 - s.pausedness * 0.85);
    const lean = s.breakness * 0.035 * (1 - s.pausedness);
    const thick = S * 0.052 * (0.28 + 0.72 * G);
    for (let i = 0; i < n; i++) {
      const b = B[i];
      const g = smoothstep(b.born, b.born + b.span, G);
      tree.g[i] = g;
      if (g <= 0) continue;
      const p = b.parent;
      const sway = Math.sin(s.windT * 1.6 + b.phase) * amp * (0.3 + b.depth * 0.45) + lean * b.depth * 0.6;
      let sx: number;
      let sy: number;
      if (p < 0) {
        sx = baseX;
        sy = ty;
        tree.abs[i] = b.ang + sway * 0.4;
      } else {
        sx = tree.x0[p] + (tree.x1[p] - tree.x0[p]) * b.at;
        sy = tree.y0[p] + (tree.y1[p] - tree.y0[p]) * b.at;
        tree.abs[i] = tree.abs[p] + b.ang + sway;
      }
      const L = b.len * S * (1 - (1 - g) * (1 - g));
      tree.x0[i] = sx;
      tree.y0[i] = sy;
      tree.x1[i] = sx + Math.sin(tree.abs[i]) * L;
      tree.y1[i] = sy - Math.cos(tree.abs[i]) * L;
    }
    const C = tree.clusters;
    let canopyX = baseX;
    let canopyY = ty - S * 0.3;
    let canopyN = 0;
    for (let c = 0; c < C.length; c++) {
      const cl = C[c];
      const gr = easeOutBack(clamp((G - cl.born) / tree.leafGrow));
      tree.cr[c] = cl.r * S * gr;
      if (gr <= 0) continue;
      const i = cl.branch;
      const a = tree.abs[i];
      const along = Math.min(cl.along, 1);
      tree.cx[c] = tree.x0[i] + (tree.x1[i] - tree.x0[i]) * along + Math.cos(a) * cl.off * S;
      tree.cy[c] = tree.y0[i] + (tree.y1[i] - tree.y0[i]) * along + Math.sin(a) * cl.off * S;
      if (gr > 0.5) {
        canopyX += tree.cx[c];
        canopyY += tree.cy[c];
        canopyN++;
      }
    }
    if (canopyN) {
      canopyX /= canopyN + 1;
      canopyY /= canopyN + 1;
    }

    const branchR = (i: number, end: boolean) => {
      const b = B[i];
      const base = (thick * b.w) / 2;
      const r = end ? base * (B[i].depth === MAX_DEPTH ? 0.45 : 0.72) : base;
      return Math.max(0.8 * U, r * (0.35 + 0.65 * tree.g[i]));
    };

    // Pass 1: one ink silhouette (branches + leaves) for a clean outline.
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (tree.g[i] <= 0) continue;
      capsule(ctx, tree.x0[i], tree.y0[i], tree.x1[i], tree.y1[i], branchR(i, false) + O, branchR(i, true) + O);
    }
    for (let c = 0; c < C.length; c++) circle(ctx, tree.cx[c], tree.cy[c], tree.cr[c] > 0 ? tree.cr[c] + O : 0);
    // Root flare.
    if (tree.g[0] > 0) {
      const rr = branchR(0, false);
      ctx.moveTo(baseX - rr * 2.2 - O, ty + O);
      ctx.quadraticCurveTo(baseX - rr, ty - rr * 0.4, baseX - rr, ty - rr * 2);
      ctx.lineTo(baseX + rr, ty - rr * 2);
      ctx.quadraticCurveTo(baseX + rr, ty - rr * 0.4, baseX + rr * 2.2 + O, ty + O);
      ctx.closePath();
    }
    ctx.fill();

    // Pass 2: bark.
    ctx.fillStyle = P.bark;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (tree.g[i] <= 0) continue;
      capsule(ctx, tree.x0[i], tree.y0[i], tree.x1[i], tree.y1[i], branchR(i, false), branchR(i, true));
    }
    if (tree.g[0] > 0) {
      const rr = branchR(0, false);
      ctx.moveTo(baseX - rr * 2.2, ty + O * 0.5);
      ctx.quadraticCurveTo(baseX - rr + O * 0.3, ty - rr * 0.4, baseX - rr + O * 0.3, ty - rr * 2);
      ctx.lineTo(baseX + rr - O * 0.3, ty - rr * 2);
      ctx.quadraticCurveTo(baseX + rr - O * 0.3, ty - rr * 0.4, baseX + rr * 2.2, ty + O * 0.5);
      ctx.closePath();
    }
    ctx.fill();

    // Pass 3: leaves in two tones + highlights.
    for (let tone = 0; tone < 2; tone++) {
      ctx.fillStyle = tone ? P.leaf : P.leafDark;
      ctx.beginPath();
      for (let c = 0; c < C.length; c++) if (C[c].tone === tone) circle(ctx, tree.cx[c], tree.cy[c], tree.cr[c]);
      ctx.fill();
    }
    ctx.fillStyle = P.leafLight;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let c = 0; c < C.length; c++) {
      if (C[c].tone !== 1 || c % 3 === 1) continue;
      const r = tree.cr[c];
      circle(ctx, tree.cx[c] - r * 0.32, tree.cy[c] - r * 0.36, r * 0.28);
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    // Seedling leaves on the tip of the young trunk.
    const sprout = smoothstep(0.0, 0.05, G) * (1 - smoothstep(0.16, 0.3, G));
    if (sprout > 0.01 && tree.g[0] > 0) {
      const tx = tree.x1[0];
      const tyy = tree.y1[0];
      const lr = S * 0.05 * sprout;
      const wob = Math.sin(t * 2.4) * 0.12 * (1 - s.pausedness);
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? P.leaf : P.ink;
        const e = pass ? 0 : O;
        ctx.beginPath();
        for (const side of [-1, 1]) {
          const ang = side * (0.95 + wob * side) + tree.abs[0];
          const lx = tx + Math.sin(ang) * lr * 0.85;
          const ly = tyy - Math.cos(ang) * lr * 0.85;
          ctx.moveTo(lx + lr, ly);
          ctx.ellipse(lx, ly, lr + e, lr * 0.5 + e, ang - Math.PI / 2, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.fillStyle = P.leafLight;
      ctx.beginPath();
      circle(ctx, tx - lr * 0.9, tyy - lr * 0.75, lr * 0.16);
      ctx.fill();
    }

    // ── bloom: flowers & fruit when the whole plan is done ──
    if (s.done > 0.01) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let c = 0; c < C.length; c++) {
          const cl = C[c];
          if (!cl.bloom || tree.cr[c] <= 0) continue;
          const a = easeOutBack(clamp((sinceFinish - cl.bloomDelay * 0.6) / 0.45)) * s.done;
          if (a <= 0.01) continue;
          const r = tree.cr[c];
          const fx = tree.cx[c] + cl.bloomDx * r;
          const fy = tree.cy[c] + cl.bloomDy * r;
          if (cl.bloom === 2) {
            if (pass === 0) circle(ctx, fx, fy + r * 0.25, S * 0.015 * a + O);
            else if (pass === 1) circle(ctx, fx, fy + r * 0.25, S * 0.015 * a);
            continue;
          }
          const pr = S * 0.012 * a;
          for (let j = 0; j < 5; j++) {
            const ang = (j / 5) * Math.PI * 2 + c;
            circle(ctx, fx + Math.cos(ang) * pr, fy + Math.sin(ang) * pr, pr * 0.8 + (pass === 0 ? O : 0));
          }
        }
        // Pass 1 paints fruit petal-pink too; it's recoloured just below.
        ctx.fillStyle = pass ? P.petal : P.ink;
        ctx.fill();
      }
      // Fruit colour + flower centres.
      ctx.fillStyle = P.fruit;
      ctx.beginPath();
      for (let c = 0; c < C.length; c++) {
        const cl = C[c];
        if (cl.bloom !== 2 || tree.cr[c] <= 0) continue;
        const a = easeOutBack(clamp((sinceFinish - cl.bloomDelay * 0.6) / 0.45)) * s.done;
        if (a <= 0.01) continue;
        const r = tree.cr[c];
        circle(ctx, tree.cx[c] + cl.bloomDx * r, tree.cy[c] + cl.bloomDy * r + r * 0.25, S * 0.015 * a);
      }
      ctx.fill();
      ctx.fillStyle = P.center;
      ctx.beginPath();
      for (let c = 0; c < C.length; c++) {
        const cl = C[c];
        if (cl.bloom !== 1 || tree.cr[c] <= 0) continue;
        const a = easeOutBack(clamp((sinceFinish - cl.bloomDelay * 0.6) / 0.45)) * s.done;
        if (a <= 0.01) continue;
        const r = tree.cr[c];
        circle(ctx, tree.cx[c] + cl.bloomDx * r, tree.cy[c] + cl.bloomDy * r, S * 0.0065 * a);
      }
      ctx.fill();
    }

    // ── particles ──
    const ps = s.particles;
    const leafIdx = () => {
      for (let tries = 0; tries < 6; tries++) {
        const c = (Math.random() * C.length) | 0;
        if (tree.cr[c] > S * 0.01) return c;
      }
      return -1;
    };
    if (run?.finishedAt && run.finishedAt !== s.lastFinishedAt) {
      s.lastFinishedAt = run.finishedAt;
      if (now - run.finishedAt < 4000) {
        for (let i = 0; i < 46; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
          const v = S * (0.5 + Math.random() * 0.7);
          spawn(ps, KIND_CONFETTI, canopyX, canopyY, Math.cos(a) * v, Math.sin(a) * v, 2.6 + Math.random(), i % CONFETTI.length);
        }
      }
    }
    if (!run) s.lastFinishedAt = null;
    if (!paused) {
      let rate = 0;
      let kind = KIND_LEAF;
      if (finished) {
        rate = sinceFinish < 5 ? 5 : 1.4;
        kind = KIND_PETAL;
      } else if (isBreak) rate = 1.4 + (isLong ? 0.8 : 0);
      else if (run) {
        rate = 0.9;
        kind = KIND_SPARKLE;
      }
      s.spawnAcc += rate * dt;
      while (s.spawnAcc >= 1) {
        s.spawnAcc -= 1;
        const c = leafIdx();
        if (c < 0) break;
        if (kind === KIND_SPARKLE) {
          spawn(ps, kind, tree.cx[c] + (Math.random() - 0.5) * tree.cr[c], tree.cy[c] - tree.cr[c] * 0.5, 0, -S * 0.05, 1.6);
        } else {
          spawn(ps, kind, tree.cx[c], tree.cy[c], S * 0.02, S * 0.02, 7, (Math.random() * 3) | 0);
        }
      }
    } else s.spawnAcc = 0;

    const pDt = dt * (1 - s.pausedness * 0.95);
    const wind = S * (0.03 + s.breakness * 0.09);
    for (let i = 0; i < MAX_P; i++) {
      if (!ps.alive[i]) continue;
      ps.life[i] += pDt;
      const k = ps.kind[i];
      if (k === KIND_CONFETTI) {
        ps.vy[i] += S * 0.9 * pDt;
        ps.vx[i] *= 1 - 1.2 * pDt;
        ps.vy[i] *= 1 - 0.8 * pDt;
      } else if (k === KIND_SPARKLE) {
        ps.vy[i] *= 1 - 0.5 * pDt;
      } else {
        // Leaves & petals flutter down on the breeze.
        ps.vx[i] += ((wind - ps.vx[i]) * 0.8 + Math.sin(ps.life[i] * 3 + i) * S * 0.12) * pDt;
        ps.vy[i] += (S * 0.06 - ps.vy[i]) * 1.2 * pDt;
      }
      ps.x[i] += ps.vx[i] * pDt;
      ps.y[i] += ps.vy[i] * pDt;
      ps.rot[i] += ps.vr[i] * pDt;
      if (ps.life[i] > ps.max[i] || ps.y[i] > H + 20 * U || ps.x[i] > W + 20 * U) ps.alive[i] = 0;
    }
    ctx.lineWidth = Math.max(1, O * 0.6);
    ctx.strokeStyle = P.ink;
    for (let i = 0; i < MAX_P; i++) {
      if (!ps.alive[i]) continue;
      const k = ps.kind[i];
      const fade = clamp((ps.max[i] - ps.life[i]) / 0.6);
      ctx.globalAlpha = fade;
      ctx.save();
      ctx.translate(ps.x[i], ps.y[i]);
      ctx.rotate(ps.rot[i]);
      if (k === KIND_SPARKLE) {
        const r = S * 0.012 * Math.sin(Math.min(1, ps.life[i] / ps.max[i]) * Math.PI);
        ctx.strokeStyle = dark ? P.leafLight : P.leafDark;
        ctx.lineWidth = Math.max(1.5, O * 0.8);
        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(r, 0);
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = Math.max(1, O * 0.6);
      } else if (k === KIND_CONFETTI) {
        const r = S * 0.012;
        ctx.fillStyle = CONFETTI[ps.col[i]];
        ctx.fillRect(-r, -r * 0.5, r * 2, r);
        ctx.strokeRect(-r, -r * 0.5, r * 2, r);
      } else {
        const r = S * (k === KIND_PETAL ? 0.011 : 0.013);
        ctx.fillStyle =
          k === KIND_PETAL ? (ps.col[i] === 1 ? P.petal2 : P.petal) : ps.col[i] === 2 ? P.leafFall : ps.col[i] ? P.leaf : P.leafDark;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // ── butterflies in breaks & at the end ──
    const flyA = s.breakness * (1 - s.pausedness);
    if (flyA > 0.02 && canopyN > 0) {
      for (let b = 0; b < 2; b++) {
        const ph = b * 2.4;
        const bt = s.windT * 0.55 + ph;
        const bx = canopyX + Math.sin(bt * 0.9) * S * 0.33 + (b ? -1 : 1) * S * 0.05;
        const by = canopyY + Math.sin(bt * 1.7) * S * 0.12 - S * 0.02;
        const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 13 + ph));
        const wr = S * 0.022;
        ctx.globalAlpha = flyA;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(Math.cos(bt * 0.9) * 0.4);
        for (let pass = 0; pass < 2; pass++) {
          ctx.fillStyle = pass ? (b ? P.fly2 : P.fly1) : P.ink;
          const e = pass ? 0 : O * 0.8;
          ctx.beginPath();
          ctx.ellipse(-wr * flap * 0.9, -wr * 0.3, wr * flap + e, wr * 0.8 + e, -0.4, 0, Math.PI * 2);
          ctx.ellipse(wr * flap * 0.9, -wr * 0.3, wr * flap + e, wr * 0.8 + e, 0.4, 0, Math.PI * 2);
          ctx.ellipse(-wr * flap * 0.6, wr * 0.5, wr * flap * 0.6 + e, wr * 0.5 + e, 0.5, 0, Math.PI * 2);
          ctx.ellipse(wr * flap * 0.6, wr * 0.5, wr * flap * 0.6 + e, wr * 0.5 + e, -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = P.ink;
        ctx.fillRect(-wr * 0.15, -wr * 0.9, wr * 0.3, wr * 1.8);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // ── snoozing while paused ──
    if (s.pausedness > 0.02) {
      const zx = (canopyN ? canopyX : baseX) + S * 0.12;
      const zy = (canopyN ? canopyY : ty - S * 0.08) - S * 0.06;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let k = 0; k < 3; k++) {
        const p = (t * 0.32 + k / 3) % 1;
        const size = S * (0.04 + p * 0.05);
        ctx.globalAlpha = s.pausedness * Math.sin(p * Math.PI);
        ctx.font = `800 ${size}px "Bricolage Grotesque Variable", ui-rounded, system-ui, sans-serif`;
        const x = zx + p * S * 0.14 + Math.sin(p * 6 + k) * S * 0.015;
        const y = zy - p * S * 0.2;
        ctx.lineWidth = O * 1.6;
        ctx.strokeStyle = dark ? "#14101b" : "#ffffff";
        ctx.strokeText("z", x, y);
        ctx.fillStyle = P.ink;
        ctx.fillText("z", x, y);
      }
      ctx.globalAlpha = 1;
    }
  });

  return <canvas ref={ref} aria-hidden />;
}
