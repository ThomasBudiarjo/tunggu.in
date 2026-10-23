import type { Segment } from "../../core/engine";

export type Mode = "tabata" | "hiit" | "emom";

export interface Config {
  mode: Mode;
  /** HIIT only (Tabata is fixed 20/10 × 8). */
  work: number;
  rest: number;
  rounds: number;
  /** Tabata + HIIT: how many blocks, and the longer breather between them. */
  sets: number;
  setRest: number;
  /** EMOM only. */
  minutes: number;
}

/** Where a segment sits in the workout, kept in run.meta so it survives reloads. */
export interface Step {
  round: number; // 0 = prep
  rounds: number;
  set: number;
  sets: number;
  /** True for the long rest between sets. */
  long?: boolean;
}

export interface Plan {
  segments: Segment[];
  steps: Step[];
}

export const PREP_SECONDS = 10;

export const DEFAULT_CONFIG: Config = {
  mode: "tabata",
  work: 40,
  rest: 20,
  rounds: 8,
  sets: 1,
  setRest: 60,
  minutes: 10,
};

const int = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(hi, Math.max(lo, n));
};

/** Clamp anything that came out of localStorage into a sane config. */
export function sanitize(c: Partial<Config> | null | undefined): Config {
  const d = DEFAULT_CONFIG;
  const mode: Mode = c?.mode === "hiit" || c?.mode === "emom" ? c.mode : "tabata";
  return {
    mode,
    work: int(c?.work, 5, 600, d.work),
    rest: int(c?.rest, 0, 600, d.rest),
    rounds: int(c?.rounds, 1, 50, d.rounds),
    sets: int(c?.sets, 1, 10, d.sets),
    setRest: int(c?.setRest, 0, 600, d.setRest),
    minutes: int(c?.minutes, 1, 60, d.minutes),
  };
}

/** The numbers actually used — Tabata overrides work/rest/rounds. */
export function effective(c: Config) {
  if (c.mode === "tabata") return { work: 20, rest: 10, rounds: 8, sets: c.sets, setRest: c.setRest };
  if (c.mode === "emom") return { work: 60, rest: 0, rounds: c.minutes, sets: 1, setRest: 0 };
  return { work: c.work, rest: c.rest, rounds: c.rounds, sets: c.sets, setRest: c.setRest };
}

const setTag = (s: number, sets: number) => (sets > 1 ? ` · Set ${s}/${sets}` : "");

export function buildPlan(c: Config): Plan {
  const segments: Segment[] = [];
  const steps: Step[] = [];
  // Zero-length segments are dropped here (not by the store) so steps stay aligned.
  const push = (seg: Segment, step: Step) => {
    if (seg.seconds <= 0) return;
    segments.push(seg);
    steps.push(step);
  };
  const { work, rest, rounds, sets, setRest } = effective(c);

  push(
    {
      label: "Siap-siap",
      seconds: PREP_SECONDS,
      kind: "prep",
      cue: "beep",
      countdown: true,
      note: "Ambil posisi, sebentar lagi mulai!",
    },
    { round: 0, rounds, set: 1, sets },
  );

  if (c.mode === "emom") {
    for (let k = 1; k <= rounds; k++) {
      push(
        {
          label: `Menit ${k}`,
          seconds: 60,
          kind: "work",
          cue: "go",
          countdown: true,
          note: k === rounds ? "Menit terakhir — habisin!" : `Menit ${k}/${rounds}: kelarin repetisi, sisanya napas.`,
        },
        { round: k, rounds, set: 1, sets: 1 },
      );
    }
    return { segments, steps };
  }

  for (let s = 1; s <= sets; s++) {
    for (let r = 1; r <= rounds; r++) {
      push(
        {
          label: "Kerja",
          seconds: work,
          kind: "work",
          cue: "go",
          countdown: true,
          note: `Ronde ${r}/${rounds}${setTag(s, sets)} — gas!`,
        },
        { round: r, rounds, set: s, sets },
      );
      if (r < rounds) {
        push(
          {
            label: "Istirahat",
            seconds: rest,
            kind: "rest",
            cue: "soft",
            countdown: true,
            note: `Atur napas. Berikutnya ronde ${r + 1}/${rounds}.`,
          },
          { round: r, rounds, set: s, sets },
        );
      } else if (s < sets) {
        push(
          {
            label: "Istirahat set",
            seconds: setRest,
            kind: "rest",
            cue: "soft",
            countdown: true,
            note: `Set ${s} beres! Minum dulu, set ${s + 1} menyusul.`,
          },
          { round: r, rounds, set: s, sets, long: true },
        );
      }
    }
  }
  return { segments, steps };
}

export function summarize(segments: Segment[]) {
  let total = 0;
  let work = 0;
  let rest = 0;
  for (const s of segments) {
    total += s.seconds;
    if (s.kind === "work") work += s.seconds;
    else if (s.kind === "rest") rest += s.seconds;
  }
  return { total, work, rest };
}

/** Read the steps stored in run.meta defensively (old/foreign data → undefined). */
export function stepsFromMeta(meta: Record<string, unknown> | undefined): Step[] | undefined {
  const steps = meta?.steps;
  return Array.isArray(steps) ? (steps as Step[]) : undefined;
}
