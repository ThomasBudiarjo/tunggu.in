import type { Segment } from "../../core/engine";

export type PresetId = "25/5" | "50/10" | "52/17" | "90/20";

export interface Preset {
  id: PresetId;
  emoji: string;
  name: string;
  focus: number; // minutes
  rest: number; // minutes
  /** Long break length (minutes) and how many sessions between them. */
  long?: { minutes: number; every: number };
  blurb: string;
}

export const PRESETS: Preset[] = [
  {
    id: "25/5",
    emoji: "🍅",
    name: "Pomodoro",
    focus: 25,
    rest: 5,
    long: { minutes: 15, every: 4 },
    blurb: "Klasik. Istirahat panjang 15 mnt tiap 4 sesi.",
  },
  { id: "50/10", emoji: "☕", name: "Santai", focus: 50, rest: 10, blurb: "Lebih lama nyemplung, rehatnya juga lebih lega." },
  { id: "52/17", emoji: "📈", name: "Ala riset", focus: 52, rest: 17, blurb: "Ritme orang paling produktif versi riset DeskTime." },
  { id: "90/20", emoji: "🧠", name: "Deep work", focus: 90, rest: 20, blurb: "Satu siklus ultradian penuh. Buat kerjaan berat." },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];

const REST_NOTES = [
  "Berdiri, minum, lihat jauh 20 detik.",
  "Regangkan leher & bahu. Jangan buka medsos dulu 😉",
  "Isi botol minum, jalan bentar.",
  "Tutup mata, tarik napas panjang 3 kali.",
];

export function buildSegments(preset: Preset, sessions: number, task: string): Segment[] {
  const n = Math.max(1, Math.min(8, Math.round(sessions)));
  const segs: Segment[] = [];
  for (let i = 0; i < n; i++) {
    segs.push({
      label: n > 1 ? `Fokus ${i + 1}/${n}` : "Fokus",
      kind: "focus",
      seconds: preset.focus * 60,
      cue: "go",
      note: task ? `Lanjut: ${task}` : "HP jauhin, satu tugas aja.",
    });
    if (i === n - 1) break; // no trailing break: the session ends on focus
    const isLong = !!preset.long && (i + 1) % preset.long.every === 0;
    segs.push(
      isLong
        ? {
            label: "Istirahat panjang",
            kind: "long",
            seconds: preset.long!.minutes * 60,
            cue: "chime",
            countdown: true,
            note: "Jalan-jalan, makan camilan, jauhi layar.",
          }
        : {
            label: "Istirahat",
            kind: "rest",
            seconds: preset.rest * 60,
            cue: "chime",
            countdown: true,
            note: REST_NOTES[i % REST_NOTES.length],
          },
    );
  }
  return segs;
}

/** "16:45" — local wall-clock time, always with a colon. */
export function clockAt(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Local calendar day key, e.g. "2026-10-22". */
export function dayKey(ms = Date.now()) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
