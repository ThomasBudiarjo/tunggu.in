import type { Cue, Segment } from "../../core/engine";

export type PhaseKind = "inhale" | "hold" | "exhale" | "hold2";
export type PatternId = "box" | "478" | "tenang" | "koheren";

export interface Phase {
  kind: PhaseKind;
  seconds: number;
}

export interface Pattern {
  id: PatternId;
  name: string;
  code: string;
  emoji: string;
  /** One line: what it's good for. */
  use: string;
  /** Short "how to" tip. */
  how: string;
  phases: Phase[];
}

export const PATTERNS: Pattern[] = [
  {
    id: "box",
    name: "Box",
    code: "4-4-4-4",
    emoji: "🟪",
    use: "Biar fokus & kepala dingin — pas mau presentasi, ujian, atau abis ribut.",
    how: "Empat sisi sama panjang. Bayangin lagi ngegambar kotak pakai napas.",
    phases: [
      { kind: "inhale", seconds: 4 },
      { kind: "hold", seconds: 4 },
      { kind: "exhale", seconds: 4 },
      { kind: "hold2", seconds: 4 },
    ],
  },
  {
    id: "478",
    name: "4-7-8",
    code: "4-7-8",
    emoji: "😴",
    use: "Buat rileks & gampang tidur. Buangnya panjang, badan jadi kalem.",
    how: "Tarik lewat hidung, tahan, lalu buang pelan lewat mulut kayak niup lilin.",
    phases: [
      { kind: "inhale", seconds: 4 },
      { kind: "hold", seconds: 7 },
      { kind: "exhale", seconds: 8 },
    ],
  },
  {
    id: "tenang",
    name: "Tenang",
    code: "4-6",
    emoji: "🌊",
    use: "Pas cemas atau deg-degan. Buang lebih lama dari tarik = jantung melambat.",
    how: "Nggak ada tahan-tahan. Cukup buang napas sedikit lebih lama.",
    phases: [
      { kind: "inhale", seconds: 4 },
      { kind: "exhale", seconds: 6 },
    ],
  },
  {
    id: "koheren",
    name: "Koheren",
    code: "5,5-5,5",
    emoji: "💗",
    use: "Latihan harian ±5,5 napas per menit — bikin napas & detak jantung selaras.",
    how: "Tarik dan buang sama panjang, mulus kayak ombak. Enak dirutinin 5–10 menit.",
    phases: [
      { kind: "inhale", seconds: 5.5 },
      { kind: "exhale", seconds: 5.5 },
    ],
  },
];

export const patternById = (id: string) => PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];

export const PHASE_TEXT: Record<PhaseKind, { label: string; say: string; note: string }> = {
  inhale: { label: "Tarik napas", say: "Tarik napas…", note: "Pelan lewat hidung, perut mengembang." },
  hold: { label: "Tahan", say: "Tahan", note: "Santai, bahu tetap turun." },
  exhale: { label: "Buang", say: "Buang perlahan…", note: "Pelan-pelan sampai kosong." },
  hold2: { label: "Tahan", say: "Tahan kosong", note: "Diam sebentar sebelum tarik lagi." },
};

/** Phase colours, shared by the shader and the little timeline strip. */
export const PHASE_COLORS: Record<PhaseKind, { main: string; glow: string }> = {
  inhale: { main: "#b69cff", glow: "#7fd3ff" },
  hold: { main: "#d6a2ff", glow: "#ffaedb" },
  exhale: { main: "#9fb4ff", glow: "#6fe3c4" },
  hold2: { main: "#9a88ff", glow: "#c5b3ff" },
};

export const cycleSeconds = (p: Pattern) => p.phases.reduce((s, ph) => s + ph.seconds, 0);

/** Whole cycles that cover at least `minutes` (rounded up, at least 1). */
export const cyclesFor = (p: Pattern, minutes: number) =>
  Math.max(1, Math.ceil((minutes * 60) / cycleSeconds(p) - 1e-9));

export function buildSegments(p: Pattern, minutes: number, sound: boolean): Segment[] {
  const cycles = cyclesFor(p, minutes);
  const cue: Cue = sound ? "soft" : "none";
  const out: Segment[] = [];
  for (let c = 0; c < cycles; c++) {
    for (const ph of p.phases) {
      const t = PHASE_TEXT[ph.kind];
      out.push({ label: t.label, seconds: ph.seconds, kind: ph.kind, cue, note: t.note, notify: false });
    }
  }
  return out;
}

/** 0..1 orb inflation for a phase at progress `t` (sine ease in-out). */
export function orbSize(kind: string | undefined, t: number) {
  const e = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
  switch (kind) {
    case "inhale":
      return e;
    case "hold":
      return 1;
    case "exhale":
      return 1 - e;
    default:
      return 0;
  }
}

/** Where we'd be in the pattern `sec` seconds into an endless loop (idle preview). */
export function previewAt(p: Pattern, sec: number) {
  const len = cycleSeconds(p);
  let t = ((sec % len) + len) % len;
  for (const ph of p.phases) {
    if (t < ph.seconds) return { kind: ph.kind, progress: t / ph.seconds, left: ph.seconds - t };
    t -= ph.seconds;
  }
  const last = p.phases[p.phases.length - 1];
  return { kind: last.kind, progress: 1, left: 0 };
}
