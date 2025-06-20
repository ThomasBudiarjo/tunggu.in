import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Timer } from "../../../components/timers";
import type { Timer as TimerType } from "../../../types/timer";
import { cn } from "../../../utils/cn";

interface HIITPreset {
  name: string;
  workTime: number;
  restTime: number;
  rounds: number;
  color: string;
}

const presets: HIITPreset[] = [
  { name: "Tabata", workTime: 20, restTime: 10, rounds: 8, color: "red" },
  {
    name: "HIIT Classic",
    workTime: 45,
    restTime: 15,
    rounds: 10,
    color: "orange",
  },
  {
    name: "Quick Burst",
    workTime: 30,
    restTime: 30,
    rounds: 6,
    color: "yellow",
  },
  { name: "Endurance", workTime: 60, restTime: 20, rounds: 12, color: "green" },
];

export default function HIITTimer() {
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [currentRound, setCurrentRound] = useState(1);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>("Tabata");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create intervals for the timer
  const intervals = React.useMemo(() => {
    const result = [];
    for (let i = 0; i < rounds; i++) {
      result.push({ duration: workTime, type: "work" as const });
      if (i < rounds - 1) {
        // Don't add rest after last round
        result.push({ duration: restTime, type: "rest" as const });
      }
    }
    return result;
  }, [workTime, restTime, rounds, isConfiguring]);

  const totalDuration = intervals.reduce(
    (sum, interval) => sum + interval.duration,
    0
  );

  const handlePresetSelect = (preset: HIITPreset) => {
    setWorkTime(preset.workTime);
    setRestTime(preset.restTime);
    setRounds(preset.rounds);
    setSelectedPreset(preset.name);
  };

  const handleTick = (timer: TimerType) => {
    // Calculate current round and phase
    let elapsed = timer.elapsed;
    let round = 1;
    let inWorkPhase = true;

    for (let i = 0; i < rounds; i++) {
      if (elapsed < workTime) {
        round = i + 1;
        inWorkPhase = true;
        break;
      }
      elapsed -= workTime;

      if (i < rounds - 1 && elapsed < restTime) {
        round = i + 1;
        inWorkPhase = false;
        break;
      }
      elapsed -= restTime;
    }

    // Update state if changed
    if (round !== currentRound || inWorkPhase !== isWorkPhase) {
      setCurrentRound(round);
      setIsWorkPhase(inWorkPhase);

      // Play audio cue
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const handleComplete = () => {
    // Play completion sound
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    setCurrentRound(1);
    setIsWorkPhase(true);
  };

  const startWorkout = () => {
    setIsConfiguring(false);
    setCurrentRound(1);
    setIsWorkPhase(true);
  };

  const resetWorkout = () => {
    setIsConfiguring(true);
    setCurrentRound(1);
    setIsWorkPhase(true);
  };

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-2">HIIT Timer</h1>
            <p className="text-white/80">High-Intensity Interval Training</p>
          </motion.div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Presets */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Quick Presets</h3>
              <div className="grid grid-cols-2 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      selectedPreset === preset.name
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-sm text-gray-600">
                      {preset.workTime}s work / {preset.restTime}s rest ×{" "}
                      {preset.rounds}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Settings */}
            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Time (seconds)
                </label>
                <input
                  type="number"
                  value={workTime}
                  onChange={(e) =>
                    setWorkTime(Math.max(1, parseInt(e.target.value) || 0))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rest Time (seconds)
                </label>
                <input
                  type="number"
                  value={restTime}
                  onChange={(e) =>
                    setRestTime(Math.max(1, parseInt(e.target.value) || 0))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rounds
                </label>
                <input
                  type="number"
                  value={rounds}
                  onChange={(e) =>
                    setRounds(Math.max(1, parseInt(e.target.value) || 0))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">
                  Total Workout Time
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.floor(totalDuration / 60)}:
                  {(totalDuration % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startWorkout}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105"
            >
              Start Workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen p-4 transition-colors duration-500",
        isWorkPhase
          ? "bg-gradient-to-br from-red-500 to-orange-600"
          : "bg-gradient-to-br from-blue-500 to-green-500"
      )}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">HIIT Timer</h1>
          <p className="text-white/80">Push yourself to the limit!</p>
        </motion.div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Phase Indicator */}
          <motion.div
            key={`${currentRound}-${isWorkPhase}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <div
              className={cn(
                "text-6xl font-black mb-2",
                isWorkPhase ? "text-white" : "text-white/90"
              )}
            >
              {isWorkPhase ? "WORK!" : "REST"}
            </div>
            <div className="text-2xl text-white/80">
              Round {currentRound} of {rounds}
            </div>
          </motion.div>

          {/* Timer */}
          <div className="mb-8">
            <Timer
              key="hiit-timer"
              mode="countdown"
              duration={totalDuration}
              intervals={intervals}
              onTick={handleTick}
              onComplete={handleComplete}
              showPresets={false}
              progressType="linear"
              size="lg"
              autoStart={true}
            />
          </div>

          {/* Round Progress */}
          <div className="mb-8">
            <div className="flex justify-center gap-2">
              {Array.from({ length: rounds }, (_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    i + 1 < currentRound
                      ? "bg-green-500 text-white"
                      : i + 1 === currentRound
                      ? isWorkPhase
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-blue-500 text-white"
                      : "bg-white/30 text-white/60"
                  )}
                >
                  {i + 1}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetWorkout}
            className="w-full py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
          >
            End Workout
          </button>

          {/* Audio Element */}
          <audio ref={audioRef} preload="auto">
            <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT" />
          </audio>
        </div>
      </div>
    </div>
  );
}
