import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Statistics, TimeRange } from "../types/settings";
import type { TimerType, TimerSession } from "../types/timer";

interface HistoryStore {
  // State
  sessions: TimerSession[];

  // Actions
  addSession: (session: TimerSession) => void;
  clearHistory: () => void;
  deleteSession: (sessionId: string) => void;

  // Selectors
  getSessionsByType: (type: TimerType) => TimerSession[];
  getRecentSessions: (limit?: number) => TimerSession[];
  getStatistics: (timeRange?: TimeRange) => Statistics;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) => {
        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, 1000), // Keep last 1000 sessions
        }));
      },

      clearHistory: () => {
        set({ sessions: [] });
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }));
      },

      getSessionsByType: (type) => {
        return get().sessions.filter((session) => session.timerType === type);
      },

      getRecentSessions: (limit = 10) => {
        return get().sessions.slice(0, limit);
      },

      getStatistics: (timeRange = "all") => {
        const sessions = get().sessions;
        const now = Date.now();
        const timeRanges = {
          today: 24 * 60 * 60 * 1000,
          week: 7 * 24 * 60 * 60 * 1000,
          month: 30 * 24 * 60 * 60 * 1000,
          year: 365 * 24 * 60 * 60 * 1000,
          all: Infinity,
        };

        const cutoff = now - timeRanges[timeRange];
        const filteredSessions = sessions.filter(
          (session) => session.completedAt >= cutoff
        );

        const sessionsByType: Record<string, number> = {};
        const timeByType: Record<string, number> = {};
        let totalTime = 0;
        let completedSessions = 0;

        filteredSessions.forEach((session) => {
          const type = session.timerType;
          sessionsByType[type] = (sessionsByType[type] || 0) + 1;
          timeByType[type] = (timeByType[type] || 0) + session.duration;
          totalTime += session.duration;
          if (session.wasCompleted) completedSessions++;
        });

        // Find favorite timer
        let favoriteTimer = "";
        let maxSessions = 0;
        Object.entries(sessionsByType).forEach(([type, count]) => {
          if (count > maxSessions) {
            maxSessions = count;
            favoriteTimer = type;
          }
        });

        // Calculate streak days
        const sortedSessions = [...filteredSessions].sort(
          (a, b) => b.completedAt - a.completedAt
        );
        let streakDays = 0;
        let currentDate = new Date();

        for (const session of sortedSessions) {
          const sessionDate = new Date(session.completedAt);
          const dayDiff = Math.floor(
            (currentDate.getTime() - sessionDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (dayDiff === streakDays) {
            streakDays++;
            currentDate = new Date(sessionDate);
            currentDate.setDate(currentDate.getDate() - 1);
          } else if (dayDiff > streakDays) {
            break;
          }
        }

        return {
          totalSessions: filteredSessions.length,
          totalTime,
          completedSessions,
          abandonedSessions: filteredSessions.length - completedSessions,
          favoriteTimer,
          streakDays,
          lastSessionDate: filteredSessions[0]?.completedAt || 0,
          sessionsByType,
          timeByType,
        };
      },
    }),
    {
      name: "tunggu-history",
    }
  )
);
