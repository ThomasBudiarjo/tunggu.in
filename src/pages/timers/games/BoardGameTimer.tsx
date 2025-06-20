import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Settings, RotateCcw, Timer } from "lucide-react";
import { cn } from "../../../utils/cn";

const playerColors = [
  { bg: "bg-red-500", light: "bg-red-100", text: "text-red-800" },
  { bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-green-500", light: "bg-green-100", text: "text-green-800" },
  { bg: "bg-yellow-500", light: "bg-yellow-100", text: "text-yellow-800" },
  { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-pink-500", light: "bg-pink-100", text: "text-pink-800" },
];

export default function BoardGameTimer() {
  const [timePerTurn, setTimePerTurn] = useState(60); // seconds
  const [currentTime, setCurrentTime] = useState(60);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [playerCount, setPlayerCount] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [turnHistory, setTurnHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev <= 1) {
          // Auto advance to next player when time runs out
          handleNextPlayer();
          return timePerTurn;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timePerTurn]);

  const handleNextPlayer = () => {
    // Record turn time
    const timeTaken = timePerTurn - currentTime;
    setTurnHistory((prev) => [...prev, timeTaken]);

    // Move to next player
    setCurrentPlayer((prev) => (prev + 1) % playerCount);
    setCurrentTime(timePerTurn);
    setIsRunning(true);
  };

  const handleTap = () => {
    if (!isRunning) {
      setIsRunning(true);
    } else {
      handleNextPlayer();
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentTime(timePerTurn);
    setCurrentPlayer(0);
    setTurnHistory([]);
  };

  const handleSettingsChange = (
    newPlayerCount: number,
    newTimePerTurn: number
  ) => {
    setPlayerCount(newPlayerCount);
    setTimePerTurn(newTimePerTurn);
    setCurrentTime(newTimePerTurn);
    setShowSettings(false);
    handleReset();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentColor = playerColors[currentPlayer % playerColors.length];
  const progress = (currentTime / timePerTurn) * 100;

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-500 p-4",
        currentColor.light
      )}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div
            className={cn(
              "p-6 text-white transition-colors duration-500",
              currentColor.bg
            )}
          >
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Board Game Timer</h1>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                <Settings className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-gray-50 border-b"
              >
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Players
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          onClick={() => handleSettingsChange(num, timePerTurn)}
                          className={cn(
                            "px-4 py-2 rounded-lg font-semibold transition-colors",
                            playerCount === num
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time per Turn
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[30, 60, 90, 120, 180].map((seconds) => (
                        <button
                          key={seconds}
                          onClick={() =>
                            handleSettingsChange(playerCount, seconds)
                          }
                          className={cn(
                            "px-4 py-2 rounded-lg font-semibold transition-colors",
                            timePerTurn === seconds
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          )}
                        >
                          {formatTime(seconds)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Timer Area - Tappable */}
          <motion.div
            onClick={handleTap}
            whileTap={{ scale: 0.98 }}
            className="relative p-12 cursor-pointer select-none"
          >
            {/* Player Indicator */}
            <div className="text-center mb-8">
              <motion.div
                key={currentPlayer}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "inline-flex items-center gap-3 px-6 py-3 rounded-full",
                  currentColor.light,
                  currentColor.text
                )}
              >
                <Users className="w-6 h-6" />
                <span className="text-2xl font-bold">
                  Player {currentPlayer + 1}'s Turn
                </span>
              </motion.div>
            </div>

            {/* Timer Display */}
            <motion.div
              key={`${currentPlayer}-${currentTime}`}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center mb-8"
            >
              <div
                className={cn(
                  "text-8xl md:text-9xl font-bold tabular-nums",
                  currentColor.text
                )}
              >
                {formatTime(currentTime)}
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="w-full max-w-md mx-auto mb-8">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full transition-all duration-1000",
                    currentColor.bg
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Tap Instruction */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-center"
            >
              <p className="text-xl text-gray-600">
                {isRunning ? "Tap to pass turn" : "Tap to start"}
              </p>
            </motion.div>
          </motion.div>

          {/* Controls */}
          <div className="p-6 bg-gray-50 flex justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Reset Game
            </motion.button>
          </div>

          {/* Turn History */}
          {turnHistory.length > 0 && (
            <div className="p-6 bg-gray-50 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Turn History
              </h3>
              <div className="flex gap-2 flex-wrap">
                {turnHistory.map((time, index) => {
                  const playerNum = index % playerCount;
                  const color = playerColors[playerNum % playerColors.length];
                  return (
                    <motion.div
                      key={index}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "px-3 py-1 rounded-lg text-sm font-medium",
                        color.light,
                        color.text
                      )}
                    >
                      P{playerNum + 1}: {formatTime(time)}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
