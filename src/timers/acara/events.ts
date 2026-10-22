export const DAY = 86_400_000;

export type Repeat = "once" | "year" | "month";

export interface Ev {
  id: string;
  name: string;
  emoji: string;
  /** Local wall-clock datetime, "YYYY-MM-DDTHH:mm" (no zone = user's zone). */
  at: string;
  /** When the event was added (epoch ms) — start of the day-dots arc. */
  created: number;
  repeat?: Repeat;
}

export interface Resolved {
  ev: Ev;
  /** Next relevant moment (epoch ms). For repeats it rolls forward. */
  target: number;
  /** Start of this countdown, for progress. */
  from: number;
  /** ms left; negative once it has passed. */
  rem: number;
  /** Repeating yearly event: which anniversary this is (e.g. 32). */
  nth: number | null;
}

export const EMOJIS = ["🎆", "🎂", "🎉", "🏖️", "✈️", "💍", "🎓", "💼", "🕌", "🎄", "💸", "🎮", "🏃", "❤️", "📦", "🎁"];

const pad = (n: number) => String(n).padStart(2, "0");

export function toLocalIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses "YYYY-MM-DDTHH:mm" as local time. NaN if invalid. */
export function parseLocal(at: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(at);
  if (!m) return NaN;
  const [, y, mo, d, h = "0", mi = "0"] = m;
  return new Date(+y, +mo - 1, +d, +h, +mi).getTime();
}

const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/**
 * Resolve an event against `now`. A repeating event keeps showing "today"
 * for 24 h after its moment, then rolls to the next occurrence.
 */
export function resolve(ev: Ev, now: number): Resolved {
  const base = new Date(parseLocal(ev.at));
  const valid = !Number.isNaN(base.getTime());
  let target = valid ? base.getTime() : now;
  let from = Math.min(ev.created, target);
  let nth: number | null = null;
  if (valid && ev.repeat === "year") {
    const at = (y: number) => {
      const d = Math.min(base.getDate(), daysIn(y, base.getMonth()));
      return new Date(y, base.getMonth(), d, base.getHours(), base.getMinutes()).getTime();
    };
    let y = Math.max(base.getFullYear(), new Date(now).getFullYear() - 1);
    while (at(y) + DAY <= now) y++;
    target = at(y);
    // Progress runs from the previous anniversary, else from when it was added.
    if (y > base.getFullYear()) from = at(y - 1) + DAY;
    nth = y - base.getFullYear();
  } else if (valid && ev.repeat === "month") {
    const n = new Date(now);
    const at = (k: number) => {
      const y = n.getFullYear() + Math.floor((n.getMonth() + k) / 12);
      const m = (((n.getMonth() + k) % 12) + 12) % 12;
      return new Date(y, m, Math.min(base.getDate(), daysIn(y, m)), base.getHours(), base.getMinutes()).getTime();
    };
    let k = -1;
    while (at(k) + DAY <= now || at(k) < base.getTime()) k++;
    target = at(k);
    if (at(k - 1) >= base.getTime()) from = at(k - 1) + DAY;
  }
  return { ev, target, from: Math.min(from, target), rem: target - now, nth: nth && nth > 0 ? nth : null };
}

/** Whole calendar days from `a` to `b` (local midnights). */
export function calendarDays(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  const ma = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime();
  const mb = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime();
  return Math.round((mb - ma) / DAY);
}

/** Upcoming (and today's celebrations) first by date, then past ones, newest first. */
export function sortEvents(list: Resolved[]) {
  const live = list.filter((r) => r.rem > -DAY).sort((a, b) => a.target - b.target);
  const past = list.filter((r) => r.rem <= -DAY).sort((a, b) => b.target - a.target);
  return [...live, ...past];
}

/** Short chip: "64 hari", "Lusa", "Besok", "Hari ini", "🎉 Hari H", "lewat 3 hr". */
export function chip(r: Resolved, now: number) {
  if (r.rem > 0) {
    const d = calendarDays(now, r.target);
    if (d <= 0) return "Hari ini";
    if (d === 1) return "Besok";
    if (d === 2) return "Lusa";
    // Whole 24-hour days, so it matches the big "hari" tile.
    return `${Math.floor(r.rem / DAY)} hari`;
  }
  if (r.rem > -DAY) return "🎉 Hari H";
  return `lewat ${Math.max(1, calendarDays(r.target, now))} hr`;
}

/** The friendly sentence under the big digits. */
export function friendly(r: Resolved, now: number) {
  if (r.rem > 0) {
    const sec = r.rem / 1000;
    const d = calendarDays(now, r.target);
    if (sec <= 60) return "Detik-detik terakhir… siap-siap! 🤩";
    if (d <= 0) {
      const h = Math.floor(sec / 3600);
      const m = Math.ceil((sec % 3600) / 60);
      return h > 0 ? `Hari ini! Tinggal ${h} jam ${m} menit lagi` : `Hari ini! Tinggal ${m} menit lagi`;
    }
    if (d === 1) return `Besok! Jam ${fmtTime(r.target)} — siap-siap ya`;
    if (d === 2) return `Lusa! Hari ${weekday(r.target)} jam ${fmtTime(r.target)}`;
    // Whole 24-hour days, matching the big "hari" tile.
    const days = Math.floor(sec / 86400);
    if (days < 14) return `Masih ${days} hari lagi — hari ${weekday(r.target)}`;
    if (days < 90) return `Masih ${days} hari lagi — sekitar ${Math.round(days / 7)} minggu`;
    const months = Math.round(days / 30.44);
    if (months < 24) return `Masih ${days} hari lagi — sekitar ${months} bulan`;
    return `Masih ${days} hari lagi — sekitar ${(days / 365.25).toFixed(1).replace(".", ",")} tahun`;
  }
  if (r.rem > -DAY) return "Selamat merayakan! 🥳";
  const d = Math.max(1, calendarDays(r.target, now));
  return `Sudah lewat ${d} hari`;
}

const dateFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("id-ID", { weekday: "long" });

export const fmtTime = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
};
export const fmtDate = (t: number) => dateFmt.format(t);
export const fmtShort = (t: number) => shortFmt.format(t);
export const weekday = (t: number) => weekdayFmt.format(t);

/** Split ms into d/h/m/s (rounded up to the next whole second). */
export function parts(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000 - 1e-6));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/** Next date strictly after `now` with this month/day (00:00 local). */
function nextOn(now: number, month: number, day: number) {
  const y = new Date(now).getFullYear();
  for (let k = 0; k < 3; k++) {
    const t = new Date(y + k, month, day).getTime();
    if (t > now) return new Date(t);
  }
  return new Date(y + 1, month, day);
}

// Estimated Idul Fitri dates (official dates are set by sidang isbat).
const LEBARAN = ["2027-03-10", "2028-02-27", "2029-02-15", "2030-02-05", "2031-01-25", "2032-01-15"];

export interface Suggestion {
  key: string;
  name: string;
  emoji: string;
  at: string;
  hint: string;
  repeat?: Repeat;
}

export function suggestions(now: number): Suggestion[] {
  const out: Suggestion[] = [];
  const ny = nextOn(now, 0, 1);
  out.push({ key: "ny", name: `Tahun Baru ${ny.getFullYear()}`, emoji: "🎆", at: toLocalIso(ny), hint: fmtShort(ny.getTime()) });
  const leb = LEBARAN.map((d) => parseLocal(d)).find((t) => t > now);
  if (leb) {
    const d = new Date(leb);
    out.push({ key: "leb", name: `Lebaran ${d.getFullYear()}`, emoji: "🕌", at: toLocalIso(d), hint: `${fmtShort(leb)} · perkiraan` });
  }
  const ri = nextOn(now, 7, 17);
  out.push({ key: "ri", name: `HUT RI ke-${ri.getFullYear() - 1945}`, emoji: "🎉", at: toLocalIso(ri), hint: fmtShort(ri.getTime()) });
  const xmas = nextOn(now, 11, 25);
  out.push({ key: "xmas", name: `Natal ${xmas.getFullYear()}`, emoji: "🎄", at: toLocalIso(xmas), hint: fmtShort(xmas.getTime()) });
  const n = new Date(now);
  const pay = new Date(n.getFullYear(), n.getMonth(), 25);
  if (pay.getTime() <= now) pay.setMonth(pay.getMonth() + 1);
  out.push({ key: "pay", name: "Gajian", emoji: "💸", at: toLocalIso(pay), hint: "tiap tgl 25", repeat: "month" });
  return out;
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
