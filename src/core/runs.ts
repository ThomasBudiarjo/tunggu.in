import { create } from "zustand";
import { persist } from "zustand/middleware";
import { elapsedMs, position, totalSeconds, type Run, type Segment } from "./engine";

export interface StartOptions {
  timerId: string;
  title: string;
  emoji: string;
  path: string;
  segments: Segment[];
  meta?: Record<string, unknown>;
}

interface RunsState {
  runs: Record<string, Run>;
  start: (opts: StartOptions) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  toggle: (id: string) => void;
  reset: (id: string) => void;
  /** Jump to the start of the next segment. */
  skip: (id: string) => void;
  /** Extend the current segment (or re-open a finished run). */
  addTime: (id: string, seconds: number) => void;
  /** Used by the global ticker. */
  markAnnounced: (id: string, index: number) => void;
  finish: (id: string, now: number) => void;
  setMeta: (id: string, meta: Record<string, unknown>) => void;
}

const patch = (
  state: RunsState,
  id: string,
  fn: (run: Run) => Partial<Run> | null,
): Partial<RunsState> => {
  const run = state.runs[id];
  if (!run) return {};
  const next = fn(run);
  if (!next) return {};
  return { runs: { ...state.runs, [id]: { ...run, ...next } } };
};

export const useRuns = create<RunsState>()(
  persist(
    (set) => ({
      runs: {},

      start: (opts) =>
        set((state) => ({
          runs: {
            ...state.runs,
            [opts.timerId]: {
              ...opts,
              segments: opts.segments.filter((s) => s.seconds > 0),
              startedAt: Date.now(),
              pausedAt: null,
              pausedTotal: 0,
              shift: 0,
              lastIndex: 0,
              finished: false,
              finishedAt: null,
            },
          },
        })),

      pause: (id) =>
        set((s) => patch(s, id, (r) => (r.pausedAt || r.finished ? null : { pausedAt: Date.now() }))),

      resume: (id) =>
        set((s) =>
          patch(s, id, (r) =>
            r.pausedAt === null || r.finished
              ? null
              : { pausedAt: null, pausedTotal: r.pausedTotal + (Date.now() - r.pausedAt) },
          ),
        ),

      toggle: (id) =>
        set((s) =>
          patch(s, id, (r) => {
            if (r.finished) return null;
            if (r.pausedAt === null) return { pausedAt: Date.now() };
            return { pausedAt: null, pausedTotal: r.pausedTotal + (Date.now() - r.pausedAt) };
          }),
        ),

      reset: (id) =>
        set((state) => {
          const runs = { ...state.runs };
          delete runs[id];
          return { runs };
        }),

      skip: (id) =>
        set((s) =>
          patch(s, id, (r) => {
            if (r.finished) return null;
            const pos = position(r);
            return { shift: r.shift + pos.segRemaining * 1000 + 1 };
          }),
        ),

      addTime: (id, seconds) =>
        set((s) =>
          patch(s, id, (r) => {
            const now = Date.now();
            const pos = position(r, now);
            const segments = r.segments.map((seg, i) =>
              i === pos.index ? { ...seg, seconds: Math.max(1, seg.seconds + seconds) } : seg,
            );
            if (!r.finished) return { segments };
            // Re-open a finished run: it was frozen at exactly its total.
            return {
              segments,
              finished: false,
              finishedAt: null,
              pausedAt: null,
              pausedTotal: r.pausedTotal + (now - (r.pausedAt ?? now)),
            };
          }),
        ),

      markAnnounced: (id, index) => set((s) => patch(s, id, () => ({ lastIndex: index }))),

      finish: (id, now) =>
        set((s) =>
          patch(s, id, (r) => {
            // Freeze elapsed at exactly the total so the display reads 0:00.
            const overshoot = elapsedMs(r, now) - totalSeconds(r.segments) * 1000;
            return {
              finished: true,
              finishedAt: now,
              pausedAt: now,
              shift: r.shift - Math.max(0, overshoot),
              lastIndex: r.segments.length - 1,
            };
          }),
        ),

      setMeta: (id, meta) => set((s) => patch(s, id, (r) => ({ meta: { ...r.meta, ...meta } }))),
    }),
    { name: "tunggu-runs", version: 1 },
  ),
);

/** Non-reactive read for animation loops: `getRun("fokus")`. */
export const getRun = (id: string): Run | undefined => useRuns.getState().runs[id];
