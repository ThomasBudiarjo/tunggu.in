import { useEffect, useRef, useState } from "react";
import { clamp, smoothstep, useCanvas, type Frame } from "../../core/canvas";
import { position } from "../../core/engine";
import { getRun } from "../../core/runs";
import { isDark } from "../../core/settings";

/**
 * Pixel-art night sky, painted pixel by pixel into an ImageData buffer.
 *
 * - The sky gradient is quantised to a small palette with 4×4 Bayer
 *   dithering, so it reads like an old-school game.
 * - A crescent moon travels along an arc as the nap progresses and sets
 *   behind the hills when it's time to wake up.
 * - During "Bangun pelan-pelan" the palette dithers into dawn
 *   (purple → pink → orange), the sun rises and birds fly by.
 * - A cat sleeps on a pillow (the timer's accent colour) and breathes out
 *   floating "Z"s. Paused = stars stop twinkling and the cat peeks.
 */

type RGB = readonly [number, number, number];
type Phase = "idle" | "fall" | "sleep" | "wake" | "done";

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const th = (x: number, y: number) => BAYER[((y & 3) << 2) | (x & 3)];

const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** RGBA packed for a little-endian Uint32 view of ImageData. */
const pack = (r: number, g: number, b: number) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const mixPack = (a: RGB, b: RGB, t: number) =>
  pack(
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  );

// Sky stops, top → horizon.
const NIGHT_DARK = ["#05061c", "#0a0d2e", "#111846", "#1b2361", "#2a3279"].map(hex);
const NIGHT_LIGHT = ["#0b0f3a", "#131a52", "#1d276c", "#2a3787", "#3c48a1"].map(hex);
const DAWN = ["#2a1f5e", "#57307f", "#a3468f", "#e5647c", "#ffa95e"].map(hex);
const SKY_N = 12;

const FAR = { night: hex("#151944"), dawn: hex("#6a3a78") };
const FAR_EDGE = { night: hex("#222a66"), dawn: hex("#9a5592") };
const NEAR = { night: hex("#0a0b24"), dawn: hex("#3a1f4c") };
const NEAR_EDGE = { night: hex("#1a1d48"), dawn: hex("#6a3768") };
const MOON = hex("#fff3c8");
const MOON_RIM = hex("#e3cf8e");
const SUN = hex("#fff1b8");
const SUN_MID = hex("#ffd36e");
const SUN_RIM = hex("#ffa743");
const STAR_DIM = hex("#a9b2ff");
const STAR_BRIGHT = hex("#fff8e2");
const WHITE = hex("#ffffff");
const BLACK = hex("#000000");
const NIGHT_SHADE = hex("#0b0d2a");
const OUTLINE = pack(11, 10, 28);
const BIRD = pack(42, 24, 56);
const BANG = pack(255, 210, 63);
const WINDOW_ON = pack(255, 214, 120);

// Cat colours by day / by night.
const CAT = {
  body: { day: hex("#f5a65b"), night: hex("#7d78a8") },
  stripe: { day: hex("#cf6d37"), night: hex("#5a5585") },
  pink: { day: hex("#ff8fb0"), night: hex("#a46f98") },
};

// ── glyphs ───────────────────────────────────────────────────────────────
const parse = (rows: string[]) => {
  const pts: number[] = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => c === "#" && pts.push(x, y)));
  return Int8Array.from(pts);
};
const Z_SMALL = parse(["####", "..#.", ".#..", "####"]);
const Z_BIG = parse(["#####", "...#.", "..#..", ".#...", "#####"]);
const BIRD_UP = parse(["#...#", ".#.#.", "..#.."]);
const BIRD_DOWN = parse([".....", "##.##", "..#.."]);
const BANG_GLYPH = parse(["##", "##", "##", "##", "..", "..", "##"]);
const OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
const Z_WINDOW = parse(["#.#"]);
const HOUSE = parse(["...#...", "..###..", ".#####.", "#######", ".#####.", ".#####.", ".#####."]);

// ── the cat + pillow sprite (built once) ─────────────────────────────────
const SW = 36;
const SH = 20;
// Indices: 0 empty, 1 outline, 2 body, 3 stripe, 4 pink, 6 pillow, 7 light, 8 dark.
function buildLayers() {
  const pil = new Uint8Array(SW * SH);
  const cat = new Uint8Array(SW * SH);
  const outline = (m: Uint8Array) => {
    const edge: number[] = [];
    for (let y = 0; y < SH; y++)
      for (let x = 0; x < SW; x++) {
        const i = y * SW + x;
        if (!m[i]) continue;
        const empty = (xx: number, yy: number) => xx < 0 || yy < 0 || xx >= SW || yy >= SH || !m[yy * SW + xx];
        if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) edge.push(i);
      }
    for (const i of edge) m[i] = 1;
  };
  // Plump pillow: a superellipse.
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const dx = (x + 0.5 - 18) / 17.2;
      const dy = (y + 0.5 - 15.2) / 4.4;
      if (dx ** 4 + dy ** 4 <= 1) pil[y * SW + x] = dy < -0.35 ? 7 : dy > 0.55 ? 8 : 6;
    }
  outline(pil);

  const inTri = (px: number, py: number, a: number[], b: number[], c: number[]) => {
    const s = (p: number[], q: number[]) => (px - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (py - q[1]);
    const d1 = s(a, b);
    const d2 = s(b, c);
    const d3 = s(c, a);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };
  for (let y = 0; y < SH; y++)
    for (let x = 0; x < SW; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      const i = y * SW + x;
      const body = ((cx - 15) / 10.5) ** 2 + ((cy - 10.8) / 4.7) ** 2 <= 1;
      const head = (cx - 25.5) ** 2 + (cy - 9.8) ** 2 <= 4.5 ** 2;
      const ears =
        inTri(cx, cy, [20.4, 8.4], [24.6, 6.2], [21, 1.4]) || inTri(cx, cy, [26.4, 6.2], [30.6, 8.4], [30, 1.4]);
      if (body || head || ears) cat[i] = 2;
      if (body && !head && cy < 9.6 && x >= 8 && x <= 20 && x % 3 === 1) cat[i] = 3;
    }
  // Tail curled around the front: a fat quadratic bezier.
  for (let k = 0; k <= 60; k++) {
    const t = k / 60;
    const bx = (1 - t) ** 2 * 5.5 + 2 * (1 - t) * t * 0.5 + t * t * 17;
    const by = (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 16.5 + t * t * 15.4;
    for (let y = Math.floor(by - 2); y <= by + 2; y++)
      for (let x = Math.floor(bx - 2); x <= bx + 2; x++) {
        if (x < 0 || y < 0 || x >= SW || y >= SH) continue;
        if ((x + 0.5 - bx) ** 2 + (y + 0.5 - by) ** 2 <= 1.35 ** 2) cat[y * SW + x] = 3;
      }
  }
  outline(cat);
  // Forehead stripes, inner ears, nose.
  for (const [x, y, c] of [
    [24, 6, 3],
    [26, 6, 3],
    [22, 4, 4],
    [22, 5, 4],
    [23, 5, 4],
    [29, 4, 4],
    [29, 5, 4],
    [28, 5, 4],
    [25, 11, 4],
    [26, 11, 4],
  ])
    cat[y * SW + x] = c;
  return { pil, cat };
}
const LAYERS = buildLayers();

// ── simulation state ─────────────────────────────────────────────────────
const MAX_Z = 10;

interface Sim {
  W: number;
  H: number;
  hy: number;
  img: ImageData;
  buf: Uint32Array;
  farY: Int16Array;
  nearY: Int16Array;
  stars: Float32Array; // x, y, phase, speed, base, big
  nStars: number;
  pal: Uint32Array;
  sprite: Uint32Array;
  t: number;
  moon: number;
  dawn: number;
  init: boolean;
  z: Float32Array; // x0, y0, age, alive
  zTimer: number;
  ss: Float32Array; // life, x, y, vx, vy
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSim(W: number, H: number, prev: Sim | null): Sim {
  const img = new ImageData(W, H);
  const hy = Math.round(H * 0.74);
  const farY = new Int16Array(W);
  const nearY = new Int16Array(W);
  for (let x = 0; x < W; x++) {
    farY[x] = Math.round(hy + Math.sin(x * 0.075 + 1.3) * 2.2 + Math.sin(x * 0.021 + 0.4) * 3.2);
    nearY[x] = Math.round(H * 0.87 + Math.sin(x * 0.045 + 2.1) * 1.6 + Math.sin(x * 0.13) * 0.6);
  }
  const rnd = mulberry32(W * 7919 + H * 31);
  const nStars = Math.min(170, Math.floor((W * hy) / 70));
  const stars = new Float32Array(nStars * 6);
  for (let i = 0; i < nStars; i++) {
    const o = i * 6;
    stars[o] = Math.floor(rnd() * W);
    stars[o + 1] = Math.floor(rnd() * (hy - 3));
    stars[o + 2] = rnd() * Math.PI * 2;
    stars[o + 3] = 0.8 + rnd() * 2.6;
    stars[o + 4] = 0.35 + rnd() * 0.65;
    stars[o + 5] = rnd() < 0.1 ? 1 : 0;
  }
  return {
    W,
    H,
    hy,
    img,
    buf: new Uint32Array(img.data.buffer),
    farY,
    nearY,
    stars,
    nStars,
    pal: new Uint32Array(SKY_N),
    sprite: new Uint32Array(9),
    t: prev?.t ?? 0,
    moon: prev?.moon ?? 0,
    dawn: prev?.dawn ?? 0,
    init: prev?.init ?? false,
    z: new Float32Array(MAX_Z * 4),
    zTimer: 0.6,
    ss: new Float32Array(5),
  };
}

function blend(buf: Uint32Array, i: number, c: RGB, a: number) {
  const v = buf[i];
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  buf[i] = pack(Math.round(r + (c[0] - r) * a), Math.round(g + (c[1] - g) * a), Math.round(b + (c[2] - b) * a));
}

function glyph(s: Sim, pts: Int8Array, x0: number, y0: number, color: number, alpha = 1, clipToSky = false) {
  const { W, H, buf, farY } = s;
  for (let k = 0; k < pts.length; k += 2) {
    const x = x0 + pts[k];
    const y = y0 + pts[k + 1];
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (clipToSky && y >= farY[x]) continue;
    if (alpha < 1 && alpha <= th(x, y)) continue;
    buf[y * W + x] = color;
  }
}

function readState(timerId: string) {
  const run = getRun(timerId);
  let phase: Phase = "idle";
  let paused = false;
  let moon = 0.16;
  let dawn = 0;
  if (run) {
    const pos = position(run);
    let wake = 0;
    for (const seg of run.segments) if (seg.kind === "wake") wake += seg.seconds;
    moon = clamp(pos.totalElapsed / Math.max(1, pos.totalDuration - wake));
    if (run.finished || pos.done) {
      phase = "done";
      dawn = 1;
    } else {
      paused = pos.paused;
      const k = pos.segment.kind;
      phase = k === "fall" ? "fall" : k === "wake" ? "wake" : "sleep";
      if (phase === "wake") dawn = 0.15 + 0.7 * smoothstep(0, 1, pos.segProgress);
    }
  }
  return { phase, paused, moon, dawn };
}

function paint(s: Sim, f: Frame, timerId: string, accent: RGB) {
  const { W, H, hy, buf, farY, nearY, pal } = s;
  const st = readState(timerId);
  const { phase, paused } = st;
  const dt = f.dt;

  if (!s.init) {
    s.moon = st.moon;
    s.dawn = st.dawn;
    s.init = true;
  }
  const ease = 1 - Math.exp(-dt * 2.2);
  s.moon += (st.moon - s.moon) * ease;
  s.dawn += (st.dawn - s.dawn) * ease;
  if (!paused) s.t += dt;
  const t = s.t;
  const d = s.dawn;

  // ── palette for this frame ──
  const night = isDark() ? NIGHT_DARK : NIGHT_LIGHT;
  const M = night.length - 1;
  for (let k = 0; k < SKY_N; k++) {
    const u = (k / (SKY_N - 1)) * M;
    const i = Math.min(M - 1, Math.floor(u));
    const fr = u - i;
    const n = mixRGB(night[i], night[i + 1], fr);
    const a = mixRGB(DAWN[i], DAWN[i + 1], fr);
    pal[k] = mixPack(n, a, d);
  }
  const farCol = mixPack(FAR.night, FAR.dawn, d);
  const farEdge = mixPack(FAR_EDGE.night, FAR_EDGE.dawn, d);
  const nearCol = mixPack(NEAR.night, NEAR.dawn, d);
  const nearEdge = mixPack(NEAR_EDGE.night, NEAR_EDGE.dawn, d);
  const moonCore = pack(...MOON);
  const moonRim = pack(...MOON_RIM);
  const sunCore = pack(...SUN);
  const sunMid = pack(...SUN_MID);
  const sunRim = pack(...SUN_RIM);

  // ── geometry ──
  const R = clamp(Math.round(Math.min(W, H) * 0.055), 4, 8);
  const mp = 0.06 + 0.88 * s.moon;
  const mx = W * (0.1 + 0.8 * mp);
  const my = hy - Math.sin(mp * Math.PI) * (hy - H * 0.42) + d * R * 2.6;
  const mvis = 1 - smoothstep(0.35, 0.95, d);
  const ox = R * 0.55;
  const oy = -R * 0.35;
  const cut2 = (R * 0.82) ** 2;
  const R2 = R * R;
  const Rin2 = (R - 1) ** 2;
  const crX = mx - R * 0.45;
  const crY = my + R * 0.3;

  const Rs = Math.round(R * 1.35);
  const sunX = W * 0.72;
  const sunLow = hy + Rs + 7;
  const sunY = sunLow - smoothstep(0, 1, d) * (sunLow - H * 0.47);
  const Rs2 = Rs * Rs;
  const RsMid2 = (Rs * 0.62) ** 2;
  const RsIn2 = (Rs - 1.2) ** 2;
  const sunOn = d > 0.01;

  // ── sky, moon, sun, hills — one pass, pixel by pixel ──
  const span = SKY_N - 1;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    const base = (y / hy) * span;
    for (let x = 0; x < W; x++) {
      const i = row + x;
      const ny = nearY[x];
      if (y >= ny) {
        // Near ground with a sparse dither texture.
        buf[i] = y === ny || (y === ny + 1 && x % 5 === 0) || ((x * 7 + y * 13) % 23 === 0 && y > ny + 2) ? nearEdge : nearCol;
        continue;
      }
      if (y >= farY[x]) {
        buf[i] = y === farY[x] ? farEdge : farCol;
        continue;
      }
      const px = x + 0.5;
      const py = y + 0.5;
      let v = base;
      if (sunOn) {
        const dx = px - sunX;
        const dy = py - sunY;
        const d2 = dx * dx + dy * dy;
        if (d2 <= Rs2) {
          buf[i] = d2 > RsIn2 ? sunRim : d2 > RsMid2 ? (th(x, y) < 0.5 ? sunMid : sunCore) : sunCore;
          continue;
        }
        v += Math.max(0, 1 - Math.sqrt(d2) / (Rs * 6)) * 4.5 * d;
      }
      if (mvis > 0) {
        const dx = px - mx;
        const dy = py - my;
        const d2 = dx * dx + dy * dy;
        if (d2 <= R2 && (dx - ox) ** 2 + (dy - oy) ** 2 > cut2 && (mvis >= 1 || mvis > th(x, y))) {
          const crater = (px - crX) ** 2 + (py - crY) ** 2 < 1.1;
          buf[i] = d2 > Rin2 || crater ? moonRim : moonCore;
          continue;
        }
        v += Math.max(0, 1 - Math.sqrt(d2) / (R * 3.6)) * 2.6 * mvis;
      }
      let k = Math.floor(v);
      if (v - k > th(x, y)) k++;
      buf[i] = pal[k < 0 ? 0 : k > span ? span : k];
    }
  }

  // Sun rays, slowly turning.
  if (d > 0.55) {
    const a = smoothstep(0.55, 1, d) * 0.85;
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4 + t * 0.35;
      const c = Math.cos(ang);
      const sn = Math.sin(ang);
      for (let r = Rs + 2; r <= Rs + 3 + (k % 2); r++) {
        const x = Math.round(sunX + c * r - 0.5);
        const y = Math.round(sunY + sn * r - 0.5);
        if (x >= 0 && y >= 0 && x < W && y < H && y < farY[x]) blend(buf, y * W + x, SUN_MID, a);
      }
    }
  }

  // ── stars ── (blended over the sky so twinkle is smooth)
  const starFade = 1 - smoothstep(0.1, 0.65, d);
  if (starFade > 0) {
    const stars = s.stars;
    for (let n = 0; n < s.nStars; n++) {
      const o = n * 6;
      const x = stars[o];
      const y = stars[o + 1];
      if (y >= farY[x] - 1) continue;
      if ((x + 0.5 - mx) ** 2 + (y + 0.5 - my) ** 2 < (R + 1.5) ** 2) continue;
      if (sunOn && (x + 0.5 - sunX) ** 2 + (y + 0.5 - sunY) ** 2 < (Rs + 4) ** 2) continue;
      const tw = 0.62 + 0.38 * Math.sin(t * stars[o + 3] + stars[o + 2]);
      const b = stars[o + 4] * tw;
      const a = b * starFade;
      if (a < 0.04) continue;
      const col = b > 0.72 ? STAR_BRIGHT : STAR_DIM;
      blend(buf, y * W + x, col, a);
      if (stars[o + 5] && b > 0.6) {
        const aa = a * 0.45;
        if (x > 0) blend(buf, y * W + x - 1, col, aa);
        if (x < W - 1) blend(buf, y * W + x + 1, col, aa);
        if (y > 0) blend(buf, (y - 1) * W + x, col, aa);
        blend(buf, (y + 1) * W + x, col, aa);
      }
    }
  }

  // ── shooting star (only while you sleep) ──
  const ss = s.ss;
  if (!paused) {
    if (ss[0] <= 0 && (phase === "sleep" || phase === "fall") && d < 0.2 && Math.random() < dt / 7) {
      ss[0] = 0.8;
      ss[1] = W * (0.35 + Math.random() * 0.6);
      ss[2] = 2 + Math.random() * hy * 0.35;
      ss[3] = -(W * 0.45 + Math.random() * W * 0.2);
      ss[4] = H * 0.16 + Math.random() * H * 0.1;
    }
    if (ss[0] > 0) {
      ss[0] -= dt;
      ss[1] += ss[3] * dt;
      ss[2] += ss[4] * dt;
    }
  }
  if (ss[0] > 0) {
    const len = Math.hypot(ss[3], ss[4]);
    const ux = ss[3] / len;
    const uy = ss[4] / len;
    const life = Math.min(1, ss[0] / 0.25);
    for (let k = 0; k < 9; k++) {
      const x = Math.round(ss[1] - ux * k);
      const y = Math.round(ss[2] - uy * k);
      if (x < 0 || y < 0 || x >= W || y >= H || y >= farY[x]) continue;
      blend(buf, y * W + x, STAR_BRIGHT, (1 - k / 9) * life);
    }
  }

  // ── a little house on the far hill: lights go out while you sleep ──
  const hx = Math.round(W * 0.58);
  const hY = farY[Math.min(W - 1, hx + 3)] - 6;
  glyph(s, HOUSE, hx, hY, farEdge);
  const lightsOn = phase === "idle" || phase === "fall" || phase === "done" || phase === "wake";
  if (lightsOn) {
    glyph(s, Z_WINDOW, hx + 2, hY + 4, WINDOW_ON);
  }

  // ── cat on a pillow ──
  const spr = s.sprite;
  const lit = d;
  spr[1] = OUTLINE;
  spr[2] = mixPack(CAT.body.night, CAT.body.day, lit);
  spr[3] = mixPack(CAT.stripe.night, CAT.stripe.day, lit);
  spr[4] = mixPack(CAT.pink.night, CAT.pink.day, lit);
  const pillow = mixRGB(mixRGB(accent, NIGHT_SHADE, 0.35), accent, lit);
  spr[6] = pack(Math.round(pillow[0]), Math.round(pillow[1]), Math.round(pillow[2]));
  spr[7] = mixPack(pillow, WHITE, 0.3);
  spr[8] = mixPack(pillow, BLACK, 0.3);

  const catCX = W * 0.3;
  const sx = Math.max(1, Math.round(catCX - SW / 2));
  const sy = nearY[Math.min(W - 1, Math.round(catCX))] - 16;
  const period = phase === "sleep" ? 4.4 : phase === "wake" ? 3 : 3.4;
  const bob = paused || phase === "done" ? 0 : Math.sin((t * Math.PI * 2) / period) > 0.15 ? 1 : 0;
  const blit = (layer: Uint8Array, oy0: number) => {
    for (let y = 0; y < SH; y++) {
      const yy = sy + oy0 + y;
      if (yy < 0 || yy >= H) continue;
      for (let x = 0; x < SW; x++) {
        const c = layer[y * SW + x];
        const xx = sx + x;
        if (!c || xx >= W) continue;
        buf[yy * W + xx] = spr[c];
      }
    }
  };
  blit(LAYERS.pil, 0);
  blit(LAYERS.cat, -bob);

  // Eyes.
  let left: "open" | "closed" = "closed";
  let right: "open" | "closed" = "closed";
  if (paused) right = "open";
  else if (phase === "done") left = right = "open";
  else if (phase === "idle") left = right = t % 4.2 < 0.16 ? "closed" : "open";
  else if (phase === "fall") left = right = t % 5.5 < 1.1 ? "open" : "closed";
  else if (phase === "wake") left = right = t % 1.7 < 0.2 || d < 0.3 ? "closed" : "open";
  const ey = sy - bob + 10;
  const eye = (x: number, state: "open" | "closed") => {
    if (state === "open") {
      buf[(ey - 1) * W + sx + x + 1] = OUTLINE;
      buf[ey * W + sx + x + 1] = OUTLINE;
    } else {
      buf[ey * W + sx + x] = OUTLINE;
      buf[ey * W + sx + x + 1] = OUTLINE;
    }
  };
  if (ey > 1 && ey < H && sx + 30 < W) {
    eye(23, left);
    eye(26, right);
  }

  // ── floating Zzz ──
  const z = s.z;
  if (!paused) {
    const every = phase === "sleep" ? 1.3 : phase === "fall" ? 2.6 : phase === "idle" ? 3.6 : phase === "wake" ? 3.2 : 0;
    if (every > 0) {
      s.zTimer -= dt;
      if (s.zTimer <= 0) {
        s.zTimer = every;
        for (let n = 0; n < MAX_Z; n++) {
          if (z[n * 4 + 3]) continue;
          z[n * 4] = sx + 29;
          z[n * 4 + 1] = sy - bob + 2;
          z[n * 4 + 2] = 0;
          z[n * 4 + 3] = 1;
          break;
        }
      }
    }
    for (let n = 0; n < MAX_Z; n++) if (z[n * 4 + 3]) z[n * 4 + 2] += dt;
  }
  const zLife = 4.2;
  const rise = H * 0.075;
  const zCol = mixPack(accent, WHITE, 0.6);
  for (let n = 0; n < MAX_Z; n++) {
    const o = n * 4;
    if (!z[o + 3]) continue;
    const age = z[o + 2];
    if (age >= zLife) {
      z[o + 3] = 0;
      continue;
    }
    const a = smoothstep(0, 0.35, age) * (1 - smoothstep(zLife * 0.6, zLife, age));
    const x = Math.round(z[o] + age * 3.2 + Math.sin(age * 2.3) * 2);
    const y = Math.round(z[o + 1] - age * rise);
    glyph(s, age < zLife * 0.3 ? Z_SMALL : Z_BIG, x, y, zCol, a);
  }

  // ── wake up! ──
  if (phase === "done") {
    const hop = Math.round(Math.abs(Math.sin(t * 5)) * 2);
    const bx = sx + 31;
    const by = sy - 9 - hop;
    for (const [ox2, oy2] of OFFSETS) glyph(s, BANG_GLYPH, bx + ox2, by + oy2, OUTLINE);
    glyph(s, BANG_GLYPH, bx, by, BANG);
  }

  // ── birds at dawn ──
  const birdA = smoothstep(0.45, 0.85, d);
  if (birdA > 0) {
    for (let k = 0; k < 3; k++) {
      const speed = W * (0.07 + k * 0.025);
      const x = Math.round(((t * speed + k * W * 0.45) % (W + 20)) - 10);
      const y = Math.round(hy * (0.3 + k * 0.09) + Math.sin(t * 1.4 + k * 2) * 1.5);
      const up = Math.floor(t * 5 + k * 1.7) % 2 === 0;
      glyph(s, up ? BIRD_UP : BIRD_DOWN, x, y, BIRD, birdA, true);
    }
  }
}

/** The stage animation for the nap timer. Reads the run directly each frame. */
export function NapSky({ timerId, accent }: { timerId: string; accent: string }) {
  const [dims, setDims] = useState({ w: 120, h: 120 });
  const sim = useRef<Sim | null>(null);
  const accentRGB = hex(accent);

  const ref = useCanvas(
    (ctx, f) => {
      let s = sim.current;
      if (!s || s.W !== f.width || s.H !== f.height) s = sim.current = makeSim(f.width, f.height, s);
      paint(s, f, timerId, accentRGB);
      ctx.putImageData(s.img, 0, 0);
    },
    { pixelated: true, fixed: { width: dims.w, height: dims.h } },
  );

  // Pick a chunky pixel size (3–6 CSS px) from the stage size.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return;
      const px = clamp(Math.round(r.width / 120), 3, 6);
      const w = Math.max(48, Math.round(r.width / px));
      const h = Math.max(48, Math.round(r.height / px));
      setDims((p) => (p.w === w && p.h === h ? p : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return <canvas ref={ref} aria-hidden />;
}
