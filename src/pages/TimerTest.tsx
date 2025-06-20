import React, { useState } from "react";
import {
  Timer,
  CompactTimer,
  FullScreenTimer,
} from "../components/timers/Timer";
import { TimerDisplay } from "../components/timers/TimerDisplay";
import {
  TimerProgress,
  SegmentedProgress,
} from "../components/timers/TimerProgress";
import {
  TimerPresets,
  WorkoutPresets,
  ProductivityPresets,
} from "../components/timers/TimerPresets";
import { IntervalList } from "../components/timers/IntervalDisplay";
import { motion } from "framer-motion";
import type { TimerStage } from "../types/timer";

const TimerTest: React.FC = () => {
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(60);

  // Example interval stages for testing
  const workoutStages: TimerStage[] = [
    { id: "warmup", name: "Warm Up", duration: 30, type: "prepare" },
    { id: "work1", name: "High Intensity", duration: 20, type: "work" },
    { id: "rest1", name: "Rest", duration: 10, type: "rest" },
    { id: "work2", name: "High Intensity", duration: 20, type: "work" },
    { id: "rest2", name: "Rest", duration: 10, type: "rest" },
    { id: "work3", name: "High Intensity", duration: 20, type: "work" },
    { id: "cooldown", name: "Cool Down", duration: 30, type: "rest" },
  ];

  const pomodoroStages: TimerStage[] = [
    { id: "work1", name: "Focus Time", duration: 1500, type: "work" },
    { id: "break1", name: "Short Break", duration: 300, type: "break" },
    { id: "work2", name: "Focus Time", duration: 1500, type: "work" },
    { id: "break2", name: "Short Break", duration: 300, type: "break" },
    { id: "work3", name: "Focus Time", duration: 1500, type: "work" },
    { id: "break3", name: "Short Break", duration: 300, type: "break" },
    { id: "work4", name: "Focus Time", duration: 1500, type: "work" },
    { id: "break4", name: "Long Break", duration: 900, type: "break" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Timer Components Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing all timer components and functionality
          </p>
        </motion.div>

        {/* Basic Timer Examples */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Basic Timers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Countdown Timer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <Timer
                title="Countdown Timer"
                mode="countdown"
                duration={selectedDuration}
                onComplete={() => console.log("Countdown completed!")}
                onDurationChange={setSelectedDuration}
              />
            </div>

            {/* Stopwatch */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <Timer
                title="Stopwatch"
                mode="stopwatch"
                showPresets={false}
                progressType="linear"
              />
            </div>

            {/* Compact Timer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-center">
                Compact Timer
              </h3>
              <CompactTimer mode="countdown" duration={300} />
            </div>
          </div>
        </section>

        {/* Interval Timers */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Interval Timers
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* HIIT Timer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <Timer
                title="HIIT Workout"
                intervals={workoutStages.map((stage) => ({
                  duration: stage.duration,
                  type: stage.type as "work" | "rest",
                }))}
                progressType="circular"
                onComplete={() => console.log("Workout completed!")}
              />
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                  Workout Stages:
                </h4>
                <IntervalList stages={workoutStages} />
              </div>
            </div>

            {/* Pomodoro Timer */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <Timer
                title="Pomodoro Timer"
                intervals={pomodoroStages.map((stage) => ({
                  duration: stage.duration,
                  type: stage.type as "work" | "rest",
                }))}
                progressType="linear"
                size="md"
                onComplete={() => console.log("Pomodoro session completed!")}
              />
            </div>
          </div>
        </section>

        {/* Component Showcase */}
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            Individual Components
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Timer Display Variants */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg space-y-4">
              <h3 className="text-lg font-semibold mb-4">
                Timer Display Sizes
              </h3>
              <TimerDisplay seconds={125} size="sm" />
              <TimerDisplay seconds={125} size="md" />
              <TimerDisplay seconds={125} size="lg" />
              <TimerDisplay seconds={3665} size="xl" format="hh:mm:ss" />
            </div>

            {/* Progress Indicators */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg space-y-6">
              <h3 className="text-lg font-semibold mb-4">
                Progress Indicators
              </h3>
              <div className="flex justify-around">
                <TimerProgress
                  progress={25}
                  type="circular"
                  size="sm"
                  showPercentage
                />
                <TimerProgress
                  progress={50}
                  type="circular"
                  size="md"
                  showPercentage
                />
                <TimerProgress
                  progress={75}
                  type="circular"
                  size="lg"
                  showPercentage
                />
              </div>
              <TimerProgress
                progress={60}
                type="linear"
                size="lg"
                showPercentage
              />
              <SegmentedProgress
                segments={4}
                currentSegment={2}
                segmentProgress={50}
              />
            </div>

            {/* Preset Buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg space-y-6">
              <h3 className="text-lg font-semibold mb-4">Timer Presets</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Default Presets
                  </p>
                  <TimerPresets onSelect={(s) => console.log("Selected:", s)} />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Workout Presets
                  </p>
                  <WorkoutPresets
                    onSelect={(s) => console.log("Selected:", s)}
                    variant="pills"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Productivity Presets
                  </p>
                  <ProductivityPresets
                    onSelect={(s) => console.log("Selected:", s)}
                    variant="minimal"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full Screen Demo Button */}
        <section className="text-center">
          <button
            onClick={() => setShowFullScreen(true)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Launch Full Screen Timer
          </button>
        </section>

        {/* Full Screen Timer */}
        {showFullScreen && (
          <FullScreenTimer
            mode="countdown"
            duration={300}
            onComplete={() => {
              console.log("Full screen timer completed!");
              setShowFullScreen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TimerTest;
