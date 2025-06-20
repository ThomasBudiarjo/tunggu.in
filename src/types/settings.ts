export interface Settings {
  theme: "light" | "dark" | "system";
  soundEnabled: boolean;
  volume: number; // 0-1
  notificationsEnabled: boolean;
  vibrationEnabled: boolean;
  defaultTimerSettings: Record<string, TimerDefaultSettings>;
}

export interface TimerDefaultSettings {
  duration?: number;
  stages?: Array<{
    name: string;
    duration: number;
    type: "work" | "rest" | "break" | "prepare";
  }>;
  sound?: string;
}

export interface Statistics {
  totalSessions: number;
  totalTime: number; // in seconds
  completedSessions: number;
  abandonedSessions: number;
  favoriteTimer: string;
  streakDays: number;
  lastSessionDate: number;
  sessionsByType: Record<string, number>;
  timeByType: Record<string, number>;
}

export type TimeRange = "today" | "week" | "month" | "year" | "all";
