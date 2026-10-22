import { Lock, SkipForward } from "lucide-react";
import { TimerShell } from "../../components/TimerShell";
import { BigTime, Button, Panel, RunControls, Segmented, Stage, Stepper } from "../../components/ui";
import { cn } from "../../core/cn";
import { formatHuman, totalSeconds, type Segment } from "../../core/engine";
import { useNow, useRun, useStoredState } from "../../core/hooks";
import { timerById } from "../registry";
import { buildSegments, clockAt, dayKey, presetById, PRESETS, type PresetId } from "./plan";
import { ID, lastDays, useFokusStats } from "./stats";
import { TreeScene } from "./TreeScene";

const KIND_BG: Record<string, string> = {
  focus: "bg-accent text-accent-ink",
  rest: "bg-[#ffd23f] text-[#2b2100]",
  long: "bg-[#ff9f1c] text-[#2b1600]",
};

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function Timeline({ segments, progress }: { segments: Segment[]; progress: number | null }) {
  const total = totalSeconds(segments) || 1;
  return (
    <div className="pop relative flex h-10 overflow-hidden rounded-xl bg-surface-2">
      {segments.map((seg, i) => (
        <div
          key={i}
          title={`${seg.label} · ${formatHuman(seg.seconds)}`}
          style={{ width: `${(seg.seconds / total) * 100}%` }}
          className={cn(
            "grid min-w-0 place-items-center overflow-hidden border-line text-[11px] font-extrabold",
            i > 0 && "border-l-2",
            KIND_BG[seg.kind ?? "focus"],
          )}
        >
          <span className="truncate px-0.5">{seg.kind === "focus" ? "🌱" : seg.kind === "long" ? "🛋️" : "☕"}</span>
        </div>
      ))}
      {progress !== null && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 bg-ink/25" style={{ width: `${progress * 100}%` }} />
          <div
            className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-ink"
            style={{ left: `${progress * 100}%` }}
          />
        </>
      )}
    </div>
  );
}

function TodayPanel() {
  const days = useFokusStats((s) => s.days);
  useNow(60_000); // roll over at midnight
  const week = lastDays(days, 7);
  const today = days[dayKey()] ?? { sec: 0, n: 0 };
  const max = Math.max(25 * 60, ...week.map((d) => d.day.sec));
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    if (week[i].day.sec > 0) streak++;
    else if (i === week.length - 1) continue; // today not started yet is fine
    else break;
  }
  const mins = Math.floor(today.sec / 60);
  return (
    <Panel title="Hari ini">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="tabular font-mono text-5xl font-bold leading-none">{mins}</span>
            <span className="text-lg font-extrabold text-ink-soft">mnt fokus</span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-ink-soft">
            {today.n ? `${today.n} sesi beres 🌳` : "Belum ada sesi. Gas satu dulu!"}
            {streak > 1 && <span className="ml-2 text-ink">🔥 {streak} hari beruntun</span>}
          </p>
        </div>
        <div className="flex h-20 shrink-0 items-end gap-1.5" aria-label="Menit fokus 7 hari terakhir">
          {week.map(({ key, date, day }, i) => {
            const isToday = i === week.length - 1;
            return (
              <div key={key} className="flex flex-col items-center gap-1" title={`${formatHuman(day.sec)} · ${day.n} sesi`}>
                <div className="flex h-14 w-4 items-end overflow-hidden rounded-md border-2 border-line bg-surface-2 sm:w-5">
                  <div
                    className={cn("w-full", isToday ? "bg-accent" : "bg-ink/35")}
                    style={{ height: `${Math.min(100, (day.sec / max) * 100)}%` }}
                  />
                </div>
                <span className={cn("text-[10px] font-extrabold", isToday ? "text-ink" : "text-ink-soft")}>
                  {DAY_NAMES[date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

export default function Fokus() {
  const def = timerById(ID)!;
  const handle = useRun(ID);
  const { run, pos } = handle;
  const [presetId, setPresetId] = useStoredState<PresetId>("fokus.preset", "25/5");
  const [sessions, setSessions] = useStoredState("fokus.sessions", 4);
  const [task, setTask] = useStoredState("fokus.task", "");
  const now = useNow(15_000);
  const preset = presetById(presetId);
  const locked = !!run;

  const plan = run ? run.segments : buildSegments(preset, sessions, task.trim());
  const focusIdx = plan.map((s, i) => (s.kind === "focus" ? i : -1)).filter((i) => i >= 0);
  const focusTotal = focusIdx.reduce((a, i) => a + plan[i].seconds, 0);

  const start = () => {
    const name = task.trim();
    handle.start({
      title: name ? `Fokus: ${name}` : "Fokus",
      emoji: def.emoji,
      path: `/${ID}`,
      segments: buildSegments(preset, sessions, name),
      meta: { task: name, preset: preset.id },
    });
  };

  // ── what the stage says ──
  const finished = !!run?.finished || !!pos?.done;
  const kind = pos?.segment.kind ?? "focus";
  const runTask = (run?.meta?.task as string | undefined) ?? "";
  const doneSessions = pos ? focusIdx.filter((i) => pos.done || i < pos.index).length : 0;
  const currentSession = pos && kind === "focus" ? focusIdx.indexOf(pos.index) : -1;
  const sessionNo = currentSession >= 0 ? currentSession + 1 : doneSessions;

  let pill: { text: string; cls: string };
  let sub: string;
  if (!run || !pos) {
    pill = { text: `🌱 Siap tanam · ${sessions} sesi`, cls: KIND_BG.focus };
    sub = task.trim() || "Pohonnya tumbuh tiap kamu fokus.";
  } else if (finished) {
    pill = { text: "🌸 Pohonmu mekar!", cls: "bg-[#ff8fc0] text-[#2e0a1b]" };
    sub = `${focusIdx.length} sesi · ${formatHuman(focusTotal)} fokus. Mantap!`;
  } else if (pos.paused) {
    pill = { text: "💤 Dijeda", cls: "bg-surface-2 text-ink" };
    sub = "Pohonnya ikut tidur. Lanjut kalau siap.";
  } else if (kind === "focus") {
    pill = { text: `🌱 Fokus ${sessionNo}/${focusIdx.length}`, cls: KIND_BG.focus };
    sub = runTask || "Satu hal dulu. Yang lain nanti.";
  } else {
    pill = { text: kind === "long" ? "🛋️ Istirahat panjang" : "☕ Istirahat", cls: KIND_BG[kind] ?? KIND_BG.rest };
    sub = pos.segment.note ?? "Rehat dulu.";
  }

  const shown = pos ? pos.segRemaining : preset.focus * 60;
  const restTotal = totalSeconds(plan) - focusTotal;
  // `now` is live while a run exists (useNow returns Date.now() when inactive).
  const finishClock = clockAt(now + (pos ? pos.totalRemaining : totalSeconds(plan)) * 1000);

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-square">
          <TreeScene timerId={ID} idleSessions={sessions} />
          <div className="pointer-events-none flex h-full flex-col items-start justify-between p-3 sm:p-4">
            <div className="pop w-fit max-w-[min(85%,22rem)] rounded-3xl bg-surface px-4 py-2.5 sm:px-5 sm:py-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className={cn("rounded-full border-2 border-line px-2.5 py-0.5 text-xs font-extrabold", pill.cls)}>
                  {pill.text}
                </span>
                <span className="flex gap-1" aria-label={`Sesi ${sessionNo} dari ${focusIdx.length}`}>
                  {focusIdx.map((segIdx, k) => {
                    const done = !!pos && (pos.done || segIdx < pos.index);
                    const current = !!pos && !pos.done && segIdx === pos.index;
                    return (
                      <span
                        key={segIdx}
                        title={`Sesi ${k + 1}`}
                        className={cn(
                          "size-3 rounded-full border-2 border-line",
                          done ? "bg-accent" : "bg-surface-2",
                          current && "animate-pulse bg-accent/60 ring-2 ring-accent ring-offset-1 ring-offset-surface",
                        )}
                      />
                    );
                  })}
                </span>
              </div>
              <BigTime seconds={finished ? 0 : shown} className="mt-1.5 block text-5xl sm:text-6xl" />
              <p className="mt-1 line-clamp-1 text-sm font-bold leading-snug text-ink-soft sm:line-clamp-2">{sub}</p>
            </div>
            {!finished && (
              <span className="pop self-end rounded-full bg-surface px-3 py-1 text-xs font-extrabold">
                {run ? (pos?.paused ? `Selesai ±${finishClock} kalau lanjut` : `Selesai jam ${finishClock}`) : `Kalau mulai sekarang: selesai ${finishClock}`}
              </span>
            )}
          </div>
        </Stage>
      }
      controls={
        <div className="space-y-2">
          <RunControls
            handle={handle}
            onStart={start}
            startLabel="Mulai fokus"
            addSeconds={300}
            className="flex-nowrap [&>button]:px-4 sm:[&>button]:px-8"
          />
          {run && !finished && kind !== "focus" && (
            <Button className="w-full" onClick={handle.skip}>
              <SkipForward className="size-5" /> Lewati istirahat, langsung fokus
            </Button>
          )}
        </div>
      }
    >
      <Panel title="Lagi ngerjain apa?">
        <input
          value={locked ? runTask : task}
          maxLength={40}
          disabled={locked}
          onChange={(e) => setTask(e.target.value)}
          placeholder="mis. Bab 2 skripsi, laporan bulanan…"
          className="w-full rounded-2xl border-[2.5px] border-line bg-surface-2 px-4 py-3 font-bold outline-none placeholder:text-ink-soft/60 focus:bg-surface disabled:opacity-60"
        />
      </Panel>

      <Panel title="Ritme">
        <Segmented
          options={PRESETS.map((p) => ({ value: p.id, label: `${p.emoji} ${p.id}`, hint: p.name }))}
          value={preset.id}
          disabled={locked}
          onChange={setPresetId}
          className="grid grid-cols-2 sm:grid-cols-4"
        />
        <p className="mt-3 text-sm font-semibold text-ink-soft">{preset.blurb}</p>
        <div className="mt-3">
          <Stepper
            label="Jumlah sesi"
            value={sessions}
            min={1}
            max={8}
            disabled={locked}
            onChange={setSessions}
            format={(v) => `${v}×`}
          />
        </div>
        {locked && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-ink-soft">
            <Lock className="size-4" /> Ulang dulu kalau mau ganti ritme.
          </p>
        )}
      </Panel>

      <Panel title="Rencana">
        <Timeline segments={plan} progress={pos ? pos.progress : null} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
          <span>🌱 {formatHuman(focusTotal)} fokus</span>
          {restTotal > 0 && <span className="text-ink-soft">☕ {formatHuman(restTotal)} istirahat</span>}
          <span className="text-ink-soft">⏱️ total {formatHuman(totalSeconds(plan))}</span>
        </div>
      </Panel>

      <TodayPanel />
    </TimerShell>
  );
}
