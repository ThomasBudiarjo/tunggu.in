import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { useTimer } from "../../../hooks/useTimer";
import { TimerDisplay } from "../../../components/timers/TimerDisplay";
import { TimerProgress } from "../../../components/timers/TimerProgress";
import { cn } from "../../../utils/cn";

const WORK_TIME = 52 * 60; // 52 minutes in seconds
const BREAK_TIME = 17 * 60; // 17 minutes in seconds

const productivityTips = [
  "Focus on one task at a time for maximum productivity",
  "Turn off notifications during your work session",
  "Keep a water bottle nearby to stay hydrated",
  "Use your break to stretch and move around",
  "Write down distracting thoughts to address later",
  "Set a clear goal for each work session",
  "Take your breaks seriously - they boost productivity",
  "Consider using noise-cancelling headphones",
];

export default function FiftyTwoSeventeen() {
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);
  const [currentTip, setCurrentTip] = useState(productivityTips[0]);

  const targetTime = isWorkSession ? WORK_TIME : BREAK_TIME;
  const { timer, isRunning, start, pause, reset, setDuration } = useTimer({
    mode: "countdown",
    duration: targetTime,
    onComplete: () => {
      if (isWorkSession) {
        setSessionCount((prev) => prev + 1);
      }
      setIsWorkSession(!isWorkSession);
    },
  });

  useEffect(() => {
    setDuration(targetTime);
    reset();
  }, [isWorkSession, targetTime, setDuration, reset]);

  useEffect(() => {
    // Change tip every session
    const tipIndex = sessionCount % productivityTips.length;
    setCurrentTip(productivityTips[tipIndex]);
  }, [sessionCount]);

  const handleReset = () => {
    reset();
    setIsWorkSession(true);
    setSessionCount(0);
  };

  const progress = timer ? (timer.elapsed / timer.duration) * 100 : 0;
  const remainingTime = timer ? timer.remaining : targetTime;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              52/17 Timer
            </h1>
            <p className="text-gray-600">
              The productivity method for deep focus
            </p>
          </div>

          {/* Session Indicator */}
          <motion.div
            key={isWorkSession ? "work" : "break"}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-center mb-6 p-4 rounded-xl",
              isWorkSession
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            )}
          >
            <div className="flex items-center justify-center gap-2 text-xl font-semibold">
              {isWorkSession ? (
                <>
                  <Brain className="w-6 h-6" />
                  <span>Work Session</span>
                </>
              ) : (
                <>
                  <Coffee className="w-6 h-6" />
                  <span>Break Time</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Timer Display */}
          <div className="mb-8 text-center">
            <TimerDisplay seconds={remainingTime} size="lg" format="mm:ss" />
          </div>

          {/* Progress Ring */}
          <div className="mb-8 flex justify-center">
            <TimerProgress
              progress={progress}
              size="xl"
              strokeWidth={8}
              color={isWorkSession ? "#3B82F6" : "#10B981"}
            />
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isRunning ? pause : start}
              className={cn(
                "px-8 py-4 rounded-full font-semibold text-white shadow-lg transition-colors flex items-center",
                isWorkSession
                  ? "bg-blue-500 hover:bg-blue-600"
                  : "bg-green-500 hover:bg-green-600"
              )}
            >
              {isRunning ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="px-8 py-4 rounded-full font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 shadow-lg transition-colors flex items-center"
            >
              <RotateCcw className="w-6 h-6" />
            </motion.button>
          </div>

          {/* Session Counter */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <span className="text-gray-600">Sessions completed:</span>
              <span className="font-bold text-gray-800">{sessionCount}</span>
            </div>
          </div>

          {/* Productivity Tip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center"
            >
              <p className="text-sm text-blue-700 italic">💡 {currentTip}</p>
            </motion.div>
          </AnimatePresence>

          {/* Method Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Work for 52 minutes, then take a 17-minute break.</p>
            <p>This ratio optimizes focus and recovery.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
