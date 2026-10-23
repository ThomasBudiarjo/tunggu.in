import { useRef } from "react";
import { clamp, smoothstep, useCanvas } from "../../core/canvas";
import { getRun } from "../../core/runs";
import { isDark } from "../../core/settings";
import {
  alpha,
  drawFace,
  drawHeart,
  drawKettle,
  drawSparkles,
  drawZzz,
  kettleTip,
  mix,
  mixHex,
  palette,
  tube,
  type Mood,
} from "./paint";
import { recipeById, type Recipe } from "./recipes";
import { computeScene } from "./scene";
import { drawAero, drawPress, drawTea, drawTubruk, drawV60, type Anim, type VCtx, type VInfo } from "./vessels";

/**
 * Hand-drawn brewing scene on a 2D canvas. Everything is derived from the
 * engine run each frame (fill levels, grounds, plunger, kettle tilt), then
 * eased so skips and reloads glide instead of jumping. Steam, splashes and
 * drips are small pooled particle systems.
 */

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
  stop: number;
}

const pool = (n: number): Particle[] =>
  Array.from({ length: n }, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, seed: 0, stop: 0 }));

function spawn(p: Particle[]): Particle | null {
  for (const q of p) {
    if (!q.alive) {
      q.alive = true;
      q.age = 0;
      return q;
    }
  }
  return null;
}

const TABLE = 372;
const KETTLE = { x: 306, y: 84 };
/** Visible slice of the 400×400 drawing: width, height, centre x, bottom y. */
const VIEW = { w: 350, h: 370, cx: 215, bottom: 388 };

const newAnim = (): Anim => ({
  tilt: 0,
  poured: 0,
  served: 0,
  extraction: 0,
  lid: 0,
  flip: 0,
  mug: 0,
  off: 0,
  spoon: 0,
  press: 0,
  cap: 0,
  amp: 1,
  exit: 0,
  at: 0,
});

export function BrewScene({
  timerId,
  recipe,
  cups,
  accent,
}: {
  timerId: string;
  recipe: Recipe;
  cups: number;
  accent: string;
}) {
  const anim = useRef<Anim>(newAnim());
  const seen = useRef<string | null>(null);
  const steam = useRef(pool(60));
  const splash = useRef(pool(30));
  const drips = useRef(pool(24));
  const acc = useRef({ steam: 0, kettle: 0, splash: 0, drip: 0 });
  const tip = useRef({ x: 0, y: 0 });

  const ref = useCanvas((ctx, f) => {
    const run = getRun(timerId);
    const rec = (run && recipeById(run.meta?.recipe)) || recipe;
    const nCups = run ? Number(run.meta?.cups) || 1 : cups;
    const now = Date.now();
    const sc = computeScene(rec, run, now);
    const pal = palette(isDark(), accent);
    const a = anim.current;
    const dt = f.dt;
    const t = f.time;

    // ── Targets → eased animation state ──
    const k = sc.kind;
    const pressT =
      rec.vessel === "aero" ? sc.served : k === "press" ? smoothstep(0.05, 0.95, sc.segP) : sc.done ? 1 : 0;
    const flipT = rec.vessel === "aero" && (k === "press" || sc.done) ? 1 : 0;
    const target = {
      tilt: sc.pouring ? 1 : 0,
      poured: sc.poured,
      served: sc.served,
      extraction: sc.extraction,
      lid: rec.vessel === "press" && (k === "pour" || k === "stir") ? 1 : 0,
      flip: flipT,
      mug: flipT && a.flip > 0.6 ? 1 : flipT ? a.mug : 0,
      off: sc.done && sc.doneFor > 0.5 && (rec.vessel === "v60" || rec.vessel === "aero") ? 1 : 0,
      spoon: k === "stir" && !sc.paused ? 1 : 0,
      press: pressT,
      cap: k === "steep" || k === "press" || k === "done" ? 1 : 0,
      amp: sc.paused ? 0.3 : sc.pouring ? 2.6 : k === "stir" ? 2.2 : sc.done ? 0.7 : 1.1,
      exit: sc.done ? 1 : 0,
    };
    const key = `${rec.id}:${run?.startedAt ?? "idle"}`;
    const snap = seen.current === null || (seen.current !== key && (!run || run.startedAt < now - 1500));
    if (snap) {
      // First frame, recipe switch or reload mid-run: jump straight there.
      Object.assign(a, target);
      a.mug = flipT;
    }
    seen.current = key;
    const ease = (name: keyof typeof target, rate: number) => {
      a[name] += (target[name] - a[name]) * (1 - Math.exp(-rate * dt));
    };
    ease("tilt", 5);
    ease("poured", 6);
    ease("served", 6);
    ease("extraction", 3);
    ease("lid", 4);
    ease("flip", 3.2);
    ease("mug", 4);
    ease("off", 2.5);
    ease("spoon", 6);
    ease("press", 8);
    ease("cap", 5);
    ease("amp", 4);
    ease("exit", 1.6);
    a.at += dt * (!sc.started ? 0.6 : sc.paused ? 0 : sc.done ? 0.5 : 1);

    // ── Colours ──
    const [weak, strong0] = rec.colors;
    const strong = pal.dark ? mixHex(strong0, "#c08a5a", 0.22) : strong0;
    const brew = (e: number) => (e < 0.2 ? mix(pal.water, weak, e / 0.2) : mix(weak, strong, (e - 0.2) / 0.8));
    const isCoffee = rec.group === "kopi";

    // ── Frame setup: logical units, cropped to the scene and sat on the bottom ──
    const u = Math.min(f.width / VIEW.w, f.height / VIEW.h);
    const ox = f.width / 2 - VIEW.cx * u;
    const oy = f.height - VIEW.bottom * u;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, f.width, f.height);
    ctx.setTransform(u, 0, 0, u, ox, oy);
    const ucss = u / f.scale;
    const lw = (2.4 + 0.6 * ucss) / ucss;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Table.
    const left = -ox / u - 2;
    const right = (f.width - ox) / u + 2;
    const bottom = (f.height - oy) / u + 2;
    ctx.fillStyle = pal.table;
    ctx.fillRect(left, TABLE, right - left, bottom - TABLE);
    ctx.strokeStyle = alpha(pal.tableGrain, 0.35);
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    for (let r = 0; r < 3; r++) {
      const y = TABLE + 9 + r * 8;
      for (let x = left + ((r * 37) % 60); x < right; x += 70) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 26 + (r % 2) * 14, y);
      }
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left, TABLE);
    ctx.lineTo(right, TABLE);
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = lw;
    ctx.stroke();

    // ── Vessel ──
    const v: VCtx = {
      ctx,
      pal,
      lw,
      t,
      sc,
      a,
      recipe: rec,
      cups: nCups,
      liquid: brew(a.extraction),
      strong,
      served: brew(isCoffee ? 0.6 + 0.4 * a.extraction : a.extraction),
      foam: isCoffee ? mix(weak, "#fff1d6", 0.35) : mix(weak, "#ffffff", 0.4),
    };
    let info: VInfo;
    switch (rec.vessel) {
      case "v60":
        info = drawV60(v);
        break;
      case "press":
        info = drawPress(v);
        break;
      case "tubruk":
        info = drawTubruk(v);
        break;
      case "aero":
        info = drawAero(v);
        break;
      default:
        info = drawTea(v);
    }

    // ── Drips (V60) ──
    const D = drips.current;
    const drip = info.drip;
    if (drip && drip.rate > 0) {
      acc.current.drip += drip.rate * dt;
      while (acc.current.drip >= 1) {
        acc.current.drip -= 1;
        const p = spawn(D);
        if (!p) break;
        p.x = drip.x + (Math.random() - 0.5) * 2;
        p.y = drip.y;
        p.vy = 20;
        p.stop = drip.toY;
        p.life = 3;
      }
    }
    ctx.fillStyle = drip?.color ?? "#000";
    for (const p of D) {
      if (!p.alive) continue;
      if (!sc.paused) {
        p.vy += 520 * dt;
        p.y += p.vy * dt;
        p.age += dt;
      }
      if (p.y >= p.stop || p.age > p.life) {
        p.alive = false;
        continue;
      }
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 2.1, 2.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Kettle + pour stream ──
    // The kettle's job is done once the brew is: it waddles off stage.
    const kx = KETTLE.x + a.exit * a.exit * 190;
    if (a.exit < 0.99) drawKettle(ctx, rec.kettle, kx, KETTLE.y, a.tilt, pal, lw, t);
    kettleTip(rec.kettle, kx, KETTLE.y, a.tilt, tip.current);
    const tx = tip.current.x;
    const ty = tip.current.y;
    const stream = smoothstep(0.72, 0.97, a.tilt) * (sc.pouring ? 1 : 0.6);
    const water = mix(pal.water, "#ffffff", pal.dark ? 0 : 0.25);
    if (stream > 0.02) {
      const ly = Math.max(ty + 10, info.landY);
      const lx = info.landX + Math.sin(t * 9) * 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx - 4, ty + 14, lx, ly);
      tube(ctx, pal, lw * 0.7, (rec.kettle === "goose" ? 3.4 : 5.6) * stream, water);
      acc.current.splash += 32 * stream * dt;
      while (acc.current.splash >= 1) {
        acc.current.splash -= 1;
        const p = spawn(splash.current);
        if (!p) break;
        p.x = lx;
        p.y = ly - 1;
        p.vx = (Math.random() - 0.5) * 70;
        p.vy = -30 - Math.random() * 50;
        p.life = 0.3 + Math.random() * 0.2;
        p.size = 1.2 + Math.random() * 1.4;
        p.stop = ly + 2;
      }
    }
    ctx.fillStyle = water;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = lw * 0.35;
    for (const p of splash.current) {
      if (!p.alive) continue;
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;
      if (p.age > p.life || p.y > p.stop) {
        p.alive = false;
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // ── Steam (noise-driven drifting puffs) ──
    const S = steam.current;
    const emit = (x: number, y: number, w: number, rate: number, key: "steam" | "kettle", big: number) => {
      acc.current[key] += rate * dt;
      while (acc.current[key] >= 1) {
        acc.current[key] -= 1;
        const p = spawn(S);
        if (!p) return;
        p.x = x + (Math.random() * 2 - 1) * w;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 4;
        p.vy = -(12 + Math.random() * 12) * (0.8 + big * 0.3);
        p.life = 1.6 + Math.random() * 1.3;
        p.size = (2.5 + Math.random() * 3) * big;
        p.seed = Math.random() * 10;
      }
    };
    const vesselRate = info.steam * (sc.paused ? 3 : sc.done ? 6 : 11);
    if (vesselRate > 0) emit(info.steamX, info.steamY, info.steamW * 0.5, vesselRate, "steam", 1);
    if (a.tilt < 0.3 && a.exit < 0.05) emit(tx - 2, ty - 2, 2, sc.started ? 2 : 4.5, "kettle", 0.7);
    ctx.fillStyle = pal.steam;
    for (const p of S) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age > p.life) {
        p.alive = false;
        continue;
      }
      const sway = Math.sin(p.y * 0.05 + t * 1.3 + p.seed * 6) * 11 + Math.sin(t * 0.7 + p.seed) * 4;
      p.x += (sway + p.vx) * dt;
      p.y += p.vy * dt;
      const k2 = p.age / p.life;
      ctx.globalAlpha = Math.sin(k2 * Math.PI) * (sc.paused ? 0.7 : 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + k2 * 1.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (sc.done) {
      drawHeart(ctx, info.steamX + 28, info.steamY, sc.doneFor, t, pal);
      drawSparkles(ctx, info.sparkles, t, pal, lw);
    }

    // ── Face ──
    const mood: Mood = !sc.started
      ? "sleep"
      : sc.done
        ? "happy"
        : sc.paused
          ? "paused"
          : sc.pouring
            ? "wow"
            : "awake";
    const hop = sc.done ? Math.abs(Math.sin(t * 4)) * -3 * clamp(2 - sc.doneFor * 0.3) : 0;
    drawFace(ctx, info.faceX, info.faceY + hop, mood, t, pal, lw);
    if (mood === "sleep" || mood === "paused") drawZzz(ctx, info.faceX + 26, info.faceY - 10, t, pal, lw);
  });

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        backgroundImage: "radial-gradient(color-mix(in srgb, var(--ink) 9%, transparent) 1.3px, transparent 1.4px)",
        backgroundSize: "22px 22px",
      }}
    />
  );
}
