import { useEffect, useRef, useCallback, useState } from "react";
import { useTimerStore } from "../stores/timerStore";
import type { Timer, TimerConfig } from "../types/timer";
import { soundManager } from "../services/soundManager";
import { notificationService } from "../services/notificationService";
import { useSettingsStore } from "../stores/settingsStore";

export type TimerMode = "countdown" | "stopwatch";

export interface UseTimerOptions {
  mode?: TimerMode;
  duration?: number;
  onComplete?: () => void;
  onTick?: (timer: Timer) => void;
  autoStart?: boolean;
  intervals?: Array<{ duration: number; type: "work" | "rest" }>;
}

export interface UseTimerReturn {
  timer: Timer | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setDuration: (seconds: number) => void;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  progress: number;
  currentInterval: number;
  totalIntervals: number;
}

export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const {
    mode = "countdown",
    duration = 60,
    onComplete,
    onTick,
    autoStart = false,
    intervals,
  } = options;

  const [timerId, setTimerId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  const {
    createTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    deleteTimer,
    updateTimer,
    tick,
    getTimer,
  } = useTimerStore();

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  // Initialize timer
  useEffect(() => {
    const config: TimerConfig = {
      type: mode === "stopwatch" ? "stopwatch" : "countdown",
      name: mode === "stopwatch" ? "Stopwatch" : "Timer",
      category: "productivity",
      duration: mode === "stopwatch" ? 0 : duration,
    };

    // Add interval stages if provided
    if (intervals && intervals.length > 0) {
      config.stages = intervals.map((interval, index) => ({
        id: `stage-${index}`,
        name:
          interval.type === "work" ? `Work ${index + 1}` : `Rest ${index + 1}`,
        duration: interval.duration,
        type: interval.type,
      }));
      config.duration = intervals.reduce(
        (sum, interval) => sum + interval.duration,
        0
      );
    }

    const id = createTimer(config);
    setTimerId(id);

    if (autoStart) {
      startTimer(id);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      deleteTimer(id);
    };
  }, []); // Only run on mount

  // Get current timer
  const timer = timerId ? getTimer(timerId) : null;

  // Handle tick interval
  useEffect(() => {
    if (!timer || !timerId) return;

    if (timer.isRunning && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const currentTimer = getTimer(timerId);
        if (!currentTimer) return;

        if (mode === "stopwatch") {
          // For stopwatch, increment elapsed time
          updateTimer(timerId, {
            elapsed: currentTimer.elapsed + 1,
            remaining: 0,
          });
        } else {
          // For countdown, use the tick function
          tick(timerId);

          // Check for stage transitions in interval mode
          if (
            currentTimer.stages &&
            currentTimer.currentStageIndex !== undefined
          ) {
            const currentStage =
              currentTimer.stages[currentTimer.currentStageIndex];
            const stageElapsed = currentTimer.elapsed % currentStage.duration;

            if (stageElapsed === 0 && currentTimer.elapsed > 0) {
              // Move to next stage
              const nextIndex = currentTimer.currentStageIndex + 1;
              if (nextIndex < currentTimer.stages.length) {
                updateTimer(timerId, {
                  currentStageIndex: nextIndex,
                });

                // Play interval change sound
                soundManager.play("interval-change");

                // Show interval change notification
                const nextStage = currentTimer.stages[nextIndex];
                notificationService.showIntervalChange(
                  currentStage.name,
                  nextStage.name
                );
              }
            }
          }
        }

        // Call onTick callback
        if (onTickRef.current) {
          const updatedTimer = getTimer(timerId);
          if (updatedTimer) {
            onTickRef.current(updatedTimer);
          }
        }

        // Check for completion
        if (mode === "countdown") {
          const updatedTimer = getTimer(timerId);
          if (
            updatedTimer &&
            updatedTimer.isCompleted &&
            onCompleteRef.current
          ) {
            // Play completion sound
            soundManager.play("timer-complete");

            // Show notification
            notificationService.showTimerComplete(updatedTimer.name);

            // Stop tab title animation
            notificationService.stopTabTitleAnimation();

            // Vibrate if enabled
            const settings = useSettingsStore.getState();
            if (settings.vibrationEnabled && "vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]);
            }

            onCompleteRef.current();
          }
        }
      }, 1000);
    } else if (!timer.isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer?.isRunning, timerId, mode]);

  // Control functions
  const start = useCallback(() => {
    if (!timerId) return;
    startTimer(timerId);
    soundManager.play("timer-start");

    // Start tab title animation
    const currentTimer = getTimer(timerId);
    if (currentTimer) {
      notificationService.startTabTitleAnimation(() => {
        const t = getTimer(timerId);
        if (!t) return "00:00";
        return mode === "stopwatch"
          ? `${Math.floor(t.elapsed / 60)
              .toString()
              .padStart(2, "0")}:${(t.elapsed % 60)
              .toString()
              .padStart(2, "0")}`
          : `${Math.floor(t.remaining / 60)
              .toString()
              .padStart(2, "0")}:${(t.remaining % 60)
              .toString()
              .padStart(2, "0")}`;
      }, currentTimer.name);
    }
  }, [timerId, startTimer, getTimer, mode]);

  const pause = useCallback(() => {
    if (!timerId) return;
    pauseTimer(timerId);
    notificationService.stopTabTitleAnimation();
  }, [timerId, pauseTimer]);

  const resume = useCallback(() => {
    if (!timerId) return;
    startTimer(timerId);
    soundManager.play("timer-start");

    // Resume tab title animation
    const currentTimer = getTimer(timerId);
    if (currentTimer) {
      notificationService.startTabTitleAnimation(() => {
        const t = getTimer(timerId);
        if (!t) return "00:00";
        return mode === "stopwatch"
          ? `${Math.floor(t.elapsed / 60)
              .toString()
              .padStart(2, "0")}:${(t.elapsed % 60)
              .toString()
              .padStart(2, "0")}`
          : `${Math.floor(t.remaining / 60)
              .toString()
              .padStart(2, "0")}:${(t.remaining % 60)
              .toString()
              .padStart(2, "0")}`;
      }, currentTimer.name);
    }
  }, [timerId, startTimer, getTimer, mode]);

  const reset = useCallback(() => {
    if (!timerId) return;
    resetTimer(timerId);
    notificationService.stopTabTitleAnimation();
  }, [timerId, resetTimer]);

  const setDuration = useCallback(
    (seconds: number) => {
      if (!timerId || mode === "stopwatch") return;
      updateTimer(timerId, {
        duration: seconds,
        remaining: seconds,
        elapsed: 0,
      });
    },
    [timerId, mode, updateTimer]
  );

  // Calculate progress
  const progress = timer
    ? mode === "stopwatch"
      ? 0
      : timer.duration > 0
      ? (timer.elapsed / timer.duration) * 100
      : 0
    : 0;

  // Calculate interval info
  const currentInterval =
    timer?.currentStageIndex !== undefined ? timer.currentStageIndex + 1 : 0;
  const totalIntervals = timer?.stages?.length || 0;

  return {
    timer: timer || null,
    start,
    pause,
    resume,
    reset,
    setDuration,
    isRunning: timer?.isRunning || false,
    isPaused: timer?.isPaused || false,
    isCompleted: timer?.isCompleted || false,
    progress,
    currentInterval,
    totalIntervals,
  };
}
