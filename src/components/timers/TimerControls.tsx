import React from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Square } from "lucide-react";
import { cn } from "../../utils/cn";

interface TimerControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStop?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "minimal" | "rounded";
  className?: string;
  showStop?: boolean;
}

const sizeConfig = {
  sm: {
    button: "h-10 w-10",
    icon: "h-4 w-4",
    gap: "gap-2",
  },
  md: {
    button: "h-12 w-12",
    icon: "h-5 w-5",
    gap: "gap-3",
  },
  lg: {
    button: "h-16 w-16",
    icon: "h-6 w-6",
    gap: "gap-4",
  },
};

const variantConfig = {
  default: {
    button: "rounded-lg",
    container: "",
  },
  minimal: {
    button: "rounded-lg",
    container: "",
  },
  rounded: {
    button: "rounded-full",
    container: "bg-gray-100 dark:bg-gray-800 rounded-full p-2",
  },
};

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onReset,
  onStop,
  size = "md",
  variant = "default",
  className,
  showStop = false,
}) => {
  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];

  const buttonClass = cn(
    "inline-flex items-center justify-center transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    sizes.button,
    variants.button
  );

  const primaryButtonClass = cn(
    buttonClass,
    "bg-blue-600 hover:bg-blue-700 text-white",
    "focus:ring-blue-500",
    "shadow-lg hover:shadow-xl",
    "transform hover:scale-105 active:scale-95"
  );

  const secondaryButtonClass = cn(
    buttonClass,
    variant === "minimal"
      ? "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      : "bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200",
    "focus:ring-gray-500"
  );

  const dangerButtonClass = cn(
    buttonClass,
    "bg-red-600 hover:bg-red-700 text-white",
    "focus:ring-red-500"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center",
        sizes.gap,
        variants.container,
        className
      )}
    >
      {/* Play/Pause/Resume Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRunning ? onPause : isPaused ? onResume : onStart}
        className={primaryButtonClass}
        aria-label={isRunning ? "Pause" : isPaused ? "Resume" : "Start"}
      >
        <motion.div
          key={isRunning ? "pause" : "play"}
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 180, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isRunning ? (
            <Pause className={sizes.icon} />
          ) : (
            <Play className={cn(sizes.icon, "ml-0.5")} />
          )}
        </motion.div>
      </motion.button>

      {/* Reset Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        className={secondaryButtonClass}
        aria-label="Reset"
      >
        <motion.div
          whileHover={{ rotate: -360 }}
          transition={{ duration: 0.5 }}
        >
          <RotateCcw className={sizes.icon} />
        </motion.div>
      </motion.button>

      {/* Stop Button (optional) */}
      {showStop && onStop && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStop}
          className={dangerButtonClass}
          aria-label="Stop"
        >
          <Square className={sizes.icon} />
        </motion.button>
      )}
    </motion.div>
  );
};

// Compact version for inline use
export const CompactTimerControls: React.FC<
  Omit<TimerControlsProps, "variant">
> = (props) => {
  return <TimerControls {...props} variant="minimal" size="sm" />;
};

// Floating action button style
export const FloatingTimerControls: React.FC<TimerControlsProps> = (props) => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="fixed bottom-8 right-8 z-50"
    >
      <TimerControls {...props} variant="rounded" />
    </motion.div>
  );
};
