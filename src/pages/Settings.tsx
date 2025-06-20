import React from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useHistoryStore } from "../stores/historyStore";
import { soundManager } from "../services/soundManager";
import { notificationService } from "../services/notificationService";
import { cn } from "../utils/cn";

export function Settings() {
  const {
    soundEnabled,
    volume,
    notificationsEnabled,
    vibrationEnabled,
    theme,
    toggleSound,
    toggleNotifications,
    toggleVibration,
    setVolume,
    setTheme,
  } = useSettingsStore();

  const { clearHistory } = useHistoryStore();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled && notificationService.isSupported()) {
      const granted = await notificationService.requestPermission();
      if (granted) {
        toggleNotifications();
      }
    } else {
      toggleNotifications();
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all timer history?")) {
      clearHistory();
      notificationService.showInAppNotification(
        "Timer history cleared",
        "success"
      );
    }
  };

  const handleTestSound = () => {
    soundManager.play("timer-complete");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Settings
      </h1>

      {/* Sound Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Sound
        </h2>

        <div className="flex items-center justify-between">
          <label
            htmlFor="sound-toggle"
            className="text-gray-700 dark:text-gray-300"
          >
            Enable Sound
          </label>
          <button
            id="sound-toggle"
            onClick={toggleSound}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              soundEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                soundEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {soundEnabled && (
          <>
            <div className="space-y-2">
              <label
                htmlFor="volume-slider"
                className="text-gray-700 dark:text-gray-300"
              >
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                id="volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleTestSound}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Test Sound
            </button>
          </>
        )}
      </section>

      {/* Notification Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Notifications
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="notification-toggle"
              className="text-gray-700 dark:text-gray-300"
            >
              Browser Notifications
            </label>
            {notificationService.isSupported() && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Status: {notificationService.getPermissionStatus()}
              </p>
            )}
          </div>
          <button
            id="notification-toggle"
            onClick={handleNotificationToggle}
            disabled={!notificationService.isSupported()}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              notificationsEnabled
                ? "bg-blue-600"
                : "bg-gray-200 dark:bg-gray-700",
              !notificationService.isSupported() &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                notificationsEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="vibration-toggle"
            className="text-gray-700 dark:text-gray-300"
          >
            Vibration (Mobile)
          </label>
          <button
            id="vibration-toggle"
            onClick={toggleVibration}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              vibrationEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                vibrationEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </section>

      {/* Theme Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Appearance
        </h2>

        <div className="space-y-2">
          <label className="text-gray-700 dark:text-gray-300">Theme</label>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((themeOption) => (
              <button
                key={themeOption}
                onClick={() => setTheme(themeOption)}
                className={cn(
                  "px-4 py-2 rounded-md border-2 transition-all capitalize",
                  theme === themeOption
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                )}
              >
                {themeOption === "light" && "☀️ "}
                {themeOption === "dark" && "🌙 "}
                {themeOption === "system" && "💻 "}
                {themeOption}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Data Management
        </h2>

        <div className="space-y-4">
          <button
            onClick={handleClearHistory}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Clear Timer History
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This will permanently delete all your timer history data.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          About
        </h2>

        <div className="space-y-2 text-gray-700 dark:text-gray-300">
          <p>
            <strong>Tunggu.in</strong> - Your versatile timer companion
          </p>
          <p className="text-sm">Version 1.0.0</p>
          <p className="text-sm">
            A collection of specialized timers for cooking, fitness,
            productivity, and games.
          </p>
          <div className="pt-4 space-y-1 text-sm">
            <p>Made with ❤️ using React, TypeScript, and Tailwind CSS</p>
            <p className="text-gray-500 dark:text-gray-400">
              © 2025 Tunggu.in. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
