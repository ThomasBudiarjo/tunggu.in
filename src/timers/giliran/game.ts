/**
 * Turn-clock logic (pure). Everything is derived from timestamps so a game
 * survives reloads: the active player's time is
 *   banked − (turnElapsed + (now − activeStartedAt))
 * and nothing ever accumulates interval ticks.
 */

export type Mode = "catur" | "giliran";
export type Status = "running" | "paused" | "flagged" | "over";

export const MAX_PLAYERS = 6;

/** Distinct, ink-friendly player colours (dark text reads on all of them). */
export const PLAYER_COLORS = ["#4cc9f0", "#ffd23f", "#7bd88f", "#b69cff", "#ff9f1c", "#d9a46b"];
export const DANGER = "#ff4d4d";
export const INK = "#1b1424";

export const DEFAULT_NAMES = ["Pemain 1", "Pemain 2", "Pemain 3", "Pemain 4", "Pemain 5", "Pemain 6"];

export interface Settings {
  players: number;
  mode: Mode;
  /** Catur: bank per player, seconds. */
  base: number;
  /** Catur: Fischer increment, seconds. */
  inc: number;
  /** Per giliran: allowance per turn, seconds. */
  turn: number;
}

export const DEFAULT_SETTINGS: Settings = { players: 2, mode: "catur", base: 300, inc: 2, turn: 60 };

interface Snapshot {
  bank: number[];
  used: number[];
  turns: number[];
  active: number;
  turnElapsed: number;
}

export interface Match {
  /** Start timestamp, doubles as an id. */
  id: number;
  mode: Mode;
  players: number;
  base: number;
  inc: number;
  turn: number;
  /** Catur: ms left per player at the start of their current turn. */
  bank: number[];
  /** Total ms each player has spent thinking (completed turns). */
  used: number[];
  turns: number[];
  /** Per giliran: how many times each player ran out. */
  flags: number[];
  /** Catur 3+ players: knocked out on time. */
  out: boolean[];
  active: number;
  /** ms already spent on the current turn before the last pause. */
  turnElapsed: number;
  /** When the current (unpaused) stretch of the turn began; null = paused/stopped. */
  activeStartedAt: number | null;
  status: Status;
  flagged: number | null;
  /** Bumped on every turn change (incl. undo) so the animation knows to flip. */
  switches: number;
  undo: Snapshot | null;
}

export function newMatch(s: Settings, first = 0, now = Date.now()): Match {
  const n = s.players;
  return {
    id: now,
    mode: s.mode,
    players: n,
    base: s.base,
    inc: s.inc,
    turn: s.turn,
    bank: Array.from({ length: n }, () => s.base * 1000),
    used: Array(n).fill(0),
    turns: Array(n).fill(0),
    flags: Array(n).fill(0),
    out: Array(n).fill(false),
    active: Math.min(first, n - 1),
    turnElapsed: 0,
    activeStartedAt: now,
    status: "running",
    flagged: null,
    switches: 0,
    undo: null,
  };
}

/** ms spent on the current turn so far. */
export function turnElapsed(m: Match, now = Date.now()) {
  return m.turnElapsed + (m.activeStartedAt !== null ? Math.max(0, now - m.activeStartedAt) : 0);
}

/** ms on the clock for player i right now (catur: bank; giliran: this turn's allowance). */
export function leftMs(m: Match, i: number, now = Date.now()) {
  if (m.status === "flagged" || m.status === "over") {
    if (m.flagged === i) return 0;
  }
  if (m.mode === "catur") {
    return Math.max(0, m.bank[i] - (i === m.active ? turnElapsed(m, now) : 0));
  }
  return i === m.active ? Math.max(0, m.turn * 1000 - turnElapsed(m, now)) : m.turn * 1000;
}

/** 0..1 — how full the active player's sand should be. */
export function fraction(m: Match, i: number, now = Date.now()) {
  const full = (m.mode === "catur" ? m.base : m.turn) * 1000;
  return full > 0 ? Math.min(1, leftMs(m, i, now) / full) : 0;
}

export function totalUsed(m: Match, i: number, now = Date.now()) {
  return m.used[i] + (i === m.active && m.status !== "over" ? turnElapsed(m, now) : 0);
}

export function nextAlive(m: Match, from: number) {
  for (let k = 1; k <= m.players; k++) {
    const j = (from + k) % m.players;
    if (!m.out[j]) return j;
  }
  return from;
}

export const aliveCount = (m: Match) => m.out.filter((o) => !o).length;

/** Active player hands over the turn. */
export function endTurn(m: Match, now = Date.now()): Match {
  if (m.status !== "running") return m;
  // Pressed after the flag fell (between watchdog ticks): the flag wins.
  const late = checkFlag(m, now);
  if (late) return late;
  const spent = turnElapsed(m, now);
  const i = m.active;
  const bank = m.bank.slice();
  if (m.mode === "catur") bank[i] = Math.max(0, bank[i] - spent) + m.inc * 1000;
  const used = m.used.slice();
  used[i] += spent;
  const turns = m.turns.slice();
  turns[i] += 1;
  return {
    ...m,
    bank,
    used,
    turns,
    active: nextAlive(m, i),
    turnElapsed: 0,
    activeStartedAt: now,
    switches: m.switches + 1,
    undo: { bank: m.bank, used: m.used, turns: m.turns, active: i, turnElapsed: spent },
  };
}

/** Take back the last hand-over (mis-tap). The new player's seconds since are forgiven. */
export function undoTurn(m: Match, now = Date.now()): Match {
  if (!m.undo || (m.status !== "running" && m.status !== "paused")) return m;
  return {
    ...m,
    ...m.undo,
    activeStartedAt: m.status === "running" ? now : null,
    switches: m.switches + 1,
    undo: null,
  };
}

export function pause(m: Match, now = Date.now()): Match {
  if (m.status !== "running") return m;
  return { ...m, status: "paused", turnElapsed: turnElapsed(m, now), activeStartedAt: null };
}

export function resume(m: Match, now = Date.now()): Match {
  if (m.status !== "paused") return m;
  return { ...m, status: "running", activeStartedAt: now };
}

/**
 * Called by the watchdog: if the active player's time is up, freeze the
 * clock exactly at zero. Returns null when nothing changed.
 */
export function checkFlag(m: Match, now = Date.now()): Match | null {
  if (m.status !== "running" || m.activeStartedAt === null) return null;
  const i = m.active;
  const allowance = m.mode === "catur" ? m.bank[i] : m.turn * 1000;
  const spent = turnElapsed(m, now);
  if (spent < allowance) return null;
  const used = m.used.slice();
  used[i] += allowance;
  const base = { ...m, used, turnElapsed: allowance, activeStartedAt: null, flagged: i, undo: null };
  if (m.mode === "giliran") {
    const flags = m.flags.slice();
    flags[i] += 1;
    return { ...base, flags, status: "flagged" };
  }
  const bank = m.bank.slice();
  bank[i] = 0;
  const out = m.out.slice();
  out[i] = true;
  const next = { ...base, bank, out };
  return { ...next, status: aliveCount(next) <= 1 ? "over" : "flagged" };
}

/** After a flag: move on to the next (alive) player. */
export function continueAfterFlag(m: Match, now = Date.now()): Match {
  if (m.status !== "flagged") return m;
  const i = m.active;
  const turns = m.turns.slice();
  turns[i] += 1;
  return {
    ...m,
    turns,
    active: nextAlive(m, i),
    turnElapsed: 0,
    activeStartedAt: now,
    status: "running",
    flagged: null,
    switches: m.switches + 1,
  };
}

/** "5+3 · Blitz" style label for chess presets. */
export function chessCategory(base: number, inc: number) {
  const est = base + 40 * inc;
  if (est < 180) return "Bullet";
  if (est < 600) return "Blitz";
  if (est < 3600) return "Rapid";
  return "Klasik";
}

export function mmss(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000 - 1e-6));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Under 10 s shows tenths so the scramble is readable: "7.4". */
export function clockText(ms: number) {
  if (ms > 0 && ms < 10000) return (Math.floor(ms / 100) / 10).toFixed(1);
  return mmss(ms);
}
