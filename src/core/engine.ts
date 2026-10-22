/**
 * Wall-clock timer engine.
 *
 * A run is a list of segments (work → rest → work …, or a single countdown)
 * plus timestamps. Everything else — current segment, remaining time,
 * progress — is derived from `Date.now()`, so a run survives page
 * navigation, reloads and background tabs without drifting.
 */

export type Cue = "beep" | "soft" | "chime" | "go" | "none";

export interface Segment {
  /** Short label shown to the user, e.g. "Kerja", "Tarik napas". */
  label: string;
  seconds: number;
  /** Free-form tag timers use to style a segment, e.g. "work" | "rest". */
  kind?: string;
  /** Sound played when this segment *starts*. Defaults to "beep". */
  cue?: Cue;
  /** Beep on the last 3 seconds of this segment. */
  countdown?: boolean;
  /** Optional longer instruction, e.g. "Tuang 60 g air memutar". */
  note?: string;
  /**
   * System notification + vibration when this segment starts (only shown
   * while the tab is hidden). Default true; set false for rapid segments
   * like breathing phases.
   */
  notify?: boolean;
}

export interface Run {
  timerId: string;
  title: string;
  emoji: string;
  /** Route to jump back to from the dock. */
  path: string;
  segments: Segment[];
  startedAt: number;
  pausedAt: number | null;
  pausedTotal: number;
  /** Milliseconds added by "skip" so elapsed lands on a segment boundary. */
  shift: number;
  /** Last segment index whose start cue was announced. */
  lastIndex: number;
  finished: boolean;
  finishedAt: number | null;
  meta?: Record<string, unknown>;
}

export interface Position {
  index: number;
  segment: Segment;
  segElapsed: number; // seconds
  segRemaining: number; // seconds
  segProgress: number; // 0..1
  totalElapsed: number; // seconds
  totalDuration: number; // seconds
  totalRemaining: number; // seconds
  progress: number; // 0..1
  done: boolean;
  paused: boolean;
}

export const totalSeconds = (segments: Segment[]) =>
  segments.reduce((sum, s) => sum + s.seconds, 0);

export function elapsedMs(run: Run, now = Date.now()): number {
  const end = run.pausedAt ?? now;
  return Math.max(0, end - run.startedAt - run.pausedTotal + run.shift);
}

export function position(run: Run, now = Date.now()): Position {
  const elapsed = elapsedMs(run, now) / 1000;
  const total = totalSeconds(run.segments);
  let acc = 0;
  let index = run.segments.length - 1;
  for (let i = 0; i < run.segments.length; i++) {
    if (elapsed < acc + run.segments[i].seconds) {
      index = i;
      break;
    }
    acc += run.segments[i].seconds;
  }
  const done = elapsed >= total;
  if (done) acc = total - run.segments[index].seconds;
  const segment = run.segments[index];
  const segElapsed = Math.min(segment.seconds, Math.max(0, elapsed - acc));
  return {
    index,
    segment,
    segElapsed,
    segRemaining: Math.max(0, segment.seconds - segElapsed),
    segProgress: segment.seconds > 0 ? segElapsed / segment.seconds : 1,
    totalElapsed: Math.min(elapsed, total),
    totalDuration: total,
    totalRemaining: Math.max(0, total - elapsed),
    progress: total > 0 ? Math.min(1, elapsed / total) : 1,
    done,
    paused: run.pausedAt !== null,
  };
}

/** "1:05:09", "25:00", "0:07" */
export function formatClock(totalSec: number, opts: { ceil?: boolean } = {}) {
  const t = Math.max(0, opts.ceil === false ? Math.floor(totalSec) : Math.ceil(totalSec - 1e-6));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** "3 mnt", "1 j 20 mnt", "45 dtk" */
export function formatHuman(totalSec: number) {
  const t = Math.round(totalSec);
  if (t < 60) return `${t} dtk`;
  const h = Math.floor(t / 3600);
  const m = Math.round((t % 3600) / 60);
  if (h === 0) return `${m} mnt`;
  return m ? `${h} j ${m} mnt` : `${h} jam`;
}
