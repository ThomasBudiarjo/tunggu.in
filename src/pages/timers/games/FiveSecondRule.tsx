import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  AlertCircle,
} from "lucide-react";
import { cn } from "../../../utils/cn";

const samplePrompts = [
  "Name 3 things you'd find in a kitchen",
  "Name 3 red fruits",
  "Name 3 countries in Europe",
  "Name 3 things you can do with a ball",
  "Name 3 animals that live in water",
  "Name 3 things you wear on your feet",
  "Name 3 pizza toppings",
  "Name 3 superhero powers",
  "Name 3 things that are cold",
  "Name 3 board games",
  "Name 3 things you do in the morning",
  "Name 3 yellow things",
  "Name 3 sports that use a ball",
  "Name 3 things found at a beach",
  "Name 3 desserts",
  "Name 3 things that fly",
  "Name 3 school subjects",
  "Name 3 things in your pocket/bag",
  "Name 3 green vegetables",
  "Name 3 things that make noise",
];

export default function FiveSecondRule() {
  const [timeLeft, setTimeLeft] = useState(5);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(samplePrompts[0]);
  const [showPrompt, setShowPrompt] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setShowTimeUp(true);
          if (soundEnabled) {
            // Play a simple beep sound using Web Audio API
            const audioContext = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = "square";
            gainNode.gain.value = 0.3;

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
          }
          return 0;
        }

        // Set urgent state when 2 seconds or less
        if (prev <= 3 && !isUrgent) {
          setIsUrgent(true);
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, soundEnabled, isUrgent]);

  const handleStart = () => {
    setTimeLeft(5);
    setIsRunning(true);
    setIsUrgent(false);
    setShowTimeUp(false);
    setShowPrompt(true);
  };

  const handleNewPrompt = () => {
    const currentIndex = samplePrompts.indexOf(currentPrompt);
    let newIndex = Math.floor(Math.random() * samplePrompts.length);

    // Ensure we don't get the same prompt twice in a row
    while (newIndex === currentIndex && samplePrompts.length > 1) {
      newIndex = Math.floor(Math.random() * samplePrompts.length);
    }

    setCurrentPrompt(samplePrompts[newIndex]);
    setTimeLeft(5);
    setIsRunning(false);
    setIsUrgent(false);
    setShowTimeUp(false);
  };

  const handleReset = () => {
    setTimeLeft(5);
    setIsRunning(false);
    setIsUrgent(false);
    setShowTimeUp(false);
  };

  return (
    <div
      className={cn(
        "min-h-screen transition-all duration-300 p-4",
        isUrgent
          ? "bg-gradient-to-br from-red-500 to-orange-600"
          : "bg-gradient-to-br from-blue-500 to-purple-600"
      )}
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={isUrgent ? { rotate: [0, -10, 10, -10, 0] } : {}}
              transition={{ duration: 0.3, repeat: isUrgent ? Infinity : 0 }}
              className="inline-block mb-4"
            >
              <Zap
                className={cn(
                  "w-12 h-12",
                  isUrgent ? "text-red-500" : "text-blue-500"
                )}
              />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              5 Second Rule
            </h1>
            <p className="text-gray-600">
              Think fast! Answer before time runs out!
            </p>
          </div>

          {/* Prompt Display */}
          <AnimatePresence mode="wait">
            {showPrompt && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "mb-8 p-6 rounded-2xl text-center",
                  isUrgent ? "bg-red-100" : "bg-blue-100"
                )}
              >
                <p
                  className={cn(
                    "text-xl md:text-2xl font-semibold",
                    isUrgent ? "text-red-800" : "text-blue-800"
                  )}
                >
                  {currentPrompt}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer Display */}
          <div className="mb-8 text-center">
            <AnimatePresence mode="wait">
              {showTimeUp ? (
                <motion.div
                  key="timeup"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="py-8"
                >
                  <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-4" />
                  <h2 className="text-4xl font-bold text-red-600">
                    TIME'S UP!
                  </h2>
                </motion.div>
              ) : (
                <motion.div
                  key="timer"
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: isUrgent ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: isUrgent ? Infinity : 0,
                  }}
                  className={cn(
                    "text-8xl md:text-9xl font-bold tabular-nums",
                    isUrgent ? "text-red-600" : "text-blue-600"
                  )}
                >
                  {timeLeft}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            {!isRunning && !showTimeUp && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6" />
                Start Timer
              </motion.button>
            )}

            {showTimeUp && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold shadow-lg flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-6 h-6" />
                  Try Again
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNewPrompt}
                  className="px-8 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-full font-semibold shadow-lg"
                >
                  New Prompt
                </motion.button>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "px-4 py-2 rounded-full flex items-center gap-2 transition-colors",
                soundEnabled
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-gray-100 text-gray-400"
              )}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-5 h-5" />
                  <span>Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-5 h-5" />
                  <span>Sound Off</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Instructions */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Answer the prompt within 5 seconds!</p>
            <p>Perfect for parties and quick thinking games.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
