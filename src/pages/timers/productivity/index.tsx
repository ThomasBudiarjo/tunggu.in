import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Brain, Clock, Calendar, Zap, ArrowLeft } from "lucide-react";
import { cn } from "../../../utils/cn";

const productivityTimers = [
  {
    id: "fifty-two-seventeen",
    name: "52/17 Timer",
    description: "Deep focus productivity method with 52-minute work sessions",
    icon: Brain,
    path: "/timers/productivity/52-17",
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "stopwatch",
    name: "Simple Stopwatch",
    description: "Track time with precision, perfect for any activity",
    icon: Clock,
    path: "/timers/productivity/stopwatch",
    color: "from-gray-400 to-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: "countdown-to-date",
    name: "Countdown to Date",
    description: "Count down to important events and special occasions",
    icon: Calendar,
    path: "/timers/productivity/countdown",
    color: "from-purple-400 to-pink-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "get-it-done",
    name: "Get It Done Timer",
    description: "15-minute power bursts for quick tasks and momentum",
    icon: Zap,
    path: "/timers/productivity/get-it-done",
    color: "from-orange-400 to-yellow-500",
    bgColor: "bg-orange-50",
  },
];

export default function ProductivityTimers() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Productivity & Study
          </h1>
          <p className="text-xl text-gray-600">
            Boost your focus and track your progress with these productivity
            tools
          </p>
        </motion.div>

        {/* Timer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {productivityTimers.map((timer, index) => {
            const Icon = timer.icon;

            return (
              <motion.div
                key={timer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={timer.path}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300",
                      "hover:shadow-xl cursor-pointer group"
                    )}
                  >
                    {/* Background Gradient */}
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-10",
                        timer.color
                      )}
                    />

                    {/* Content */}
                    <div className={cn("relative p-8", timer.bgColor)}>
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={cn(
                            "p-3 rounded-xl bg-gradient-to-br text-white",
                            timer.color
                          )}
                        >
                          <Icon className="w-8 h-8" />
                        </div>
                        <motion.div
                          initial={{ x: 0 }}
                          whileHover={{ x: 5 }}
                          className="text-gray-400 group-hover:text-gray-600 transition-colors"
                        >
                          <ArrowLeft className="w-6 h-6 rotate-180" />
                        </motion.div>
                      </div>

                      <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {timer.name}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {timer.description}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Category Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-md">
            <Brain className="w-5 h-5 text-blue-500" />
            <span className="text-gray-700">
              Designed to help you stay focused and achieve more
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
