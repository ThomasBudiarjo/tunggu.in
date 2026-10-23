import type { Segment } from "../../core/engine";

export type DonenessId = "cair" | "jammy" | "lembut" | "matang" | "keras";
export type SizeId = "S" | "M" | "L" | "XL";
export type TempId = "kulkas" | "ruang";

export interface Doneness {
  id: DonenessId;
  name: string;
  emoji: string;
  /** Large egg, from the fridge, into already-boiling water. */
  base: number;
  desc: string;
  /** Yolk colour for the little swatch in the picker. */
  swatch: string;
  /** Shorter ice bath for soft eggs. */
  ice: number;
}

export const DONENESS: Doneness[] = [
  { id: "cair", name: "Kuning cair", emoji: "🍞", base: 360, ice: 120, swatch: "#ff8a1c", desc: "Meleleh, buat cocol roti" },
  { id: "jammy", name: "Setengah matang", emoji: "🍜", base: 420, ice: 120, swatch: "#ff9d21", desc: "Kental kayak selai, khas ramen" },
  { id: "lembut", name: "Matang lembut", emoji: "🥗", base: 510, ice: 180, swatch: "#ffb733", desc: "Padat tapi masih lembap" },
  { id: "matang", name: "Matang", emoji: "🍱", base: 600, ice: 180, swatch: "#ffcd4f", desc: "Padat, pas buat bekal" },
  { id: "keras", name: "Matang keras", emoji: "🥪", base: 720, ice: 180, swatch: "#f3dc7e", desc: "Kering & remah, buat isian" },
];

export const SIZES: { id: SizeId; label: string; hint: string; delta: number }[] = [
  { id: "S", label: "S", hint: "< 50 g", delta: -45 },
  { id: "M", label: "M", hint: "50–57 g", delta: -20 },
  { id: "L", label: "L", hint: "58–65 g", delta: 0 },
  { id: "XL", label: "XL", hint: "> 65 g", delta: 40 },
];

export const TEMPS: { id: TempId; label: string; hint: string; delta: number }[] = [
  { id: "kulkas", label: "❄️ Dari kulkas", hint: "dingin", delta: 0 },
  { id: "ruang", label: "🌤️ Suhu ruang", hint: "−1 mnt", delta: -60 },
];

export const donenessById = (id: DonenessId) => DONENESS.find((d) => d.id === id) ?? DONENESS[1];

export interface Plan {
  done: Doneness;
  sizeDelta: number;
  tempDelta: number;
  cook: number;
  ice: number;
  total: number;
}

export function makePlan(doneId: DonenessId, size: SizeId, temp: TempId, iceOn: boolean): Plan {
  const done = donenessById(doneId);
  const sizeDelta = SIZES.find((s) => s.id === size)?.delta ?? 0;
  const tempDelta = TEMPS.find((t) => t.id === temp)?.delta ?? 0;
  // Never below 3 minutes even with odd combos.
  const cook = Math.max(180, done.base + sizeDelta + tempDelta);
  const ice = iceOn ? done.ice : 0;
  return { done, sizeDelta, tempDelta, cook, ice, total: cook + ice };
}

export function planSegments(plan: Plan): Segment[] {
  const segs: Segment[] = [
    {
      label: "Rebus",
      kind: "cook",
      seconds: plan.cook,
      cue: "none",
      countdown: true,
      note: "Api sedang, air tetap mendidih pelan",
    },
  ];
  if (plan.ice > 0) {
    segs.push({
      label: "Rendam air es",
      kind: "ice",
      seconds: plan.ice,
      cue: "chime",
      countdown: true,
      note: "Pindahkan telur ke air es",
    });
  }
  return segs;
}

/** Stored in run.meta so the animation knows what the running egg is. */
export interface EggMeta {
  done: DonenessId;
  /** Cook seconds planned at start (before any "+1 mnt"). */
  cook: number;
}

export const STEPS: { title: string; body: string }[] = [
  { title: "Didihkan air dulu", body: "Cukup sampai telur terendam ±2 cm. Baru masukin telur pas sudah mendidih." },
  { title: "Turunkan pelan-pelan", body: "Pakai sendok sayur biar cangkang nggak retak, lalu langsung tekan Mulai." },
  { title: "Api sedang", body: "Tetap mendidih tapi nggak bergolak heboh — telur nggak saling tabrak." },
  { title: "Langsung ke air es", body: "Matangnya berhenti di titik yang pas dan kulit ari gampang lepas." },
  { title: "Kupas dari bagian tumpul", body: "Ada kantong udara di situ. Kupas di bawah air mengalir." },
];
