import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../utils/cn";
import type { TimerStage } from "../../types/timer";

interface IntervalDisplayProps {
  stages: TimerStage[];
  currentStageIndex: number;
  currentCycle?: number;
  totalCycles?: number;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    container: "text-sm",
    stageName: "text-base font-medium",
    cycleInfo: "text-xs",
    dot: "w-2 h-2",
  },
  md: {
    container: "text-base",
    stageName: "text-lg font-semibold",
    cycleInfo: "text-sm",
    dot: "w-3 h-3",
  },
  lg: {
    container: "text-lg",
    stageName: "text-xl font-bold",
    cycleInfo: "text-base",
    dot: "w-4 h-4",
  },
};

export const IntervalDisplay: React.FC<IntervalDisplayProps> = ({
  stages,
  currentStageIndex,
  currentCycle = 1,
  totalCycles = 1,
  size = "md",
  showProgress = true,
  className,
}) => {
  const sizes = sizeConfig[size];
  const currentStage = stages[currentStageIndex];

  if (!currentStage) return null;

  return (
    <div className={cn("space-y-3", sizes.container, className)}>
      {/* Current Stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStageIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className={cn(sizes.stageName, "mb-1")}>{currentStage.name}</div>
          <div
            className={cn("text-gray-500 dark:text-gray-400", sizes.cycleInfo)}
          >
            {currentStage.type === "work"
              ? "Work"
              : currentStage.type === "rest"
              ? "Rest"
              : "Break"}
            {totalCycles > 1 && ` • Cycle ${currentCycle}/${totalCycles}`}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Stage Progress Dots */}
      {showProgress && stages.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {stages.map((stage, index) => {
            const isActive = index === currentStageIndex;
            const isCompleted = index < currentStageIndex;

            return (
              <motion.div
                key={stage.id}
                className={cn(
                  "rounded-full transition-all duration-300",
                  sizes.dot,
                  isActive
                    ? "bg-blue-600 dark:bg-blue-400"
                    : isCompleted
                    ? "bg-gray-400 dark:bg-gray-600"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
                initial={{ scale: 0 }}
                animate={{ scale: isActive ? 1.2 : 1 }}
                transition={{ duration: 0.2 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// Detailed interval list view
interface IntervalListProps {
  stages: TimerStage[];
  currentStageIndex?: number;
  onStageClick?: (index: number) => void;
  className?: string;
}

export const IntervalList: React.FC<IntervalListProps> = ({
  stages,
  currentStageIndex,
  onStageClick,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {stages.map((stage, index) => {
        const isActive = index === currentStageIndex;
        const isCompleted =
          currentStageIndex !== undefined && index < currentStageIndex;

        return (
          <motion.div
            key={stage.id}
            onClick={() => onStageClick?.(index)}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg transition-all",
              "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
              isActive && "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500",
              isCompleted && "opacity-60",
              !isActive && !isCompleted && "bg-gray-50 dark:bg-gray-800/50"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                  isActive
                    ? "bg-blue-600 text-white"
                    : isCompleted
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                )}
              >
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{stage.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.floor(stage.duration / 60)}:
                  {(stage.duration % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>
            <div
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                stage.type === "work"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : stage.type === "rest"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
              )}
            >
              {stage.type}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// Compact interval indicator
interface CompactIntervalIndicatorProps {
  currentInterval: number;
  totalIntervals: number;
  type?: "work" | "rest" | "break";
  className?: string;
}

export const CompactIntervalIndicator: React.FC<
  CompactIntervalIndicatorProps
> = ({ currentInterval, totalIntervals, type = "work", className }) => {
  const colors = {
    work: "bg-blue-600 text-white",
    rest: "bg-green-600 text-white",
    break: "bg-yellow-600 text-white",
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        colors[type],
        className
      )}
    >
      <span>
        {currentInterval}/{totalIntervals}
      </span>
      <span className="text-xs opacity-80">{type}</span>
    </motion.div>
  );
};
