import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface TimerDef {
  /** Also the URL slug: tunggu.in/<id> */
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  /** Loud accent colour for the card and the page. */
  accent: string;
  /** Text colour that reads well on `accent`. */
  accentInk: string;
  /** What it's actually for — shown on the home card. */
  blurb: string;
  Page: LazyExoticComponent<ComponentType>;
}

export const TIMERS: TimerDef[] = [
  {
    id: "timer",
    name: "Timer Bebas",
    tagline: "Hitung mundur apa aja",
    emoji: "⏳",
    accent: "#4cc9f0",
    accentInk: "#10202b",
    blurb: "Mie instan, masker wajah, parkir — set, mulai, lupakan.",
    Page: lazy(() => import("./timer")),
  },
  {
    id: "fokus",
    name: "Fokus",
    tagline: "Pomodoro yang numbuhin pohon",
    emoji: "🌱",
    accent: "#7bd88f",
    accentInk: "#0f2414",
    blurb: "25/5, 50/10, 52/17 atau 90 menit deep work. Siklus otomatis.",
    Page: lazy(() => import("./fokus")),
  },
  {
    id: "interval",
    name: "Interval",
    tagline: "HIIT, Tabata, EMOM",
    emoji: "🔥",
    accent: "#ff5a36",
    accentInk: "#2a0d05",
    blurb: "Kerja–istirahat berulang dengan hitung 3-2-1 yang kenceng.",
    Page: lazy(() => import("./interval")),
  },
  {
    id: "napas",
    name: "Napas",
    tagline: "Tarik… tahan… buang",
    emoji: "🫧",
    accent: "#b69cff",
    accentInk: "#1b1235",
    blurb: "Box breathing, 4-7-8, dan napas koheren buat nenangin diri.",
    Page: lazy(() => import("./napas")),
  },
  {
    id: "telur",
    name: "Telur Rebus",
    tagline: "Kuning telur sesuai selera",
    emoji: "🥚",
    accent: "#ffd23f",
    accentInk: "#2b2100",
    blurb: "Hitung waktu dari tingkat matang, ukuran, dan suhu telur.",
    Page: lazy(() => import("./telur")),
  },
  {
    id: "seduh",
    name: "Seduh",
    tagline: "Kopi & teh, langkah demi langkah",
    emoji: "☕",
    accent: "#d9a46b",
    accentInk: "#2a1709",
    blurb: "V60, French press, tubruk, teh hijau — tiap tuangan dipandu.",
    Page: lazy(() => import("./seduh")),
  },
  {
    id: "tidur",
    name: "Tidur Siang",
    tagline: "Power nap anti-pusing",
    emoji: "🌙",
    accent: "#5b6cff",
    accentInk: "#ffffff",
    blurb: "Sudah dihitung waktu buat terlelap, bangun sebelum tidur dalam.",
    Page: lazy(() => import("./tidur")),
  },
  {
    id: "giliran",
    name: "Jam Giliran",
    tagline: "Catur & board game",
    emoji: "♟️",
    accent: "#ff7eb6",
    accentInk: "#2e0a1b",
    blurb: "2–6 pemain, tap untuk ganti giliran, bonus detik per langkah.",
    Page: lazy(() => import("./giliran")),
  },
  {
    id: "stopwatch",
    name: "Stopwatch",
    tagline: "Hitung maju + lap",
    emoji: "⏱️",
    accent: "#3ddbb5",
    accentInk: "#062019",
    blurb: "Catat lap, lihat lap tercepat & terlambat sekilas.",
    Page: lazy(() => import("./stopwatch")),
  },
  {
    id: "acara",
    name: "Hitung Mundur Acara",
    tagline: "Berapa hari lagi?",
    emoji: "🎆",
    accent: "#ff9f1c",
    accentInk: "#2b1600",
    blurb: "Lebaran, ulang tahun, deadline — simpan banyak acara sekaligus.",
    Page: lazy(() => import("./acara")),
  },
];

export const timerById = (id: string) => TIMERS.find((t) => t.id === id);
