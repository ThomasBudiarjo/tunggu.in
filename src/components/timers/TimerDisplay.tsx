import React from "react";
import { motion } from "framer-motion";
import { formatTime, formatTimeWithMillis } from "../../utils/time";
import { cn } from "../../utils/cn";

interface TimerDisplayProps {
  seconds: number;
  format?: "mm:ss" | "hh:mm:ss";
  showMillis?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animate?: boolean;
}

const sizeClasses = {
  sm: "text-2xl font-medium",
  md: "text-4xl font-semibold",
  lg: "text-6xl font-bold",
  xl: "text-8xl font-bold",
};

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  seconds,
  format = "mm:ss",
  showMillis = false,
  size = "md",
  className,
  animate = true,
}) => {
  const displayTime = showMillis
    ? formatTimeWithMillis(seconds, true)
    : formatTime(Math.floor(seconds), format);

  const digits = displayTime.split("");

  if (!animate) {
    return (
      <div
        className={cn("font-mono tabular-nums", sizeClasses[size], className)}
      >
        {displayTime}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "font-mono tabular-nums inline-flex",
        sizeClasses[size],
        className
      )}
    >
      {digits.map((digit, index) => (
        <motion.span
          key={`${index}-${digit}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{
            duration: 0.2,
            ease: "easeOut",
          }}
          className={cn(
            "inline-block",
            digit === ":" || digit === "." ? "mx-1" : ""
          )}
        >
          {digit}
        </motion.span>
      ))}
    </div>
  );
};

// Variant with background
export const TimerDisplayCard: React.FC<
  TimerDisplayProps & {
    variant?:
      | "default"
      | "primary"
      | "secondary"
      | "success"
      | "warning"
      | "danger";
  }
> = ({ variant = "default", className, ...props }) => {
  const variantClasses = {
    default: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    primary: "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100",
    secondary:
      "bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100",
    success:
      "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100",
    warning:
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100",
    danger: "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100",
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "rounded-2xl p-6 shadow-sm",
        variantClasses[variant],
        className
      )}
    >
      <TimerDisplay {...props} />
    </motion.div>
  );
};
