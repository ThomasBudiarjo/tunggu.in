import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/cn";

interface TimerPreset {
  label: string;
  seconds: number;
}

interface TimerPresetsProps {
  presets?: TimerPreset[];
  onSelect: (seconds: number) => void;
  currentValue?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "pills" | "minimal";
  className?: string;
}

const defaultPresets: TimerPreset[] = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "10m", seconds: 600 },
  { label: "15m", seconds: 900 },
  { label: "30m", seconds: 1800 },
];

const sizeConfig = {
  sm: {
    button: "px-3 py-1.5 text-xs",
    gap: "gap-1.5",
  },
  md: {
    button: "px-4 py-2 text-sm",
    gap: "gap-2",
  },
  lg: {
    button: "px-5 py-2.5 text-base",
    gap: "gap-3",
  },
};

const variantConfig = {
  default: {
    container: "inline-flex flex-wrap",
    button: "rounded-lg border border-gray-300 dark:border-gray-600",
    active: "bg-blue-600 text-white border-blue-600",
    inactive:
      "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700",
  },
  pills: {
    container:
      "inline-flex flex-wrap bg-gray-100 dark:bg-gray-800 rounded-full p-1",
    button: "rounded-full",
    active: "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm",
    inactive:
      "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
  },
  minimal: {
    container: "inline-flex flex-wrap",
    button: "rounded-md",
    active: "text-blue-600 dark:text-blue-400 font-semibold",
    inactive:
      "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white",
  },
};

export const TimerPresets: React.FC<TimerPresetsProps> = ({
  presets = defaultPresets,
  onSelect,
  currentValue,
  size = "md",
  variant = "default",
  className,
}) => {
  const sizes = sizeConfig[size];
  const variants = variantConfig[variant];

  return (
    <div className={cn(variants.container, sizes.gap, className)}>
      {presets.map((preset, index) => {
        const isActive = currentValue === preset.seconds;

        return (
          <motion.button
            key={preset.seconds}
            onClick={() => onSelect(preset.seconds)}
            className={cn(
              "font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              sizes.button,
              variants.button,
              isActive ? variants.active : variants.inactive
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {preset.label}
          </motion.button>
        );
      })}
    </div>
  );
};

// Quick timer presets for specific use cases
export const KitchenPresets: React.FC<Omit<TimerPresetsProps, "presets">> = (
  props
) => {
  const kitchenPresets: TimerPreset[] = [
    { label: "30s", seconds: 30 },
    { label: "1m", seconds: 60 },
    { label: "3m", seconds: 180 },
    { label: "5m", seconds: 300 },
    { label: "10m", seconds: 600 },
    { label: "15m", seconds: 900 },
  ];

  return <TimerPresets {...props} presets={kitchenPresets} />;
};

export const WorkoutPresets: React.FC<Omit<TimerPresetsProps, "presets">> = (
  props
) => {
  const workoutPresets: TimerPreset[] = [
    { label: "20s", seconds: 20 },
    { label: "30s", seconds: 30 },
    { label: "45s", seconds: 45 },
    { label: "1m", seconds: 60 },
    { label: "90s", seconds: 90 },
    { label: "2m", seconds: 120 },
  ];

  return <TimerPresets {...props} presets={workoutPresets} />;
};

export const ProductivityPresets: React.FC<
  Omit<TimerPresetsProps, "presets">
> = (props) => {
  const productivityPresets: TimerPreset[] = [
    { label: "5m", seconds: 300 },
    { label: "15m", seconds: 900 },
    { label: "25m", seconds: 1500 },
    { label: "45m", seconds: 2700 },
    { label: "1h", seconds: 3600 },
    { label: "2h", seconds: 7200 },
  ];

  return <TimerPresets {...props} presets={productivityPresets} />;
};

// Custom input with preset buttons
interface TimerInputWithPresetsProps extends TimerPresetsProps {
  value: number;
  onChange: (seconds: number) => void;
  placeholder?: string;
}

export const TimerInputWithPresets: React.FC<TimerInputWithPresetsProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Enter time...",
  ...presetProps
}) => {
  const [inputValue, setInputValue] = React.useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Try to parse as seconds
    const seconds = parseInt(val, 10);
    if (!isNaN(seconds) && seconds > 0) {
      onChange(seconds);
    }
  };

  const handlePresetSelect = (seconds: number) => {
    onChange(seconds);
    setInputValue(seconds.toString());
    onSelect(seconds);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2 rounded-lg border",
          "border-gray-300 dark:border-gray-600",
          "bg-white dark:bg-gray-800",
          "text-gray-900 dark:text-gray-100",
          "focus:outline-none focus:ring-2 focus:ring-blue-500"
        )}
      />
      <TimerPresets
        {...presetProps}
        onSelect={handlePresetSelect}
        currentValue={value}
      />
    </div>
  );
};
