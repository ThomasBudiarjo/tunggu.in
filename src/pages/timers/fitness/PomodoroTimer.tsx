import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "../../../components/timers";
import { cn } from "../../../utils/cn";

const WORK_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes
const POMODOROS_BEFORE_LONG_BREAK = 4;

const motivationalQuotes = [
  "Take a deep breath. You've earned this break!",
  "Great work! Rest your mind for a moment.",
  "Progress is progress, no matter how small.",
  "You're doing amazing! Keep it up!",
  "Every pomodoro completed is a step forward.",
  "Rest is part of the process. Enjoy it!",
  "Your focus is impressive. Recharge now!",
  "Well done! Let your mind wander for a bit.",
];

export default function PomodoroTimer() {
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [currentQuote, setCurrentQuote] = useState("");
  const [sessionDuration, setSessionDuration] = useState(WORK_TIME);

  const getSessionDuration = () => {
    if (isWorkSession) return WORK_TIME;
    if (
      pomodoroCount % POMODOROS_BEFORE_LONG_BREAK === 0 &&
      pomodoroCount > 0
    ) {
      return LONG_BREAK;
    }
    return SHORT_BREAK;
  };

  const handleComplete = () => {
    if (isWorkSession) {
      setPomodoroCount((prev) => prev + 1);
      setIsWorkSession(false);
      // Select a random quote for the break
      const randomQuote =
        motivationalQuotes[
          Math.floor(Math.random() * motivationalQuotes.length)
        ];
      setCurrentQuote(randomQuote);
    } else {
      setIsWorkSession(true);
      setCurrentQuote("");
    }
  };

  // Update session duration when session type changes
  useEffect(() => {
    setSessionDuration(getSessionDuration());
  }, [isWorkSession, pomodoroCount]);

  const getSessionTitle = () => {
    if (isWorkSession) return "Work Session";
    if (
      pomodoroCount % POMODOROS_BEFORE_LONG_BREAK === 0 &&
      pomodoroCount > 0
    ) {
      return "Long Break";
    }
    return "Short Break";
  };

  const resetPomodoro = () => {
    setPomodoroCount(0);
    setIsWorkSession(true);
    setCurrentQuote("");
    setSessionDuration(WORK_TIME);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-red-600 mb-2">
            Pomodoro Timer
          </h1>
          <p className="text-gray-600">
            Stay focused with 25-minute work sessions
          </p>
        </motion.div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-red-200">
          {/* Tomato Icon */}
          <motion.div
            className="flex justify-center mb-6"
            animate={{
              scale: [1, 1.1, 1],
              rotate: !isWorkSession ? [0, 5, -5, 0] : 0,
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 1, repeat: Infinity },
            }}
          >
            <div className="w-24 h-24 bg-red-500 rounded-full relative shadow-lg">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-green-500 rounded-full" />
            </div>
          </motion.div>

          {/* Session Info */}
          <div className="text-center mb-6">
            <h2
              className={cn(
                "text-2xl font-bold mb-2",
                isWorkSession ? "text-red-600" : "text-green-600"
              )}
            >
              {getSessionTitle()}
            </h2>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-gray-600">
                Session #{pomodoroCount + (isWorkSession ? 1 : 0)}
              </span>
              <span className="text-gray-600">
                Completed: {pomodoroCount} 🍅
              </span>
            </div>
          </div>

          {/* Timer Component */}
          <Timer
            key={`${isWorkSession}-${pomodoroCount}`} // Force remount on session change
            mode="countdown"
            duration={sessionDuration}
            onComplete={handleComplete}
            showPresets={false}
            progressType="linear"
            size="lg"
          />

          {/* Motivational Quote */}
          <AnimatePresence mode="wait">
            {!isWorkSession && currentQuote && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 bg-green-50 rounded-lg"
              >
                <p className="text-green-700 text-center italic">
                  "{currentQuote}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset Button */}
          <button
            onClick={resetPomodoro}
            className="w-full mt-4 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Reset Pomodoro
          </button>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-red-50 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">
              How Pomodoro Works:
            </h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Work for 25 minutes with complete focus</li>
              <li>• Take a 5-minute break after each session</li>
              <li>• After 4 pomodoros, enjoy a 15-minute long break</li>
              <li>• Repeat the cycle to maintain productivity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
