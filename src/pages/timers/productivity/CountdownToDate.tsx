import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Plus, Trash2, PartyPopper } from "lucide-react";
import { cn } from "../../../utils/cn";

interface SavedCountdown {
  id: string;
  name: string;
  targetDate: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function CountdownToDate() {
  const [eventName, setEventName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [savedCountdowns, setSavedCountdowns] = useState<SavedCountdown[]>(
    () => {
      const saved = localStorage.getItem("savedCountdowns");
      return saved ? JSON.parse(saved) : [];
    }
  );
  const [activeCountdown, setActiveCountdown] = useState<SavedCountdown | null>(
    null
  );
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!activeCountdown) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(activeCountdown.targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsCompleted(true);
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
        });
        return;
      }

      setIsCompleted(false);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        total: difference,
      });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [activeCountdown]);

  const handleSaveCountdown = () => {
    if (!eventName || !targetDate) return;

    const newCountdown: SavedCountdown = {
      id: Date.now().toString(),
      name: eventName,
      targetDate,
    };

    const updated = [...savedCountdowns, newCountdown];
    setSavedCountdowns(updated);
    localStorage.setItem("savedCountdowns", JSON.stringify(updated));

    setActiveCountdown(newCountdown);
    setEventName("");
    setTargetDate("");
  };

  const handleDeleteCountdown = (id: string) => {
    const updated = savedCountdowns.filter((c) => c.id !== id);
    setSavedCountdowns(updated);
    localStorage.setItem("savedCountdowns", JSON.stringify(updated));

    if (activeCountdown?.id === id) {
      setActiveCountdown(null);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Countdown to Date
            </h1>
            <p className="text-gray-600">Count down to your special moments</p>
          </div>

          {/* Create New Countdown */}
          {!activeCountdown && (
            <div className="mb-8 p-6 bg-purple-50 rounded-2xl">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Create New Countdown
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Birthday, Anniversary, Vacation..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveCountdown}
                  disabled={!eventName || !targetDate}
                  className={cn(
                    "w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2",
                    eventName && targetDate
                      ? "bg-purple-500 hover:bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Plus className="w-5 h-5" />
                  Start Countdown
                </motion.button>
              </div>
            </div>
          )}

          {/* Active Countdown Display */}
          {activeCountdown && (
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.div
                  key="completed"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-center py-12"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="inline-block mb-6"
                  >
                    <PartyPopper className="w-24 h-24 text-purple-500" />
                  </motion.div>
                  <h2 className="text-4xl font-bold text-purple-600 mb-2">
                    {activeCountdown.name}
                  </h2>
                  <p className="text-2xl text-gray-600">Has Arrived! 🎉</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveCountdown(null)}
                    className="mt-8 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold"
                  >
                    Create New Countdown
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="counting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-purple-600 mb-2">
                      {activeCountdown.name}
                    </h2>
                    <p className="text-gray-500">
                      {new Date(activeCountdown.targetDate).toLocaleString()}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-6 text-center"
                    >
                      <div className="text-4xl md:text-5xl font-bold text-purple-800">
                        {timeRemaining.days}
                      </div>
                      <div className="text-sm text-purple-600 mt-2">
                        {timeRemaining.days === 1 ? "Day" : "Days"}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl p-6 text-center"
                    >
                      <div className="text-4xl md:text-5xl font-bold text-pink-800">
                        {timeRemaining.hours}
                      </div>
                      <div className="text-sm text-pink-600 mt-2">
                        {timeRemaining.hours === 1 ? "Hour" : "Hours"}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 text-center"
                    >
                      <div className="text-4xl md:text-5xl font-bold text-blue-800">
                        {timeRemaining.minutes}
                      </div>
                      <div className="text-sm text-blue-600 mt-2">
                        {timeRemaining.minutes === 1 ? "Minute" : "Minutes"}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-6 text-center"
                    >
                      <div className="text-4xl md:text-5xl font-bold text-green-800">
                        {timeRemaining.seconds}
                      </div>
                      <div className="text-sm text-green-600 mt-2">
                        {timeRemaining.seconds === 1 ? "Second" : "Seconds"}
                      </div>
                    </motion.div>
                  </div>

                  <div className="text-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveCountdown(null)}
                      className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold"
                    >
                      Back to List
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Saved Countdowns List */}
          {!activeCountdown && savedCountdowns.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Saved Countdowns
              </h2>
              <div className="space-y-3">
                {savedCountdowns.map((countdown) => (
                  <motion.div
                    key={countdown.id}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setActiveCountdown(countdown)}
                    >
                      <h3 className="font-semibold text-gray-800">
                        {countdown.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(countdown.targetDate).toLocaleDateString()}
                        <Clock className="w-4 h-4 ml-2" />
                        {new Date(countdown.targetDate).toLocaleTimeString()}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteCountdown(countdown.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
