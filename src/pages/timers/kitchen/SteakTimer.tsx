import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TimerDisplay,
  TimerControls,
  TimerProgress,
} from "../../../components/timers";
import { useTimer } from "../../../hooks/useTimer";
import { cn } from "../../../utils/cn";

interface SteakDoneness {
  name: string;
  temp: string;
  color: string;
  timePerSide: number; // seconds per side per cm thickness
}

const donenessOptions: SteakDoneness[] = [
  { name: "Rare", temp: "120-125°F", color: "red-600", timePerSide: 60 },
  { name: "Medium Rare", temp: "130-135°F", color: "red-500", timePerSide: 90 },
  { name: "Medium", temp: "135-145°F", color: "pink-500", timePerSide: 120 },
  { name: "Well Done", temp: "155°F+", color: "gray-600", timePerSide: 180 },
];

const SteakTimer: React.FC = () => {
  const [thickness, setThickness] = useState<number>(2.5); // cm
  const [selectedDoneness, setSelectedDoneness] = useState<SteakDoneness>(
    donenessOptions[1]
  );
  const [hasFlipped, setHasFlipped] = useState(false);

  const totalTime = selectedDoneness.timePerSide * thickness * 2;
  const flipTime = totalTime / 2;

  const timer = useTimer({
    duration: totalTime,
    onComplete: () => {
      const audio = new Audio("/sounds/bell.mp3");
      audio.play().catch(() => {});
    },
  });

  // Check for flip reminder
  useEffect(() => {
    if (timer.timer && timer.isRunning) {
      const elapsed = timer.timer.elapsed;
      if (elapsed >= flipTime && !hasFlipped) {
        setHasFlipped(true);
        // Play flip notification
        const audio = new Audio("/sounds/bell.mp3");
        audio.play().catch(() => {});
      }
    }
  }, [timer.timer?.elapsed, timer.isRunning, flipTime, hasFlipped]);

  const handleDonenessSelect = (doneness: SteakDoneness) => {
    setSelectedDoneness(doneness);
    const newDuration = doneness.timePerSide * thickness * 2;
    timer.setDuration(newDuration);
    timer.reset();
    setHasFlipped(false);
  };

  const handleThicknessChange = (newThickness: number) => {
    setThickness(newThickness);
    const newDuration = selectedDoneness.timePerSide * newThickness * 2;
    timer.setDuration(newDuration);
    timer.reset();
    setHasFlipped(false);
  };

  const timeLeft = timer.timer?.remaining || 0;
  const currentSide = timer.timer && timer.timer.elapsed < flipTime ? 1 : 2;
  const shouldFlip =
    timer.timer && timer.timer.elapsed >= flipTime && !hasFlipped;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <h1 className="text-4xl font-bold text-center mb-8 text-red-800">
            Steak Timer
          </h1>

          {/* Steak Visual */}
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative w-64 h-48"
              animate={{
                rotateY: currentSide === 2 ? 180 : 0,
              }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
              }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 300 200" className="w-full h-full">
                  {/* Steak shape */}
                  <path
                    d="M50 100 Q50 50 100 40 L200 40 Q250 50 250 100 Q250 150 200 160 L100 160 Q50 150 50 100"
                    className={cn(
                      "transition-colors duration-1000",
                      `fill-${selectedDoneness.color}`
                    )}
                    stroke="#8b4513"
                    strokeWidth="3"
                  />

                  {/* Grill marks */}
                  {[0, 1, 2, 3].map((i) => (
                    <line
                      key={i}
                      x1={80 + i * 40}
                      y1="60"
                      x2={80 + i * 40}
                      y2="140"
                      stroke="#654321"
                      strokeWidth="8"
                      opacity="0.3"
                    />
                  ))}
                </svg>
              </div>

              {/* Flip indicator */}
              {shouldFlip && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full font-semibold"
                >
                  Flip Now!
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Timer Display */}
          <div className="mb-8">
            <TimerDisplay
              seconds={timeLeft}
              size="lg"
              className="text-6xl font-mono text-red-800 text-center"
            />
            <p className="text-center text-gray-600 mt-2">
              Side {currentSide} of 2
            </p>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <TimerProgress
              progress={timer.progress}
              type="linear"
              size="lg"
              color="bg-gradient-to-r from-red-400 to-red-600"
              backgroundColor="bg-red-100"
              className="h-4"
            />
          </div>

          {/* Thickness Input */}
          <div className="mb-6">
            <label className="block text-lg font-semibold text-gray-700 mb-2">
              Steak Thickness: {thickness} cm
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.5"
              value={thickness}
              onChange={(e) =>
                handleThicknessChange(parseFloat(e.target.value))
              }
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                  ((thickness - 1) / 4) * 100
                }%, #e5e7eb ${((thickness - 1) / 4) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>1 cm</span>
              <span>5 cm</span>
            </div>
          </div>

          {/* Doneness Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Select Doneness
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {donenessOptions.map((option) => (
                <motion.button
                  key={option.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDonenessSelect(option)}
                  className={cn(
                    "p-4 rounded-xl transition-all",
                    selectedDoneness.name === option.name
                      ? "bg-red-500 text-white shadow-lg"
                      : "bg-red-100 text-red-800 hover:bg-red-200"
                  )}
                >
                  <div className="font-semibold">{option.name}</div>
                  <div className="text-sm opacity-80">{option.temp}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <TimerControls
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            onStart={() => {
              timer.start();
              setHasFlipped(false);
            }}
            onPause={timer.pause}
            onResume={timer.resume}
            onReset={() => {
              timer.reset();
              setHasFlipped(false);
            }}
            className="justify-center"
          />

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-red-50 rounded-xl"
          >
            <h3 className="font-semibold text-red-800 mb-2">Tips:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>
                • Let steak rest at room temperature for 30 minutes before
                cooking
              </li>
              <li>• Pat dry and season generously with salt and pepper</li>
              <li>• Use high heat for a good sear</li>
              <li>• Let rest for 5-10 minutes after cooking</li>
              <li>• Use a meat thermometer for precise doneness</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SteakTimer;
