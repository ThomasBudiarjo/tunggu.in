import { clamp, smoothstep } from "../../core/canvas";
import { position, type Run, type Segment } from "../../core/engine";
import type { Recipe, StepKind } from "./recipes";

/** Everything the brewing animation needs, derived from the run + clock. */
export interface Scene {
  started: boolean;
  paused: boolean;
  done: boolean;
  kind: StepKind | "idle" | "done";
  index: number;
  segP: number;
  segElapsed: number;
  /** Fraction of the total water poured so far. */
  poured: number;
  /** Fraction that has made it into the cup (V60 server / AeroPress mug). */
  served: number;
  /** 0 = plain water … 1 = fully brewed colour. */
  extraction: number;
  /** Kettle should be pouring right now. */
  pouring: boolean;
  /** Seconds since the brew finished. */
  doneFor: number;
}

export const IDLE_SCENE: Scene = {
  started: false,
  paused: false,
  done: false,
  kind: "idle",
  index: -1,
  segP: 0,
  segElapsed: 0,
  poured: 0,
  served: 0,
  extraction: 0,
  pouring: false,
  doneFor: 0,
};

/** Seconds of a bloom step spent actually pouring. */
const bloomPour = (seg: Segment) => Math.min(10, seg.seconds * 0.4);

/** Water in the vessel at `t` seconds into the run. */
export function pouredAt(segments: Segment[], water: number[], t: number) {
  let acc = 0;
  let prev = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const w = water[i] ?? prev;
    if (t < acc + s.seconds) {
      const local = Math.max(0, t - acc);
      if (s.kind === "pour") return prev + (w - prev) * clamp(local / s.seconds);
      if (s.kind === "bloom") return prev + (w - prev) * clamp(local / bloomPour(s));
      return w;
    }
    prev = w;
    acc += s.seconds;
  }
  return prev;
}

export function computeScene(recipe: Recipe, run: Run | undefined, now: number): Scene {
  if (!run || run.segments.length === 0) return IDLE_SCENE;
  const pos = position(run, now);
  const done = run.finished || pos.done;
  const meta = run.meta?.water;
  const water = Array.isArray(meta) ? (meta as number[]) : run.segments.map(() => 1);
  const t = pos.totalElapsed;
  const kind = done ? "done" : ((pos.segment.kind as StepKind | undefined) ?? "steep");
  const poured = done ? 1 : pouredAt(run.segments, water, t);

  let served = poured;
  if (recipe.vessel === "v60") {
    // Coffee drips through the bed ~25 s behind the pour; the final
    // drawdown step drains whatever is left.
    const lag = 25 * (kind === "drip" ? 1 - pos.segProgress : 1);
    served = done ? 1 : Math.min(poured, pouredAt(run.segments, water, t - lag));
  } else if (recipe.vessel === "aero") {
    served = done ? 1 : kind === "press" ? smoothstep(0.06, 0.95, pos.segProgress) : 0;
  }

  const p = done ? 1 : pos.progress;
  const extraction =
    poured <= 0
      ? 0
      : recipe.group === "kopi"
        ? 0.3 + 0.7 * (1 - (1 - p) * (1 - p))
        : Math.pow(p, 0.75);

  const pouring =
    !done &&
    !pos.paused &&
    (kind === "pour" || (kind === "bloom" && pos.segElapsed < bloomPour(pos.segment)));

  return {
    started: true,
    paused: pos.paused && !done,
    done,
    kind,
    index: pos.index,
    segP: done ? 1 : pos.segProgress,
    segElapsed: pos.segElapsed,
    poured,
    served,
    extraction,
    pouring,
    doneFor: done && run.finishedAt ? Math.max(0, (now - run.finishedAt) / 1000) : 0,
  };
}
