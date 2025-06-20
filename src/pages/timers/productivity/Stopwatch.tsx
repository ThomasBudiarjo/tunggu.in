import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, RotateCcw, Flag } from "lucide-react";
import { useTimer } from "../../../hooks/useTimer";
import { TimerDisplay } from "../../../components/timers/TimerDisplay";
import { cn } from "../../../utils/cn";
import { formatTime } from "../../../utils/time";

interface Lap {
  id: number;
  time: number;
  split: number;
}

export default function Stopwatch() {
  const [laps, setLaps] = useState<Lap[]>([]);
  const { timer, isRunning, start, pause, reset } = useTimer({
    mode: "stopwatch",
  });

  const currentTime = timer?.elapsed || 0;

  const handleLap = () => {
    if (!isRunning || currentTime === 0) return;

    const previousLapTime = laps.length > 0 ? laps[laps.length - 1].time : 0;
    const split = currentTime - previousLapTime;

    setLaps((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        time: currentTime,
        split: split,
      },
    ]);
  };

  const handleReset = () => {
    reset();
    setLaps([]);
  };

  const getBestLap = () => {
    if (laps.length === 0) return null;
    return laps.reduce((best, lap) => (lap.split < best.split ? lap : best));
  };

  const getWorstLap = () => {
    if (laps.length === 0) return null;
    return laps.reduce((worst, lap) => (lap.split > worst.split ? lap : worst));
  };

  const bestLap = getBestLap();
  const worstLap = getWorstLap();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Stopwatch
            </h1>
            <p className="text-gray-600">Track your time with precision</p>
          </div>

          {/* Timer Display */}
          <div className="mb-12 text-center">
            <TimerDisplay
              seconds={currentTime}
              size="xl"
              format="hh:mm:ss"
              showMillis={true}
              className="font-mono"
            />
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRunning ? pause : start}
              className={cn(
                "px-8 py-4 rounded-full font-semibold text-white shadow-lg transition-colors flex items-center gap-2",
                isRunning
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="w-6 h-6" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" />
                  <span>Start</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLap}
              disabled={!isRunning || currentTime === 0}
              className={cn(
                "px-8 py-4 rounded-full font-semibold shadow-lg transition-colors flex items-center gap-2",
                isRunning && currentTime > 0
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              <Flag className="w-6 h-6" />
              <span>Lap</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              disabled={currentTime === 0 && laps.length === 0}
              className={cn(
                "px-8 py-4 rounded-full font-semibold shadow-lg transition-colors flex items-center gap-2",
                currentTime > 0 || laps.length > 0
                  ? "bg-gray-500 hover:bg-gray-600 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              <RotateCcw className="w-6 h-6" />
              <span>Reset</span>
            </motion.button>
          </div>

          {/* Laps */}
          {laps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 rounded-2xl p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Laps</h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...laps].reverse().map((lap) => {
                  const isBest = bestLap && lap.id === bestLap.id;
                  const isWorst = worstLap && lap.id === worstLap.id;

                  return (
                    <motion.div
                      key={lap.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        isBest && "bg-green-100 text-green-800",
                        isWorst && "bg-red-100 text-red-800",
                        !isBest && !isWorst && "bg-white"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-lg">
                          Lap {lap.id}
                        </span>
                        {isBest && (
                          <span className="text-xs font-medium px-2 py-1 bg-green-200 rounded-full">
                            BEST
                          </span>
                        )}
                        {isWorst && (
                          <span className="text-xs font-medium px-2 py-1 bg-red-200 rounded-full">
                            SLOWEST
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-lg">
                          {formatTime(lap.split, "mm:ss")}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          Total: {formatTime(lap.time, "hh:mm:ss")}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Press Start to begin timing. Use Lap to record split times.</p>
            <p>Best and slowest laps are highlighted automatically.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
