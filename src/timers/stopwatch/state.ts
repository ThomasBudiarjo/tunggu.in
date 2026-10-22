/**
 * Stopwatch state is three numbers and a list, all wall-clock based so it
 * survives reloads and background tabs without drifting:
 *
 *   elapsed = acc + (startedAt ? now - startedAt : 0)
 *
 * `laps` holds the cumulative elapsed time (ms) at each Lap press.
 */
export interface SwState {
  /** Epoch ms of the last start/resume; null while paused or idle. */
  startedAt: number | null;
  /** Milliseconds banked before the current running stretch. */
  acc: number;
  /** Cumulative split times in ms, oldest first. */
  laps: number[];
}

export const EMPTY: SwState = { startedAt: null, acc: 0, laps: [] };

/** Guards against corrupt / old localStorage values. */
export function sanitize(raw: unknown): SwState {
  if (!raw || typeof raw !== "object") return EMPTY;
  const r = raw as Partial<SwState>;
  const startedAt = typeof r.startedAt === "number" && Number.isFinite(r.startedAt) ? r.startedAt : null;
  const acc = typeof r.acc === "number" && Number.isFinite(r.acc) && r.acc > 0 ? r.acc : 0;
  const laps = Array.isArray(r.laps) ? r.laps.filter((n): n is number => typeof n === "number" && Number.isFinite(n)) : [];
  return { startedAt, acc, laps };
}

export const isRunning = (s: SwState) => s.startedAt !== null;

export function elapsedOf(s: SwState, now = Date.now()) {
  return s.acc + (s.startedAt !== null ? Math.max(0, now - s.startedAt) : 0);
}

/** "0:07.42", "12:03.10", "1:02:03.04" — hundredths are floored. */
export function splitClock(ms: number): { main: string; cs: string } {
  const t = Math.max(0, Math.floor(ms / 10));
  const cs = t % 100;
  const sec = Math.floor(t / 100);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = String(s).padStart(2, "0");
  const main = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  return { main, cs: `.${String(cs).padStart(2, "0")}` };
}

export function fmt(ms: number) {
  const { main, cs } = splitClock(ms);
  return main + cs;
}

/** "+0.42", "−1:03.20" — for lap-vs-previous-lap deltas. */
export function fmtDelta(ms: number) {
  const sign = ms > 0 ? "+" : ms < 0 ? "−" : "±";
  const a = Math.abs(ms);
  if (a < 60_000) {
    const t = Math.floor(a / 10);
    return `${sign}${Math.floor(t / 100)}.${String(t % 100).padStart(2, "0")}`;
  }
  return sign + fmt(a);
}

export type LapKind = "fast" | "slow" | "normal";

export interface LapInfo {
  /** 1-based lap number. */
  n: number;
  duration: number;
  total: number;
  /** vs the previous lap; null for lap 1. */
  delta: number | null;
  kind: LapKind;
}

/** Durations, deltas and fastest/slowest marks (only with ≥3 laps). */
export function lapInfo(laps: number[]): LapInfo[] {
  const out: LapInfo[] = laps.map((total, i) => {
    const duration = total - (i > 0 ? laps[i - 1] : 0);
    return { n: i + 1, duration, total, delta: null, kind: "normal" };
  });
  for (let i = 1; i < out.length; i++) out[i].delta = out[i].duration - out[i - 1].duration;
  if (out.length >= 3) {
    let fast = 0;
    let slow = 0;
    for (let i = 1; i < out.length; i++) {
      if (out[i].duration < out[fast].duration) fast = i;
      if (out[i].duration > out[slow].duration) slow = i;
    }
    if (out[fast].duration !== out[slow].duration) {
      out[fast].kind = "fast";
      out[slow].kind = "slow";
    }
  }
  return out;
}

export function copyText(s: SwState, now = Date.now()) {
  const info = lapInfo(s.laps);
  const lines = [`⏱️ Stopwatch — tunggu.in`, `Total: ${fmt(elapsedOf(s, now))} · ${info.length} lap`];
  for (const l of info) {
    const tag = l.kind === "fast" ? " 🟢 tercepat" : l.kind === "slow" ? " 🔴 terlama" : "";
    const d = l.delta === null ? "" : ` (${fmtDelta(l.delta)})`;
    lines.push(`Lap ${l.n}: ${fmt(l.duration)}${d} · total ${fmt(l.total)}${tag}`);
  }
  return lines.join("\n");
}
