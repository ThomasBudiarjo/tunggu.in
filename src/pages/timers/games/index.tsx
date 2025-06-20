import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, Zap, ArrowLeft, Gamepad2 } from "lucide-react";
import { cn } from "../../../utils/cn";

const gameTimers = [
  {
    id: "board-game-timer",
    name: "Board Game Turn Timer",
    description: "Keep track of player turns with a simple tap-to-pass timer",
    icon: Users,
    path: "/timers/games/board-game",
    color: "from-purple-400 to-pink-600",
    bgColor: "bg-purple-50",
  },
  {
    id: "five-second-rule",
    name: "Five Second Rule",
    description: "Quick-fire 5-second countdown for rapid response games",
    icon: Zap,
    path: "/timers/games/five-second-rule",
    color: "from-red-400 to-orange-600",
    bgColor: "bg-red-50",
  },
];

export default function GameTimers() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
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
            Fun & Games
          </h1>
          <p className="text-xl text-gray-600">
            Timers designed to make your games more exciting and fair
          </p>
        </motion.div>

        {/* Timer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gameTimers.map((timer, index) => {
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
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-md">
            <Gamepad2 className="w-5 h-5 text-purple-500" />
            <span className="text-gray-700">
              Perfect for board games, party games, and family fun
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
