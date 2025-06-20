import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  TimerDisplay,
  TimerControls,
  TimerProgress,
} from "../../../components/timers";
import { useTimer } from "../../../hooks/useTimer";
import { cn } from "../../../utils/cn";

interface TeaType {
  name: string;
  steepTime: number;
  temperature: string;
  color: string;
  description: string;
}

const teaTypes: TeaType[] = [
  {
    name: "Green",
    steepTime: 2 * 60,
    temperature: "160-180°F",
    color: "green",
    description: "Delicate, grassy flavor",
  },
  {
    name: "Black",
    steepTime: 4 * 60,
    temperature: "200-212°F",
    color: "amber",
    description: "Bold, robust flavor",
  },
  {
    name: "White",
    steepTime: 3 * 60,
    temperature: "160-185°F",
    color: "yellow",
    description: "Subtle, naturally sweet",
  },
  {
    name: "Herbal",
    steepTime: 5 * 60,
    temperature: "212°F",
    color: "red",
    description: "Caffeine-free, varied flavors",
  },
  {
    name: "Oolong",
    steepTime: 3 * 60,
    temperature: "185-205°F",
    color: "orange",
    description: "Complex, partially oxidized",
  },
];

const TeaSteeper: React.FC = () => {
  const [selectedTea, setSelectedTea] = useState<TeaType>(teaTypes[0]);
  const timer = useTimer({
    duration: selectedTea.steepTime,
    onComplete: () => {
      const audio = new Audio("/sounds/bell.mp3");
      audio.play().catch(() => {});
    },
  });

  const handleTeaSelect = (tea: TeaType) => {
    setSelectedTea(tea);
    timer.setDuration(tea.steepTime);
    timer.reset();
  };

  const timeLeft = timer.timer?.remaining || 0;
  const steepProgress = timer.progress;

  const getTeaColorClass = (color: string) => {
    const colorMap: { [key: string]: string } = {
      green: "from-green-200 to-green-400",
      amber: "from-amber-300 to-amber-600",
      yellow: "from-yellow-200 to-yellow-400",
      red: "from-red-200 to-red-400",
      orange: "from-orange-200 to-orange-400",
    };
    return colorMap[color] || "from-gray-200 to-gray-400";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8"
        >
          <h1 className="text-4xl font-bold text-center mb-8 text-teal-800">
            Tea Steeper
          </h1>

          {/* Tea Cup Animation */}
          <div className="flex justify-center mb-8">
            <motion.div
              className="relative w-56 h-56"
              animate={{
                scale: timer.isRunning ? [1, 1.02, 1] : 1,
              }}
              transition={{
                duration: 4,
                repeat: timer.isRunning ? Infinity : 0,
              }}
            >
              <svg viewBox="0 0 240 240" className="w-full h-full">
                {/* Saucer */}
                <ellipse
                  cx="120"
                  cy="200"
                  rx="80"
                  ry="20"
                  fill="#E5E7EB"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                />

                {/* Cup */}
                <path
                  d="M60 120 L60 160 Q60 180 80 180 L160 180 Q180 180 180 160 L180 120 Q180 100 160 100 L80 100 Q60 100 60 120"
                  fill="#F3F4F6"
                  stroke="#6B7280"
                  strokeWidth="2"
                />

                {/* Handle */}
                <path
                  d="M180 130 Q200 130 200 150 Q200 170 180 170"
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Tea water with gradient based on steep progress */}
                <motion.path
                  d="M70 130 L70 160 Q70 170 80 170 L160 170 Q170 170 170 160 L170 130 Q170 120 160 120 L80 120 Q70 120 70 130"
                  className={cn(
                    "transition-all duration-1000",
                    `bg-gradient-to-b ${getTeaColorClass(selectedTea.color)}`
                  )}
                  fill="url(#teaGradient)"
                  opacity={0.3 + (steepProgress / 100) * 0.7}
                />

                {/* Tea gradient definition */}
                <defs>
                  <linearGradient
                    id="teaGradient"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      stopColor={
                        selectedTea.color === "green"
                          ? "#86efac"
                          : selectedTea.color === "amber"
                          ? "#fbbf24"
                          : selectedTea.color === "yellow"
                          ? "#fde047"
                          : selectedTea.color === "red"
                          ? "#fca5a5"
                          : "#fdba74"
                      }
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        selectedTea.color === "green"
                          ? "#22c55e"
                          : selectedTea.color === "amber"
                          ? "#d97706"
                          : selectedTea.color === "yellow"
                          ? "#facc15"
                          : selectedTea.color === "red"
                          ? "#ef4444"
                          : "#f97316"
                      }
                    />
                  </linearGradient>
                </defs>

                {/* Tea bag */}
                {timer.isRunning && (
                  <motion.g
                    animate={{
                      y: [0, 10, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <rect
                      x="110"
                      y="140"
                      width="20"
                      height="25"
                      fill="#8B7355"
                      opacity="0.8"
                    />
                    <line
                      x1="120"
                      y1="140"
                      x2="120"
                      y2="100"
                      stroke="#4A4A4A"
                      strokeWidth="1"
                    />
                    <rect x="115" y="95" width="10" height="5" fill="#4A4A4A" />
                  </motion.g>
                )}

                {/* Steam */}
                {timer.isRunning && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <motion.path
                        key={i}
                        d={`M${90 + i * 30} 100 Q${95 + i * 30} 80 ${
                          90 + i * 30
                        } 60`}
                        fill="none"
                        stroke="#D3D3D3"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{
                          pathLength: [0, 1, 1],
                          opacity: [0, 0.4, 0],
                          y: [0, -10, -20],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeOut",
                          delay: i * 0.5,
                        }}
                      />
                    ))}
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
              className="text-6xl font-mono text-teal-800 text-center"
            />
          </div>

          {/* Progress */}
          <div className="mb-8">
            <TimerProgress
              progress={timer.progress}
              type="linear"
              size="lg"
              color="bg-gradient-to-r from-teal-400 to-teal-600"
              backgroundColor="bg-teal-100"
              className="h-4"
            />
          </div>

          {/* Tea Type Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Select Tea Type
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {teaTypes.map((tea) => (
                <motion.button
                  key={tea.name}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTeaSelect(tea)}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    selectedTea.name === tea.name
                      ? "bg-teal-600 text-white shadow-lg"
                      : "bg-teal-100 text-teal-800 hover:bg-teal-200"
                  )}
                >
                  <div className="font-semibold">{tea.name}</div>
                  <div className="text-xs opacity-80">
                    {Math.floor(tea.steepTime / 60)} min
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tea Info */}
          <div className="mb-8 p-4 bg-teal-50 rounded-xl">
            <h3 className="font-semibold text-teal-800 mb-2">
              {selectedTea.name} Tea
            </h3>
            <div className="text-sm text-teal-700 space-y-1">
              <p>• Temperature: {selectedTea.temperature}</p>
              <p>
                • Steep time: {Math.floor(selectedTea.steepTime / 60)} minutes
              </p>
              <p>• {selectedTea.description}</p>
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
            className="mt-8 p-4 bg-teal-50 rounded-xl"
          >
            <h3 className="font-semibold text-teal-800 mb-2">Tea Tips:</h3>
            <ul className="text-sm text-teal-700 space-y-1">
              <li>• Use 1 teaspoon of loose tea per 8 oz water</li>
              <li>• Pre-warm your teapot or cup</li>
              <li>• Use filtered water for best taste</li>
              <li>• Don't squeeze tea bags - it releases bitter tannins</li>
              <li>• Store tea in airtight containers away from light</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TeaSteeper;
