import { useEffect, useState } from "react";
import { position, type Position, type Run } from "./engine";
import { useRuns, type StartOptions } from "./runs";

/** Re-renders every `ms` while `active`; returns the current epoch ms. */
export function useNow(ms = 250, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return active ? now : Date.now();
}

export interface RunHandle {
  run: Run | undefined;
  pos: Position | null;
  running: boolean;
  start: (opts: Omit<StartOptions, "timerId">) => void;
  toggle: () => void;
  reset: () => void;
  skip: () => void;
  addTime: (seconds: number) => void;
}

/** Everything a page needs to drive one engine run. */
export function useRun(timerId: string): RunHandle {
  const run = useRuns((s) => s.runs[timerId]);
  const active = !!run && run.pausedAt === null && !run.finished;
  const now = useNow(100, active);
  const pos = run ? position(run, now) : null;
  const api = useRuns.getState();
  return {
    run,
    pos,
    running: active,
    start: (opts) => api.start({ ...opts, timerId }),
    toggle: () => api.toggle(timerId),
    reset: () => api.reset(timerId),
    skip: () => api.skip(timerId),
    addTime: (s) => api.addTime(timerId, s),
  };
}

/** Like useState, but remembered in localStorage under `tunggu:<key>`. */
export function useStoredState<T>(key: string, initial: T) {
  const storageKey = `tunggu:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage full / private mode */
    }
  }, [storageKey, value]);
  return [value, setValue] as const;
}
