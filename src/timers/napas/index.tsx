import { Lock } from "lucide-react";
import { TimerShell } from "../../components/TimerShell";
import { Panel, RunControls, Segmented, Stage } from "../../components/ui";
import { cn } from "../../core/cn";
import { formatClock, formatHuman } from "../../core/engine";
import { useRun, useStoredState } from "../../core/hooks";
import { timerById } from "../registry";
import { BreathOrb } from "./BreathOrb";
import {
  PATTERNS,
  PHASE_COLORS,
  PHASE_TEXT,
  buildSegments,
  cycleSeconds,
  cyclesFor,
  patternById,
  type PatternId,
  type PhaseKind,
} from "./plan";

const ID = "napas";
const MINUTES = [1, 3, 5, 10];
const SHORT: Record<PhaseKind, string> = { inhale: "Tarik", hold: "Tahan", exhale: "Buang", hold2: "Tahan" };

const sec = (s: number) => String(s).replace(".", ",");

export default function Napas() {
  const def = timerById(ID)!;
  const handle = useRun(ID);
  const { run, pos } = handle;
  const [patternId, setPatternId] = useStoredState<PatternId>("napas.pattern", "box");
  const [minutes, setMinutes] = useStoredState("napas.minutes", 3);
  const [sound, setSound] = useStoredState("napas.sound", true);

  const pattern = patternById(patternId);
  const locked = !!run;
  const cycles = cyclesFor(pattern, minutes);

  const start = () =>
    handle.start({
      title: `Napas ${pattern.name}`,
      emoji: def.emoji,
      path: `/${ID}`,
      segments: buildSegments(pattern, minutes, sound),
      meta: { pattern: pattern.id, perCycle: pattern.phases.length, cycles },
    });

  // Which pattern is on screen: the running one wins over the picker.
  const shown = run ? patternById(String(run.meta?.pattern ?? patternId)) : pattern;
  const perCycle = Number(run?.meta?.perCycle) || shown.phases.length;
  const totalCycles = run ? Math.max(1, Math.round(run.segments.length / perCycle)) : cycles;
  const cycleNow = pos ? Math.min(totalCycles, Math.floor(pos.index / perCycle) + 1) : 0;
  const kind = (pos?.segment.kind as PhaseKind | undefined) ?? "inhale";
  const phaseLeft = pos ? Math.max(1, Math.ceil(pos.segRemaining - 1e-6)) : 0;

  let headline: string;
  let sub: string;
  if (!run || !pos) {
    headline = `${shown.emoji} ${shown.name} ${shown.code}`;
    sub = `${cycles} siklus · ±${formatHuman(cycles * cycleSeconds(shown))}. Siap?`;
  } else if (run.finished) {
    headline = "Selesai 🌸";
    sub = `${totalCycles} siklus beres. Gimana, lebih enteng?`;
  } else if (pos.paused) {
    headline = "Dijeda";
    sub = "Napas biasa dulu, lanjut kalau udah siap.";
  } else {
    headline = PHASE_TEXT[kind].say;
    sub = PHASE_TEXT[kind].note;
  }

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage>
          <BreathOrb timerId={ID} preview={pattern} />

          {run && pos && (
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
              <span className="pop rounded-full bg-surface px-3 py-1 text-sm font-extrabold">
                Siklus <span className="tabular font-mono">{cycleNow}/{totalCycles}</span>
              </span>
              <span className="pop rounded-full bg-surface px-3 py-1 text-sm font-extrabold">
                <span className="tabular font-mono">{formatClock(pos.totalRemaining)}</span> lagi
              </span>
            </div>
          )}

          {run && pos && !run.finished && (
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-[41.5%] -translate-x-1/2 -translate-y-1/2 text-center transition-opacity",
                pos.paused && "opacity-60",
              )}
            >
              <span
                key={pos.index}
                className="animate-pop-in tabular block font-mono text-5xl font-bold leading-none text-[#1b1235] sm:text-6xl"
              >
                {phaseLeft}
              </span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center sm:bottom-4">
            <div
              key={run ? `${pos?.index}-${pos?.paused}-${run.finished}` : "idle"}
              className="pop animate-pop-in max-w-full rounded-3xl bg-surface px-5 py-2.5 text-center sm:px-6 sm:py-3"
            >
              <div className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{headline}</div>
              <div className="truncate text-xs font-bold text-ink-soft sm:text-sm">{sub}</div>
            </div>
          </div>
        </Stage>
      }
      controls={<RunControls handle={handle} onStart={start} startLabel="Mulai napas" addSeconds={null} />}
    >
      <Panel title="Pola napas">
        <Segmented
          className="grid grid-cols-2 sm:grid-cols-4"
          options={PATTERNS.map((p) => ({ value: p.id, label: `${p.emoji} ${p.name}`, hint: p.code }))}
          value={patternId}
          disabled={locked}
          onChange={setPatternId}
        />
        <div className="mt-4 rounded-2xl border-[2.5px] border-line bg-surface-2 p-3">
          <p className="font-bold leading-snug">{pattern.use}</p>
          <p className="mt-1 text-sm font-semibold text-ink-soft">{pattern.how}</p>
          <div className="mt-3 flex h-11 overflow-hidden rounded-xl border-[2.5px] border-line">
            {pattern.phases.map((ph, i) => (
              <div
                key={i}
                style={{ flexGrow: ph.seconds, background: PHASE_COLORS[ph.kind].main }}
                className={cn(
                  "flex min-w-0 basis-0 flex-col items-center justify-center leading-none text-[#1b1235]",
                  i > 0 && "border-l-[2.5px] border-line",
                  ph.kind === "hold2" && "opacity-80",
                )}
              >
                <span className="truncate text-xs font-extrabold">{SHORT[ph.kind]}</span>
                <span className="font-mono text-xs font-bold">{sec(ph.seconds)}d</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs font-bold text-ink-soft">
            1 siklus = {sec(cycleSeconds(pattern))} detik · ±{sec(Math.round(600 / cycleSeconds(pattern)) / 10)} napas/menit
          </p>
        </div>
      </Panel>

      <Panel title="Berapa lama?">
        <Segmented
          className="grid grid-cols-2 sm:grid-cols-4"
          options={MINUTES.map((m) => ({ value: m, label: `${m} mnt`, hint: `${cyclesFor(pattern, m)} siklus` }))}
          value={minutes}
          disabled={locked}
          onChange={setMinutes}
        />
        <p className="mt-3 text-sm font-semibold text-ink-soft">
          Dibulatkan ke siklus utuh: {cycles}× = <b className="font-mono text-ink">{formatClock(cycles * cycleSeconds(pattern))}</b>
        </p>
      </Panel>

      <Panel title="Suara">
        <Segmented
          className="grid grid-cols-2"
          options={[
            { value: "on", label: "🔔 Bunyi lembut", hint: "tiap ganti fase" },
            { value: "off", label: "🔕 Hening", hint: "lihat bolanya aja" },
          ]}
          value={sound ? "on" : "off"}
          disabled={locked}
          onChange={(v) => setSound(v === "on")}
        />
        {locked ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
            <Lock className="size-4" strokeWidth={2.5} /> Lagi jalan — ulang dulu buat ganti setelan.
          </p>
        ) : (
          <p className="mt-3 text-sm font-semibold text-ink-soft">
            Tips: duduk tegak, bahu turun, napas lewat hidung. Pusing? Berhenti dan napas biasa.
          </p>
        )}
      </Panel>
    </TimerShell>
  );
}
