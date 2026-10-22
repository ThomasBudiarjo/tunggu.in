import { clamp } from "../../core/canvas";
import type { KettleStyle } from "./recipes";

type C = CanvasRenderingContext2D;

/** Deterministic 0..1 noise from an integer-ish seed. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const cache = new Map<string, [number, number, number]>();
function rgb(hex: string): [number, number, number] {
  let c = cache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(hex, c);
  }
  return c;
}

/** Blend two hex colours → "rgba(...)". */
export function mix(a: string, b: string, t: number, alpha = 1) {
  const A = rgb(a);
  const B = rgb(b);
  const k = clamp(t);
  return `rgba(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(
    A[2] + (B[2] - A[2]) * k,
  )},${alpha})`;
}
/** Same as mix() but returns a hex string (so it can be mixed again). */
export function mixHex(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  const k = clamp(t);
  const h = (i: number) => Math.round(A[i] + (B[i] - A[i]) * k).toString(16).padStart(2, "0");
  return `#${h(0)}${h(1)}${h(2)}`;
}
export const alpha = (hex: string, a: number) => mix(hex, hex, 0, a);

export interface Pal {
  dark: boolean;
  ink: string;
  halo: string;
  surface: string;
  glass: string;
  glint: string;
  water: string;
  steam: string;
  steamStrong: string;
  metal: string;
  rubber: string;
  paper: string;
  groundsDry: string;
  groundsWet: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  table: string;
  tableGrain: string;
  blush: string;
  leaf: string;
  leafDry: string;
}

let lastPal: Pal | null = null;
let lastKey = "";
/** Theme palette; cached so the draw loop doesn't rebuild it every frame. */
export function palette(dark: boolean, accent: string): Pal {
  const key = `${dark}:${accent}`;
  if (lastPal && key === lastKey) return lastPal;
  lastKey = key;
  lastPal = buildPalette(dark, accent);
  return lastPal;
}

function buildPalette(dark: boolean, accent: string): Pal {
  const ink = dark ? "#fbf1e1" : "#1b1424";
  const surface2 = dark ? "#2a2236" : "#fbecd5";
  return {
    dark,
    ink,
    halo: dark ? "#201a2a" : "#ffffff",
    surface: dark ? "#201a2a" : "#ffffff",
    glass: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
    glint: dark ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.95)",
    water: dark ? "#b4d9e3" : "#e6f4f7",
    steam: dark ? "rgba(251,241,225,0.22)" : "rgba(95,83,104,0.2)",
    steamStrong: dark ? "rgba(251,241,225,0.75)" : "rgba(95,83,104,0.6)",
    metal: dark ? "#8a8199" : "#d6d0dc",
    rubber: dark ? "#141018" : "#3a3340",
    paper: dark ? "#efe4d2" : "#fffaf0",
    groundsDry: dark ? "#b98552" : "#9a6a40",
    groundsWet: dark ? "#5e3820" : "#4a2a17",
    accent,
    accentDark: mixHex(accent, "#1b1424", 0.35),
    accentLight: mixHex(accent, "#ffffff", 0.45),
    table: mixHex(accent, surface2, dark ? 0.62 : 0.5),
    tableGrain: mixHex(accent, dark ? "#14101b" : "#1b1424", dark ? 0.5 : 0.2),
    blush: "#ff8fa3",
    leaf: dark ? "#8fae4a" : "#6f8f2e",
    leafDry: dark ? "#6d6a3a" : "#4f5a2a",
  };
}

/** Outline the current path with the chunky ink line, optionally filled first. */
export function ink(ctx: C, pal: Pal, lw: number, fill?: string) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** A stroke drawn as an inked tube: ink outline + coloured core. */
export function tube(ctx: C, pal: Pal, lw: number, width: number, color: string) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = width + lw * 2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Wavy liquid surface from xL to xR; closes down to `bottom` if given. */
export function wave(ctx: C, xL: number, xR: number, y: number, amp: number, t: number, bottom?: number) {
  ctx.beginPath();
  if (bottom !== undefined) ctx.moveTo(xL, bottom);
  const step = 5;
  for (let x = xL; x <= xR + step; x += step) {
    const xx = Math.min(x, xR);
    const yy = y + Math.sin(xx * 0.09 + t * 3.1) * amp + Math.sin(xx * 0.043 - t * 2.2) * amp * 0.7;
    if (bottom === undefined && x === xL) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  }
  if (bottom !== undefined) {
    ctx.lineTo(xR, bottom);
    ctx.closePath();
  }
}

/** Liquid fill with a lighter foam line on top. */
export function liquid(
  ctx: C,
  xL: number,
  xR: number,
  y: number,
  bottom: number,
  amp: number,
  t: number,
  color: string,
  foam: string,
  lw: number,
) {
  wave(ctx, xL, xR, y, amp, t, bottom);
  ctx.fillStyle = color;
  ctx.fill();
  wave(ctx, xL, xR, y, amp, t);
  ctx.strokeStyle = foam;
  ctx.lineWidth = lw * 1.1;
  ctx.stroke();
}

// ── Kettle ──────────────────────────────────────────────────────────────

const TIP: Record<KettleStyle, [number, number]> = { goose: [-86, -31], teko: [-62, -19] };
export const MAX_TILT: Record<KettleStyle, number> = { goose: 0.55, teko: 0.62 };

/** World position of the spout tip for a kettle at (px, py) tilted by `tilt` (0..1). */
export function kettleTip(style: KettleStyle, px: number, py: number, tilt: number, out: { x: number; y: number }) {
  const a = -tilt * MAX_TILT[style];
  const [lx, ly] = TIP[style];
  out.x = px + lx * Math.cos(a) - ly * Math.sin(a);
  out.y = py - tilt * 6 + lx * Math.sin(a) + ly * Math.cos(a);
}

export function drawKettle(ctx: C, style: KettleStyle, px: number, py: number, tilt: number, pal: Pal, lw: number, t: number) {
  ctx.save();
  // A tiny idle "breathing" bob so the kettle feels alive.
  const bob = tilt < 0.05 ? Math.sin(t * 2.2) * 0.8 : 0;
  ctx.translate(px, py - tilt * 6 + bob);
  ctx.rotate(-tilt * MAX_TILT[style]);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (style === "goose") {
    // Long swan-neck spout (behind the body).
    ctx.beginPath();
    ctx.moveTo(-30, 16);
    ctx.bezierCurveTo(-64, 22, -60, -6, -86, -31);
    tube(ctx, pal, lw, 6, pal.accent);
    // Handle.
    ctx.beginPath();
    ctx.moveTo(30, -14);
    ctx.bezierCurveTo(58, -20, 60, 16, 37, 20);
    tube(ctx, pal, lw, 7, pal.accentDark);
    // Body.
    ctx.beginPath();
    ctx.moveTo(-36, 26);
    ctx.lineTo(36, 26);
    ctx.quadraticCurveTo(43, 26, 41, 18);
    ctx.lineTo(31, -17);
    ctx.quadraticCurveTo(29, -24, 22, -24);
    ctx.lineTo(-22, -24);
    ctx.quadraticCurveTo(-29, -24, -31, -17);
    ctx.lineTo(-41, 18);
    ctx.quadraticCurveTo(-43, 26, -36, 26);
    ctx.closePath();
  } else {
    // Short chubby spout.
    ctx.beginPath();
    ctx.moveTo(-30, 10);
    ctx.quadraticCurveTo(-50, 6, -62, -19);
    tube(ctx, pal, lw, 10, pal.accent);
    // Arched top handle.
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.bezierCurveTo(-30, -64, 30, -64, 30, -14);
    tube(ctx, pal, lw, 7, pal.accentDark);
    // Round body.
    ctx.beginPath();
    ctx.moveTo(-36, 26);
    ctx.lineTo(36, 26);
    ctx.quadraticCurveTo(46, 26, 44, 12);
    ctx.bezierCurveTo(42, -18, 22, -25, 0, -25);
    ctx.bezierCurveTo(-22, -25, -42, -18, -44, 12);
    ctx.quadraticCurveTo(-46, 26, -36, 26);
    ctx.closePath();
  }
  ctx.save();
  ctx.fillStyle = pal.accent;
  ctx.fill();
  ctx.clip();
  // Shaded base band + glint.
  ctx.fillStyle = pal.accentDark;
  ctx.fillRect(-50, 15, 100, 20);
  ctx.beginPath();
  ctx.moveTo(-22, -12);
  ctx.quadraticCurveTo(-30, 0, -28, 8);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = lw * 1.2;
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = lw;
  ctx.stroke();

  // Lid + knob.
  const lidY = style === "goose" ? -30 : -31;
  ctx.beginPath();
  ctx.roundRect(-18, lidY, 36, 7, 3);
  ink(ctx, pal, lw, pal.accentDark);
  ctx.beginPath();
  ctx.arc(0, lidY - 3, 3.5, 0, Math.PI * 2);
  ink(ctx, pal, lw * 0.8, style === "goose" ? pal.ink : pal.accent);
  ctx.restore();
}

// ── Faces, hearts, sparkles ────────────────────────────────────────────

export type Mood = "sleep" | "awake" | "wow" | "paused" | "happy";

export function drawFace(ctx: C, x: number, y: number, mood: Mood, t: number, pal: Pal, lw: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const both = (build: () => void, fill = false) => {
    build();
    ctx.strokeStyle = pal.halo;
    ctx.lineWidth = lw * 1.1 + 4;
    ctx.stroke();
    if (fill) {
      ctx.fillStyle = pal.ink;
      ctx.fill();
    }
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = lw * 1.1;
    ctx.stroke();
  };
  const ex = 11;
  if (mood === "happy") {
    ctx.fillStyle = alpha(pal.blush, 0.75);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + s * 20, y + 6, 5.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const s of [-1, 1]) {
    const cx = x + s * ex;
    if (mood === "happy") {
      both(() => {
        ctx.beginPath();
        ctx.arc(cx, y + 2, 4.5, Math.PI * 1.15, Math.PI * 1.85);
      });
    } else if (mood === "sleep") {
      both(() => {
        ctx.beginPath();
        ctx.arc(cx, y - 2, 4.5, Math.PI * 0.15, Math.PI * 0.85);
      });
    } else if (mood === "paused") {
      both(() => {
        ctx.beginPath();
        ctx.moveTo(cx - 4, y);
        ctx.lineTo(cx + 4, y);
      });
    } else {
      const blink = t % 3.7 < 0.13;
      both(() => {
        ctx.beginPath();
        if (blink) {
          ctx.moveTo(cx - 3.5, y);
          ctx.lineTo(cx + 3.5, y);
        } else {
          ctx.arc(cx, y, 2.2, 0, Math.PI * 2);
        }
      }, !blink);
    }
  }
  const my = y + 7;
  if (mood === "happy") {
    both(() => {
      ctx.beginPath();
      ctx.arc(x, my - 1, 6.5, 0, Math.PI);
      ctx.closePath();
    }, true);
  } else if (mood === "wow") {
    both(() => {
      ctx.beginPath();
      ctx.ellipse(x, my + 1, 3, 3.6 + Math.sin(t * 8) * 0.6, 0, 0, Math.PI * 2);
    });
  } else if (mood === "paused") {
    both(() => {
      ctx.beginPath();
      ctx.moveTo(x - 4, my + 1);
      ctx.lineTo(x + 4, my + 1);
    });
  } else {
    both(() => {
      ctx.beginPath();
      ctx.arc(x, my - 3, 5, Math.PI * 0.2, Math.PI * 0.8);
    });
  }
  ctx.restore();
}

/** Little "z z" floating off a sleepy face. */
export function drawZzz(ctx: C, x: number, y: number, t: number, pal: Pal, lw: number) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.45 + i * 0.5) % 1;
    const s = 3 + ph * 4;
    const zx = x + ph * 14 + i * 4;
    const zy = y - ph * 26;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.beginPath();
    ctx.moveTo(zx - s, zy - s);
    ctx.lineTo(zx + s, zy - s);
    ctx.lineTo(zx - s, zy + s);
    ctx.lineTo(zx + s, zy + s);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
  }
  ctx.restore();
}

const HEART_N = 40;
/** Steam that gathers into a pulsing heart above the finished brew. */
export function drawHeart(ctx: C, sx: number, sy: number, doneFor: number, t: number, pal: Pal) {
  const asm = clamp(doneFor / 1.8);
  const hx = sx;
  const hy = sy - 58 + Math.sin(t * 2) * 3;
  const s = 2.1 * (1 + 0.06 * Math.sin(t * 3.2));
  const hp = (th: number, o: { x: number; y: number }) => {
    const st = Math.sin(th);
    o.x = hx + 16 * st * st * st * s;
    o.y = hy - (13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)) * s;
  };
  const p = { x: 0, y: 0 };
  // Soft fill.
  ctx.beginPath();
  for (let k = 0; k <= 48; k++) {
    hp((k / 48) * Math.PI * 2, p);
    if (k === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = alpha(pal.accent, 0.6 * asm * asm);
  ctx.fill();
  // Steam dots flowing into place.
  ctx.fillStyle = pal.dark ? "rgba(251,241,225,0.9)" : "#ffffff";
  ctx.strokeStyle = pal.steamStrong;
  ctx.lineWidth = 1;
  for (let k = 0; k < HEART_N; k++) {
    const th = (k / HEART_N) * Math.PI * 2 + Math.sin(t * 0.8 + k) * 0.04;
    hp(th, p);
    const a = clamp(asm * 1.5 - hash(k) * 0.5);
    const e = 1 - Math.pow(1 - a, 3);
    const x = sx + (hash(k + 9) - 0.5) * 30 + (p.x - sx) * e + Math.sin(t * 2 + k) * (1 - e) * 6;
    const y = sy + (p.y - sy) * e;
    ctx.globalAlpha = 0.35 + 0.65 * a;
    ctx.beginPath();
    ctx.arc(x, y, 2.8 + Math.sin(t * 3 + k * 0.7) * 0.8 + (1 - e) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawSparkles(ctx: C, pts: readonly (readonly [number, number])[], t: number, pal: Pal, lw: number) {
  for (let i = 0; i < pts.length; i++) {
    const s = Math.max(0, Math.sin(t * 2.6 + i * 1.9)) * 7;
    if (s < 0.5) continue;
    const [x, y] = pts[i];
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.closePath();
    ink(ctx, pal, lw * 0.6, pal.accentLight);
  }
}

/** Bloom/crema bubbles popping along a surface. */
export function drawBubbles(
  ctx: C,
  cx: number,
  y: number,
  halfW: number,
  intensity: number,
  t: number,
  pal: Pal,
  lw: number,
  fill: string,
  seed = 0,
) {
  if (intensity <= 0.01) return;
  const n = 12;
  ctx.lineWidth = lw * 0.45;
  ctx.strokeStyle = pal.ink;
  for (let i = 0; i < n; i++) {
    const h = hash(i * 3.1 + seed);
    if (h > intensity + 0.15) continue;
    const cyc = 1.1 + hash(i + 40 + seed) * 1.6;
    const ph = (t / cyc + hash(i + 7 + seed)) % 1;
    const x = cx + (hash(i + 3 + seed) * 2 - 1) * halfW * 0.85;
    const rMax = 1.6 + hash(i + 11 + seed) * 3.2;
    if (ph < 0.85) {
      const r = rMax * Math.sin((ph / 0.85) * Math.PI * 0.5);
      ctx.beginPath();
      ctx.arc(x, y - r * 0.6, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.stroke();
    } else {
      // Pop! tiny burst lines.
      const k = (ph - 0.85) / 0.15;
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * Math.PI * 2 + 0.4;
        ctx.moveTo(x + Math.cos(a) * rMax * (0.6 + k), y - rMax * 0.6 + Math.sin(a) * rMax * (0.6 + k));
        ctx.lineTo(x + Math.cos(a) * rMax * (1 + k * 1.4), y - rMax * 0.6 + Math.sin(a) * rMax * (1 + k * 1.4));
      }
      ctx.globalAlpha = 1 - k;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

/** A stirring spoon whose bowl swirls around inside a vessel. */
export function drawSpoon(ctx: C, cx: number, topY: number, bowlY: number, t: number, amount: number, pal: Pal, lw: number) {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = amount;
  const sw = Math.sin(t * 6);
  const bx = cx + sw * 26;
  const by = bowlY + Math.cos(t * 6) * 5 - (1 - amount) * 40;
  const hx = cx + 18 + sw * 6;
  const hy = topY - (1 - amount) * 40;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(bx, by);
  tube(ctx, pal, lw * 0.8, 4, pal.metal);
  ctx.beginPath();
  ctx.ellipse(bx, by + 6, 6, 9, (hx - bx) * 0.01, 0, Math.PI * 2);
  ink(ctx, pal, lw * 0.8, pal.metal);
  ctx.restore();
}
