import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

interface TimerProgressProps {
  progress: number; // 0-100
  type?: "circular" | "linear";
  size?: "sm" | "md" | "lg" | "xl";
  strokeWidth?: number;
  showPercentage?: boolean;
  color?: string;
  backgroundColor?: string;
  className?: string;
  animate?: boolean;
}

const sizeConfig = {
  circular: {
    sm: { size: 80, fontSize: "text-sm" },
    md: { size: 120, fontSize: "text-base" },
    lg: { size: 160, fontSize: "text-lg" },
    xl: { size: 200, fontSize: "text-xl" },
  },
  linear: {
    sm: { height: "h-2", fontSize: "text-xs" },
    md: { height: "h-3", fontSize: "text-sm" },
    lg: { height: "h-4", fontSize: "text-base" },
    xl: { height: "h-6", fontSize: "text-lg" },
  },
};

export const CircularProgress: React.FC<TimerProgressProps> = ({
  progress,
  size = "md",
  strokeWidth = 8,
  showPercentage = false,
  color = "rgb(59, 130, 246)", // blue-500
  backgroundColor = "rgb(229, 231, 235)", // gray-200
  className,
  animate = true,
}) => {
  const config = sizeConfig.circular[size];
  const radius = (config.size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <motion.circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={
            animate ? { strokeDashoffset: circumference } : { strokeDashoffset }
          }
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </svg>
      {showPercentage && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            config.fontSize
          )}
        >
          <motion.span
            key={Math.floor(progress)}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-semibold"
          >
            {Math.floor(progress)}%
          </motion.span>
        </div>
      )}
    </div>
  );
};

export const LinearProgress: React.FC<TimerProgressProps> = ({
  progress,
  size = "md",
  showPercentage = false,
  color = "bg-blue-500",
  backgroundColor = "bg-gray-200 dark:bg-gray-700",
  className,
  animate = true,
}) => {
  const config = sizeConfig.linear[size];

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative w-full rounded-full overflow-hidden",
          config.height,
          backgroundColor
        )}
      >
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={animate ? { width: "0%" } : { width: `${progress}%` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
      {showPercentage && (
        <div className={cn("mt-1 text-center", config.fontSize)}>
          <motion.span
            key={Math.floor(progress)}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-medium text-gray-600 dark:text-gray-400"
          >
            {Math.floor(progress)}%
          </motion.span>
        </div>
      )}
    </div>
  );
};

export const TimerProgress: React.FC<TimerProgressProps> = ({
  type = "circular",
  ...props
}) => {
  if (type === "linear") {
    return <LinearProgress {...props} />;
  }
  return <CircularProgress {...props} />;
};

// Segmented progress for interval timers
interface SegmentedProgressProps {
  segments: number;
  currentSegment: number;
  segmentProgress: number;
  size?: "sm" | "md" | "lg";
  color?: string;
  backgroundColor?: string;
  className?: string;
}

export const SegmentedProgress: React.FC<SegmentedProgressProps> = ({
  segments,
  currentSegment,
  segmentProgress,
  size = "md",
  color = "bg-blue-500",
  backgroundColor = "bg-gray-200 dark:bg-gray-700",
  className,
}) => {
  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      {Array.from({ length: segments }, (_, i) => {
        const isActive = i === currentSegment;
        const isCompleted = i < currentSegment;
        const progress = isActive ? segmentProgress : isCompleted ? 100 : 0;

        return (
          <div
            key={i}
            className={cn(
              "relative w-full rounded-full overflow-hidden",
              heights[size],
              backgroundColor
            )}
          >
            <motion.div
              className={cn(
                "h-full rounded-full",
                isActive ? color : isCompleted ? `${color} opacity-60` : ""
              )}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </div>
        );
      })}
    </div>
  );
};
