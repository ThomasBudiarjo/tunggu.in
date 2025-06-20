import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Timer } from "../../../components/timers";
import { cn } from "../../../utils/cn";

interface NapPreset {
  name: string;
  duration: number;
  description: string;
  icon: string;
}

const napPresets: NapPreset[] = [
  {
    name: "Power Nap",
    duration: 20 * 60,
    description: "Optimal for alertness",
    icon: "⚡",
  },
  {
    name: "Recovery Nap",
    duration: 25 * 60,
    description: "Restore energy levels",
    icon: "🔋",
  },
  {
    name: "Micro Nap",
    duration: 10 * 60,
    description: "Quick refresh",
    icon: "✨",
  },
  {
    name: "Coffee Nap",
    duration: 15 * 60,
    description: "Caffeine + nap combo",
    icon: "☕",
  },
];

const sleepTips = [
  "Find a quiet, dark place to rest",
  "Set your phone to 'Do Not Disturb'",
  "Keep the room cool (65-68°F)",
  "Use an eye mask if needed",
  "Relax your muscles progressively",
];

export default function PowerNapTimer() {
  const [isActive, setIsActive] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(napPresets[0]);
  const [showTips, setShowTips] = useState(true);
  const alarmRef = useRef<HTMLAudioElement | null>(null);

  const handleComplete = () => {
    setIsActive(false);

    // Play gentle wake-up sound
    if (alarmRef.current) {
      alarmRef.current.play().catch(() => {});
    }
  };

  const startNap = () => {
    setIsActive(true);
    setShowTips(false);
  };

  const stopNap = () => {
    setIsActive(false);
  };

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-white mb-2">
              Power Nap Timer
            </h1>
            <p className="text-gray-300">Recharge with the perfect nap</p>
          </motion.div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
            {/* Moon Animation */}
            <div className="flex justify-center mb-8">
              <div className="relative w-32 h-32">
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 60,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {/* Stars */}
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                      style={{
                        top: `${20 + Math.random() * 60}%`,
                        left: `${20 + Math.random() * 60}%`,
                      }}
                    />
                  ))}
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl">🌙</div>
                </div>
              </div>
            </div>

            {/* Nap Presets */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Choose Your Nap
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {napPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setSelectedPreset(preset)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all backdrop-blur-sm",
                      selectedPreset.name === preset.name
                        ? "border-purple-400 bg-purple-500/20"
                        : "border-white/20 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="text-2xl mb-1">{preset.icon}</div>
                    <div className="font-semibold text-white">
                      {preset.name}
                    </div>
                    <div className="text-xs text-gray-300">
                      {preset.duration / 60} minutes
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sleep Tips */}
            {showTips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6 p-4 bg-white/5 rounded-lg"
              >
                <h4 className="font-semibold text-white mb-2">Quick Tips:</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  {sleepTips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Sleep Cycle Info */}
            <div className="mb-6 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <h4 className="font-semibold text-blue-200 mb-2">
                Sleep Science
              </h4>
              <p className="text-sm text-blue-100">
                A 20-minute power nap helps you wake up before entering deep
                sleep, avoiding grogginess and maximizing alertness.
              </p>
            </div>

            {/* Start Button */}
            <button
              onClick={startNap}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
            >
              Start {selectedPreset.name}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            Power Nap Timer
          </h1>
          <p className="text-gray-400">Sweet dreams...</p>
        </motion.div>

        <div className="bg-gray-800/50 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-gray-700">
          {/* Sleep Animation */}
          <div className="flex justify-center mb-8">
            <div className="relative w-64 h-64">
              {/* Animated Z's */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-4xl text-purple-400"
                  style={{
                    top: "40%",
                    left: "50%",
                  }}
                  animate={{
                    x: [0, 20 + i * 10, 40 + i * 20],
                    y: [0, -20 - i * 10, -40 - i * 20],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 1.5],
                  }}
                  transition={{
                    duration: 3,
                    delay: i * 0.5,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                >
                  Z
                </motion.div>
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-8xl"
                >
                  😴
                </motion.div>
              </div>
            </div>
          </div>

          {/* Current Nap Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {selectedPreset.icon} {selectedPreset.name}
            </h2>
            <p className="text-gray-400">{selectedPreset.description}</p>
          </div>

          {/* Timer */}
          <div className="mb-8">
            <Timer
              key="power-nap"
              mode="countdown"
              duration={selectedPreset.duration}
              onComplete={handleComplete}
              showPresets={false}
              progressType="circular"
              size="lg"
              autoStart={true}
            />
          </div>

          {/* Wake Up Early Button */}
          <button
            onClick={stopNap}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Wake Up Early
          </button>

          {/* Ambient Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 italic">
              "A power nap is like a system reboot for your brain"
            </p>
          </div>

          {/* Audio Element for Alarm */}
          <audio ref={alarmRef} preload="auto">
            <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT" />
          </audio>
        </div>
      </div>
    </div>
  );
}
