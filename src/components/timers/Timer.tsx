import React from "react";
import { motion } from "framer-motion";
import { useTimer } from "../../hooks/useTimer";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { TimerProgress } from "./TimerProgress";
import { TimerPresets } from "./TimerPresets";
import { IntervalDisplay } from "./IntervalDisplay";
import { cn } from "../../utils/cn";

import type { UseTimerOptions } from "../../hooks/useTimer";

interface TimerProps extends UseTimerOptions {
  title?: string;
  showPresets?: boolean;
  showProgress?: boolean;
  progressType?: "circular" | "linear";
  size?: "sm" | "md" | "lg";
  className?: string;
  onDurationChange?: (seconds: number) => void;
}

export const Timer: React.FC<TimerProps> = ({
  title,
  showPresets = true,
  showProgress = true,
  progressType = "circular",
  size = "md",
  className,
  onDurationChange,
  ...timerOptions
}) => {
  const {
    timer,
    start,
    pause,
    resume,
    reset,
    setDuration,
    isRunning,
    isPaused,
    progress,
    currentInterval,
    totalIntervals,
  } = useTimer(timerOptions);

  const handlePresetSelect = (seconds: number) => {
    setDuration(seconds);
    onDurationChange?.(seconds);
  };

  if (!timer) return null;

  const hasIntervals = timer.stages && timer.stages.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      {/* Title */}
      {title && (
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      )}

      {/* Interval Display */}
      {hasIntervals &&
        timer.currentStageIndex !== undefined &&
        timer.stages && (
          <IntervalDisplay
            stages={timer.stages}
            currentStageIndex={timer.currentStageIndex}
            currentCycle={currentInterval}
            totalCycles={totalIntervals}
            size={size}
          />
        )}

      {/* Main Timer Display */}
      <div className="flex flex-col items-center space-y-6">
        {showProgress && progressType === "circular" ? (
          <div className="relative">
            <TimerProgress
              progress={progress}
              type="circular"
              size={size === "sm" ? "md" : size === "md" ? "lg" : "xl"}
              showPercentage={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <TimerDisplay
                seconds={
                  timerOptions.mode === "stopwatch"
                    ? timer.elapsed
                    : timer.remaining
                }
                size={size}
                animate={isRunning}
              />
            </div>
          </div>
        ) : (
          <TimerDisplay
            seconds={
              timerOptions.mode === "stopwatch"
                ? timer.elapsed
                : timer.remaining
            }
            size={size === "sm" ? "md" : size === "md" ? "lg" : "xl"}
            animate={isRunning}
          />
        )}

        {/* Linear Progress */}
        {showProgress && progressType === "linear" && (
          <div className="w-full max-w-md">
            <TimerProgress progress={progress} type="linear" size={size} />
          </div>
        )}

        {/* Controls */}
        <TimerControls
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onReset={reset}
          size={size}
        />

        {/* Presets */}
        {showPresets &&
          timerOptions.mode !== "stopwatch" &&
          !isRunning &&
          !isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <TimerPresets
                onSelect={handlePresetSelect}
                currentValue={timer.duration}
                size={size}
              />
            </motion.div>
          )}
      </div>
    </motion.div>
  );
};

// Compact timer for sidebars or lists
export const CompactTimer: React.FC<TimerProps> = (props) => {
  return (
    <Timer
      {...props}
      size="sm"
      showPresets={false}
      showProgress={false}
      className="space-y-3"
    />
  );
};

// Full-screen timer for focused sessions
export const FullScreenTimer: React.FC<TimerProps> = ({
  onComplete,
  ...props
}) => {
  const handleComplete = () => {
    // Add completion animation
    onComplete?.();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 dark:bg-black flex items-center justify-center p-8">
      <Timer
        {...props}
        size="lg"
        progressType="circular"
        onComplete={handleComplete}
        className="max-w-2xl w-full"
      />
    </div>
  );
};

// Timer with custom theme
interface ThemedTimerProps extends TimerProps {
  theme?: {
    primary: string;
    secondary: string;
    background: string;
  };
}

export const ThemedTimer: React.FC<ThemedTimerProps> = ({
  theme,
  ...props
}) => {
  return (
    <div
      className="p-8 rounded-2xl"
      style={{
        backgroundColor: theme?.background || "transparent",
      }}
    >
      <Timer {...props} />
    </div>
  );
};
