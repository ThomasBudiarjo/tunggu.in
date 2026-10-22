import type { Cue, Segment } from "../../core/engine";

export type StepKind = "bloom" | "pour" | "wait" | "steep" | "stir" | "press" | "drip" | "settle";
export type Vessel = "v60" | "press" | "tubruk" | "aero" | "mug";
export type TeaStyle = "infuser" | "bag" | "loose";
export type KettleStyle = "goose" | "teko";

export interface Amounts {
  cups: number;
  /** Grams of coffee/tea (or tea bags for `doseUnit: "kantong"`). */
  dose: number;
  /** Millilitres (= grams) of water. */
  water: number;
}

export interface StepSpec {
  kind: StepKind;
  label: string;
  seconds: number;
  note: string;
  /** Fraction of the total water that is in the vessel when this step ends. */
  waterTo: number;
}

export interface Recipe {
  id: string;
  group: "kopi" | "teh";
  name: string;
  short: string;
  vessel: Vessel;
  tea?: TeaStyle;
  kettle: KettleStyle;
  dosePerCup: number;
  doseUnit?: "g" | "kantong";
  waterPerCup: number;
  temp: number;
  maxCups: number;
  ratio?: string;
  /** e.g. grind size for coffee, measuring hint for tea. */
  detailLabel: string;
  detail: string;
  tip: string;
  /** Shown when the brew is done. */
  done: string;
  /** Liquid colour from barely brewed → fully extracted. */
  colors: [string, string];
  steps: (a: Amounts) => StepSpec[];
}

const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);
/** Bigger batches need a little longer to pour. */
const pourScale = (cups: number, per = 0.25) => 1 + per * (cups - 1);

export const RECIPES: Recipe[] = [
  {
    id: "v60",
    group: "kopi",
    name: "V60",
    short: "Pour-over jernih & fruity",
    vessel: "v60",
    kettle: "goose",
    dosePerCup: 15,
    waterPerCup: 240,
    temp: 93,
    maxCups: 4,
    ratio: "1:16",
    detailLabel: "Gilingan",
    detail: "Sedang-halus, kayak garam dapur",
    tip: "Bilas kertas filter pakai air panas dulu biar nggak bau kertas.",
    done: "Angkat dripper, goyang server, tuang. Selamat ngopi!",
    colors: ["#b5773f", "#3a1f10"],
    steps: ({ cups, dose, water }) => {
      const k = pourScale(cups);
      const bloom = r5(dose * 2);
      const first = r5(water * 0.6);
      return [
        {
          kind: "bloom",
          label: "Bloom",
          seconds: 45,
          note: `Tuang ${bloom} g air, putar pelan sampai semua bubuk basah. Biarkan mengembang.`,
          waterTo: bloom / water,
        },
        {
          kind: "pour",
          label: "Tuang ke-1",
          seconds: Math.round(30 * k),
          note: `Tuang memutar dari tengah ke luar sampai ${first} g.`,
          waterTo: first / water,
        },
        { kind: "wait", label: "Jeda", seconds: 15, note: "Biarkan air turun sedikit dulu.", waterTo: first / water },
        {
          kind: "pour",
          label: "Tuang ke-2",
          seconds: Math.round(30 * k),
          note: `Tuang pelan sampai ${water} g, lalu goyang dripper sekali.`,
          waterTo: 1,
        },
        {
          kind: "drip",
          label: "Tetes",
          seconds: 60 + 15 * (cups - 1),
          note: "Biarkan menetes sampai habis. Bubuknya harus rata di dasar.",
          waterTo: 1,
        },
      ];
    },
  },
  {
    id: "press",
    group: "kopi",
    name: "French Press",
    short: "Body tebal, anti ribet",
    vessel: "press",
    kettle: "teko",
    dosePerCup: 17,
    waterPerCup: 250,
    temp: 95,
    maxCups: 4,
    ratio: "1:15",
    detailLabel: "Gilingan",
    detail: "Kasar, kayak gula pasir kasar",
    tip: "Kalau plunger seret, angkat sedikit lalu tekan lagi. Jangan dipaksa.",
    done: "Langsung tuang semua ke cangkir biar nggak kepahitan.",
    colors: ["#a2622f", "#3b2010"],
    steps: ({ cups, water }) => {
      const pour = Math.round(20 * pourScale(cups));
      return [
        {
          kind: "pour",
          label: "Tuang air",
          seconds: pour,
          note: `Tuang ${water} ml air sekaligus, pastikan semua bubuk basah.`,
          waterTo: 1,
        },
        {
          kind: "steep",
          label: "Rendam",
          seconds: 240 - pour,
          note: "Pasang tutup, plunger di atas. Jangan ditekan dulu!",
          waterTo: 1,
        },
        { kind: "stir", label: "Aduk", seconds: 15, note: "Pecahkan kerak di atas, aduk 3×, buang busanya.", waterTo: 1 },
        { kind: "press", label: "Tekan", seconds: 25, note: "Tekan plunger pelan & rata sampai mentok.", waterTo: 1 },
      ];
    },
  },
  {
    id: "tubruk",
    group: "kopi",
    name: "Kopi Tubruk",
    short: "Klasik, ampas di bawah",
    vessel: "tubruk",
    kettle: "teko",
    dosePerCup: 12,
    waterPerCup: 180,
    temp: 96,
    maxCups: 4,
    ratio: "1:15",
    detailLabel: "Gilingan",
    detail: "Halus. 12 g ≈ 2 sdm munjung",
    tip: "Air mendidih didiamkan ±30 detik dulu biar kopinya nggak gosong.",
    done: "Ampas sudah turun. Seruput pelan dari atas ya!",
    colors: ["#8a5226", "#2a160b"],
    steps: ({ cups, water }) => [
      {
        kind: "pour",
        label: "Tuang air",
        seconds: Math.round(15 * pourScale(cups, 0.2)),
        note: `Tuang ${water} ml air panas ke bubuk kopi (+ gula kalau suka).`,
        waterTo: 1,
      },
      { kind: "stir", label: "Aduk", seconds: 15, note: "Aduk sampai bubuk yang ngambang ikut tenggelam.", waterTo: 1 },
      {
        kind: "settle",
        label: "Ampas turun",
        seconds: 240,
        note: "Diamkan, jangan diaduk lagi biar ampasnya ngendap.",
        waterTo: 1,
      },
    ],
  },
  {
    id: "aero",
    group: "kopi",
    name: "AeroPress",
    short: "Terbalik, cepat & manis",
    vessel: "aero",
    kettle: "goose",
    dosePerCup: 15,
    waterPerCup: 220,
    temp: 85,
    maxCups: 1,
    ratio: "1:15",
    detailLabel: "Gilingan",
    detail: "Sedang-halus",
    tip: "AeroPress cuma muat 1 gelas sekali seduh. Bilas filter sebelum dipasang.",
    done: "Lepas tutup, dorong ampasnya ke tempat sampah. Nikmati!",
    colors: ["#a6683a", "#3d2211"],
    steps: ({ water }) => [
      {
        kind: "pour",
        label: "Tuang air",
        seconds: 15,
        note: `Posisi terbalik (plunger di bawah). Tuang ${water} g air.`,
        waterTo: 1,
      },
      { kind: "stir", label: "Aduk", seconds: 10, note: "Aduk 10× pelan.", waterTo: 1 },
      { kind: "steep", label: "Rendam", seconds: 65, note: "Pasang tutup + filter yang sudah dibilas.", waterTo: 1 },
      {
        kind: "press",
        label: "Balik & tekan",
        seconds: 30,
        note: "Balik ke atas cangkir, tekan pelan sampai bunyi desis.",
        waterTo: 1,
      },
    ],
  },
  {
    id: "hijau",
    group: "teh",
    name: "Teh Hijau",
    short: "Segar, jangan kepanasan",
    vessel: "mug",
    tea: "infuser",
    kettle: "teko",
    dosePerCup: 3,
    waterPerCup: 200,
    temp: 80,
    maxCups: 4,
    detailLabel: "Takaran",
    detail: "3 g ≈ 1 sdt daun per gelas",
    tip: "Kepanasan atau kelamaan = pahit. 80°C itu ±5 menit setelah mendidih.",
    done: "Angkat saringannya sekarang biar nggak pahit.",
    colors: ["#e6e39a", "#a3ad3a"],
    steps: ({ cups, water }) => {
      const pour = Math.round(10 * pourScale(cups, 0.2));
      return [
        { kind: "pour", label: "Tuang air", seconds: pour, note: `Tuang ${water} ml air 80°C, jangan yang mendidih.`, waterTo: 1 },
        { kind: "steep", label: "Seduh", seconds: 120 - pour, note: "Biarkan daun mekar pelan-pelan.", waterTo: 1 },
      ];
    },
  },
  {
    id: "hitam",
    group: "teh",
    name: "Teh Hitam",
    short: "Pekat, cocok pakai susu",
    vessel: "mug",
    tea: "bag",
    kettle: "teko",
    dosePerCup: 1,
    doseUnit: "kantong",
    waterPerCup: 250,
    temp: 95,
    maxCups: 4,
    detailLabel: "Takaran",
    detail: "1 kantong (±2 g) per gelas",
    tip: "Mau pakai susu? Tambah 1 menit biar rasanya tetap nendang.",
    done: "Angkat kantongnya, jangan diperas biar nggak sepet.",
    colors: ["#eeb468", "#8a3510"],
    steps: ({ cups, water }) => {
      const pour = Math.round(10 * pourScale(cups, 0.2));
      return [
        { kind: "pour", label: "Tuang air", seconds: pour, note: `Tuang ${water} ml air mendidih ke kantong teh.`, waterTo: 1 },
        { kind: "steep", label: "Seduh", seconds: 240 - pour, note: "Celup-celup sesekali biar rata.", waterTo: 1 },
      ];
    },
  },
  {
    id: "melati",
    group: "teh",
    name: "Teh Melati",
    short: "Tubruk wangi ala warung",
    vessel: "mug",
    tea: "loose",
    kettle: "teko",
    dosePerCup: 3,
    waterPerCup: 200,
    temp: 95,
    maxCups: 4,
    detailLabel: "Takaran",
    detail: "3 g ≈ 1 sdm teh tubruk",
    tip: "Teh tubruk paling enak pakai gula batu. Saring pakai saringan kecil.",
    done: "Saring & sajikan. Wangi melatinya mantap!",
    colors: ["#f2d78e", "#b8801f"],
    steps: ({ cups, water }) => {
      const pour = Math.round(10 * pourScale(cups, 0.2));
      return [
        { kind: "pour", label: "Tuang air", seconds: pour, note: `Tuang ${water} ml air mendidih ke daun teh.`, waterTo: 1 },
        { kind: "stir", label: "Aduk", seconds: 10, note: "Aduk sekali biar daunnya tenggelam.", waterTo: 1 },
        {
          kind: "steep",
          label: "Seduh",
          seconds: 180 - pour - 10,
          note: "Tunggu daunnya turun ke dasar, lalu saring.",
          waterTo: 1,
        },
      ];
    },
  },
];

export const recipeById = (id: unknown) => RECIPES.find((r) => r.id === id);

const CUE: Record<StepKind, Cue> = {
  bloom: "go",
  pour: "go",
  stir: "beep",
  press: "chime",
  wait: "soft",
  steep: "soft",
  drip: "soft",
  settle: "soft",
};

/** Steps that need your hands — get a 3-2-1 warning before them. */
const ACTION = new Set<StepKind>(["bloom", "pour", "stir", "press"]);

export const clampCups = (recipe: Recipe, cups: number) =>
  Math.min(recipe.maxCups, Math.max(1, Math.round(cups) || 1));

export function amounts(recipe: Recipe, cups: number): Amounts {
  const c = clampCups(recipe, cups);
  return { cups: c, dose: recipe.dosePerCup * c, water: recipe.waterPerCup * c };
}

export function doseLabel(recipe: Recipe, dose: number) {
  return recipe.doseUnit === "kantong" ? `${dose} kantong` : `${dose} g`;
}

/** "Kopi 15 g · Air 240 ml · 93°C" */
export function summary(recipe: Recipe, a: Amounts) {
  return `${recipe.group === "kopi" ? "Kopi" : "Teh"} ${doseLabel(recipe, a.dose)} · Air ${a.water} ml · ${recipe.temp}°C`;
}

export interface Plan {
  amounts: Amounts;
  segments: Segment[];
  /** waterTo per segment, stored in run.meta so the animation knows fill levels. */
  water: number[];
}

export function plan(recipe: Recipe, cups: number): Plan {
  const a = amounts(recipe, cups);
  const specs = recipe.steps(a);
  const segments: Segment[] = specs.map((s, i) => {
    const next = specs[i + 1];
    return {
      label: s.label,
      seconds: Math.max(1, Math.round(s.seconds)),
      kind: s.kind,
      note: s.note,
      cue: CUE[s.kind],
      countdown: !!next && ACTION.has(next.kind),
    };
  });
  return { amounts: a, segments, water: specs.map((s) => Math.min(1, Math.max(0, s.waterTo))) };
}
