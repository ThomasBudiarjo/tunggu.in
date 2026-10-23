import { Lock, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useMemo, type CSSProperties } from "react";
import { TimerShell } from "../../components/TimerShell";
import { BigTime, Button, Panel, Segmented, Stage, Stepper } from "../../components/ui";
import { cn } from "../../core/cn";
import { formatClock, formatHuman } from "../../core/engine";
import { useRun, useStoredState, type RunHandle } from "../../core/hooks";
import { useRuns } from "../../core/runs";
import { play } from "../../core/sound";
import { timerById } from "../registry";
import { Campfire } from "./Campfire";
import { buildPlan, DEFAULT_CONFIG, effective, sanitize, stepsFromMeta, summarize, type Config, type Mode } from "./plan";

const ID = "interval";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "tabata", label: "🔥 Tabata", hint: "20/10 × 8" },
  { value: "hiit", label: "💪 HIIT", hint: "atur sendiri" },
  { value: "emom", label: "⏱️ EMOM", hint: "tiap menit" },
];

const MODE_NAME: Record<Mode, string> = { tabata: "Tabata", hiit: "HIIT", emom: "EMOM" };

const HIIT_PRESETS = [
  { work: 30, rest: 30, hint: "pemula" },
  { work: 40, rest: 20, hint: "sedang" },
  { work: 45, rest: 15, hint: "berat" },
  { work: 60, rest: 30, hint: "kekuatan" },
];

const PILL = {
  work: { background: "var(--accent)", color: "var(--accent-ink)" },
  rest: { background: "#3ddbd0", color: "#062019" },
  prep: { background: "#ffd23f", color: "#2b2100" },
  done: { background: "#7bd88f", color: "#0f2414" },
  idle: { background: "var(--surface-2)", color: "var(--ink)" },
  paused: { background: "var(--ink)", color: "var(--bg)" },
} satisfies Record<string, CSSProperties>;

const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");

export default function Interval() {
  const def = timerById(ID)!;
  const handle = useRun(ID);
  const { run, pos, running } = handle;
  const [stored, setStored] = useStoredState<Config>("interval.config", DEFAULT_CONFIG);
  const cfg = useMemo(() => sanitize(stored), [stored]);
  const set = (patch: Partial<Config>) => setStored((c) => sanitize({ ...sanitize(c), ...patch }));
  const plan = useMemo(() => buildPlan(cfg), [cfg]);
  const locked = !!run;

  const start = () =>
    handle.start({
      title: `${MODE_NAME[cfg.mode]}`,
      emoji: def.emoji,
      path: `/${ID}`,
      segments: plan.segments,
      meta: { mode: cfg.mode, steps: plan.steps },
    });

  // Keep the phone screen awake mid-workout.
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      void lock?.release().catch(() => {});
    };
  }, [running]);

  // Space bar = pause / resume (handy with sweaty hands near a laptop).
  const active = !!run && !run.finished;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest("button, input, textarea, select, a")) return;
      e.preventDefault();
      play("tap");
      useRuns.getState().toggle(ID);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // ---- What the stage card shows -----------------------------------------
  const segments = run ? run.segments : plan.segments;
  const steps = run ? stepsFromMeta(run.meta) : plan.steps;
  const runMode = (run?.meta?.mode as Mode | undefined) ?? cfg.mode;
  const sum = summarize(segments);
  const done = !!run && (run.finished || !!pos?.done);
  const step = pos && steps ? steps[pos.index] : undefined;
  const kind = pos?.segment.kind;

  let pill: keyof typeof PILL = "idle";
  let pillText = MODE_NAME[cfg.mode].toUpperCase();
  let bigSeconds = sum.total;
  let sub = "";
  let foot = "";

  const roundText = (st = step) => {
    if (!st) return "";
    if (st.round === 0) return st.sets > 1 ? `Set 1/${st.sets}` : `${st.rounds} ronde menanti`;
    const r = runMode === "emom" ? `Menit ${st.round}/${st.rounds}` : `Ronde ${st.round}/${st.rounds}`;
    return st.sets > 1 ? `${r} · Set ${st.set}/${st.sets}` : r;
  };

  if (!run || !pos) {
    const e = effective(cfg);
    sub =
      cfg.mode === "emom"
        ? `${e.rounds} menit, gas tiap awal menit`
        : `${e.rounds} ronde × ${e.work}/${e.rest} dtk${e.sets > 1 ? ` × ${e.sets} set` : ""}`;
    foot = "Api kecil nunggu disulut 🔥";
  } else if (done) {
    pill = "done";
    pillText = "BERES! 💪";
    bigSeconds = sum.total;
    sub = `Kerja ${formatHuman(sum.work)} · total ${formatHuman(sum.total)}`;
    foot = "Apinya padam. Kamu yang panas!";
  } else {
    bigSeconds = pos.segRemaining;
    if (kind === "prep") {
      pill = "prep";
      pillText = "SIAP-SIAP";
    } else if (kind === "rest") {
      pill = "rest";
      pillText = step?.long ? "REHAT SET" : "ISTIRAHAT";
    } else {
      pill = "work";
      pillText = runMode === "emom" ? `MENIT ${step?.round ?? pos.index}` : "KERJA!";
    }
    sub = roundText();
    const next = segments[pos.index + 1];
    foot = next ? `Berikutnya: ${next.label} · ${formatClock(next.seconds)}` : "Terakhir! Habisin! 🏁";
    if (pos.paused) {
      pill = "paused";
      pillText = "DIJEDA";
    }
  }

  const finalCount = !!pos && !done && !pos.paused && !!pos.segment.countdown && pos.segRemaining <= 3;
  const finishAt = run && pos && !done ? (pos.paused ? null : Date.now() + pos.totalRemaining * 1000) : Date.now() + sum.total * 1000;

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage className="aspect-[5/6] sm:aspect-[4/3] lg:aspect-square">
          <Campfire timerId={ID} accent={def.accent} preview={plan.segments} />
          <div className="flex h-full flex-col items-center px-4 pt-7 sm:pt-11">
            <div className="pop w-full max-w-[15.5rem] rounded-3xl bg-surface px-4 pb-2.5 pt-2.5 text-center sm:max-w-[19rem] sm:pb-3 sm:pt-3">
              <span
                key={pillText}
                style={PILL[pill]}
                className={cn(
                  "animate-pop-in inline-block rounded-full border-2 border-line px-3 py-0.5 text-sm font-extrabold tracking-wider",
                  finalCount && "animate-wiggle",
                )}
              >
                {pillText}
              </span>
              <BigTime
                seconds={bigSeconds}
                className={cn("mt-1 block text-5xl sm:text-7xl", finalCount && "text-accent")}
              />
              <div className="mt-1 truncate text-sm font-bold text-ink-soft">{sub}</div>
              <div className="mt-1.5 truncate border-t-2 border-dashed border-line/25 pt-1.5 text-xs font-bold text-ink-soft sm:mt-2 sm:pt-2">
                {foot}
              </div>
            </div>
          </div>
        </Stage>
      }
      controls={<Controls handle={handle} onStart={start} />}
    >
      <Panel title="Mau latihan apa?">
        <Segmented options={MODES} value={cfg.mode} onChange={(mode) => set({ mode })} disabled={locked} />
        <p className="mt-3 text-sm font-semibold text-ink-soft">
          {cfg.mode === "tabata" && "20 detik all-out, 10 detik napas, 8 ronde. Cuma 4 menit tapi bikin ngos-ngosan."}
          {cfg.mode === "hiit" && "Atur sendiri lama kerja, istirahat, dan jumlah ronde. Cocok buat circuit."}
          {cfg.mode === "emom" &&
            "Every Minute On the Minute: tiap awal menit kerjain repetisimu, sisa waktunya buat istirahat."}
        </p>
      </Panel>

      <Panel title="Atur latihan">
        <div className="space-y-2">
          {cfg.mode === "hiit" && (
            <>
              <Segmented
                className="mb-3"
                disabled={locked}
                value={`${cfg.work}/${cfg.rest}`}
                onChange={(v) => {
                  const [work, rest] = v.split("/").map(Number);
                  set({ work, rest });
                }}
                options={HIIT_PRESETS.map((p) => ({ value: `${p.work}/${p.rest}`, label: `${p.work}/${p.rest}`, hint: p.hint }))}
              />
              <Stepper label="Kerja" value={cfg.work} min={5} max={600} step={5} format={(v) => formatClock(v)} onChange={(work) => set({ work })} disabled={locked} />
              <Stepper label="Istirahat" value={cfg.rest} min={0} max={600} step={5} format={(v) => formatClock(v)} onChange={(rest) => set({ rest })} disabled={locked} />
              <Stepper label="Ronde" value={cfg.rounds} min={1} max={50} onChange={(rounds) => set({ rounds })} disabled={locked} />
            </>
          )}
          {cfg.mode === "emom" && (
            <Stepper label="Lama (menit)" value={cfg.minutes} min={1} max={60} onChange={(minutes) => set({ minutes })} disabled={locked} />
          )}
          {cfg.mode !== "emom" && (
            <>
              <Stepper label="Jumlah set" value={cfg.sets} min={1} max={10} onChange={(sets) => set({ sets })} disabled={locked} />
              <Stepper
                label="Rehat antar set"
                value={cfg.setRest}
                min={0}
                max={600}
                step={15}
                format={(v) => formatClock(v)}
                onChange={(setRest) => set({ setRest })}
                disabled={locked || cfg.sets <= 1}
              />
            </>
          )}
        </div>
        {locked && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <Lock className="size-4" strokeWidth={2.5} /> Ulang dulu latihannya buat ganti setelan.
          </p>
        )}
      </Panel>

      <Panel title={run ? "Latihan ini" : "Ringkasan"}>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Total" value={formatClock(sum.total)} />
          <Stat label="Selesai jam" value={finishAt ? clockTime(finishAt) : "—"} />
          <Stat label="Kerja" value={formatClock(sum.work)} dot="var(--accent)" />
          <Stat label="Istirahat" value={formatClock(sum.rest)} dot="#3ddbd0" />
        </div>
        <p className="mt-3 text-xs font-semibold text-ink-soft">
          Termasuk {formatClock(segments[0]?.kind === "prep" ? segments[0].seconds : 0)} siap-siap. Bunyi 3-2-1 di tiap akhir
          tahap · <kbd className="rounded border border-line/40 px-1 font-mono">Spasi</kbd> buat jeda.
        </p>
      </Panel>
    </TimerShell>
  );
}

/** One row on every screen size: play/pause, +10 s, skip, reset. */
function Controls({ handle, onStart }: { handle: RunHandle; onStart: () => void }) {
  const { run, running } = handle;
  if (!run) {
    return (
      <Button
        variant="accent"
        size="lg"
        className="w-full text-2xl"
        onClick={() => {
          play("go");
          onStart();
        }}
      >
        <Play className="size-7 fill-current" /> Mulai
      </Button>
    );
  }
  if (run.finished) {
    return (
      <div className="flex gap-2">
        <Button size="lg" variant="accent" className="flex-1" onClick={handle.reset}>
          <RotateCcw className="size-6" /> Selesai
        </Button>
        <Button
          size="lg"
          className="px-5"
          title="Ulang latihan yang sama"
          onClick={() => {
            play("go");
            handle.reset();
            onStart();
          }}
        >
          Lagi! 🔁
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Button variant={running ? "ink" : "accent"} size="lg" className="min-w-0 flex-1 px-4" onClick={handle.toggle}>
        {running ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
        {running ? "Jeda" : "Lanjut"}
      </Button>
      <Button size="lg" className="px-3 sm:px-5" title="Tambah 10 detik ke tahap ini" onClick={() => handle.addTime(10)}>
        +10<span className="hidden sm:inline">dtk</span>
      </Button>
      <Button size="lg" className="px-3.5 sm:px-5" aria-label="Lewati" title="Lewati tahap ini" onClick={handle.skip}>
        <SkipForward className="size-6" />
      </Button>
      <Button size="lg" className="px-3.5 sm:px-5" aria-label="Ulang" title="Ulang dari awal" onClick={handle.reset}>
        <RotateCcw className="size-6" />
      </Button>
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div className="rounded-2xl border-[2.5px] border-line bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-soft">
        {dot && <span className="size-2.5 rounded-full border-2 border-line" style={{ background: dot }} />}
        {label}
      </div>
      <div className="tabular font-mono text-2xl font-bold">{value}</div>
    </div>
  );
}
