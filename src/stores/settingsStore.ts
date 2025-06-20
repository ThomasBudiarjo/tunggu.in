import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Settings } from "../types/settings";

interface SettingsStore extends Settings {
  // Actions
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  toggleSound: () => void;
  toggleNotifications: () => void;
  toggleVibration: () => void;
  setVolume: (volume: number) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  soundEnabled: true,
  volume: 0.7,
  notificationsEnabled: false,
  vibrationEnabled: true,
  defaultTimerSettings: {},
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }));
      },

      resetSettings: () => {
        set(DEFAULT_SETTINGS);
      },

      toggleSound: () => {
        set((state) => ({ soundEnabled: !state.soundEnabled }));
      },

      toggleNotifications: () => {
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled }));
      },

      toggleVibration: () => {
        set((state) => ({ vibrationEnabled: !state.vibrationEnabled }));
      },

      setVolume: (volume) => {
        set({ volume: Math.max(0, Math.min(1, volume)) });
      },

      setTheme: (theme) => {
        set({ theme });
      },
    }),
    {
      name: "tunggu-settings",
    }
  )
);
