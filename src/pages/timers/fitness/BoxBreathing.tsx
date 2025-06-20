import React, { useState } from "react";
import { motion } from "framer-motion";
import { Timer } from "../../../components/timers";
import { cn } from "../../../utils/cn";

const BREATH_PHASES = [
  {
    name: "Inhale",
    duration: 4,
    color: "blue",
    instruction: "Breathe in slowly",
  },
  {
    name: "Hold",
    duration: 4,
    color: "purple",
    instruction: "Hold your breath",
  },
  {
    name: "Exhale",
    duration: 4,
    color: "green",
    instruction: "Breathe out slowly",
  },
  { name: "Hold", duration: 4, color: "teal", instruction: "Hold empty" },
];

export default function BoxBreathing() {
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(5 * 60); // 5 minutes default

  const durations = [
    { label: "3 minutes", value: 3 * 60 },
    { label: "5 minutes", value: 5 * 60 },
    { label: "10 minutes", value: 10 * 60 },
    { label: "15 minutes", value: 15 * 60 },
  ];

  const handleTick = () => {
    // Timer ticks every second, we need to track which phase we're in
    const totalCycleTime = BREATH_PHASES.reduce(
      (sum, phase) => sum + phase.duration,
      0
    );
    const elapsedInCycle =
      (breathCount * totalCycleTime +
        BREATH_PHASES.slice(0, currentPhase).reduce(
          (sum, phase) => sum + phase.duration,
          0
        )) %
      totalCycleTime;

    let phaseIndex = 0;
    let accumulated = 0;

    for (let i = 0; i < BREATH_PHASES.length; i++) {
      accumulated += BREATH_PHASES[i].duration;
      if (elapsedInCycle < accumulated) {
        phaseIndex = i;
        break;
      }
    }

    if (phaseIndex !== currentPhase) {
      setCurrentPhase(phaseIndex);
      if (phaseIndex === 0) {
        setBreathCount((prev) => prev + 1);
      }
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    setCurrentPhase(0);
  };

  const startSession = () => {
    setIsActive(true);
    setCurrentPhase(0);
    setBreathCount(0);
  };

  const stopSession = () => {
    setIsActive(false);
    setCurrentPhase(0);
    setBreathCount(0);
  };

  const phase = BREATH_PHASES[currentPhase];

  if (!isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold text-blue-600 mb-2">
              Box Breathing
            </h1>
            <p className="text-gray-600">
              Find your calm with 4-4-4-4 breathing
            </p>
          </motion.div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Visual Guide Preview */}
            <div className="flex justify-center mb-8">
              <div className="relative w-48 h-48">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-200 to-green-200"
                  animate={{
                    scale: [1, 1.2, 1.2, 1],
                  }}
                  transition={{
                    duration: 16,
                    repeat: Infinity,
                    times: [0, 0.25, 0.5, 1],
                  }}
                />
                <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
                  <span className="text-2xl font-semibold text-gray-700">
                    4-4-4-4
                  </span>
                </div>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-center">
                Session Duration
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {durations.map((duration) => (
                  <button
                    key={duration.value}
                    onClick={() => setSessionDuration(duration.value)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all",
                      sessionDuration === duration.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="font-semibold">{duration.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">
                How Box Breathing Works:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Inhale for 4 seconds</li>
                <li>• Hold your breath for 4 seconds</li>
                <li>• Exhale for 4 seconds</li>
                <li>• Hold empty for 4 seconds</li>
                <li>• Repeat the cycle</li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={startSession}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold rounded-lg hover:from-blue-600 hover:to-green-600 transition-all transform hover:scale-105"
            >
              Start Breathing Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen p-4 transition-colors duration-1000",
        phase.color === "blue" && "bg-gradient-to-br from-blue-400 to-blue-600",
        phase.color === "purple" &&
          "bg-gradient-to-br from-purple-400 to-purple-600",
        phase.color === "green" &&
          "bg-gradient-to-br from-green-400 to-green-600",
        phase.color === "teal" && "bg-gradient-to-br from-teal-400 to-teal-600"
      )}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Box Breathing</h1>
          <p className="text-white/80">Breath #{breathCount + 1}</p>
        </motion.div>

        <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Breathing Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-64 h-64">
              <motion.div
                className="absolute inset-0 rounded-full bg-white/30"
                animate={{
                  scale:
                    phase.name === "Inhale"
                      ? [1, 1.3]
                      : phase.name === "Exhale"
                      ? [1.3, 1]
                      : phase.name === "Hold" && currentPhase === 1
                      ? 1.3
                      : 1,
                }}
                transition={{
                  duration: phase.duration,
                  ease: "linear",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    key={phase.name + currentPhase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-bold text-white mb-2"
                  >
                    {phase.name}
                  </motion.div>
                  <div className="text-lg text-white/80">
                    {phase.instruction}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Phase Indicators */}
          <div className="flex justify-center gap-4 mb-8">
            {BREATH_PHASES.map((p, index) => (
              <div
                key={index}
                className={cn(
                  "w-16 h-2 rounded-full transition-all duration-500",
                  index === currentPhase ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="mb-8">
            <Timer
              key="box-breathing"
              mode="countdown"
              duration={sessionDuration}
              onTick={handleTick}
              onComplete={handleComplete}
              showPresets={false}
              progressType="linear"
              size="md"
              autoStart={true}
            />
          </div>

          {/* Stop Button */}
          <button
            onClick={stopSession}
            className="w-full py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors backdrop-blur-sm"
          >
            End Session
          </button>

          {/* Tips */}
          <div className="mt-6 p-4 bg-white/10 rounded-lg">
            <p className="text-sm text-white/80 text-center">
              Focus on your breath. Let thoughts pass by without judgment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
