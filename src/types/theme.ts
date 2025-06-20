export interface TimerTheme {
  id: string;
  name: string;
  category: TimerCategory;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  animations: {
    timerPulse?: boolean;
    progressStyle: "circular" | "linear" | "dots";
    completionAnimation: string;
  };
  sounds: {
    start: string;
    tick?: string;
    warning?: string;
    complete: string;
  };
}

export type TimerCategory = "kitchen" | "fitness" | "productivity" | "games";

export interface SoundPreset {
  id: string;
  name: string;
  category: TimerCategory;
  files: {
    start: string;
    tick?: string;
    warning?: string;
    complete: string;
  };
}
