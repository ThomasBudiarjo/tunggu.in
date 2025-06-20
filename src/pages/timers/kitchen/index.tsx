import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../../utils/cn";

interface KitchenTimer {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  color: string;
  path: string;
}

const kitchenTimers: KitchenTimer[] = [
  {
    id: "egg",
    name: "Egg Timer",
    description: "Perfect eggs every time",
    duration: "4-12 min",
    icon: "🥚",
    color: "from-orange-400 to-yellow-400",
    path: "/timers/kitchen/egg",
  },
  {
    id: "steak",
    name: "Steak Timer",
    description: "Cook steak to perfection",
    duration: "2-10 min",
    icon: "🥩",
    color: "from-red-400 to-red-600",
    path: "/timers/kitchen/steak",
  },
  {
    id: "coffee",
    name: "Coffee Brewer",
    description: "Brew the perfect cup",
    duration: "1-4 min",
    icon: "☕",
    color: "from-amber-600 to-amber-800",
    path: "/timers/kitchen/coffee",
  },
  {
    id: "tea",
    name: "Tea Steeper",
    description: "Steep tea to perfection",
    duration: "2-5 min",
    icon: "🍵",
    color: "from-green-400 to-teal-600",
    path: "/timers/kitchen/tea",
  },
  {
    id: "dough",
    name: "Dough Proofing",
    description: "Track dough rising time",
    duration: "30m-24h",
    icon: "🍞",
    color: "from-yellow-400 to-amber-600",
    path: "/timers/kitchen/dough",
  },
];

const KitchenCategory: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Kitchen & Cooking Timers
          </h1>
          <p className="text-xl text-gray-600">
            Essential timers for your culinary adventures
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kitchenTimers.map((timer, index) => (
            <motion.div
              key={timer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={timer.path}>
                <motion.div
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer h-full"
                >
                  {/* Gradient Header */}
                  <div
                    className={cn(
                      "h-32 bg-gradient-to-br flex items-center justify-center",
                      timer.color
                    )}
                  >
                    <motion.div
                      className="text-6xl"
                      animate={{
                        rotate: [0, -10, 10, -10, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        repeatDelay: 2,
                      }}
                    >
                      {timer.icon}
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
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
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Category Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-white rounded-2xl shadow-lg p-8"
        >
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            About Kitchen Timers
          </h2>
          <div className="prose prose-lg text-gray-600">
            <p>
              Our kitchen timers are designed to help you achieve culinary
              perfection. Whether you're boiling eggs, brewing coffee, or
              proofing dough, these timers provide precise timing with helpful
              visual cues and notifications.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Features
                </h3>
                <ul className="space-y-2">
                  <li>• Visual animations showing progress</li>
                  <li>• Preset options for common tasks</li>
                  <li>• Audio notifications when complete</li>
                  <li>• Mobile-responsive design</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Tips
                </h3>
                <ul className="space-y-2">
                  <li>• Read the helpful tips in each timer</li>
                  <li>• Customize durations as needed</li>
                  <li>• Keep your device volume on for alerts</li>
                  <li>• Save your favorite settings</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back to Categories */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <Link
            to="/timers"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Timer Categories
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default KitchenCategory;
