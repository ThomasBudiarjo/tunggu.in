import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TimerDisplay,
  TimerControls,
  TimerProgress,
} from "../../../components/timers";
import { useTimer } from "../../../hooks/useTimer";
import { cn } from "../../../utils/cn";

interface EggPreset {
  name: string;
  duration: number;
  description: string;
}

const eggPresets: EggPreset[] = [
  { name: "Soft", duration: 5 * 60, description: "4-6 minutes" },
  { name: "Medium", duration: 8 * 60, description: "7-9 minutes" },
  { name: "Hard", duration: 11 * 60, description: "10-12 minutes" },
];

const EggTimer: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>("Medium");
  const timer = useTimer({
    duration: 8 * 60,
    onComplete: () => {
      // Play notification sound
      const audio = new Audio("/sounds/bell.mp3");
      audio.play().catch(() => {});
    },
  });

  const handlePresetSelect = (preset: EggPreset) => {
    setSelectedPreset(preset.name);
    timer.setDuration(preset.duration);
    timer.reset();
  };

  const getDoneness = () => {
    const percentage = timer.progress;
    if (percentage < 40) return "raw";
    if (percentage < 70) return "soft";
    if (percentage < 90) return "medium";
    return "hard";
  };

  const doneness = getDoneness();
  const timeLeft = timer.timer?.remaining || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <h1 className="text-4xl font-bold text-center mb-8 text-orange-800">
            Egg Timer
          </h1>

          {/* Egg Animation */}
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative w-48 h-64"
              animate={{
                scale: timer.isRunning ? [1, 1.05, 1] : 1,
              }}
              transition={{
                duration: 2,
                repeat: timer.isRunning ? Infinity : 0,
              }}
            >
              <svg viewBox="0 0 200 260" className="w-full h-full">
                {/* Egg shape */}
                <ellipse
                  cx="100"
                  cy="140"
                  rx="80"
                  ry="110"
                  className={cn(
                    "transition-colors duration-1000",
                    doneness === "raw" && "fill-orange-100",
                    doneness === "soft" && "fill-orange-200",
                    doneness === "medium" && "fill-orange-300",
                    doneness === "hard" && "fill-orange-400"
                  )}
                  stroke="#f97316"
                  strokeWidth="3"
                />

                {/* Yolk */}
                <motion.ellipse
                  cx="100"
                  cy="140"
                  rx="40"
                  ry="40"
                  className={cn(
                    "transition-all duration-1000",
                    doneness === "raw" && "fill-yellow-300 opacity-80",
                    doneness === "soft" && "fill-yellow-400 opacity-70",
                    doneness === "medium" && "fill-yellow-500 opacity-60",
                    doneness === "hard" && "fill-yellow-600 opacity-50"
                  )}
                  animate={{
                    scale: timer.isRunning ? [1, 0.9, 1] : 1,
                  }}
                  transition={{
                    duration: 3,
                    repeat: timer.isRunning ? Infinity : 0,
                  }}
                />
              </svg>
            </motion.div>
          </div>

          {/* Timer Display */}
          <div className="mb-8">
            <TimerDisplay
              seconds={timeLeft}
              size="lg"
              className="text-6xl font-mono text-orange-800 text-center"
            />
          </div>

          {/* Progress */}
          <div className="mb-8">
            <TimerProgress
              progress={timer.progress}
              type="linear"
              size="lg"
              color="bg-gradient-to-r from-orange-400 to-orange-600"
              backgroundColor="bg-orange-100"
              className="h-4"
            />
          </div>

          {/* Presets */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">
              Select Doneness
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {eggPresets.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "p-4 rounded-xl transition-all",
                    selectedPreset === preset.name
                      ? "bg-orange-500 text-white shadow-lg"
                      : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                  )}
                >
                  <div className="font-semibold">{preset.name}</div>
                  <div className="text-sm opacity-80">{preset.description}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <TimerControls
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            onStart={timer.start}
            onPause={timer.pause}
            onResume={timer.resume}
            onReset={timer.reset}
            className="justify-center"
          />

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-orange-50 rounded-xl"
          >
            <h3 className="font-semibold text-orange-800 mb-2">Tips:</h3>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>
                • Start with eggs at room temperature for more consistent
                results
              </li>
              <li>
                • Place eggs in already boiling water for better timing control
              </li>
              <li>
                • Transfer to ice water immediately after cooking to stop the
                process
              </li>
              <li>• Add a teaspoon of vinegar to prevent cracking</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default EggTimer;
