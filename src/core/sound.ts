import { useSettings } from "./settings";

/**
 * Tiny Web Audio synth — no audio files to download, works offline.
 * `play("chime")`, `play("tick")`, `alarm()`.
 */
export type SoundName = "beep" | "soft" | "chime" | "go" | "tick" | "tap" | "pop" | "alarm";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Browsers only allow audio after a user gesture: warm up on the first one.
if (typeof window !== "undefined") {
  const unlock = () => audio();
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  dur: number,
  { type = "sine", gain = 0.3, slideTo }: { type?: OscillatorType; gain?: number; slideTo?: number } = {},
) {
  const { volume } = useSettings.getState();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * volume), start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

export function play(name: SoundName) {
  if (useSettings.getState().muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  switch (name) {
    case "tick":
      tone(ac, 1800, t, 0.03, { type: "square", gain: 0.05 });
      break;
    case "tap":
      tone(ac, 520, t, 0.06, { type: "triangle", gain: 0.25, slideTo: 380 });
      break;
    case "pop":
      tone(ac, 300, t, 0.12, { type: "sine", gain: 0.35, slideTo: 900 });
      break;
    case "beep":
      tone(ac, 880, t, 0.18, { type: "square", gain: 0.12 });
      break;
    case "soft":
      tone(ac, 528, t, 0.9, { gain: 0.22 });
      tone(ac, 792, t + 0.02, 0.7, { gain: 0.08 });
      break;
    case "go":
      tone(ac, 660, t, 0.12, { type: "square", gain: 0.12 });
      tone(ac, 990, t + 0.13, 0.25, { type: "square", gain: 0.14 });
      break;
    case "chime":
      [784, 988, 1175, 1568].forEach((f, i) => tone(ac, f, t + i * 0.12, 1.1, { type: "triangle", gain: 0.2 }));
      break;
    case "alarm":
      for (let r = 0; r < 3; r++) {
        [1046, 1318, 1568, 1318].forEach((f, i) =>
          tone(ac, f, t + r * 0.9 + i * 0.11, 0.22, { type: "square", gain: 0.12 }),
        );
      }
      break;
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
