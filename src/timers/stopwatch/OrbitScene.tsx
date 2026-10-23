import { useRef, type RefObject } from "react";
import { clamp, hexToRgb, useCanvas, type Frame } from "../../core/canvas";
import { isDark } from "../../core/settings";
import { planetColor } from "./palette";
import { elapsedOf, lapInfo, type LapInfo, type SwState } from "./state";

/**
 * A tiny solar system that *is* the stopwatch:
 *  - the comet on the dial is the seconds hand (one orbit per minute) and
 *    lights up the ticks it has passed,
 *  - the little spark near the sun circles once per second,
 *  - every lap drops a planet where the comet was, on its own ring —
 *    green + Saturn ring for the fastest lap, red with craters for the slowest,
 *  - paused: everything freezes, the trail fades and the sun dozes off.
 */

const THEME = {
  light: { bg: "#fbecd5", ink: "#1b1424", shadow: "#1b1424", star: "#1b1424", starA: 0.5, face: "#ffffff", faceA: 0.45 },
  dark: { bg: "#2a2236", ink: "#fbf1e1", shadow: "#000000", star: "#fbf1e1", starA: 0.65, face: "#14101b", faceA: 0.35 },
};

const TAU = Math.PI * 2;
const MINUTE = 60_000;
const MAX_RINGS = 6;
const RING_IN = 0.37;
const RING_OUT = 0.71;
const FONT = '"Bricolage Grotesque Variable", ui-rounded, system-ui, sans-serif';

// Deterministic starfield in polar coords around the system centre.
const N_STARS = 96;
const starA = new Float32Array(N_STARS);
const starD = new Float32Array(N_STARS);
const starS = new Float32Array(N_STARS);
const starP = new Float32Array(N_STARS);
{
  let seed = 1234567;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N_STARS; i++) {
    starA[i] = rnd() * TAU;
    starD[i] = Math.sqrt(rnd());
    starS[i] = 0.6 + rnd() * rnd() * 2.2;
    starP[i] = rnd() * 100;
  }
}

// Comet dust: x, y, vx, vy, life, maxLife per particle.
const N_DUST = 80;

interface Seen {
  t: number;
  drop: boolean;
}

interface SceneState {
  trail: number;
  dust: Float32Array;
  dustNext: number;
  spawnAcc: number;
  seen: Map<number, Seen>;
  ringR: Map<number, number>;
  laps: number[] | null;
  info: LapInfo[];
  neb: HTMLCanvasElement;
  nebKey: string;
  glow: HTMLCanvasElement;
  glowKey: string;
}

function makeScene(): SceneState {
  return {
    trail: 0,
    dust: new Float32Array(N_DUST * 6),
    dustNext: 0,
    spawnAcc: 0,
    seen: new Map(),
    ringR: new Map(),
    laps: null,
    info: [],
    neb: document.createElement("canvas"),
    nebKey: "",
    glow: document.createElement("canvas"),
    glowKey: "",
  };
}

// ---------- per-pixel nebula (regenerated only on resize / theme change) ----------

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function vnoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number) {
  let v = 0;
  let amp = 0.5;
  for (let o = 0; o < 4; o++) {
    v += vnoise(x, y) * amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 9.7;
    amp *= 0.5;
  }
  return v;
}

/** 4×4 Bayer matrix: the nebula is dithered into chunky pixels on purpose. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function paintNebula(cv: HTMLCanvasElement, w: number, h: number, cx: number, cy: number, R: number, accent: number[], dark: boolean) {
  const NW = 128;
  const NH = Math.max(1, Math.round((NW * h) / w));
  cv.width = NW;
  cv.height = NH;
  const c = cv.getContext("2d");
  if (!c) return;
  const img = c.createImageData(NW, NH);
  const d = img.data;
  const purple = [182, 156, 255];
  const k = NW / w;
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < NW; x++) {
      const px = x / k;
      const py = y / k;
      const n = fbm(px / 90, py / 90);
      const m = fbm(px / 140 + 40, py / 140 + 12);
      const dist = Math.hypot(px - cx, py - cy) / (R * 1.6);
      const fall = clamp(1 - dist * dist);
      let a = clamp((n - 0.42) * 2.6) * (0.35 + 0.65 * fall);
      // Dither: snap alpha to 5 levels with an ordered pattern.
      const levels = 5;
      const t = BAYER[(y & 3) * 4 + (x & 3)] / 16;
      a = Math.floor(a * levels + t) / levels;
      const mix = clamp((m - 0.4) * 3);
      const i = (y * NW + x) * 4;
      d[i] = accent[0] + (purple[0] - accent[0]) * mix;
      d[i + 1] = accent[1] + (purple[1] - accent[1]) * mix;
      d[i + 2] = accent[2] + (purple[2] - accent[2]) * mix;
      d[i + 3] = a * 255 * (dark ? 0.24 : 0.34);
    }
  }
  c.putImageData(img, 0, 0);
}

function paintGlow(cv: HTMLCanvasElement, rgb: number[]) {
  const S = 64;
  cv.width = S;
  cv.height = S;
  const c = cv.getContext("2d");
  if (!c) return;
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const col = `${rgb[0]},${rgb[1]},${rgb[2]}`;
  g.addColorStop(0, `rgba(${col},0.75)`);
  g.addColorStop(0.35, `rgba(${col},0.3)`);
  g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
}

const easeOutBack = (x: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export function OrbitScene({
  sw,
  accent,
  bottomInset,
}: {
  sw: SwState;
  accent: string;
  /** CSS px at the bottom of the stage covered by the readout card. */
  bottomInset: RefObject<number>;
}) {
  const sceneRef = useRef<SceneState | null>(null);
  const rgb = hexToRgb(accent).map((v) => Math.round(v * 255));
  const deep = `rgb(${Math.round(rgb[0] * 0.55)},${Math.round(rgb[1] * 0.62)},${Math.round(rgb[2] * 0.6)})`;

  const draw = (ctx: CanvasRenderingContext2D, f: Frame) => {
    const S = (sceneRef.current ??= makeScene());
    const dark = isDark();
    const C = dark ? THEME.dark : THEME.light;
    const w = f.cssWidth;
    const h = f.cssHeight;
    const now = Date.now();
    const running = sw.startedAt !== null;
    const el = elapsedOf(sw, now);
    const idle = !running && el === 0;
    const line = deep; // strong accent for strokes on light paper
    const hot = dark ? accent : line;

    // Layout: system sits above the readout card.
    const inset = clamp(bottomInset.current || h * 0.3, 0, h * 0.5);
    const top = 16;
    const avail = h - inset - top;
    const R = Math.max(24, Math.min(w * 0.43, avail / 2 - 10));
    const cx = w / 2;
    const cy = top + avail / 2;
    const lw = Math.max(1.6, R * 0.016);

    S.trail += ((running ? 1 : 0) - S.trail) * (1 - Math.exp(-f.dt * (running ? 2.5 : 1.4)));
    if (S.laps !== sw.laps) {
      S.laps = sw.laps;
      S.info = lapInfo(sw.laps);
      if (!sw.laps.length) {
        S.seen.clear();
        S.ringR.clear();
      }
    }
    const info = S.info;

    // ---- background ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, f.width, f.height);
    const nebKey = `${Math.round(w)}x${Math.round(h)}|${Math.round(R)}|${dark}|${accent}`;
    if (S.nebKey !== nebKey) {
      S.nebKey = nebKey;
      paintNebula(S.neb, w, h, cx, cy, R, rgb, dark);
    }
    if (S.glowKey !== accent) {
      S.glowKey = accent;
      paintGlow(S.glow, rgb);
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S.neb, 0, 0, f.width, f.height);
    ctx.imageSmoothingEnabled = true;
    ctx.setTransform(f.width / w, 0, 0, f.height / h, 0, 0);

    // ---- stars (drift with elapsed time, twinkle always) ----
    const rot = (el / (8 * MINUTE)) * TAU;
    const half = Math.hypot(w, h) / 2 + 12;
    ctx.fillStyle = C.star;
    for (let i = 0; i < N_STARS; i++) {
      const a = starA[i] + rot;
      const r = starD[i] * half;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (x < -4 || y < -4 || x > w + 4 || y > h + 4) continue;
      const tw = 0.5 + 0.5 * Math.sin(f.time * (0.7 + (starP[i] % 1.4)) + starP[i]);
      const s = starS[i];
      ctx.globalAlpha = C.starA * (0.3 + 0.7 * tw);
      if (s > 1.9) {
        const k = s * (0.8 + tw * 0.6);
        ctx.fillRect(x - k, y - 0.6, k * 2, 1.2);
        ctx.fillRect(x - 0.6, y - k, 1.2, k * 2);
      } else {
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;

    const cometA = ((el % MINUTE) / MINUTE) * TAU - Math.PI / 2;

    // ---- dial face: a translucent lens with a hard offset shadow ----
    ctx.globalAlpha = dark ? 0.5 : 0.12;
    ctx.strokeStyle = C.shadow;
    ctx.lineWidth = lw * 2.2;
    ctx.beginPath();
    ctx.arc(cx + lw * 2, cy + lw * 2, R, -0.1 * Math.PI, 0.6 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = C.faceA;
    circle(ctx, cx, cy, R, C.face);
    ctx.globalAlpha = 1;

    // ---- orbit guides ----
    const ringStart = Math.max(0, info.length - MAX_RINGS);
    const ringGap = (RING_OUT - RING_IN) / (MAX_RINGS - 1);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 5]);
    ctx.globalAlpha = 0.18;
    for (let j = 0; j < Math.min(MAX_RINGS, info.length); j++) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * (RING_IN + j * ringGap), 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.25, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // Seconds "hand": faint tether from sun to comet.
    if (!idle) {
      ctx.globalAlpha = 0.14 + 0.1 * S.trail;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(cometA) * R, cy + Math.sin(cometA) * R);
      ctx.stroke();
    }

    // ---- dial: bezel + 60 ticks; passed ticks light up ----
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    const sec = idle ? -1 : Math.floor((el % MINUTE) / 1000);
    ctx.lineCap = "round";
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * TAU - Math.PI / 2;
      const long = k % 5 === 0;
      const r0 = R * (long ? 0.79 : 0.84);
      const r1 = R * 0.9;
      const lit = k <= sec;
      ctx.globalAlpha = lit ? 1 : long ? 0.45 : 0.22;
      ctx.strokeStyle = lit ? hot : C.ink;
      ctx.lineWidth = (long ? 2.2 : 1.3) * (lit ? 1.35 : 1) * Math.max(1, R / 140);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    ctx.globalAlpha = 1;

    // Minute pulse: a ring ripples out each time the comet completes a lap of the dial.
    if (!idle && el >= MINUTE) {
      const p = (el % MINUTE) / 1100;
      if (p < 1) {
        ctx.globalAlpha = (1 - p) * 0.7;
        ctx.strokeStyle = hot;
        ctx.lineWidth = lw * 2 * (1 - p) + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (1 + easeOutCubic(p) * 0.22), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // ---- sun (with a face) ----
    const rs = R * 0.14;
    const beat = running ? Math.exp(-((el % 1000) / 1000) * 7) : 0;
    const sunR = rs * (1 + 0.1 * beat + (running ? 0 : 0.03 * Math.sin(f.time * 1.6)));
    ctx.globalAlpha = dark ? 0.9 : 0.75;
    const gs = sunR * (4.2 + beat * 0.8);
    ctx.drawImage(S.glow, cx - gs / 2, cy - gs / 2, gs, gs);
    ctx.globalAlpha = 1;
    circle(ctx, cx + lw, cy + lw, sunR, C.shadow);
    circle(ctx, cx, cy, sunR, accent);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.3;
    ctx.stroke();
    // cheeks
    ctx.globalAlpha = 0.55;
    circle(ctx, cx - sunR * 0.55, cy + sunR * 0.22, sunR * 0.16, "#ff7eb6");
    circle(ctx, cx + sunR * 0.55, cy + sunR * 0.22, sunR * 0.16, "#ff7eb6");
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#1b1424";
    ctx.fillStyle = "#1b1424";
    ctx.lineWidth = Math.max(1.4, sunR * 0.11);
    ctx.lineCap = "round";
    const ex = sunR * 0.33;
    const ey = cy - sunR * 0.12;
    if (running) {
      const blink = (f.time % 4.2) < 0.12;
      const lx = Math.cos(cometA) * sunR * 0.09;
      const ly = Math.sin(cometA) * sunR * 0.09;
      for (const sx of [-1, 1]) {
        if (blink) {
          ctx.beginPath();
          ctx.moveTo(cx + sx * ex - sunR * 0.1, ey);
          ctx.lineTo(cx + sx * ex + sunR * 0.1, ey);
          ctx.stroke();
        } else {
          circle(ctx, cx + sx * ex + lx, ey + ly, sunR * 0.12, "#1b1424");
        }
      }
      ctx.beginPath();
      ctx.arc(cx, cy + sunR * 0.12, sunR * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // dozing: closed eyes + tiny "o" mouth
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(cx + sx * ex, ey, sunR * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy + sunR * 0.3, sunR * 0.08, 0, TAU);
      ctx.stroke();
      // floating z's
      ctx.fillStyle = C.ink;
      for (let i = 0; i < 3; i++) {
        const p = (f.time * 0.35 + i / 3) % 1;
        const fs = Math.max(9, sunR * (0.5 + p * 0.5));
        ctx.globalAlpha = Math.sin(p * Math.PI) * 0.8;
        ctx.font = `800 ${fs}px ${FONT}`;
        ctx.fillText("z", cx + sunR * (0.9 + p * 1.1), cy - sunR * (0.8 + p * 1.6));
      }
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = "butt";

    // ---- the once-per-second spark ----
    {
      const rf = R * 0.25;
      const a = ((el % 1000) / 1000) * TAU - Math.PI / 2;
      const len = Math.min(TAU * 0.45 * S.trail, (el / 1000) * TAU);
      const hr = Math.max(2.2, R * 0.03);
      arcTrail(ctx, cx, cy, rf, a, len, hr * 1.6, hot, S.trail, 18);
      if (dark) {
        ctx.globalAlpha = 0.8;
        ctx.drawImage(S.glow, cx + Math.cos(a) * rf - hr * 3, cy + Math.sin(a) * rf - hr * 3, hr * 6, hr * 6);
        ctx.globalAlpha = 1;
      }
      circle(ctx, cx + Math.cos(a) * rf, cy + Math.sin(a) * rf, hr, dark ? "#ffffff" : C.ink);
    }

    // ---- planets, one per lap ----
    const pr = clamp(R * 0.054, 4, 11);
    for (let i = ringStart; i < info.length; i++) {
      const L = info[i];
      let seen = S.seen.get(L.total);
      if (!seen) {
        // Laps already there on first paint pop in one by one; fresh laps drop from the comet.
        const initial = f.frame < 3;
        seen = { t: f.time + (initial ? (i - ringStart) * 0.09 : 0), drop: !initial };
        S.seen.set(L.total, seen);
      }
      const target = RING_IN + (i - ringStart) * ringGap;
      const prev = S.ringR.get(L.total) ?? target;
      const rn = prev + (target - prev) * (1 - Math.exp(-f.dt * 5));
      S.ringR.set(L.total, rn);

      const age = f.time - seen.t;
      if (age < 0) continue;
      const period = 16 + 6 * (i % MAX_RINGS);
      const a0 = ((L.total % MINUTE) / MINUTE) * TAU - Math.PI / 2;
      const a = a0 + (TAU / period) * Math.max(0, el - L.total) / 1000;
      const dropT = seen.drop ? clamp(age / 0.6) : 1;
      const rr = R * (seen.drop ? 1 + (rn - 1) * easeOutCubic(dropT) : rn);
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      const sc = easeOutBack(clamp(age / 0.55));
      const r = pr * sc * (L.kind === "fast" ? 1.15 : L.kind === "slow" ? 1.08 : 1);

      // spawn shockwave
      if (age < 0.8) {
        ctx.globalAlpha = (1 - age / 0.8) * 0.8;
        ctx.strokeStyle = planetColor(L);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(x, y, pr * (1 + age * 5), 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (r > 0.3) drawPlanet(ctx, x, y, r, L, lw, C.ink, C.shadow, i);

      // newest lap gets a little name tag for a moment
      if (i === info.length - 1 && age < 2.6) {
        const fade = clamp((2.6 - age) / 0.5);
        const fs = Math.max(11, R * 0.085);
        ctx.font = `800 ${fs}px ${FONT}`;
        ctx.globalAlpha = fade;
        ctx.lineJoin = "round";
        ctx.lineWidth = 4;
        ctx.strokeStyle = C.bg;
        const tx = x + r + 4;
        const ty = y - r - 2;
        ctx.strokeText(`Lap ${L.n}`, tx, ty);
        ctx.fillStyle = C.ink;
        ctx.fillText(`Lap ${L.n}`, tx, ty);
        ctx.globalAlpha = 1;
      }
    }

    // ---- comet dust (pixel squares) ----
    const hx = cx + Math.cos(cometA) * R;
    const hy = cy + Math.sin(cometA) * R;
    const D = S.dust;
    if (running) {
      S.spawnAcc += f.dt * 34;
      while (S.spawnAcc >= 1) {
        S.spawnAcc -= 1;
        const o = S.dustNext * 6;
        S.dustNext = (S.dustNext + 1) % N_DUST;
        const tang = cometA - Math.PI / 2; // backwards along the orbit
        const sp = 6 + Math.random() * 14;
        const spread = (Math.random() - 0.5) * 1.6;
        D[o] = hx + (Math.random() - 0.5) * 4;
        D[o + 1] = hy + (Math.random() - 0.5) * 4;
        D[o + 2] = Math.cos(tang + spread) * sp;
        D[o + 3] = Math.sin(tang + spread) * sp;
        D[o + 5] = 0.6 + Math.random() * 0.9;
        D[o + 4] = D[o + 5];
      }
    }
    for (let i = 0; i < N_DUST; i++) {
      const o = i * 6;
      if (D[o + 4] <= 0) continue;
      D[o + 4] -= f.dt;
      D[o] += D[o + 2] * f.dt;
      D[o + 1] += D[o + 3] * f.dt;
      const lf = clamp(D[o + 4] / D[o + 5]);
      const s = (0.8 + lf * 2.2) * Math.max(1, R / 160);
      ctx.globalAlpha = lf;
      ctx.fillStyle = i % 3 === 0 ? (dark ? "#ffffff" : C.ink) : hot;
      ctx.fillRect(Math.round(D[o] - s / 2), Math.round(D[o + 1] - s / 2), s, s);
    }
    ctx.globalAlpha = 1;

    // ---- comet: the seconds hand ----
    const hr = Math.max(4.5, R * 0.062);
    const len = Math.min(TAU * 0.4 * S.trail, (el / MINUTE) * TAU);
    arcTrail(ctx, cx, cy, R, cometA, len, hr * 1.9, accent, S.trail, 44);
    arcTrail(ctx, cx, cy, R, cometA, len * 0.7, hr * 0.7, dark ? "#ffffff" : line, S.trail * 0.9, 30);
    ctx.globalAlpha = dark ? 1 : 0.8;
    const gl = hr * (6 + S.trail * 2);
    ctx.drawImage(S.glow, hx - gl / 2, hy - gl / 2, gl, gl);
    ctx.globalAlpha = 1;
    circle(ctx, hx + lw, hy + lw, hr, C.shadow);
    circle(ctx, hx, hy, hr, accent);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    circle(ctx, hx - hr * 0.35, hy - hr * 0.35, hr * 0.3, "#ffffff");
    ctx.globalAlpha = 1;

    // paused: a dashed halo breathes around the frozen comet
    if (!running && !idle) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.setLineDash([3, 4]);
      ctx.lineDashOffset = -f.time * 8;
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(f.time * 3);
      ctx.beginPath();
      ctx.arc(hx, hy, hr * (2 + 0.25 * Math.sin(f.time * 3)), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.globalAlpha = 1;
    }
  };

  const ref = useCanvas(draw);
  return <canvas ref={ref} aria-hidden />;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
  ctx.fill();
}

/** A tapering, fading stroke that trails behind angle `head` along a circle. */
function arcTrail(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  head: number,
  len: number,
  width: number,
  color: string,
  alpha: number,
  steps: number,
) {
  if (len < 0.005 || alpha < 0.01) return;
  ctx.strokeStyle = color;
  ctx.lineCap = "butt";
  for (let k = 0; k < steps; k++) {
    const t0 = k / steps;
    const t1 = (k + 1.15) / steps;
    const fade = 1 - t0;
    ctx.globalAlpha = Math.pow(fade, 1.7) * alpha;
    ctx.lineWidth = Math.max(0.5, width * fade);
    ctx.beginPath();
    ctx.arc(cx, cy, r, head - len * Math.min(1, t1), head - len * t0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  L: LapInfo,
  lw: number,
  ink: string,
  shadow: string,
  seed: number,
) {
  const col = planetColor(L);
  const tilt = -0.4;
  if (L.kind === "fast") {
    // back half of the Saturn ring
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.85, r * 0.6, tilt, Math.PI, TAU);
    ctx.stroke();
  }
  circle(ctx, x + lw * 0.9, y + lw * 0.9, r, shadow);
  circle(ctx, x, y, r, col);
  // surface detail, clipped to the disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  if (L.kind === "slow") {
    ctx.globalAlpha = 0.3;
    circle(ctx, x - r * 0.25, y + r * 0.2, r * 0.28, ink);
    circle(ctx, x + r * 0.4, y - r * 0.25, r * 0.18, ink);
    circle(ctx, x + r * 0.2, y + r * 0.6, r * 0.14, ink);
  } else {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#ffffff";
    const off = ((seed * 37) % 7) / 7 - 0.5;
    ctx.fillRect(x - r, y + r * (off * 0.6 - 0.12), r * 2, r * 0.32);
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = ink;
    ctx.fillRect(x - r, y + r * (off * 0.6 + 0.35), r * 2, r * 0.2);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 0.8;
  circle(ctx, x - r * 0.38, y - r * 0.38, r * 0.22, "#ffffff");
  ctx.globalAlpha = 1;
  if (L.kind === "fast") {
    // front half of the ring, over the planet
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw * 2.4;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.85, r * 0.6, tilt, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "#ffd23f";
    ctx.lineWidth = lw * 1.1;
    ctx.stroke();
  }
}
