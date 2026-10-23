import { useEffect, useRef, type PointerEvent } from "react";
import { clamp, hexToRgb, lerp, useCanvas, type Frame } from "../../core/canvas";
import { isDark } from "../../core/settings";

/** What the sky needs to know; read live inside the draw loop. */
export interface SkyState {
  /** Target moment (epoch ms) or null when there is no event yet. */
  at: number | null;
  /** When the countdown "began" (event created / previous occurrence). */
  from: number;
  /** Changes when the user switches event, so the sky can reset nicely. */
  key: string;
}

const DAY = 86_400_000;
const MAXP = 1400; // spark cap
const FINALE = 30; // seconds of grand finale after T-0

// Particle flags
const SPARK = 0;
const GLITTER = 1;
const WILLOW = 2;
const ROCKET = 3;
const EMBER = 4;

const PALETTE_HEX = ["#ff9f1c", "#ff5fa2", "#4cc9f0", "#ffd23f", "#fff3d6", "#b69cff", "#7bd88f", "#ff5a36"];

interface Sim {
  n: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  life: Float32Array;
  max: Float32Array;
  size: Float32Array;
  ty: Float32Array; // rocket: explode height · others: unused
  col: Uint8Array;
  col2: Uint8Array; // rocket: burst colour 2
  flag: Uint8Array;
  kind: Uint8Array; // rocket: burst type
  pow: Float32Array; // rocket: burst power
  acc: number;
  flash: number;
  lastRem: number | null;
  lastKey: string;
  stars: Float32Array; // x, y, phase, size
  city: Building[];
  trail: HTMLCanvasElement;
  tctx: CanvasRenderingContext2D;
  sky: { key: string; grad: CanvasGradient | null };
}

interface Building {
  x: number;
  w: number;
  h: number;
  windows: number[]; // packed x,y pairs (relative to building, 0..1)
  seed: number;
}

/** Tiny deterministic RNG so the skyline and stars stay put. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSim(): Sim {
  const r = rng(1945);
  const stars = new Float32Array(110 * 4);
  for (let i = 0; i < 110; i++) {
    stars[i * 4] = r();
    stars[i * 4 + 1] = Math.pow(r(), 1.4) * 0.8;
    stars[i * 4 + 2] = r() * Math.PI * 2;
    stars[i * 4 + 3] = r() < 0.12 ? 2 : 1;
  }
  // Skyline: buildings across the width, leaving a gap for Monas.
  const city: Building[] = [];
  let x = -0.02;
  while (x < 1.02) {
    const w = 0.045 + r() * 0.07;
    const nearMonas = x + w > 0.76 && x < 0.94;
    const h = nearMonas ? 0.05 + r() * 0.04 : 0.07 + r() * 0.13;
    const windows: number[] = [];
    const cols = Math.max(1, Math.floor(w / 0.02));
    const rows = Math.max(1, Math.floor(h / 0.022));
    for (let cx = 0; cx < cols; cx++)
      for (let cy = 0; cy < rows; cy++) if (r() < 0.32) windows.push((cx + 0.5) / cols, (cy + 0.6) / (rows + 0.4));
    city.push({ x, w, h, windows, seed: r() * 100 });
    x += w + (r() < 0.25 ? 0.01 : 0);
  }
  const trail = document.createElement("canvas");
  const tctx = trail.getContext("2d")!;
  return {
    n: 0,
    x: new Float32Array(MAXP),
    y: new Float32Array(MAXP),
    vx: new Float32Array(MAXP),
    vy: new Float32Array(MAXP),
    life: new Float32Array(MAXP),
    max: new Float32Array(MAXP),
    size: new Float32Array(MAXP),
    ty: new Float32Array(MAXP),
    col: new Uint8Array(MAXP),
    col2: new Uint8Array(MAXP),
    flag: new Uint8Array(MAXP),
    kind: new Uint8Array(MAXP),
    pow: new Float32Array(MAXP),
    acc: 0,
    flash: 0,
    lastRem: null,
    lastKey: "",
    stars,
    city,
    trail,
    tctx,
    sky: { key: "", grad: null },
  };
}

function add(s: Sim, x: number, y: number, vx: number, vy: number, life: number, size: number, col: number, flag: number) {
  if (s.n >= MAXP) return -1;
  const i = s.n++;
  s.x[i] = x;
  s.y[i] = y;
  s.vx[i] = vx;
  s.vy[i] = vy;
  s.life[i] = life;
  s.max[i] = life;
  s.size[i] = size;
  s.col[i] = col;
  s.flag[i] = flag;
  return i;
}

function kill(s: Sim, i: number) {
  const j = --s.n;
  if (i === j) return;
  s.x[i] = s.x[j];
  s.y[i] = s.y[j];
  s.vx[i] = s.vx[j];
  s.vy[i] = s.vy[j];
  s.life[i] = s.life[j];
  s.max[i] = s.max[j];
  s.size[i] = s.size[j];
  s.ty[i] = s.ty[j];
  s.col[i] = s.col[j];
  s.col2[i] = s.col2[j];
  s.flag[i] = s.flag[j];
  s.kind[i] = s.kind[j];
  s.pow[i] = s.pow[j];
}

/**
 * Burst types: 0 peony · 1 ring · 2 willow · 3 two-tone glitter · 4 heart.
 * `S` scales speeds to the stage size; `power` 0..1 sets size & count.
 */
function burst(s: Sim, x: number, y: number, power: number, type: number, c1: number, c2: number, S: number) {
  const room = MAXP - s.n;
  let count = Math.round(lerp(14, 110, power));
  if (type === 4) count = Math.round(count * 0.8);
  count = Math.min(count, room);
  if (count <= 0) return;
  const speed = lerp(45, 210, power) * S;
  const life = lerp(0.7, 1.7, power);
  for (let k = 0; k < count; k++) {
    const a = (k / count) * Math.PI * 2 + Math.random() * 0.15;
    let sp = speed;
    let vx = 0;
    let vy = 0;
    let flag = SPARK;
    let col = c1;
    let lf = life * (0.75 + Math.random() * 0.5);
    if (type === 0) {
      sp *= 0.55 + Math.sqrt(Math.random()) * 0.5;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
    } else if (type === 1) {
      vx = Math.cos(a) * sp * 0.9;
      vy = Math.sin(a) * sp * 0.9;
      if (k % 2) col = c2;
    } else if (type === 2) {
      sp *= 0.5 + Math.random() * 0.5;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      flag = WILLOW;
      col = 3;
      lf *= 1.9;
    } else if (type === 3) {
      sp *= 0.4 + Math.random() * 0.6;
      vx = Math.cos(a) * sp;
      vy = Math.sin(a) * sp;
      flag = GLITTER;
      col = Math.random() < 0.5 ? c1 : c2;
    } else {
      // Heart curve, y flipped for screen space.
      const t = (k / count) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      vx = (hx / 16) * sp * 0.75;
      vy = (hy / 16) * sp * 0.75;
      col = k % 3 === 0 ? 4 : c1;
    }
    add(s, x, y, vx, vy, lf, (type === 2 ? 1.1 : 1.3) * (0.7 + power * 0.6), col, flag);
  }
  // Bright core flash.
  add(s, x, y, 0, 0, 0.18, 7 * (0.5 + power), 4, EMBER);
  s.flash = Math.min(1, s.flash + power * 0.35);
}

function launch(
  s: Sim,
  W: number,
  H: number,
  S: number,
  power: number,
  palette: number,
  tx?: number,
  ty?: number,
) {
  const targetY = ty ?? H * lerp(0.12, 0.42, Math.random());
  const targetX = tx ?? W * lerp(0.12, 0.88, Math.random());
  const x0 = clamp(targetX + (Math.random() - 0.5) * W * 0.18, W * 0.04, W * 0.96);
  const y0 = H + 4;
  const vy = -lerp(250, 380, Math.random()) * S;
  const t = (y0 - targetY) / -vy;
  const i = add(s, x0, y0, (targetX - x0) / Math.max(0.2, t), vy, 4, 1.8, 3, ROCKET);
  if (i < 0) return;
  s.ty[i] = targetY;
  s.pow[i] = power;
  // Palette: 0 = mostly accent, 1 = festive mix, 2 = embers (past events).
  let c1 = 0;
  let c2 = 3;
  if (palette === 1) {
    c1 = Math.floor(Math.random() * PALETTE_HEX.length);
    c2 = Math.floor(Math.random() * PALETTE_HEX.length);
  } else if (palette === 0) {
    c1 = Math.random() < 0.6 ? 0 : Math.random() < 0.5 ? 3 : 1;
    c2 = 4;
  } else {
    c1 = 0;
    c2 = 0;
  }
  s.col[i] = 3;
  s.kind[i] = c1;
  s.col2[i] = c2;
}

/** Pick a burst type for a rocket, more variety as power rises. */
function pickType(power: number) {
  const r = Math.random();
  if (power < 0.45) return r < 0.7 ? 0 : 3;
  if (r < 0.05 && power > 0.8) return 4;
  if (r < 0.35) return 0;
  if (r < 0.55) return 1;
  if (r < 0.75) return 3;
  return 2;
}

/** How busy the sky is, from the seconds left (negative = after T-0). */
function intensity(rem: number | null): { rate: number; power: number; palette: number } {
  if (rem === null) return { rate: 0.35, power: 0.3, palette: 0 };
  if (rem > 0) {
    const x = Math.log10(Math.max(1, rem));
    // 6.6 ≈ 46 days → rare sparkles · 1.8 ≈ 1 minute → busy.
    const k = clamp((6.6 - x) / (6.6 - 1.8));
    let rate = lerp(0.18, 3.2, k * k);
    let power = lerp(0.28, 0.85, k);
    if (rem <= 60) {
      rate = lerp(4, 8, 1 - rem / 60);
      power = 0.9;
    }
    return { rate, power, palette: k > 0.75 ? 1 : 0 };
  }
  const since = -rem;
  if (since < FINALE) return { rate: 10, power: 1, palette: 1 };
  if (since < DAY / 1000) return { rate: 1.3, power: 0.8, palette: 1 };
  return { rate: 0.08, power: 0.25, palette: 2 };
}

export function Fireworks({ sky, accent }: { sky: SkyState; accent: string }) {
  const live = useRef(sky);
  useEffect(() => {
    live.current = sky;
  }, [sky]);
  const simRef = useRef<Sim | null>(null);
  const sizeRef = useRef({ w: 1, h: 1 });
  const palette = useRef<{ rgb: string[]; raw: [number, number, number][] }>({ rgb: [], raw: [] });
  useEffect(() => {
    const hex = [accent, ...PALETTE_HEX.slice(1)];
    palette.current = {
      raw: hex.map((h) => hexToRgb(h)),
      rgb: hex.map((h) => {
        const [r, g, b] = hexToRgb(h);
        return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
      }),
    };
  }, [accent]);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const ref = useCanvas((ctx, f: Frame) => {
    const s = (simRef.current ??= makeSim());
    const W = f.cssWidth;
    const H = f.cssHeight;
    sizeRef.current = { w: W, h: H };
    const S = Math.min(W, H) / 420;
    const dt = f.dt;
    const now = Date.now();
    const st = live.current;
    const rem = st.at === null ? null : (st.at - now) / 1000;
    const dark = isDark();
    const pal = palette.current;
    const [ar, ag, ab] = pal.raw[0] ?? [1, 0.6, 0.1];

    // ── Event switch: clear the sky. Crossing T-0 live: salvo!
    if (st.key !== s.lastKey) {
      s.lastKey = st.key;
      s.n = 0;
      s.lastRem = rem;
    }
    if (rem !== null && s.lastRem !== null && s.lastRem > 0 && rem <= 0) {
      for (let k = 0; k < 7; k++) launch(s, W, H, S, 1, 1, W * (0.12 + k * 0.126), H * lerp(0.1, 0.35, Math.random()));
      s.flash = 1;
    }
    s.lastRem = rem;

    // ── Spawn
    const { rate, power, palette: pmode } = intensity(rem);
    s.acc += rate * dt * (reduced.current ? 0.35 : 1);
    while (s.acc >= 1) {
      s.acc -= 1 + (Math.random() - 0.5) * 0.6;
      if (power < 0.45 && Math.random() < 0.65) {
        // Far away: tiny sparkles twinkling straight in the sky.
        burst(s, W * lerp(0.1, 0.9, Math.random()), H * lerp(0.08, 0.5, Math.random()), power * 0.6, 3, 0, 4, S);
      } else {
        launch(s, W, H, S, power * lerp(0.85, 1.1, Math.random()), pmode);
      }
    }

    // ── Simulate
    const g = 70 * S;
    for (let i = 0; i < s.n; i++) {
      const fl = s.flag[i];
      s.life[i] -= dt;
      if (fl === ROCKET) {
        s.vy[i] += g * 0.35 * dt;
        s.x[i] += s.vx[i] * dt;
        s.y[i] += s.vy[i] * dt;
        // smoke-sparks behind the rocket
        if (Math.random() < 0.7) add(s, s.x[i], s.y[i] + 2, (Math.random() - 0.5) * 18 * S, 25 * S, 0.35, 0.9, 3, EMBER);
        if (s.y[i] <= s.ty[i] || s.vy[i] >= -30 * S || s.life[i] <= 0) {
          const p = clamp(s.pow[i], 0, 1);
          burst(s, s.x[i], s.y[i], p, pickType(p), s.kind[i], s.col2[i], S);
          kill(s, i);
          i--;
        }
        continue;
      }
      if (s.life[i] <= 0) {
        kill(s, i);
        i--;
        continue;
      }
      const drag = fl === WILLOW ? 2.6 : fl === EMBER ? 1.0 : 1.7;
      const k = Math.exp(-drag * dt);
      s.vx[i] *= k;
      s.vy[i] = s.vy[i] * k + g * (fl === WILLOW ? 0.55 : 1) * dt;
      s.x[i] += s.vx[i] * dt;
      s.y[i] += s.vy[i] * dt;
    }
    s.flash *= Math.exp(-dt * 3.2);

    // ── Trail layer (half-res, additive, fades every frame)
    const tw = Math.max(1, Math.round(f.width * 0.5));
    const th = Math.max(1, Math.round(f.height * 0.5));
    const t = s.tctx;
    if (s.trail.width !== tw || s.trail.height !== th) {
      s.trail.width = tw;
      s.trail.height = th;
    }
    const ts = f.scale * 0.5;
    t.globalCompositeOperation = "destination-out";
    t.fillStyle = `rgba(0,0,0,${1 - Math.pow(0.8, dt * 60)})`;
    t.fillRect(0, 0, tw, th);
    t.globalCompositeOperation = "lighter";
    for (let i = 0; i < s.n; i++) {
      const fl = s.flag[i];
      const lifeK = s.life[i] / s.max[i];
      let a = fl === ROCKET ? 1 : Math.pow(clamp(lifeK), fl === WILLOW ? 0.6 : 0.9);
      if (fl === GLITTER && lifeK < 0.6 && Math.random() < 0.45) a = 0;
      if (a <= 0.01) continue;
      // Sparks cool from white-hot to their colour.
      const hot = fl === EMBER ? 0 : clamp((lifeK - 0.82) * 5);
      t.globalAlpha = a;
      t.fillStyle = hot > 0.5 ? pal.rgb[4] : pal.rgb[s.col[i]];
      const sz = Math.max(1, s.size[i] * ts * (fl === EMBER ? lifeK : 1));
      t.fillRect(s.x[i] * ts - sz / 2, s.y[i] * ts - sz / 2, sz, sz);
    }
    t.globalAlpha = 1;

    // ── Sky
    const skyKey = `${f.height}:${dark ? 1 : 0}`;
    if (s.sky.key !== skyKey || !s.sky.grad) {
      const gr = ctx.createLinearGradient(0, 0, 0, f.height);
      if (dark) {
        gr.addColorStop(0, "#05061a");
        gr.addColorStop(0.55, "#120d33");
        gr.addColorStop(1, "#2c1640");
      } else {
        gr.addColorStop(0, "#1c2470");
        gr.addColorStop(0.5, "#46307f");
        gr.addColorStop(0.85, "#b0487a");
        gr.addColorStop(1, "#f08a5d");
      }
      s.sky = { key: skyKey, grad: gr };
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.sky.grad!;
    ctx.fillRect(0, 0, f.width, f.height);
    if (s.flash > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${(ar * 255) | 0},${(ag * 160) | 0},${(ab * 255) | 0},${s.flash * 0.16})`;
      ctx.fillRect(0, 0, f.width, f.height);
      ctx.globalCompositeOperation = "source-over";
    }

    // Stars
    const sc = f.scale;
    ctx.fillStyle = "#fff6e0";
    for (let i = 0; i < 110; i++) {
      const tw2 = 0.45 + 0.55 * Math.sin(f.time * (0.8 + (i % 5) * 0.35) + s.stars[i * 4 + 2]);
      ctx.globalAlpha = clamp(tw2) * (dark ? 0.85 : 0.6);
      const sz = s.stars[i * 4 + 3] * sc;
      ctx.fillRect(s.stars[i * 4] * f.width, s.stars[i * 4 + 1] * f.height, sz, sz);
    }
    ctx.globalAlpha = 1;

    // ── Day dots: an arc of lights, one per day left (up to 100).
    if (st.at !== null) {
      const total = Math.max(1, Math.ceil((st.at - st.from) / DAY));
      const slots = Math.min(100, total);
      const remDays = rem === null ? 0 : rem / 86400;
      const lit = clamp(Math.ceil(remDays), 0, slots);
      const cx = f.width / 2;
      const cy = f.height * 0.56;
      const R = Math.min(f.width, f.height) * 0.42;
      const after = rem !== null && rem <= 0 ? -rem : 0;
      const celebrate = rem !== null && rem <= 0 && after < DAY / 1000;
      const perRow = slots > 50 ? 50 : slots;
      for (let i = 0; i < slots; i++) {
        const row = i < perRow ? 0 : 1;
        const idx = row === 0 ? i : i - perRow;
        const inRow = row === 0 ? perRow : slots - perRow;
        const span = Math.PI * 0.72;
        const a0 = Math.PI * 1.5 - span / 2;
        // Day 1 sits at the right end, so the remaining days stay clear of the name sticker.
        const ang = a0 + (inRow > 1 ? 1 - idx / (inRow - 1) : 0.5) * span;
        const rr = R * (row === 0 ? 1 : 0.88);
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        // Dot i is lit if its day is still ahead. Last lit = today, shrinking.
        const isLit = i < lit;
        const isToday = i === lit - 1;
        let r = (isLit ? 2.2 : 1.4) * sc;
        let alpha = 0.3;
        let col = "#fff6e0";
        if (celebrate) {
          alpha = 0.55 + 0.45 * Math.sin(f.time * 6 + i * 0.5);
          col = pal.rgb[i % pal.rgb.length] ?? col;
          r = 2.2 * sc;
        } else if (isToday) {
          const frac = remDays - Math.floor(remDays) || (remDays > 0 ? 1 : 0);
          r = (1.8 + 2.4 * frac) * sc * (1 + 0.25 * Math.sin(f.time * 4));
          alpha = 1;
          col = pal.rgb[0] ?? col;
        } else if (isLit) {
          alpha = 0.7 + 0.3 * Math.sin(f.time * 1.5 + i);
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (isToday && !celebrate) {
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // ── Fireworks on top of the sky
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(s.trail, 0, 0, f.width, f.height);
    ctx.globalCompositeOperation = "source-over";

    // ── Skyline + Monas silhouette
    const silhouette = dark ? "#07050f" : "#1d1030";
    const groundY = f.height;
    ctx.fillStyle = silhouette;
    for (const b of s.city) {
      const bx = b.x * f.width;
      const bw = b.w * f.width;
      const bh = b.h * f.height;
      ctx.fillRect(bx, groundY - bh, bw + 1, bh);
    }
    // Monas: platform, obelisk, cup and golden flame.
    const mx = f.width * 0.86;
    const u = Math.min(f.width, f.height);
    const baseH = f.height * 0.035;
    ctx.beginPath();
    ctx.moveTo(mx - u * 0.1, groundY);
    ctx.lineTo(mx - u * 0.085, groundY - baseH);
    ctx.lineTo(mx + u * 0.085, groundY - baseH);
    ctx.lineTo(mx + u * 0.1, groundY);
    ctx.fill();
    const topY = groundY - f.height * 0.27;
    ctx.beginPath();
    ctx.moveTo(mx - u * 0.02, groundY - baseH);
    ctx.lineTo(mx - u * 0.011, topY);
    ctx.lineTo(mx + u * 0.011, topY);
    ctx.lineTo(mx + u * 0.02, groundY - baseH);
    ctx.fill();
    ctx.fillRect(mx - u * 0.02, topY - u * 0.012, u * 0.04, u * 0.012);
    const flick = 1 + 0.12 * Math.sin(f.time * 9) + 0.06 * Math.sin(f.time * 23);
    const fh = u * 0.035 * flick;
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(255,190,60,0.22)";
    ctx.beginPath();
    ctx.arc(mx, topY - u * 0.012 - fh * 0.45, fh * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffcf4a";
    ctx.beginPath();
    ctx.moveTo(mx - u * 0.012, topY - u * 0.012);
    ctx.quadraticCurveTo(mx - u * 0.016, topY - u * 0.012 - fh * 0.6, mx, topY - u * 0.012 - fh);
    ctx.quadraticCurveTo(mx + u * 0.016, topY - u * 0.012 - fh * 0.6, mx + u * 0.012, topY - u * 0.012);
    ctx.fill();

    // Windows glow warmer during a flash.
    ctx.fillStyle = "#ffd77a";
    const wsz = Math.max(1, 2.2 * sc);
    for (const b of s.city) {
      const bx = b.x * f.width;
      const bw = b.w * f.width;
      const bh = b.h * f.height;
      for (let k = 0; k < b.windows.length; k += 2) {
        const on = Math.sin(f.time * 0.3 + b.seed + k) > -0.85;
        if (!on) continue;
        ctx.globalAlpha = clamp(0.55 + s.flash * 0.5);
        ctx.fillRect(bx + b.windows[k] * bw - wsz / 2, groundY - bh + b.windows[k + 1] * bh, wsz, wsz);
      }
    }
    ctx.globalAlpha = 1;
  });

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = simRef.current;
    if (!s) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { w, h } = sizeRef.current;
    const S = Math.min(w, h) / 420;
    const x = e.clientX - rect.left;
    const y = Math.min(e.clientY - rect.top, h * 0.6);
    launch(s, w, h, S, 0.85, 1, x, y);
  };

  return <canvas ref={ref} aria-hidden onPointerDown={onPointerDown} className="touch-manipulation" />;
}
