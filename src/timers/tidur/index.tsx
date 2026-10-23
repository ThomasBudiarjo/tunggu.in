import { ChevronRight, Lock } from "lucide-react";
import { useState } from "react";
import { TimerShell } from "../../components/TimerShell";
import { BigTime, Button, Panel, RunControls, Segmented, Stage, Stepper } from "../../components/ui";
import { cn } from "../../core/cn";
import { formatHuman, totalSeconds, type Position, type Segment } from "../../core/engine";
import { useNow, useRun, useStoredState } from "../../core/hooks";
import { timerById } from "../registry";
import { NapSky } from "./NapSky";

const ID = "tidur";
/** The last minute of the nap plays a soft chime before the real alarm. */
const WAKE_SECONDS = 60;

const NAPS = [
  {
    value: 10,
    emoji: "⚡",
    name: "Kilat",
    hint: "segar cepat",
    why: "Cukup buat ngusir ngantuk tanpa masuk tidur dalam. Bangun langsung on.",
  },
  {
    value: 20,
    emoji: "😌",
    name: "Klasik",
    hint: "paling aman",
    why: "Sweet spot power nap: otak segar, fokus naik, hampir pasti nggak pusing.",
  },
  {
    value: 26,
    emoji: "🚀",
    name: "NASA",
    hint: "ala pilot",
    why: "Durasi dari studi NASA ke pilot: kewaspadaan naik sampai 54%.",
  },
  {
    value: 90,
    emoji: "🌀",
    name: "Siklus penuh",
    hint: "1 siklus tidur",
    why: "Lewat semua tahap tidur lalu bangun di ujung siklus — nggak nanggung, nggak teler.",
  },
] as const;

const TIPS = [
  { emoji: "☕", title: "Coffee nap", body: "Minum kopi tepat sebelum rebahan. Kafeinnya baru nendang ±20 mnt kemudian — pas kamu bangun." },
  { emoji: "📵", title: "HP jauhin dikit", body: "Taruh di luar jangkauan tangan, tapi biarkan tab ini terbuka & volume nyala biar alarm kedengeran." },
  { emoji: "🕐", title: "Jam terbaik", body: "Antara 13.00–15.00, pas energi lagi turun alami. Lewat jam 4 sore bisa ganggu tidur malam." },
  { emoji: "🌑", title: "Gelap & adem", body: "Redupkan lampu, pakai penutup mata atau tutup muka pakai kain. Suhu agak sejuk bikin cepat lelap." },
  { emoji: "💧", title: "Habis bangun", body: "Langsung minum air, cuci muka, dan cari cahaya terang. Pusingnya hilang lebih cepat." },
  { emoji: "😮‍💨", title: "Nggak bisa tidur?", body: "Gapapa. Merem dan napas pelan aja tetap ngasih istirahat ke otak." },
];

const pad = (n: number) => String(n).padStart(2, "0");
const clockAt = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function buildSegments(napMin: number, fallMin: number): Segment[] {
  const segs: Segment[] = [
    {
      label: "Terlelap dulu…",
      seconds: fallMin * 60,
      kind: "fall",
      cue: "none",
      notify: false,
      note: "Merem, napas pelan. Waktu tidur dihitung setelah ini.",
    },
    {
      label: "Tidur",
      seconds: Math.max(0, napMin * 60 - WAKE_SECONDS),
      kind: "sleep",
      cue: "none",
      notify: false,
      note: "Zzz…",
    },
    {
      label: "Bangun pelan-pelan",
      seconds: WAKE_SECONDS,
      kind: "wake",
      cue: "soft",
      note: "Melek pelan-pelan, regangkan badan. Alarm 1 menit lagi.",
    },
  ];
  return segs.filter((s) => s.seconds > 0);
}

const PHASE_STYLE: Record<string, { emoji: string; short: string }> = {
  fall: { emoji: "😪", short: "Lelap" },
  sleep: { emoji: "💤", short: "Tidur" },
  wake: { emoji: "🌅", short: "Bangun" },
};

/** Proportional strip of the three phases with live fill. */
function PhaseStrip({ segments, pos, finished }: { segments: Segment[]; pos: Position | null; finished: boolean }) {
  const total = Math.max(1, totalSeconds(segments));
  return (
    <div className="pop flex gap-1 overflow-hidden rounded-2xl bg-surface p-1">
      {segments.map((seg, i) => {
        const style = PHASE_STYLE[seg.kind ?? "sleep"] ?? PHASE_STYLE.sleep;
        const fill = finished ? 1 : !pos ? 0 : i < pos.index ? 1 : i === pos.index ? pos.segProgress : 0;
        const current = !!pos && !finished && i === pos.index;
        return (
          <div
            key={i}
            style={{ flex: `${Math.max(seg.seconds, total * 0.3)} 1 0` }}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-xl bg-surface-2 px-1.5 py-1.5 sm:px-2",
              current && "ring-[2.5px] ring-line",
            )}
          >
            <div
              className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-300"
              style={{ width: `${fill * 100}%` }}
            />
            <div className={cn("relative truncate text-xs font-extrabold", fill > 0.5 ? "text-accent-ink" : "text-ink")}>
              {style.emoji} {style.short}
            </div>
            <div className={cn("relative truncate font-mono text-[11px] font-bold", fill > 0.5 ? "text-accent-ink/80" : "text-ink-soft")}>
              {formatHuman(seg.seconds)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TidurSiang() {
  const def = timerById(ID)!;
  const handle = useRun(ID);
  const { run, pos } = handle;
  const [storedNap, setNap] = useStoredState<number>("tidur.nap", 20);
  const [storedFall, setFall] = useStoredState<number>("tidur.fall", 7);
  const [tip, setTip] = useState(0);
  const nap = NAPS.find((n) => n.value === storedNap) ?? NAPS[1];
  const fall = Number.isFinite(storedFall) ? Math.min(20, Math.max(0, Math.round(storedFall))) : 7;
  // Idle and paused screens don't tick via useRun, so refresh the alarm clock.
  const now = useNow(5000, !run || (run.pausedAt !== null && !run.finished));

  const planned = buildSegments(nap.value, fall);
  const segments = run ? run.segments : planned;
  const total = totalSeconds(planned);
  const finished = !!run?.finished;
  const paused = !!pos?.paused && !finished;

  const start = () =>
    handle.start({
      title: def.name,
      emoji: def.emoji,
      path: `/${ID}`,
      segments: planned,
      meta: { nap: nap.value, fall },
    });

  // Alarm time: planned from now, or live from the run.
  const alarmAt = run
    ? finished
      ? (run.finishedAt ?? now)
      : now + (pos?.totalRemaining ?? 0) * 1000
    : now + total * 1000;

  const kind = pos?.segment.kind;
  const pill = !run
    ? "🌙 Siap rebahan?"
    : finished
      ? "☀️ Bangun, yuk!"
      : paused
        ? "⏸️ Dijeda — ngintip dulu"
        : kind === "fall"
          ? "😪 Terlelap dulu…"
          : kind === "wake"
            ? "🌅 Bangun pelan-pelan"
            : "💤 Lagi tidur";

  const sub = !run
    ? `Alarm jam ${clockAt(alarmAt)} kalau mulai sekarang`
    : finished
      ? "Minum air, cuci muka, cari cahaya ✨"
      : paused
        ? "Alarm ikut mundur selama dijeda"
        : kind === "fall" && pos
          ? `Tidur dihitung ${formatHuman(pos.segRemaining)} lagi · alarm ${clockAt(alarmAt)}`
          : `Alarm bunyi jam ${clockAt(alarmAt)}`;

  const t = TIPS[tip % TIPS.length];

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage className="bg-[#0b0d2a]">
          <NapSky timerId={ID} accent={def.accent} />
          <div className="pointer-events-none flex h-full flex-col items-center px-4 pt-4 text-center text-white sm:pt-6">
            <span
              className={cn(
                "rounded-full border-2 px-3 py-1 text-xs font-extrabold sm:text-sm",
                finished ? "border-[#1b1424] bg-[#ffd23f] text-[#1b1424]" : "border-white/25 bg-[#05061c]/55 text-white",
              )}
            >
              {pill}
            </span>
            {finished ? (
              <span className="mt-1 text-5xl font-extrabold tracking-tight [text-shadow:0_4px_0_rgba(20,8,40,0.55)] sm:text-7xl">
                Bangun!
              </span>
            ) : (
              <BigTime
                seconds={pos ? pos.totalRemaining : total}
                className={cn(
                  "mt-1 text-5xl [text-shadow:0_4px_0_rgba(0,0,0,0.45)] sm:text-7xl",
                  paused && "opacity-70",
                )}
              />
            )}
            <span className="mt-1.5 max-w-[30ch] text-xs font-bold text-white/75 [text-shadow:0_1px_0_rgba(0,0,0,0.5)] sm:text-sm">
              {sub}
            </span>
          </div>
        </Stage>
      }
      controls={
        <div className="space-y-3">
          <PhaseStrip segments={segments} pos={pos} finished={finished} />
          <RunControls
            handle={handle}
            onStart={start}
            startLabel="Mulai tidur"
            canSkip
            addSeconds={300}
            className="[&>button]:px-3 sm:[&>button]:px-8"
          />
        </div>
      }
    >
      <section className="pop flex items-center gap-4 rounded-3xl bg-accent p-4 text-accent-ink sm:p-5">
        <span className="animate-float text-4xl" aria-hidden>
          ⏰
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold opacity-80">
            {finished ? "Alarm sudah bunyi jam" : paused ? "Kalau lanjut sekarang, alarm jam" : "Alarm bunyi jam"}
          </div>
          <div className="font-mono text-4xl font-bold tabular leading-tight">{clockAt(alarmAt)}</div>
          <div className="text-sm font-semibold opacity-80">
            Total rebahan {formatHuman(totalSeconds(segments))}
            {fall > 0 || run ? "" : " · langsung tidur"}
          </div>
        </div>
      </section>

      <Panel title="Mau tidur berapa lama?">
        <Segmented
          options={NAPS.map((n) => ({
            value: n.value,
            label: `${n.emoji} ${n.name}`,
            hint: `${n.value} mnt · ${n.hint}`,
          }))}
          value={nap.value}
          disabled={!!run}
          onChange={setNap}
          className="grid grid-cols-2"
        />
        <p className="mt-3 rounded-2xl border-[2.5px] border-line bg-surface-2 px-4 py-3 text-sm font-semibold">
          <span className="mr-1">{nap.emoji}</span>
          {nap.why}
        </p>
      </Panel>

      <Panel title="Waktu buat terlelap">
        <Stepper
          label="Biasanya aku butuh"
          value={fall}
          onChange={setFall}
          min={0}
          max={20}
          format={(v) => `${v} mnt`}
          disabled={!!run}
        />
        <p className="mt-3 text-sm font-semibold text-ink-soft">
          Rata-rata orang butuh 5–10 mnt buat ketiduran. Alarm baru dihitung setelahnya, jadi tidurmu tetap{" "}
          <b className="text-ink">{nap.value} mnt</b> beneran.
        </p>
        {run && (
          <p className="mt-3 flex items-center gap-2 text-sm font-bold text-ink-soft">
            <Lock className="size-4" strokeWidth={3} /> Lagi tidur — ulang dulu buat ganti setelan.
          </p>
        )}
      </Panel>

      <Panel title="Tips tidur siang">
        <div className="flex items-start gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl border-[2.5px] border-line bg-surface-2 text-3xl">
            {t.emoji}
          </span>
          <div key={tip} className="animate-pop-in min-w-0">
            <h3 className="font-extrabold">{t.title}</h3>
            <p className="text-sm font-semibold text-ink-soft">{t.body}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {TIPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-2.5 rounded-full border-2 border-line transition-all",
                  i === tip % TIPS.length ? "w-6 bg-accent" : "w-2.5 bg-surface-2",
                )}
              />
            ))}
          </div>
          <Button size="sm" onClick={() => setTip((v) => (v + 1) % TIPS.length)}>
            Tip lain <ChevronRight className="size-4" strokeWidth={3} />
          </Button>
        </div>
      </Panel>
    </TimerShell>
  );
}
