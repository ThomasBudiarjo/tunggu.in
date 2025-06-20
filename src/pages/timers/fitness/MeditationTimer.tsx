import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Timer } from "../../../components/timers";
import type { Timer as TimerType } from "../../../types/timer";
import { cn } from "../../../utils/cn";

interface MeditationPreset {
  label: string;
  duration: number;
  description: string;
}

const presets: MeditationPreset[] = [
  {
    label: "5 minutes",
    duration: 5 * 60,
    description: "Quick mindfulness break",
  },
  { label: "10 minutes", duration: 10 * 60, description: "Daily meditation" },
  { label: "15 minutes", duration: 15 * 60, description: "Extended practice" },
  { label: "20 minutes", duration: 20 * 60, description: "Deep meditation" },
  { label: "30 minutes", duration: 30 * 60, description: "Long session" },
];

export default function MeditationTimer() {
  const [isActive, setIsActive] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(10 * 60);
  const [enableBells, setEnableBells] = useState(true);
  const [bellInterval, setBellInterval] = useState(5 * 60); // 5 minutes
  const [sessionCount, setSessionCount] = useState(0);
  const [totalMeditationTime, setTotalMeditationTime] = useState(0);
  const bellRef = useRef<HTMLAudioElement | null>(null);
  const lastBellTime = useRef(0);

  const handleTick = (timer: TimerType) => {
    // Play interval bell if enabled
    if (enableBells && bellInterval > 0) {
      const elapsed = timer.elapsed;
      if (
        elapsed > 0 &&
        elapsed % bellInterval === 0 &&
        elapsed !== lastBellTime.current
      ) {
        lastBellTime.current = elapsed;
        if (bellRef.current) {
          bellRef.current.play().catch(() => {});
        }
      }
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    setSessionCount((prev) => prev + 1);
    setTotalMeditationTime((prev) => prev + selectedDuration);

    // Play completion bell
    if (bellRef.current) {
      bellRef.current.play().catch(() => {});
    }
  };

  const startMeditation = () => {
    setIsActive(true);
    lastBellTime.current = 0;
  };

  const stopMeditation = () => {
    setIsActive(false);
  };

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-indigo-600 mb-2">
              Meditation Timer
            </h1>
            <p className="text-gray-600">Find peace in the present moment</p>
          </motion.div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Zen Animation */}
            <div className="flex justify-center mb-8">
              <div className="relative w-32 h-32">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.3, 0.5],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-300 to-purple-300"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.3, 0.5],
                  }}
                  transition={{
                    duration: 4,
                    delay: 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="absolute inset-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.3, 0.5],
                  }}
                  transition={{
                    duration: 4,
                    delay: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>

            {/* Duration Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Select Duration</h3>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <button
                    key={preset.duration}
                    onClick={() => setSelectedDuration(preset.duration)}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 transition-all text-left",
                      selectedDuration === preset.duration
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="font-semibold">{preset.label}</div>
                    <div className="text-sm text-gray-600">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bell Settings */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium text-gray-700">
                  Interval Bells
                </label>
                <button
                  onClick={() => setEnableBells(!enableBells)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    enableBells ? "bg-indigo-600" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      enableBells ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              {enableBells && (
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Bell interval (minutes)
                  </label>
                  <select
                    value={bellInterval / 60}
                    onChange={(e) =>
                      setBellInterval(parseInt(e.target.value) * 60)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value={3}>Every 3 minutes</option>
                    <option value={5}>Every 5 minutes</option>
                    <option value={10}>Every 10 minutes</option>
                    <option value={0}>Only at end</option>
                  </select>
                </div>
              )}
            </div>

            {/* Session Stats */}
            {sessionCount > 0 && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-indigo-600 mb-1">
                    Today's Progress
                  </div>
                  <div className="flex justify-center gap-6">
                    <div>
                      <div className="text-2xl font-bold text-indigo-700">
                        {sessionCount}
                      </div>
                      <div className="text-xs text-indigo-600">Sessions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-700">
                        {Math.floor(totalMeditationTime / 60)}
                      </div>
                      <div className="text-xs text-indigo-600">Minutes</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={startMeditation}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105"
            >
              Begin Meditation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Meditation Timer
          </h1>
          <p className="text-white/80">Be present in this moment</p>
        </motion.div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Ambient Animation */}
          <div className="flex justify-center mb-8">
            <div className="relative w-64 h-64">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle, rgba(255,255,255,${
                      0.1 - i * 0.03
                    }) 0%, transparent 70%)`,
                  }}
                  animate={{
                    scale: [1 + i * 0.2, 1.5 + i * 0.2, 1 + i * 0.2],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{
                    duration: 6 + i * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 2,
                  }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl font-light text-white mb-2">☮</div>
                  <div className="text-lg text-white/60">Breathe</div>
                </div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="mb-8">
            <Timer
              key="meditation"
              mode="countdown"
              duration={selectedDuration}
              onTick={handleTick}
              onComplete={handleComplete}
              showPresets={false}
              progressType="linear"
              size="lg"
              autoStart={true}
            />
          </div>

          {/* Stop Button */}
          <button
            onClick={stopMeditation}
            className="w-full py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
          >
            End Session
          </button>

          {/* Meditation Tips */}
          <div className="mt-6 p-4 bg-white/10 rounded-lg">
            <p className="text-sm text-white/80 text-center italic">
              "The mind is like water. When agitated, it becomes difficult to
              see. When calm, everything becomes clear."
            </p>
          </div>

          {/* Audio Element for Bell */}
          <audio ref={bellRef} preload="auto">
            <source src="data:audio/wav;base64,UklGRiQFAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAFAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAAgAAAAIAAAACAAAAA" />
          </audio>
        </div>
      </div>
    </div>
  );
}
