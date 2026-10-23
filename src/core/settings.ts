import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePref = "light" | "dark" | "system";

interface SettingsState {
  muted: boolean;
  volume: number; // 0..1
  theme: ThemePref;
  notify: boolean;
  toggleMute: () => void;
  setVolume: (v: number) => void;
  cycleTheme: () => void;
  setNotify: (v: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      muted: false,
      volume: 0.7,
      theme: "system",
      notify: false,
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setVolume: (volume) => set({ volume }),
      cycleTheme: () =>
        set((s) => ({
          theme: s.theme === "system" ? "dark" : s.theme === "dark" ? "light" : "system",
        })),
      setNotify: (notify) => set({ notify }),
    }),
    { name: "tunggu-settings", version: 1 },
  ),
);

const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

export function isDark() {
  const { theme } = useSettings.getState();
  return theme === "dark" || (theme === "system" && !!media?.matches);
}

function applyTheme() {
  const dark = isDark();
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#14101b" : "#fff4e2");
}

if (typeof window !== "undefined") {
  applyTheme();
  useSettings.subscribe(applyTheme);
  media?.addEventListener("change", applyTheme);
}
