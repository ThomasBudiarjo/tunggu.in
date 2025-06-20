import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Zap, CheckCircle } from "lucide-react";
import { useTimer } from "../../../hooks/useTimer";
import { TimerDisplay } from "../../../components/timers/TimerDisplay";
import { TimerProgress } from "../../../components/timers/TimerProgress";
import { cn } from "../../../utils/cn";

const BURST_TIME = 15 * 60; // 15 minutes in seconds

const motivationalMessages = [
  "You've got this! 💪",
  "Focus mode: ACTIVATED! 🚀",
  "15 minutes to greatness! ⚡",
  "Time to crush it! 🔥",
  "Let's make it happen! 🎯",
  "Full speed ahead! 🏃‍♂️",
  "You're unstoppable! 🌟",
  "Power through! 💥",
  "Excellence in progress! ✨",
  "Making magic happen! 🎪",
];

export default function GetItDone() {
  const [task, setTask] = useState("");
  const [currentMessage, setCurrentMessage] = useState(motivationalMessages[0]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);

  const { timer, isRunning, start, pause, reset } = useTimer({
    mode: "countdown",
    duration: BURST_TIME,
    onComplete: () => {
      setShowCompletion(true);
      if (task) {
        setCompletedTasks((prev) => [...prev, task]);
      }
    },
  });

  useEffect(() => {
    // Change motivational message every 30 seconds while running
    if (!isRunning) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(
        Math.random() * motivationalMessages.length
      );
      setCurrentMessage(motivationalMessages[randomIndex]);
    }, 30000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    if (!task.trim()) {
      setTask("Get something done!");
    }
    setShowCompletion(false);
    start();
    const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
    setCurrentMessage(motivationalMessages[randomIndex]);
  };

  const handleReset = () => {
    reset();
    setShowCompletion(false);
    setCurrentMessage(motivationalMessages[0]);
  };

  const remainingTime = timer ? timer.remaining : BURST_TIME;
  const progress = timer ? (timer.elapsed / timer.duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-yellow-400 to-orange-500 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
              className="inline-block"
            >
              <Zap className="w-12 h-12 text-orange-500 mb-4" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Get It Done Timer
            </h1>
            <p className="text-gray-600">
              15-minute power bursts for maximum productivity
            </p>
          </div>

          {/* Task Input */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What are you going to accomplish?
            </label>
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Write that email, finish the report, clean the desk..."
              className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
              disabled={isRunning}
            />
          </div>

          {/* Timer Display */}
          <div className="mb-8 text-center">
            <AnimatePresence mode="wait">
              {showCompletion ? (
                <motion.div
                  key="completion"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="py-8"
                >
                  <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-800">
                    Task Complete! 🎉
                  </h2>
                  <p className="text-gray-600 mt-2">Great job on: {task}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="timer"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <TimerDisplay
                    seconds={remainingTime}
                    size="xl"
                    format="mm:ss"
                    className="text-orange-600"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <TimerProgress
              progress={progress}
              type="linear"
              size="lg"
              color="bg-gradient-to-r from-orange-400 to-yellow-400"
              showPercentage={false}
            />
          </div>

          {/* Motivational Message */}
          {isRunning && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMessage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center mb-8"
              >
                <p className="text-xl font-semibold text-orange-600">
                  {currentMessage}
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRunning ? pause : handleStart}
              className={cn(
                "px-8 py-4 rounded-full font-semibold text-white shadow-lg transition-all flex items-center gap-2",
                isRunning
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
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
                  <span>Start Burst</span>
                </>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="px-8 py-4 rounded-full font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-6 h-6" />
              <span>Reset</span>
            </motion.button>
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Today's Accomplishments 🏆
              </h3>
              <div className="space-y-2">
                {completedTasks.map((completedTask, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 text-gray-700"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>{completedTask}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Enter your task and hit start for a focused 15-minute sprint.</p>
            <p>Perfect for quick wins and building momentum!</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
