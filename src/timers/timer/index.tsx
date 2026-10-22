import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TimerShell } from "../../components/TimerShell";
import { BigTime, Button, Panel, RunControls, Segmented, Stage } from "../../components/ui";
import { formatClock } from "../../core/engine";
import { useRun, useStoredState } from "../../core/hooks";
import { play } from "../../core/sound";
import { timerById } from "../registry";
import { WaterTank } from "./WaterTank";

const ID = "timer";

const PRESETS = [
  { emoji: "🍜", name: "Mie", seconds: 180 },
  { emoji: "🥚", name: "Telur", seconds: 420 },
  { emoji: "☕", name: "Kopi", seconds: 240 },
  { emoji: "🧖", name: "Masker", seconds: 900 },
  { emoji: "🍚", name: "Nasi", seconds: 1500 },
  { emoji: "🅿️", name: "Parkir", seconds: 3600 },
];

const NUDGES = [10, 30, 60, 300, 600, 1800];

export default function TimerBebas() {
  const def = timerById(ID)!;
  const handle = useRun(ID);
  const { run, pos } = handle;
  const [seconds, setSeconds] = useStoredState("timer.seconds", 300);
  const [label, setLabel] = useStoredState("timer.label", "");
  const [params, setParams] = useSearchParams();

  const start = (sec = seconds, name = label) =>
    handle.start({
      title: name || "Timer",
      emoji: def.emoji,
      path: `/${ID}`,
      segments: [{ label: name || "Timer", seconds: sec, cue: "none" }],
    });

  // Quick-start links from the home page: /timer?d=180&l=Mie%20instan
  const qd = Number(params.get("d"));
  const ql = params.get("l") ?? "";
  useEffect(() => {
    if (!qd) return;
    setSeconds(qd);
    setLabel(ql);
    if (!run || run.finished) {
      play("go");
      start(qd, ql);
    }
    setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qd, ql]);

  const shown = pos ? pos.totalRemaining : seconds;
  const title = run ? run.title : label || "Timer";

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage>
          <WaterTank timerId={ID} color={def.accent} />
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <div className="pop rounded-3xl bg-surface px-6 py-4 text-center">
              <BigTime seconds={shown} className="text-6xl sm:text-7xl" />
              <div className="mt-1 max-w-[16ch] truncate text-sm font-bold text-ink-soft">
                {run?.finished ? "Waktunya habis! 🎉" : pos?.paused ? `${title} · dijeda` : title}
              </div>
            </div>
          </div>
        </Stage>
      }
      controls={<RunControls handle={handle} onStart={() => start()} />}
    >
      <Panel title="Mau nunggu berapa lama?">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border-[2.5px] border-line bg-surface-2 px-4 py-3">
          <span className="font-mono text-4xl font-bold tabular">{formatClock(seconds)}</span>
          <Button size="sm" disabled={!!run} onClick={() => setSeconds(0)}>
            Nol-kan
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NUDGES.map((n) => (
            <Button
              key={n}
              size="sm"
              disabled={!!run}
              onClick={() => setSeconds((s) => Math.min(24 * 3600 - 1, s + n))}
            >
              +{n >= 60 ? `${n / 60} mnt` : `${n} dtk`}
            </Button>
          ))}
        </div>
        {run && <p className="mt-3 text-sm font-semibold text-ink-soft">Ulang dulu timer yang jalan buat ganti durasi.</p>}
      </Panel>

      <Panel title="Preset">
        <Segmented
          options={PRESETS.map((p) => ({ value: p.seconds, label: `${p.emoji} ${p.name}`, hint: formatClock(p.seconds) }))}
          value={seconds}
          disabled={!!run}
          onChange={(v) => {
            setSeconds(v);
            setLabel(PRESETS.find((p) => p.seconds === v)?.name ?? "");
          }}
        />
      </Panel>

      <Panel title="Nama (opsional)">
        <input
          value={label}
          maxLength={32}
          disabled={!!run}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="mis. Angkat jemuran"
          className="w-full rounded-2xl border-[2.5px] border-line bg-surface-2 px-4 py-3 font-bold outline-none placeholder:text-ink-soft/60 focus:bg-surface disabled:opacity-50"
        />
      </Panel>
    </TimerShell>
  );
}
