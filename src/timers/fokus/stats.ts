import { create } from "zustand";
import { persist } from "zustand/middleware";
import { position, type Run } from "../../core/engine";
import { useRuns } from "../../core/runs";
import { dayKey } from "./plan";

export const ID = "fokus";

export interface Day {
  /** Focused seconds. */
  sec: number;
  /** Completed focus sessions. */
  n: number;
}

interface StatsState {
  days: Record<string, Day>;
  credit: (sec: number, n: number, at?: number) => void;
}

const KEEP_DAYS = 30;

export const useFokusStats = create<StatsState>()(
  persist(
    (set) => ({
      days: {},
      credit: (sec, n, at = Date.now()) =>
        set((s) => {
          if (sec <= 0 && n <= 0) return {};
          const key = dayKey(at);
          const prev = s.days[key] ?? { sec: 0, n: 0 };
          const days = { ...s.days, [key]: { sec: prev.sec + sec, n: prev.n + n } };
          // Trim old days so storage stays tiny.
          const keys = Object.keys(days).sort();
          for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[k];
          return { days };
        }),
    }),
    { name: "tunggu-fokus-stats", version: 1 },
  ),
);

interface Ledger {
  /** Seconds already credited per focus segment index. */
  sec: Record<string, number>;
  /** Focus segment indices already counted as a finished session. */
  done: number[];
}

const ledgerOf = (run: Run): Ledger => {
  const l = run.meta?.ledger as Ledger | undefined;
  return { sec: { ...(l?.sec ?? {}) }, done: [...(l?.done ?? [])] };
};

/**
 * Credit focus time that hasn't been credited yet. Completed focus segments
 * count in full (and as a session); with `partial`, the running focus
 * segment's elapsed seconds count too (used when a run is reset mid-focus).
 * What was credited is stored in the run's meta, so nothing counts twice —
 * not across reloads, not when +5 mnt re-opens a finished run.
 */
function settle(run: Run, now: number, partial: boolean) {
  const pos = position(run, now);
  const ledger = ledgerOf(run);
  let addSec = 0;
  let addN = 0;
  run.segments.forEach((seg, i) => {
    if (seg.kind !== "focus") return;
    const complete = pos.done || i < pos.index;
    let sec: number;
    if (complete) sec = seg.seconds;
    else if (partial && i === pos.index) sec = Math.floor(pos.segElapsed);
    else return;
    const had = ledger.sec[i] ?? 0;
    if (sec > had) {
      addSec += sec - had;
      ledger.sec[i] = sec;
    }
    if (complete && !ledger.done.includes(i)) {
      ledger.done.push(i);
      addN += 1;
    }
  });
  return { addSec, addN, ledger };
}

function check(next: Run | undefined, prev: Run | undefined) {
  const now = Date.now();
  if (next) {
    const { addSec, addN, ledger } = settle(next, now, false);
    if (addSec > 0 || addN > 0) {
      // Write the ledger first: the nested store update re-enters this
      // listener, which must already see the segment as credited.
      useRuns.getState().setMeta(ID, { ledger });
      useFokusStats.getState().credit(addSec, addN, now);
    }
    return;
  }
  // Run was reset: keep whatever was focused before the reset.
  if (prev && !prev.finished) {
    const { addSec, addN } = settle(prev, now, true);
    useFokusStats.getState().credit(addSec, addN, now);
  } else if (prev) {
    const { addSec, addN } = settle(prev, now, false);
    useFokusStats.getState().credit(addSec, addN, now);
  }
}

// The global ticker touches the store on every segment change and on finish,
// so this fires at exactly the moments a focus segment completes — on any
// page, once this module has been loaded.
const unsub = useRuns.subscribe((s, p) => {
  const next = s.runs[ID];
  const prev = p.runs[ID];
  if (next === prev) return;
  check(next, prev);
});
// Catch up on anything that completed while this module wasn't loaded.
check(useRuns.getState().runs[ID], undefined);

if (import.meta.hot) import.meta.hot.dispose(unsub);

/** The last `n` days, oldest first, for a tiny bar chart. */
export function lastDays(days: Record<string, Day>, n = 7, now = Date.now()) {
  const out: { key: string; date: Date; day: Day }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    out.push({ key, date: d, day: days[key] ?? { sec: 0, n: 0 } });
  }
  return out;
}
