import { clamp, lerp, smoothstep } from "../../core/canvas";
import { alpha, drawBubbles, drawSpoon, hash, ink, liquid, mix, tube, type Pal } from "./paint";
import type { Recipe } from "./recipes";
import type { Scene } from "./scene";

type C = CanvasRenderingContext2D;

/** Smoothed animation values (eased toward the scene's targets each frame). */
export interface Anim {
  tilt: number;
  poured: number;
  served: number;
  extraction: number;
  /** French press lid lifted off (0..1). */
  lid: number;
  /** AeroPress flip 0 (inverted) → 1 (on the cup). */
  flip: number;
  /** AeroPress cup slid under (0..1). */
  mug: number;
  /** Brewer lifted away once finished (V60 cone, AeroPress). */
  off: number;
  spoon: number;
  press: number;
  cap: number;
  amp: number;
  /** Kettle walked off stage (finished). */
  exit: number;
  /** Animation clock that freezes while paused. */
  at: number;
}

export interface VCtx {
  ctx: C;
  pal: Pal;
  lw: number;
  t: number;
  sc: Scene;
  a: Anim;
  recipe: Recipe;
  cups: number;
  liquid: string;
  strong: string;
  served: string;
  foam: string;
}

export interface VInfo {
  landX: number;
  landY: number;
  steamX: number;
  steamY: number;
  steamW: number;
  /** 0..1 how much this vessel steams. */
  steam: number;
  faceX: number;
  faceY: number;
  drip?: { x: number; y: number; toY: number; rate: number; color: string };
  sparkles: readonly (readonly [number, number])[];
}

const TAU = Math.PI * 2;
const P = { x: 0, y: 0 };

function glint(ctx: C, pal: Pal, lw: number, x: number, y0: number, y1: number) {
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.quadraticCurveTo(x - 2, (y0 + y1) / 2, x, y1);
  ctx.strokeStyle = pal.glint;
  ctx.lineWidth = lw * 1.1;
  ctx.lineCap = "round";
  ctx.stroke();
}

function grain(ctx: C, x: number, y: number, r: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function leaf(ctx: C, x: number, y: number, len: number, w: number, rot: number, color: string, pal: Pal, lw: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(0, -w * 2, len, 0);
  ctx.quadraticCurveTo(0, w * 2, -len, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = alpha(pal.dark ? "#14101b" : "#1b1424", 0.45);
  ctx.lineWidth = lw * 0.35;
  ctx.stroke();
  ctx.restore();
}

/** Coffee grounds: dry pile → floating crust → swirl → settled, per particle. */
interface GroundsShape {
  cx: number;
  half: number;
  bottom: number;
  surf: number;
  pile: number;
}
function groundsDry(i: number, g: GroundsShape) {
  const xn = hash(i * 1.7) * 2 - 1;
  P.x = g.cx + xn * g.half;
  P.y = g.bottom - hash(i * 2.3 + 5) * g.pile * (1 - xn * xn * 0.8);
}
function groundsCrust(i: number, g: GroundsShape, at: number) {
  const xn = hash(i * 1.7) * 2 - 1;
  P.x = g.cx + xn * g.half + Math.sin(at * 1.3 + i) * 1.2;
  P.y = g.surf + 2 + hash(i * 2.3 + 5) * (5 + g.pile * 0.6);
}
function groundsSwirl(i: number, g: GroundsShape, at: number, depth: number) {
  const ang = at * 3.2 + hash(i * 3.9 + 1) * TAU;
  P.x = g.cx + Math.cos(ang) * g.half * (0.25 + 0.75 * hash(i * 2.3 + 5));
  P.y = g.surf + 6 + hash(i * 3.9 + 1) * depth + Math.sin(ang) * 4;
}
function groundsSettled(i: number, g: GroundsShape) {
  const xn = hash(i * 1.7) * 2 - 1;
  P.x = g.cx + xn * g.half;
  P.y = g.bottom - hash(i * 2.3 + 5) * g.pile;
}
const Q = { x: 0, y: 0 };
const save = () => {
  Q.x = P.x;
  Q.y = P.y;
};
const blend = (k: number) => {
  P.x = Q.x + (P.x - Q.x) * k;
  P.y = Q.y + (P.y - Q.y) * k;
};

// ── V60 ─────────────────────────────────────────────────────────────────

const coneL = (y: number) => 138 + ((y - 184) / 70) * 46;

export function drawV60(v: VCtx): VInfo {
  const { ctx, pal, lw, a, sc } = v;
  const at = a.at;

  // Server (glass carafe) — the coffee collects here.
  const sTop = 366 - a.served * 64;
  const server = () => {
    ctx.beginPath();
    ctx.moveTo(170, 294);
    ctx.quadraticCurveTo(140, 318, 146, 350);
    ctx.quadraticCurveTo(149, 370, 168, 370);
    ctx.lineTo(232, 370);
    ctx.quadraticCurveTo(251, 370, 254, 350);
    ctx.quadraticCurveTo(260, 318, 230, 294);
    ctx.closePath();
  };
  ctx.beginPath();
  ctx.moveTo(250, 308);
  ctx.bezierCurveTo(284, 304, 286, 350, 251, 354);
  tube(ctx, pal, lw, 6, pal.surface);
  server();
  ctx.fillStyle = pal.glass;
  ctx.fill();
  if (a.served > 0.004) {
    ctx.save();
    server();
    ctx.clip();
    liquid(ctx, 130, 270, sTop, 380, a.amp * 0.4, at, v.served, v.foam, lw);
    ctx.restore();
  }
  server();
  ink(ctx, pal, lw);
  glint(ctx, pal, lw, 156, 322, 350);
  ctx.beginPath();
  ctx.roundRect(163, 288, 74, 8, 4);
  ink(ctx, pal, lw, pal.surface);

  // Dripper cone — lifts away when the brew is done.
  const off = a.off;
  const dy = -off * 150;
  const bedTop = 238 - (v.cups - 1) * 4;
  const cl = clamp((a.poured - a.served) / 0.42);
  const slurryTop = lerp(bedTop - 2, 192, cl);
  const bloom = sc.kind === "bloom" ? smoothstep(0.05, 0.35, sc.segP) * (1 - 0.45 * smoothstep(0.6, 1, sc.segP)) : 0;
  const dome = bloom * 9;

  if (off < 0.99) {
    ctx.save();
    ctx.translate(0, dy);
    ctx.globalAlpha = 1 - off;
    // Handle.
    ctx.beginPath();
    ctx.moveTo(256, 196);
    ctx.bezierCurveTo(294, 192, 294, 240, 240, 238);
    tube(ctx, pal, lw, 7, pal.accent);
    // Collar + flange that sits on the server.
    ctx.beginPath();
    ctx.roundRect(150, 275, 100, 9, 4);
    ink(ctx, pal, lw, pal.accent);
    ctx.beginPath();
    ctx.roundRect(181, 252, 38, 24, 4);
    ink(ctx, pal, lw, pal.accentDark);

    const outer = () => {
      ctx.beginPath();
      ctx.moveTo(128, 180);
      ctx.lineTo(272, 180);
      ctx.lineTo(224, 258);
      ctx.lineTo(176, 258);
      ctx.closePath();
    };
    const inner = () => {
      ctx.beginPath();
      ctx.moveTo(138, 184);
      ctx.lineTo(262, 184);
      ctx.lineTo(216, 254);
      ctx.lineTo(184, 254);
      ctx.closePath();
    };
    outer();
    ctx.fillStyle = alpha(pal.accent, 0.3);
    ctx.fill();

    ctx.save();
    inner();
    ctx.clip();
    if (cl > 0.01) liquid(ctx, 130, 270, slurryTop, 262, a.amp, at, v.liquid, v.foam, lw);
    // Coffee bed (domes up while blooming).
    const wet = smoothstep(0, 0.04, a.poured);
    const bl = coneL(bedTop);
    ctx.beginPath();
    ctx.moveTo(bl - 4, bedTop);
    ctx.quadraticCurveTo(200, bedTop - dome * 2, 404 - bl, bedTop);
    ctx.lineTo(230, 262);
    ctx.lineTo(170, 262);
    ctx.closePath();
    ctx.fillStyle = mix(pal.groundsDry, pal.groundsWet, wet);
    ctx.fill();
    ctx.strokeStyle = alpha(pal.dark ? "#000000" : "#1b1424", 0.35);
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
    for (let i = 0; i < 26; i++) {
      const y = bedTop + 3 + hash(i) * (250 - bedTop - 3);
      const l = coneL(y) + 3;
      grain(ctx, l + hash(i + 50) * (400 - 2 * l), y, 0.8 + hash(i + 9) * 0.9, mix(pal.groundsDry, "#2a160b", 0.3 + wet * 0.5));
    }
    drawBubbles(ctx, 200, bedTop - dome * 1.2, 200 - coneL(bedTop), bloom, at, pal, lw, v.foam, 0);
    if (sc.pouring && cl > 0.05) drawBubbles(ctx, 200, slurryTop, 200 - coneL(slurryTop), 0.6, at, pal, lw, v.foam, 20);
    // Paper filter, see-through enough to watch the coffee.
    inner();
    ctx.fillStyle = alpha(pal.paper, pal.dark ? 0.1 : 0.22);
    ctx.fill();
    ctx.strokeStyle = alpha(pal.paper, 0.55);
    ctx.lineWidth = lw * 0.45;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(200 + k * 17, 184);
      ctx.lineTo(200 + k * 4, 254);
      ctx.stroke();
    }
    ctx.restore();

    // Paper zig-zag poking out the top.
    ctx.beginPath();
    ctx.moveTo(140, 181);
    for (let x = 140, k = 0; x <= 260; x += 8, k++) ctx.lineTo(x, k % 2 ? 171 : 175);
    ctx.lineTo(260, 181);
    ctx.closePath();
    ink(ctx, pal, lw * 0.5, pal.paper);
    // Spiral ribs.
    ctx.strokeStyle = alpha(pal.accentDark, 0.5);
    ctx.lineWidth = lw * 0.6;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(146 + k * 26, 188);
      ctx.quadraticCurveTo(160 + k * 22, 230, 186 + k * 7, 252);
      ctx.stroke();
    }
    outer();
    ink(ctx, pal, lw);
    ctx.beginPath();
    ctx.roundRect(122, 175, 156, 9, 4);
    ink(ctx, pal, lw, pal.accent);
    ctx.restore();
  }

  const coneSteam = off < 0.5;
  return {
    landX: 205,
    landY: (cl > 0.01 ? slurryTop : bedTop - dome) + dy,
    steamX: 200,
    steamY: coneSteam ? 172 + dy : 288,
    steamW: coneSteam ? 40 : 28,
    steam: sc.started ? (a.poured > 0.03 ? 1 : 0.2) : 0,
    faceX: 200,
    faceY: 336,
    drip: {
      x: 200,
      y: 284 + dy,
      toY: sTop,
      rate: sc.started && !sc.paused && !sc.done && cl > 0.02 && off < 0.5 ? 3 + 14 * cl : 0,
      color: v.served,
    },
    sparkles: [
      [116, 238],
      [292, 262],
      [124, 330],
      [282, 318],
    ],
  };
}

// ── French press ────────────────────────────────────────────────────────

export function drawPress(v: VCtx): VInfo {
  const { ctx, pal, lw, a, sc } = v;
  const at = a.at;
  const L = 152;
  const R = 248;
  const top = 184;
  const bottom = 364;
  const liqTop = 360 - a.poured * 156;
  const pile = 6 + v.cups * 3;
  const discY = lerp(206, 352 - pile, a.press);

  // Handle.
  ctx.beginPath();
  ctx.moveTo(R + 4, 210);
  ctx.bezierCurveTo(R + 42, 210, R + 42, 326, R + 4, 326);
  tube(ctx, pal, lw, 9, pal.metal);

  const glass = () => {
    ctx.beginPath();
    ctx.roundRect(L, top, R - L, bottom - top, [3, 3, 10, 10]);
  };
  glass();
  ctx.fillStyle = pal.glass;
  ctx.fill();
  ctx.save();
  glass();
  ctx.clip();
  if (a.poured > 0.004) liquid(ctx, L - 6, R + 6, liqTop, 380, a.amp, at, v.liquid, v.foam, lw);

  // Grounds.
  const g: GroundsShape = { cx: 200, half: 42, bottom: 358, surf: liqTop, pile };
  const wet = smoothstep(0, 0.05, a.poured);
  const col = mix(pal.groundsDry, pal.groundsWet, wet);
  for (let i = 0; i < 42; i++) {
    const h3 = hash(i * 3.9 + 1);
    if (!sc.started) groundsDry(i, g);
    else if (sc.kind === "pour") {
      groundsDry(i, g);
      save();
      groundsCrust(i, g, at);
      blend(smoothstep(h3 * 0.4, h3 * 0.4 + 0.5, sc.segP));
    } else if (sc.kind === "steep") groundsCrust(i, g, at);
    else if (sc.kind === "stir") {
      groundsCrust(i, g, at);
      save();
      groundsSwirl(i, g, at, 110);
      blend(smoothstep(0, 0.3, sc.segP));
      save();
      groundsSettled(i, g);
      blend(smoothstep(0.45 + h3 * 0.2, 1, sc.segP));
    } else {
      groundsSettled(i, g);
      P.y = Math.max(P.y, discY + 5);
    }
    grain(ctx, P.x, P.y, 1.7 + hash(i + 70) * 1.6, col);
  }
  const crustBubbles = sc.kind === "pour" ? 0.8 : sc.kind === "steep" ? 1 - smoothstep(0, 30, sc.segElapsed) : 0;
  drawBubbles(ctx, 200, liqTop + 2, 44, crustBubbles, at, pal, lw, v.foam, 3);
  ctx.restore();
  glass();
  ink(ctx, pal, lw);
  glint(ctx, pal, lw, L + 11, 226, 318);

  // Metal frame.
  ctx.beginPath();
  ctx.roundRect(L - 6, 338, R - L + 12, 30, [4, 4, 9, 9]);
  ink(ctx, pal, lw, pal.metal);
  ctx.beginPath();
  ctx.roundRect(L + 10, 345, R - L - 20, 14, 5);
  ink(ctx, pal, lw * 0.6, alpha(pal.accent, 0.8));
  ctx.beginPath();
  ctx.roundRect(L - 6, 196, R - L + 12, 10, 4);
  ink(ctx, pal, lw, pal.metal);

  drawSpoon(ctx, 200, 150, liqTop + 60, at, a.spoon, pal, lw);

  // Plunger: lid + rod + mesh disc. Lifted off while pouring / stirring.
  const lift = a.lid;
  if (lift < 0.99) {
    ctx.save();
    ctx.translate(0, -lift * 170);
    ctx.globalAlpha = 1 - lift;
    ctx.beginPath();
    ctx.moveTo(200, discY);
    ctx.lineTo(200, discY - 96);
    tube(ctx, pal, lw, 4, pal.metal);
    ctx.beginPath();
    ctx.roundRect(L + 3, discY - 3, R - L - 6, 7, 3);
    ink(ctx, pal, lw * 0.8, pal.metal);
    ctx.beginPath();
    ctx.arc(200, 172, 16, Math.PI, TAU);
    ink(ctx, pal, lw, pal.metal);
    ctx.beginPath();
    ctx.roundRect(L - 8, 170, R - L + 16, 14, 6);
    ink(ctx, pal, lw, pal.metal);
    ctx.beginPath();
    ctx.arc(200, discY - 102, 10, 0, TAU);
    ink(ctx, pal, lw, pal.accent);
    ctx.restore();
  }

  return {
    landX: 206,
    landY: a.poured > 0.01 ? liqTop : 356,
    steamX: 200,
    steamY: lift > 0.5 ? 182 : 166,
    steamW: 36,
    steam: sc.started ? smoothstep(0, 0.2, a.poured) : 0,
    faceX: 200,
    faceY: 306,
    sparkles: [
      [118, 230],
      [300, 190],
      [120, 318],
      [306, 330],
    ],
  };
}

// ── Kopi tubruk ─────────────────────────────────────────────────────────

export function drawTubruk(v: VCtx): VInfo {
  const { ctx, pal, lw, a, sc } = v;
  const at = a.at;
  const liqTop = 360 - a.poured * 122;

  // Saucer.
  ctx.beginPath();
  ctx.ellipse(200, 367, 80, 8, 0, 0, TAU);
  ink(ctx, pal, lw, pal.accent);
  ctx.beginPath();
  ctx.ellipse(200, 365, 52, 4, 0, 0, TAU);
  ctx.strokeStyle = pal.accentDark;
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();

  const glass = () => {
    ctx.beginPath();
    ctx.moveTo(148, 222);
    ctx.lineTo(252, 222);
    ctx.lineTo(240, 354);
    ctx.quadraticCurveTo(239, 364, 229, 364);
    ctx.lineTo(171, 364);
    ctx.quadraticCurveTo(161, 364, 160, 354);
    ctx.closePath();
  };
  glass();
  ctx.fillStyle = pal.glass;
  ctx.fill();
  ctx.save();
  glass();
  ctx.clip();
  if (a.poured > 0.004) liquid(ctx, 140, 260, liqTop, 380, a.amp, at, v.liquid, v.foam, lw);
  const pile = 4 + v.cups * 2.5;
  const g: GroundsShape = { cx: 200, half: 34, bottom: 359, surf: liqTop, pile };
  const wet = smoothstep(0, 0.05, a.poured);
  const col = mix(pal.groundsDry, pal.groundsWet, wet);
  for (let i = 0; i < 46; i++) {
    const h3 = hash(i * 3.9 + 1);
    if (!sc.started) groundsDry(i, g);
    else if (sc.kind === "pour") {
      groundsDry(i, g);
      save();
      groundsCrust(i, g, at);
      blend(smoothstep(h3 * 0.4, h3 * 0.4 + 0.55, sc.segP));
    } else if (sc.kind === "stir") {
      groundsCrust(i, g, at);
      save();
      groundsSwirl(i, g, at, 50);
      blend(smoothstep(0, 0.35, sc.segP));
    } else if (sc.kind === "settle") {
      groundsSwirl(i, g, at, 50);
      save();
      groundsSettled(i, g);
      blend(smoothstep(h3 * 0.45, h3 * 0.45 + 0.4, sc.segP));
    } else groundsSettled(i, g);
    grain(ctx, P.x, P.y, 1.5 + hash(i + 70) * 1.4, col);
  }
  drawBubbles(ctx, 200, liqTop + 2, 44, sc.kind === "pour" ? 0.9 : 0, at, pal, lw, v.foam, 5);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(163, 350);
  ctx.lineTo(237, 350);
  ctx.strokeStyle = alpha(pal.ink, 0.25);
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  glass();
  ink(ctx, pal, lw);
  glint(ctx, pal, lw, 160, 240, 330);

  drawSpoon(ctx, 200, 186, liqTop + 40, at, a.spoon, pal, lw);

  return {
    landX: 205,
    landY: a.poured > 0.01 ? liqTop : 356,
    steamX: 200,
    steamY: 218,
    steamW: 40,
    steam: sc.started ? smoothstep(0, 0.2, a.poured) : 0,
    faceX: 200,
    faceY: 306,
    sparkles: [
      [122, 236],
      [282, 226],
      [112, 330],
      [292, 320],
    ],
  };
}

// ── Glass cup (AeroPress target + tea) ──────────────────────────────────

function cupPath(ctx: C, cx: number, top: number, bottom: number, hw: number, close: boolean) {
  ctx.beginPath();
  ctx.moveTo(cx - hw, top);
  ctx.lineTo(cx - hw + 3, bottom - 16);
  ctx.quadraticCurveTo(cx - hw + 4, bottom, cx - hw + 18, bottom);
  ctx.lineTo(cx + hw - 18, bottom);
  ctx.quadraticCurveTo(cx + hw - 4, bottom, cx + hw - 3, bottom - 16);
  ctx.lineTo(cx + hw, top);
  if (close) ctx.closePath();
}

/** Draws a glass cup; `inside(surf)` runs clipped to the cup. Returns the liquid surface y. */
function drawCup(
  v: VCtx,
  cx: number,
  top: number,
  bottom: number,
  hw: number,
  fill: number,
  color: string,
  inside?: (surf: number) => void,
) {
  const { ctx, pal, lw, a } = v;
  ctx.beginPath();
  ctx.moveTo(cx + hw - 2, top + 16);
  ctx.bezierCurveTo(cx + hw + 32, top + 12, cx + hw + 34, bottom - 30, cx + hw - 3, bottom - 26);
  tube(ctx, pal, lw, 7, pal.surface);
  cupPath(ctx, cx, top, bottom, hw, true);
  ctx.fillStyle = pal.glass;
  ctx.fill();
  const surf = bottom - 4 - fill * (bottom - top - 14);
  ctx.save();
  cupPath(ctx, cx, top, bottom, hw, true);
  ctx.clip();
  if (fill > 0.004) liquid(ctx, cx - hw - 4, cx + hw + 4, surf, bottom + 10, a.amp, a.at, color, v.foam, lw);
  inside?.(surf);
  ctx.restore();
  cupPath(ctx, cx, top, bottom, hw, false);
  ink(ctx, pal, lw);
  ctx.beginPath();
  ctx.moveTo(cx - hw - 3, top);
  ctx.lineTo(cx + hw + 3, top);
  ctx.lineCap = "round";
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = lw * 1.4;
  ctx.stroke();
  glint(ctx, pal, lw, cx - hw + 11, top + 18, bottom - 24);
  return surf;
}

// ── AeroPress (inverted) ────────────────────────────────────────────────

export function drawAero(v: VCtx): VInfo {
  const { ctx, pal, lw, a, sc } = v;
  const at = a.at;
  const px = 212;
  const py = 204;
  const ang = a.flip * Math.PI;
  const VMAX = 112;
  const V0 = VMAX * a.poured;
  const insert = lerp(22, 128, a.press);
  const sy = 70 - insert;
  const freeLen = sy + 70;
  const V = Math.min(V0, Math.max(0, freeLen - 8 * a.press));
  const mugFill = clamp((V0 - V) / VMAX);
  const mugX = lerp(84, px, a.mug);

  const mugSurf = drawCup(v, mugX, 290, 370, 42, mugFill, v.served);

  const off = a.off;
  const dy = -off * 175;
  let surfWorld = py + sy;
  if (off < 0.99) {
    ctx.save();
    ctx.translate(0, dy);
    ctx.globalAlpha = 1 - off;

    // Press stream into the cup.
    if (a.flip > 0.95 && a.press > 0.02 && a.press < 0.99 && !sc.paused) {
      ctx.beginPath();
      ctx.moveTo(px, py + 84);
      ctx.lineTo(px + Math.sin(at * 20) * 0.6, mugSurf);
      ctx.strokeStyle = v.served;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    ctx.translate(px, py);
    ctx.rotate(ang);
    const chamber = () => {
      ctx.beginPath();
      ctx.roundRect(-32, -70, 64, 140, 4);
    };
    chamber();
    ctx.fillStyle = pal.glass;
    ctx.fill();

    // Liquid in world space (gravity stays down while the tube flips).
    ctx.save();
    ctx.beginPath();
    ctx.rect(-30, -70, 60, Math.max(0, freeLen));
    ctx.clip();
    ctx.rotate(-ang);
    ctx.translate(-px, -py);
    const cyL = (sy - 70) / 2;
    const wcy = py + cyL * Math.cos(ang);
    const f = freeLen > 0 ? clamp(V / freeLen) : 0;
    const span = freeLen * Math.abs(Math.cos(ang)) + 60 * Math.abs(Math.sin(ang));
    surfWorld = wcy + (0.5 - f) * span;
    if (V > 0.5) liquid(ctx, 100, 300, surfWorld, 420, a.amp, at, v.liquid, v.foam, lw);
    ctx.translate(px, py);
    ctx.rotate(ang);
    // Grounds in the slurry (local coords, they tumble with the tube).
    const wet = smoothstep(0, 0.05, a.poured);
    const col = mix(pal.groundsDry, pal.groundsWet, wet);
    const fill = Math.max(V, 12);
    const lo = lerp(sy - fill, -70, a.flip);
    const hi = lerp(sy, -70 + fill, a.flip);
    const stir = sc.kind === "stir" ? 1 : 0;
    for (let i = 0; i < 34; i++) {
      const xn = hash(i * 1.7) * 2 - 1;
      const h2 = hash(i * 2.3 + 5);
      let x = xn * 26 + Math.sin(at * 5 + i) * 10 * stir;
      let y = sc.started ? lerp(lo, hi, h2) : sy - h2 * 12;
      x = lerp(x, xn * 28, a.press);
      y = lerp(y, -66 + h2 * 6, a.press);
      grain(ctx, x, y, 1.5 + hash(i + 70) * 1.4, col);
    }
    if (a.press > 0.01) {
      ctx.fillStyle = col;
      ctx.fillRect(-30, -70, 60, 8 * a.press);
    }
    ctx.restore();

    chamber();
    ink(ctx, pal, lw);
    ctx.strokeStyle = alpha(pal.ink, 0.6);
    ctx.lineWidth = lw * 0.5;
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      ctx.moveTo(-31, -70 + k * 22);
      ctx.lineTo(-22, -70 + k * 22);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.roundRect(-41, -74, 82, 8, 3);
    ink(ctx, pal, lw, pal.metal);
    // Filter cap.
    if (a.cap > 0.01) {
      ctx.save();
      ctx.globalAlpha *= a.cap;
      ctx.beginPath();
      ctx.roundRect(-37, -84 - (1 - a.cap) * 20, 74, 12, 4);
      ink(ctx, pal, lw, pal.rubber);
      ctx.restore();
    }
    // Plunger.
    ctx.beginPath();
    ctx.roundRect(-26, sy + 12, 52, 98, 3);
    ink(ctx, pal, lw, alpha(pal.metal, 0.75));
    ctx.beginPath();
    ctx.roundRect(-31, sy, 62, 12, 3);
    ink(ctx, pal, lw, pal.rubber);
    ctx.beginPath();
    ctx.roundRect(-39, sy + 110, 78, 10, 4);
    ink(ctx, pal, lw, pal.accent);
    ctx.restore();
  }

  drawSpoon(ctx, px - 6, 112, 200, at, a.spoon, pal, lw);

  const mugHot = mugFill > 0.15;
  return {
    landX: 210,
    landY: V > 1 ? surfWorld : py + sy,
    steamX: mugHot ? mugX : px,
    steamY: mugHot ? 286 : 132 + dy,
    steamW: mugHot ? 26 : 22,
    steam: sc.started ? (mugHot ? 1 : smoothstep(0, 0.2, a.poured) * (1 - a.flip)) : 0,
    faceX: mugX,
    faceY: 336,
    sparkles: [
      [130, 280],
      [276, 286],
      [122, 350],
      [282, 350],
    ],
  };
}

// ── Tea mug ─────────────────────────────────────────────────────────────

export function drawTea(v: VCtx): VInfo {
  const { ctx, pal, lw, a, sc, recipe } = v;
  const at = a.at;
  const style = recipe.tea ?? "loose";
  const TOP = 212;
  const BOT = 370;
  const live = !sc.done && sc.started;

  // Clouds of colour seeping out of the leaves.
  const clouds = (sx: number, sy: number, spread: number) => {
    if (a.poured < 0.05 || !live) return;
    for (let i = 0; i < 9; i++) {
      const cyc = 5 + hash(i + 2) * 4;
      const ph = (at / cyc + hash(i + 31)) % 1;
      const x = sx + (hash(i + 13) * 2 - 1) * spread * ph + Math.sin(at * 0.7 + i) * 6;
      const y = sy + (hash(i + 17) - 0.3) * 70 * ph;
      ctx.beginPath();
      ctx.arc(x, y, 6 + ph * 24, 0, TAU);
      ctx.fillStyle = mix(v.strong, v.strong, 0, 0.2 * Math.sin(ph * Math.PI) * (1 - a.extraction * 0.5));
      ctx.fill();
    }
  };

  let bagTop = 0;
  const looseLeaves = (surf: number) => {
    const g: GroundsShape = { cx: 200, half: 46, bottom: 362, surf, pile: 8 + v.cups * 2 };
    for (let i = 0; i < 30; i++) {
      const h3 = hash(i * 3.9 + 1);
      if (!sc.started) groundsDry(i, g);
      else if (sc.kind === "pour") {
        groundsDry(i, g);
        save();
        groundsCrust(i, g, at);
        blend(smoothstep(h3 * 0.4, h3 * 0.4 + 0.55, sc.segP));
      } else if (sc.kind === "stir") {
        groundsCrust(i, g, at);
        save();
        groundsSwirl(i, g, at, 70);
        blend(smoothstep(0, 0.4, sc.segP));
      } else if (sc.kind === "steep") {
        groundsSwirl(i, g, at, 70);
        save();
        groundsSettled(i, g);
        blend(smoothstep(h3 * 0.5, h3 * 0.5 + 0.45, sc.segP));
      } else groundsSettled(i, g);
      const wetK = smoothstep(0, 0.1, a.poured);
      leaf(
        ctx,
        P.x,
        P.y,
        3 + wetK * 2.5 * (0.6 + a.extraction * 0.6),
        1 + wetK * 0.8,
        h3 * TAU + Math.sin(at * 0.8 + i) * 0.3,
        mix(pal.leafDry, recipe.id === "melati" ? "#5c4a1c" : pal.leaf, wetK),
        pal,
        lw,
      );
    }
    // Jasmine flowers float on top once there's water.
    for (let k = 0; k < 3; k++) {
      const fx = 200 + (k - 1) * 30 + Math.sin(at * 0.9 + k * 2) * 6;
      const fy = a.poured > 0.15 ? surf + 1 + Math.sin(at * 1.4 + k) * 1.2 : 358 - k * 3;
      for (let p = 0; p < 5; p++) {
        const an = (p / 5) * TAU + k;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(an) * 3.4, fy + Math.sin(an) * 2, 2.6, 0, TAU);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = alpha("#1b1424", 0.35);
        ctx.lineWidth = lw * 0.3;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(fx, fy, 1.8, 0, TAU);
      ctx.fillStyle = "#ffd23f";
      ctx.fill();
    }
  };

  const surf = drawCup(v, 200, TOP, BOT, 62, a.poured, v.liquid, (s) => {
    if (style === "loose") {
      clouds(200, s + 20, 40);
      looseLeaves(s);
    } else if (style === "infuser") clouds(200, 262, 30);
    else {
      const rise = smoothstep(0.05, 0.5, a.poured);
      const bob = live ? Math.sin(at * 1.6) * 3 : 0;
      bagTop = lerp(310, 262, rise) + bob;
      clouds(200, bagTop + 28, 34);
    }
  });

  // Infuser basket / tea bag, drawn over the cup and then tinted where submerged.
  if (style === "infuser") {
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(174, 212);
      ctx.lineTo(176, 290);
      ctx.quadraticCurveTo(200, 306, 224, 290);
      ctx.lineTo(226, 212);
      ctx.closePath();
    };
    body();
    ctx.fillStyle = alpha(pal.metal, 0.3);
    ctx.fill();
    ctx.save();
    body();
    ctx.clip();
    const wetK = smoothstep(0, 0.1, a.poured);
    for (let i = 0; i < 16; i++) {
      const xn = hash(i * 1.7) * 2 - 1;
      const h2 = hash(i * 2.3 + 5);
      const dryY = 292 - h2 * 16;
      const wetY = Math.max(lerp(296, 226, h2), surf + 4);
      leaf(
        ctx,
        200 + xn * 18 + Math.sin(at + i) * 2 * wetK,
        lerp(dryY, wetY, wetK),
        3 + wetK * 3.5 * (0.5 + a.extraction * 0.6),
        1.1 + wetK,
        hash(i + 3) * TAU + Math.sin(at * 0.7 + i) * 0.3 * wetK,
        mix(pal.leafDry, pal.leaf, wetK),
        pal,
        lw,
      );
    }
    ctx.strokeStyle = alpha(pal.ink, 0.22);
    ctx.lineWidth = lw * 0.35;
    ctx.beginPath();
    for (let x = 178; x < 226; x += 6) {
      ctx.moveTo(x, 212);
      ctx.lineTo(x, 304);
    }
    for (let y = 220; y < 304; y += 7) {
      ctx.moveTo(170, y);
      ctx.lineTo(230, y);
    }
    ctx.stroke();
    ctx.restore();
    body();
    ink(ctx, pal, lw * 0.8);
    ctx.beginPath();
    ctx.roundRect(128, 204, 144, 8, 4);
    ink(ctx, pal, lw, pal.metal);
  } else if (style === "bag") {
    // String over the rim to a little tag.
    ctx.beginPath();
    ctx.moveTo(200, bagTop);
    ctx.quadraticCurveTo(168, 206, 140, 208);
    ctx.quadraticCurveTo(126, 212, 127, 232);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(114, 232, 26, 24, 4);
    ink(ctx, pal, lw * 0.8, pal.accent);
    leaf(ctx, 127, 244, 6, 2, -0.6, pal.leaf, pal, lw);
    ctx.beginPath();
    ctx.roundRect(178, bagTop, 44, 52, 6);
    ink(ctx, pal, lw * 0.8, mix(pal.paper, v.strong, 0.15 + 0.6 * a.extraction));
    ctx.beginPath();
    ctx.moveTo(180, bagTop + 8);
    ctx.lineTo(220, bagTop + 8);
    ctx.strokeStyle = alpha(pal.ink, 0.5);
    ctx.lineWidth = lw * 0.5;
    ctx.stroke();
    for (let i = 0; i < 10; i++) {
      grain(ctx, 184 + hash(i + 4) * 32, bagTop + 16 + hash(i + 8) * 30, 1.4, mix(pal.leafDry, v.strong, 0.5));
    }
  }
  if (style !== "loose" && a.poured > 0.004) {
    ctx.save();
    cupPath(ctx, 200, TOP, BOT, 62, true);
    ctx.clip();
    ctx.globalAlpha = 0.35;
    liquid(ctx, 130, 270, surf, BOT + 10, a.amp, at, v.liquid, v.foam, lw);
    ctx.restore();
  }

  drawSpoon(ctx, 200, 192, surf + 44, at, a.spoon, pal, lw);

  return {
    landX: 205,
    landY: a.poured > 0.01 ? surf : style === "loose" ? 356 : style === "bag" ? bagTop : 290,
    steamX: 200,
    steamY: 206,
    steamW: 44,
    steam: sc.started ? smoothstep(0, 0.25, a.poured) : 0,
    faceX: 200,
    faceY: style === "loose" ? 322 : 340,
    sparkles: [
      [112, 200],
      [300, 214],
      [106, 330],
      [306, 300],
    ],
  };
}
