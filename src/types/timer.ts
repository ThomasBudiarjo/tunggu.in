export type TimerType =
  | "egg-timer"
  | "steak-timer"
  | "coffee-timer"
  | "tea-timer"
  | "dough-proofing"
  | "pomodoro"
  | "hiit"
  | "box-breathing"
  | "meditation"
  | "power-nap"
  | "52-17"
  | "stopwatch"
  | "countdown"
  | "quick-burst"
  | "board-game"
  | "five-second-rule";

export type TimerCategory = "kitchen" | "fitness" | "productivity" | "games";

export interface TimerStage {
  id: string;
  name: string;
  duration: number; // in seconds
  type: "work" | "rest" | "break" | "prepare";
}

export interface Timer {
  id: string;
  type: TimerType;
  name: string;
  category: TimerCategory;
  duration: number; // total duration in seconds
  elapsed: number; // elapsed time in seconds
  remaining: number; // remaining time in seconds
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  stages?: TimerStage[];
  currentStageIndex?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface TimerConfig {
  type: TimerType;
  name: string;
  category: TimerCategory;
  duration: number;
  stages?: TimerStage[];
  theme?: string;
  sound?: string;
}

export interface TimerPreset {
  id: string;
  name: string;
  duration: number;
  stages?: TimerStage[];
}

export interface TimerSession {
  id: string;
  timerType: TimerType;
  duration: number;
  completedAt: number;
  wasCompleted: boolean;
  stages?: StageCompletion[];
}

export interface StageCompletion {
  stageId: string;
  duration: number;
  completed: boolean;
}
