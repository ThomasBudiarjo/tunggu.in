import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "../../../utils/cn";

interface FitnessTimer {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  color: string;
  path: string;
}

const fitnessTimers: FitnessTimer[] = [
  {
    id: "pomodoro",
    name: "Pomodoro Timer",
    description: "Stay focused with 25-minute work sessions",
    duration: "25 min",
    icon: "🍅",
    color: "from-red-500 to-orange-500",
    path: "/timers/fitness/pomodoro",
  },
  {
    id: "hiit",
    name: "HIIT/Tabata Timer",
    description: "High-intensity interval training",
    duration: "Custom",
    icon: "💪",
    color: "from-orange-500 to-red-600",
    path: "/timers/fitness/hiit",
  },
  {
    id: "box-breathing",
    name: "Box Breathing",
    description: "4-4-4-4 breathing technique for calm",
    duration: "5-15 min",
    icon: "🫁",
    color: "from-blue-500 to-green-500",
    path: "/timers/fitness/box-breathing",
  },
  {
    id: "meditation",
    name: "Meditation Timer",
    description: "Find peace in the present moment",
    duration: "5-30 min",
    icon: "🧘",
    color: "from-indigo-500 to-purple-500",
    path: "/timers/fitness/meditation",
  },
  {
    id: "power-nap",
    name: "Power Nap Timer",
    description: "Optimal naps for energy restoration",
    duration: "10-25 min",
    icon: "😴",
    color: "from-purple-600 to-indigo-600",
    path: "/timers/fitness/power-nap",
  },
];

export default function FitnessTimers() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Health & Fitness Timers
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Boost your productivity, improve your fitness, and find inner peace
            with our collection of wellness-focused timers.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fitnessTimers.map((timer, index) => (
            <motion.div
              key={timer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={timer.path} className="block h-full">
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 h-full">
                  <div
                    className={cn(
                      "h-32 rounded-t-2xl bg-gradient-to-br flex items-center justify-center text-6xl",
                      timer.color
                    )}
                  >
                    {timer.icon}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {timer.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{timer.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Duration: {timer.duration}
                      </span>
                      <motion.span
                        className="text-blue-600 font-medium"
                        whileHover={{ x: 5 }}
                      >
                        Start →
                      </motion.span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Category Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 bg-white rounded-2xl shadow-lg p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Why Use Fitness Timers?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="font-semibold text-gray-800 mb-2">Stay Focused</h3>
              <p className="text-gray-600 text-sm">
                Pomodoro technique helps maintain concentration and avoid
                burnout
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💪</div>
              <h3 className="font-semibold text-gray-800 mb-2">Get Fit</h3>
              <p className="text-gray-600 text-sm">
                HIIT timers make interval training easy and effective
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🧘</div>
              <h3 className="font-semibold text-gray-800 mb-2">Find Peace</h3>
              <p className="text-gray-600 text-sm">
                Meditation and breathing exercises reduce stress and anxiety
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-600">
            <span className="font-semibold">Pro tip:</span> Start with shorter
            sessions and gradually increase duration as you build the habit.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
