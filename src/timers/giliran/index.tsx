import { Dices, Pause, Play, RotateCcw, SkipForward, Trophy, Undo2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TimerShell } from "../../components/TimerShell";
import { Button, Panel, Segmented, Stage, Stepper } from "../../components/ui";
import { cn } from "../../core/cn";
import { formatHuman } from "../../core/engine";
import { useNow, useStoredState } from "../../core/hooks";
import { play, vibrate } from "../../core/sound";
import {
  chessCategory,
  checkFlag,
  clockText,
  continueAfterFlag,
  DEFAULT_NAMES,
  DEFAULT_SETTINGS,
  endTurn,
  fraction,
  INK,
  leftMs,
  MAX_PLAYERS,
  mmss,
  newMatch,
  nextAlive,
  pause,
  PLAYER_COLORS,
  resume,
  totalUsed,
  undoTurn,
  type Match,
  type Settings,
} from "./game";
import { Hourglass, type GlassState } from "./Hourglass";
import { PlayerTile } from "./PlayerTile";

const ID = "giliran";

const BASES = [60, 180, 300, 600, 900, 1800];
const INCS = [0, 2, 5, 10];
const TURNS = [15, 30, 45, 60, 90, 120];

export default function JamGiliran() {
  const [settings, setSettings] = useStoredState<Settings>("giliran.settings", DEFAULT_SETTINGS);
  const [names, setNames] = useStoredState<string[]>("giliran.names", DEFAULT_NAMES);
  const [match, setMatch] = useStoredState<Match | null>("giliran.match", null);
  const [confirmReset, setConfirmReset] = useState(false);

  const running = match?.status === "running";
  const now = useNow(100, running);
  const n = match?.players ?? settings.players;
  const nameOf = (i: number) => names[i]?.trim() || DEFAULT_NAMES[i];

  // Latest match for timers, key handlers and the canvas loop.
  const matchRef = useRef(match);
  matchRef.current = match;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const commit = useCallback(
    (m: Match | null) => {
      matchRef.current = m;
      setMatch(m);
    },
    [setMatch],
  );

  const start = useCallback(
    (first: number) => {
      play("go");
      vibrate(40);
      commit(newMatch(settingsRef.current, first));
    },
    [commit],
  );

  /** Tap on a player's tile. */
  const tap = useCallback(
    (i: number) => {
      const m = matchRef.current;
      if (!m) return start(i);
      if (i !== m.active) return;
      if (m.status === "running") {
        const next = endTurn(m);
        if (next.status === "running") {
          play("tap");
          vibrate(25);
        } else {
          play("alarm");
          vibrate([300, 120, 300, 120, 600]);
        }
        commit(next);
      } else if (m.status === "paused") {
        play("go");
        commit(resume(m));
      }
    },
    [commit, start],
  );

  const togglePause = useCallback(() => {
    const m = matchRef.current;
    if (!m) return;
    if (m.status === "running") commit(pause(m));
    else if (m.status === "paused") commit(resume(m));
  }, [commit]);

  // Watchdog: flag on zero, tick under 10 s. Timestamp-based, so it also
  // catches time that ran out while the tab was closed.
  const lastTick = useRef("");
  useEffect(() => {
    if (match?.status !== "running") return;
    const check = () => {
      const m = matchRef.current;
      if (!m || m.status !== "running") return;
      const t = Date.now();
      const flagged = checkFlag(m, t);
      if (flagged) {
        commit(flagged);
        play("alarm");
        vibrate([300, 120, 300, 120, 600]);
        return;
      }
      const left = leftMs(m, m.active, t);
      if (left < 10000) {
        const key = `${m.id}:${m.switches}:${Math.ceil(left / 1000)}`;
        if (key !== lastTick.current) {
          lastTick.current = key;
          play("tick");
        }
      }
    };
    check();
    const id = window.setInterval(check, 100);
    return () => window.clearInterval(id);
  }, [match?.status, match?.id, commit]);

  // Keep the screen awake during a game.
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const grab = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          if (alive) lock = l;
          else void l.release();
        })
        .catch(() => {});
    };
    grab();
    document.addEventListener("visibilitychange", grab);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", grab);
      void lock?.release().catch(() => {});
    };
  }, [running]);

  // Space = end turn, P = pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault(); // also stops a focused button from "clicking"
        if (e.repeat) return; // holding Space must not skip several turns
        const m = matchRef.current;
        if (!m) start(0);
        else tap(m.active);
      } else if ((e.key === "p" || e.key === "P") && !e.repeat) {
        togglePause();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.code === "Space" && el?.tagName === "BUTTON") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [tap, togglePause, start]);

  useEffect(() => {
    if (!confirmReset) return;
    const id = window.setTimeout(() => setConfirmReset(false), 2500);
    return () => window.clearTimeout(id);
  }, [confirmReset]);

  const reset = () => {
    if (!confirmReset && match && match.status !== "over") {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    commit(null);
  };

  // Canvas reads this every frame (no React state in the loop).
  const readGlass = (): GlassState => {
    const m = matchRef.current;
    if (!m) {
      return { matchId: 0, switches: 0, color: PLAYER_COLORS[0], frac: 1, phase: "idle", low: false };
    }
    const t = Date.now();
    const left = leftMs(m, m.active, t);
    return {
      matchId: m.id,
      switches: m.switches,
      color: PLAYER_COLORS[m.active],
      frac: fraction(m, m.active, t),
      phase: m.status,
      low: m.status === "running" && left < 10000,
    };
  };

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const locked = !!match;

  // ---- sticker readout ---------------------------------------------------
  const ai = match?.active ?? 0;
  const activeColor = PLAYER_COLORS[ai];
  let stickerTime: string;
  let stickerName: string;
  let stickerNote: string;
  let alert = false;
  let winnerColor: string | null = null;
  if (!match) {
    stickerName = "Siap main?";
    stickerTime = mmss((settings.mode === "catur" ? settings.base : settings.turn) * 1000);
    stickerNote = settings.mode === "catur" ? `${n} pemain · ${settings.base / 60}+${settings.inc}` : `${n} pemain · per giliran`;
  } else {
    const left = leftMs(match, ai, now);
    stickerName = nameOf(ai);
    stickerTime = clockText(left);
    if (match.status === "over") {
      const winner = match.out.findIndex((o) => !o);
      if (winner >= 0) {
        stickerName = nameOf(winner);
        stickerTime = clockText(leftMs(match, winner, now));
        winnerColor = PLAYER_COLORS[winner];
      }
      stickerNote = "Menang! 🎉";
    } else if (match.status === "flagged") {
      stickerNote = "Waktu habis! ⏰";
      alert = true;
    } else if (match.status === "paused") {
      stickerNote = "Dijeda";
    } else {
      stickerNote =
        match.mode === "catur"
          ? `Langkah ke-${match.turns[ai] + 1}`
          : `Giliran ke-${match.turns[ai] + 1} · total ${mmss(totalUsed(match, ai, now))}`;
    }
    if (running && left < 10000) alert = true;
  }

  const modeChip =
    (match?.mode ?? settings.mode) === "catur"
      ? `♟️ ${(match?.base ?? settings.base) / 60}+${match?.inc ?? settings.inc} · ${chessCategory(match?.base ?? settings.base, match?.inc ?? settings.inc)}`
      : `🎲 ${match?.turn ?? settings.turn} dtk / giliran`;

  const stage = (
    <Stage className="aspect-[5/4] sm:aspect-[4/3] lg:aspect-[4/3]">
      <Hourglass read={readGlass} />
      <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4">
        <span className="pop inline-block rounded-full bg-surface px-3 py-1 text-xs font-extrabold sm:text-sm">
          {modeChip}
        </span>
      </div>
      <div className="absolute inset-y-0 right-0 flex w-[52%] items-center justify-center pr-3 sm:pr-6">
        <div
          className={cn(
            "pop w-full max-w-72 rounded-3xl bg-surface px-3 py-3 text-center sm:px-5 sm:py-4",
            alert && "animate-pulse",
          )}
          style={
            winnerColor
              ? { background: winnerColor, color: INK }
              : alert
                ? { background: "#ff4d4d", color: INK }
                : undefined
          }
        >
          <div className="flex min-w-0 items-center justify-center gap-1.5">
            {match?.status === "over" ? (
              <Trophy className="size-4 shrink-0" strokeWidth={3} />
            ) : (
              <span
                className="size-3.5 shrink-0 rounded-full border-2"
                style={{ background: activeColor, borderColor: alert ? INK : "var(--line)" }}
              />
            )}
            <span className="truncate text-sm font-extrabold sm:text-base">{stickerName}</span>
          </div>
          <div className="tabular my-1 font-mono text-4xl font-bold leading-none tracking-tight sm:text-6xl">
            {stickerTime}
          </div>
          <div className={cn("truncate text-xs font-bold sm:text-sm", !alert && !winnerColor && "text-ink-soft")}>
            {stickerNote}
          </div>
        </div>
      </div>
    </Stage>
  );

  const tile = (i: number, className?: string) => (
    <PlayerTile
      key={i}
      i={i}
      name={nameOf(i)}
      match={match}
      settings={settings}
      now={now}
      onTap={tap}
      className={className}
    />
  );

  const two = n === 2;

  const buttons = (() => {
    if (!match) {
      return (
        <div className="flex gap-2">
          <Button variant="accent" size="lg" className="flex-1 text-2xl" onClick={() => start(0)}>
            <Play className="size-7 fill-current" /> Mulai
          </Button>
          <Button
            size="lg"
            aria-label="Undi siapa duluan"
            title="Undi siapa duluan"
            onClick={() => start(Math.floor(Math.random() * n))}
          >
            <Dices className="size-6" /> <span className="hidden sm:inline">Undi</span>
          </Button>
        </div>
      );
    }
    const resetBtn = (
      <Button
        size="lg"
        variant={confirmReset ? "ink" : "plain"}
        aria-label="Ulang"
        title="Ulang dari awal"
        onClick={reset}
      >
        <RotateCcw className="size-6" />
        {confirmReset && "Yakin?"}
      </Button>
    );
    if (match.status === "over") {
      return (
        <div className="flex gap-2">
          <Button variant="accent" size="lg" className="flex-1" onClick={() => start(0)}>
            <Play className="size-6 fill-current" /> Main lagi
          </Button>
          {resetBtn}
        </div>
      );
    }
    if (match.status === "flagged") {
      const nx = nextAlive(match, match.active);
      return (
        <div className="flex gap-2">
          <Button
            variant="accent"
            size="lg"
            className="min-w-0 flex-1"
            onClick={() => {
              play("go");
              commit(continueAfterFlag(match));
            }}
          >
            <SkipForward className="size-6 shrink-0" /> <span className="truncate">Lanjut: {nameOf(nx)}</span>
          </Button>
          {resetBtn}
        </div>
      );
    }
    return (
      <div className="flex gap-2">
        <Button variant={running ? "ink" : "accent"} size="lg" className="flex-1" onClick={togglePause}>
          {running ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
          {running ? "Jeda" : "Lanjut"}
        </Button>
        <Button
          size="lg"
          aria-label="Batalkan ganti giliran"
          title="Salah tap? Balikin giliran sebelumnya"
          disabled={!match.undo}
          onClick={() => commit(undoTurn(match))}
        >
          <Undo2 className="size-6" /> <span className="hidden sm:inline">Batal</span>
        </Button>
        {resetBtn}
      </div>
    );
  })();

  return (
    <TimerShell
      id={ID}
      stage={
        <div className="space-y-3">
          {two && tile(1, "rotate-180 sm:hidden")}
          {stage}
        </div>
      }
      controls={
        <div className="space-y-3">
          {two ? (
            <>
              {tile(0, "sm:hidden")}
              <div className="hidden grid-cols-2 gap-3 sm:grid">
                {tile(0)}
                {tile(1)}
              </div>
            </>
          ) : (
            <div className={cn("grid grid-cols-2 gap-3", n > 4 && "sm:grid-cols-3")}>
              {Array.from({ length: n }, (_, i) => tile(i))}
            </div>
          )}
          {buttons}
        </div>
      }
    >
      <Panel title="Aturan main">
        <Segmented
          options={[
            { value: "catur", label: "♟️ Catur", hint: "Bank waktu + bonus" },
            { value: "giliran", label: "🎲 Per giliran", hint: "Reset tiap giliran" },
          ]}
          value={settings.mode}
          disabled={locked}
          onChange={(v) => set("mode", v)}
          className="[&>button]:flex-1"
        />
        {settings.mode === "catur" ? (
          <>
            <h3 className="mb-2 mt-4 text-sm font-bold text-ink-soft">Waktu tiap pemain</h3>
            <Segmented
              options={BASES.map((b) => ({ value: b, label: `${b / 60} mnt` }))}
              value={settings.base}
              disabled={locked}
              onChange={(v) => set("base", v)}
            />
            <h3 className="mb-2 mt-4 text-sm font-bold text-ink-soft">Bonus tiap habis jalan</h3>
            <Segmented
              options={INCS.map((v) => ({ value: v, label: v ? `+${v} dtk` : "Tanpa" }))}
              value={settings.inc}
              disabled={locked}
              onChange={(v) => set("inc", v)}
            />
            <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm font-semibold text-ink-soft">
              <b className="text-ink">
                {settings.base / 60}+{settings.inc} · {chessCategory(settings.base, settings.inc)}
              </b>{" "}
              — 40 langkah makan maks ±{formatHuman(settings.base + 40 * settings.inc)} per orang.
            </p>
          </>
        ) : (
          <>
            <h3 className="mb-2 mt-4 text-sm font-bold text-ink-soft">Batas tiap giliran</h3>
            <Segmented
              options={TURNS.map((v) => ({ value: v, label: v >= 60 ? `${v / 60} mnt` : `${v} dtk`, hint: v === 60 ? "umum" : undefined }))}
              value={settings.turn}
              disabled={locked}
              onChange={(v) => set("turn", v)}
            />
            <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm font-semibold text-ink-soft">
              Waktu balik penuh tiap giliran. Kalau habis, jam berhenti &amp; yang telat ketahuan. 😏
            </p>
          </>
        )}
        {locked && (
          <p className="mt-3 text-sm font-semibold text-ink-soft">🔒 Game lagi jalan — ulang dulu buat ganti aturan.</p>
        )}
      </Panel>

      <Panel title="Pemain">
        <Stepper
          label="Jumlah pemain"
          value={settings.players}
          min={2}
          max={MAX_PLAYERS}
          disabled={locked}
          onChange={(v) => set("players", v)}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: n }, (_, i) => (
            <label
              key={i}
              className="flex items-center gap-2 rounded-2xl border-[2.5px] border-line bg-surface-2 py-1.5 pl-2 pr-3 focus-within:bg-surface"
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-xl border-2 border-line text-sm font-extrabold"
                style={{ background: PLAYER_COLORS[i], color: INK }}
              >
                {i + 1}
              </span>
              <input
                value={names[i] ?? ""}
                maxLength={16}
                placeholder={DEFAULT_NAMES[i]}
                onChange={(e) => {
                  const v = e.target.value;
                  setNames((arr) => {
                    const next = DEFAULT_NAMES.map((d, k) => arr[k] ?? d);
                    next[i] = v;
                    return next;
                  });
                }}
                className="min-w-0 flex-1 bg-transparent py-1 font-bold outline-none placeholder:text-ink-soft/60"
              />
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Cara pakai">
        <ul className="space-y-2 text-sm font-semibold">
          <li className="flex gap-2">
            <span>👆</span>
            <span>Selesai jalan? Tap kartu yang menyala (atau <kbd className="rounded border-2 border-line px-1 text-xs">Spasi</kbd>).</span>
          </li>
          <li className="flex gap-2">
            <span>↩️</span>
            <span>Salah tap? <b>Batal</b> balikin giliran — detik lawan nggak kepotong.</span>
          </li>
          <li className="flex gap-2">
            <span>📱</span>
            <span>Main berdua? Taruh HP di tengah meja — kartu atas udah kebalik buat lawan.</span>
          </li>
          <li className="flex gap-2">
            <span>⏳</span>
            <span>Pasir di jam pasir = sisa waktu yang lagi jalan. Ditutup/di-refresh pun tetap jalan.</span>
          </li>
        </ul>
      </Panel>
    </TimerShell>
  );
}
