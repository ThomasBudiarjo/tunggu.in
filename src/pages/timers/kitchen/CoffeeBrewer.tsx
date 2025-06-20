import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TimerDisplay,
  TimerControls,
  TimerProgress,
} from "../../../components/timers";
import { useTimer } from "../../../hooks/useTimer";
import { cn } from "../../../utils/cn";

interface BrewMethod {
  name: string;
  duration: number;
  steps: string[];
  icon: string;
}

const brewMethods: BrewMethod[] = [
  {
    name: "Pour Over",
    duration: 3.5 * 60,
    steps: [
      "Bloom coffee with 2x water weight (30s)",
      "Pour in circular motions",
      "Maintain steady water level",
      "Total brew time: 3-4 minutes",
    ],
    icon: "☕",
  },
  {
    name: "French Press",
    duration: 4 * 60,
    steps: [
      "Add coarse ground coffee",
      "Pour hot water and stir",
      "Steep for 4 minutes",
      "Press down slowly",
    ],
    icon: "🫖",
  },
  {
    name: "AeroPress",
    duration: 1.5 * 60,
    steps: [
      "Insert filter and rinse",
      "Add medium-fine grounds",
      "Pour water and stir",
      "Press down steadily",
    ],
    icon: "💉",
  },
];

const CoffeeBrewer: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<BrewMethod>(
    brewMethods[0]
  );
  const timer = useTimer({
    duration: selectedMethod.duration,
    onComplete: () => {
      const audio = new Audio("/sounds/bell.mp3");
      audio.play().catch(() => {});
    },
  });

  const handleMethodSelect = (method: BrewMethod) => {
    setSelectedMethod(method);
    timer.setDuration(method.duration);
    timer.reset();
  };

  const timeLeft = timer.timer?.remaining || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-brown-50 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <h1 className="text-4xl font-bold text-center mb-8 text-amber-900">
            Coffee Brewer
          </h1>

          {/* Coffee Bean Animation */}
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative w-48 h-48"
              animate={{
                rotate: timer.isRunning ? 360 : 0,
              }}
              transition={{
                duration: 20,
                repeat: timer.isRunning ? Infinity : 0,
                ease: "linear",
              }}
            >
              {/* Coffee cup */}
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Cup */}
                <path
                  d="M40 80 L40 140 Q40 160 60 160 L140 160 Q160 160 160 140 L160 80 Z"
                  fill="#8B4513"
                  stroke="#654321"
                  strokeWidth="2"
                />

                {/* Handle */}
                <path
                  d="M160 100 Q180 100 180 120 Q180 140 160 140"
                  fill="none"
                  stroke="#654321"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Coffee */}
                <motion.path
                  d="M50 90 L50 130 Q50 140 60 140 L140 140 Q150 140 150 130 L150 90 Z"
                  fill="#3E2723"
                  initial={{ opacity: 0.3 }}
                  animate={{
                    opacity: timer.isRunning ? [0.3, 0.8, 0.3] : 0.3,
                  }}
                  transition={{
                    duration: 2,
                    repeat: timer.isRunning ? Infinity : 0,
                  }}
                />

                {/* Steam */}
                {timer.isRunning && (
                  <>
                    <motion.path
                      d="M70 70 Q75 50 70 30"
                      fill="none"
                      stroke="#D3D3D3"
                      strokeWidth="3"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: [0, 1, 1],
                        opacity: [0, 0.6, 0],
                        y: [0, -10, -20],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                    <motion.path
                      d="M100 70 Q95 50 100 30"
                      fill="none"
                      stroke="#D3D3D3"
                      strokeWidth="3"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: [0, 1, 1],
                        opacity: [0, 0.6, 0],
                        y: [0, -10, -20],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 1,
                      }}
                    />
                    <motion.path
                      d="M130 70 Q135 50 130 30"
                      fill="none"
                      stroke="#D3D3D3"
                      strokeWidth="3"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: [0, 1, 1],
                        opacity: [0, 0.6, 0],
                        y: [0, -10, -20],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 2,
                      }}
                    />
                  </>
                )}
              </svg>
            </motion.div>
          </div>

          {/* Timer Display */}
          <div className="mb-8">
            <TimerDisplay
              seconds={timeLeft}
              size="lg"
              className="text-6xl font-mono text-amber-900 text-center"
            />
          </div>

          {/* Progress */}
          <div className="mb-8">
            <TimerProgress
              progress={timer.progress}
              type="linear"
              size="lg"
              color="bg-gradient-to-r from-amber-600 to-amber-800"
              backgroundColor="bg-amber-100"
              className="h-4"
            />
          </div>

          {/* Brew Methods */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Select Brew Method
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {brewMethods.map((method) => (
                <motion.button
                  key={method.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMethodSelect(method)}
                  className={cn(
                    "p-4 rounded-xl transition-all text-center",
                    selectedMethod.name === method.name
                      ? "bg-amber-600 text-white shadow-lg"
                      : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                  )}
                >
                  <div className="text-2xl mb-2">{method.icon}</div>
                  <div className="font-semibold">{method.name}</div>
                  <div className="text-sm opacity-80">
                    {Math.floor(method.duration / 60)}-
                    {Math.ceil(method.duration / 60)} min
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Brewing Steps */}
          <div className="mb-8 p-4 bg-amber-50 rounded-xl">
            <h3 className="font-semibold text-amber-900 mb-3">
              {selectedMethod.name} Steps:
            </h3>
            <ol className="text-sm text-amber-800 space-y-2">
              {selectedMethod.steps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start"
                >
                  <span className="font-semibold mr-2">{index + 1}.</span>
                  <span>{step}</span>
                </motion.li>
              ))}
            </ol>
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
            className="mt-8 p-4 bg-amber-50 rounded-xl"
          >
            <h3 className="font-semibold text-amber-900 mb-2">Coffee Tips:</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Use freshly ground coffee beans</li>
              <li>• Water temperature: 195-205°F (90-96°C)</li>
              <li>• Coffee to water ratio: 1:15 to 1:17</li>
              <li>• Grind size varies by brew method</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CoffeeBrewer;
