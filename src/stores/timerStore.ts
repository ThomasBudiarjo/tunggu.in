import { create } from "zustand";
import type { Timer, TimerConfig } from "../types/timer";

interface TimerStore {
  // State
  timers: Map<string, Timer>;
  activeTimerId: string | null;

  // Actions
  createTimer: (config: TimerConfig) => string;
  startTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  deleteTimer: (id: string) => void;
  updateTimer: (id: string, updates: Partial<Timer>) => void;
  tick: (id: string) => void;

  // Selectors
  getTimer: (id: string) => Timer | undefined;
  getActiveTimer: () => Timer | undefined;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  timers: new Map(),
  activeTimerId: null,

  createTimer: (config) => {
    const id = `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timer: Timer = {
      id,
      type: config.type,
      name: config.name,
      category: config.category,
      duration: config.duration,
      elapsed: 0,
      remaining: config.duration,
      isRunning: false,
      isPaused: false,
      isCompleted: false,
      stages: config.stages,
      currentStageIndex: config.stages ? 0 : undefined,
      createdAt: Date.now(),
    };

    set((state) => {
      const newTimers = new Map(state.timers);
      newTimers.set(id, timer);
      return { timers: newTimers };
    });

    return id;
  },

  startTimer: (id) => {
    set((state) => {
      const timer = state.timers.get(id);
      if (!timer) return state;

      const newTimers = new Map(state.timers);
      newTimers.set(id, {
        ...timer,
        isRunning: true,
        isPaused: false,
        startedAt: Date.now(),
      });

      return {
        timers: newTimers,
        activeTimerId: id,
      };
    });
  },

  pauseTimer: (id) => {
    set((state) => {
      const timer = state.timers.get(id);
      if (!timer) return state;

      const newTimers = new Map(state.timers);
      newTimers.set(id, {
        ...timer,
        isRunning: false,
        isPaused: true,
      });

      return { timers: newTimers };
    });
  },

  resetTimer: (id) => {
    set((state) => {
      const timer = state.timers.get(id);
      if (!timer) return state;

      const newTimers = new Map(state.timers);
      newTimers.set(id, {
        ...timer,
        elapsed: 0,
        remaining: timer.duration,
        isRunning: false,
        isPaused: false,
        isCompleted: false,
        currentStageIndex: timer.stages ? 0 : undefined,
        startedAt: undefined,
        completedAt: undefined,
      });

      return { timers: newTimers };
    });
  },

  deleteTimer: (id) => {
    set((state) => {
      const newTimers = new Map(state.timers);
      newTimers.delete(id);
      return {
        timers: newTimers,
        activeTimerId: state.activeTimerId === id ? null : state.activeTimerId,
      };
    });
  },

  updateTimer: (id, updates) => {
    set((state) => {
      const timer = state.timers.get(id);
      if (!timer) return state;

      const newTimers = new Map(state.timers);
      newTimers.set(id, { ...timer, ...updates });
      return { timers: newTimers };
    });
  },

  tick: (id) => {
    set((state) => {
      const timer = state.timers.get(id);
      if (!timer || !timer.isRunning) return state;

      const elapsed = timer.elapsed + 1;
      const remaining = Math.max(0, timer.duration - elapsed);
      const isCompleted = remaining === 0;

      // Handle stage transitions for interval timers
      let currentStageIndex = timer.currentStageIndex;
      if (timer.stages && currentStageIndex !== undefined) {
        let stageElapsed = elapsed;
        let targetStageIndex = 0;

        // Calculate which stage we should be in
        for (let i = 0; i < timer.stages.length; i++) {
          const stageDuration = timer.stages[i].duration;
          if (stageElapsed <= stageDuration) {
            targetStageIndex = i;
            break;
          }
          stageElapsed -= stageDuration;
          targetStageIndex = i + 1;
        }

        // Update stage index if it changed
        if (targetStageIndex < timer.stages.length) {
          currentStageIndex = targetStageIndex;
        }
      }

      const newTimers = new Map(state.timers);
      newTimers.set(id, {
        ...timer,
        elapsed,
        remaining,
        isCompleted,
        isRunning: !isCompleted,
        completedAt: isCompleted ? Date.now() : undefined,
        currentStageIndex,
      });

      return { timers: newTimers };
    });
  },

  getTimer: (id) => {
    return get().timers.get(id);
  },

  getActiveTimer: () => {
    const { activeTimerId, timers } = get();
    return activeTimerId ? timers.get(activeTimerId) : undefined;
  },
}));
