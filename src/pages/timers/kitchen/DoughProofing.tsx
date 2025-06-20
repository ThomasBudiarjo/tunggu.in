import React, { useState } from "react";
import { motion } from "framer-motion";
import { TimerControls, TimerProgress } from "../../../components/timers";
import { useTimer } from "../../../hooks/useTimer";
import { cn } from "../../../utils/cn";

interface ProofingStage {
  name: string;
  duration: number;
  temperature: string;
  description: string;
}

const proofingStages: ProofingStage[] = [
  {
    name: "Quick Rise",
    duration: 30 * 60,
    temperature: "80-90°F",
    description: "Fast rise for quick breads",
  },
  {
    name: "First Rise",
    duration: 60 * 60,
    temperature: "75-80°F",
    description: "Standard first rise for most breads",
  },
  {
    name: "Second Rise",
    duration: 45 * 60,
    temperature: "75-80°F",
    description: "After shaping, before baking",
  },
  {
    name: "Cold Proof",
    duration: 8 * 60 * 60,
    temperature: "35-40°F",
    description: "Overnight in refrigerator",
  },
  {
    name: "Long Ferment",
    duration: 24 * 60 * 60,
    temperature: "35-40°F",
    description: "Extended cold fermentation",
  },
];

const DoughProofing: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<ProofingStage>(
    proofingStages[1]
  );
  const [customDuration, setCustomDuration] = useState<number>(60); // minutes
  const [useCustom, setUseCustom] = useState(false);

  const timer = useTimer({
    duration: useCustom ? customDuration * 60 : selectedStage.duration,
    onComplete: () => {
      const audio = new Audio("/sounds/bell.mp3");
      audio.play().catch(() => {});
    },
  });

  const handleStageSelect = (stage: ProofingStage) => {
    setSelectedStage(stage);
    setUseCustom(false);
    timer.setDuration(stage.duration);
    timer.reset();
  };

  const handleCustomDuration = () => {
    setUseCustom(true);
    timer.setDuration(customDuration * 60);
    timer.reset();
  };

  const timeLeft = timer.timer?.remaining || 0;
  const doughSize = 1 + (timer.progress / 100) * 0.5; // Dough grows from 1x to 1.5x

  const formatLongTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <h1 className="text-4xl font-bold text-center mb-8 text-amber-900">
            Dough Proofing Timer
          </h1>

          {/* Dough Animation */}
          <div className="flex justify-center mb-8">
            <motion.div className="relative w-64 h-64 flex items-center justify-center">
              {/* Bowl */}
              <svg viewBox="0 0 300 300" className="absolute w-full h-full">
                <path
                  d="M50 150 Q50 250 150 250 Q250 250 250 150 L250 150 L50 150"
                  fill="#F5F5DC"
                  stroke="#D2691E"
                  strokeWidth="3"
                />
                <ellipse
                  cx="150"
                  cy="150"
                  rx="100"
                  ry="20"
                  fill="none"
                  stroke="#D2691E"
                  strokeWidth="3"
                />
              </svg>

              {/* Dough */}
              <motion.div
                className="absolute"
                animate={{
                  scale: doughSize,
                }}
                transition={{
                  duration: 2,
                  ease: "easeOut",
                }}
              >
                <svg viewBox="0 0 200 200" className="w-40 h-40">
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="#F5DEB3"
                    stroke="#DEB887"
                    strokeWidth="2"
                    animate={{
                      r: timer.isRunning ? [80, 82, 80] : 80,
                    }}
                    transition={{
                      duration: 4,
                      repeat: timer.isRunning ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                  />

                  {/* Texture dots */}
                  {[...Array(8)].map((_, i) => (
                    <circle
                      key={i}
                      cx={100 + Math.cos((i * Math.PI) / 4) * 40}
                      cy={100 + Math.sin((i * Math.PI) / 4) * 40}
                      r="3"
                      fill="#D2B48C"
                      opacity="0.5"
                    />
                  ))}
                </svg>
              </motion.div>

              {/* Rising indicator */}
              {timer.isRunning && (
                <motion.div
                  className="absolute -right-8 top-1/2 transform -translate-y-1/2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-2xl">📈</div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Timer Display */}
          <div className="mb-8">
            <div className="text-center">
              <div className="text-6xl font-mono text-amber-900">
                {formatLongTime(timeLeft)}
              </div>
              <p className="text-gray-600 mt-2">
                {Math.round(timer.progress)}% Complete
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <TimerProgress
              progress={timer.progress}
              type="linear"
              size="lg"
              color="bg-gradient-to-r from-amber-400 to-amber-600"
              backgroundColor="bg-amber-100"
              className="h-4"
            />
          </div>

          {/* Proofing Stages */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Select Proofing Stage
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {proofingStages.map((stage) => (
                <motion.button
                  key={stage.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStageSelect(stage)}
                  className={cn(
                    "p-3 rounded-xl transition-all text-left",
                    selectedStage.name === stage.name && !useCustom
                      ? "bg-amber-600 text-white shadow-lg"
                      : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                  )}
                >
                  <div className="font-semibold">{stage.name}</div>
                  <div className="text-xs opacity-80">
                    {stage.duration >= 3600
                      ? `${Math.floor(stage.duration / 3600)}h`
                      : `${Math.floor(stage.duration / 60)}min`}
                    {" • "}
                    {stage.temperature}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Custom Duration */}
          <div className="mb-8 p-4 bg-amber-50 rounded-xl">
            <h4 className="font-semibold text-amber-900 mb-3">
              Custom Duration
            </h4>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="1"
                max="1440"
                value={customDuration}
                onChange={(e) =>
                  setCustomDuration(parseInt(e.target.value) || 1)
                }
                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Minutes"
              />
              <span className="text-amber-700">minutes</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCustomDuration}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all",
                  useCustom
                    ? "bg-amber-600 text-white"
                    : "bg-amber-200 text-amber-800 hover:bg-amber-300"
                )}
              >
                Set
              </motion.button>
            </div>
          </div>

          {/* Stage Info */}
          {!useCustom && (
            <div className="mb-8 p-4 bg-amber-50 rounded-xl">
              <h4 className="font-semibold text-amber-900 mb-2">
                {selectedStage.name}
              </h4>
              <p className="text-sm text-amber-800">
                {selectedStage.description}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Temperature: {selectedStage.temperature}
              </p>
            </div>
          )}

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
            className="mt-8 p-4 bg-amber-50 rounded-xl"
          >
            <h3 className="font-semibold text-amber-900 mb-2">
              Proofing Tips:
            </h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Dough should roughly double in size during first rise</li>
              <li>• Use the "poke test" - dough should spring back slowly</li>
              <li>• Warmer temperatures speed up proofing</li>
              <li>• Cover dough to prevent drying out</li>
              <li>• Cold proofing develops more complex flavors</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default DoughProofing;
