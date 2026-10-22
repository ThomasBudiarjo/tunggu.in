import { Lock, Snowflake, Thermometer } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { TimerShell } from "../../components/TimerShell";
import { BigTime, Panel, RunControls, Segmented, Stage } from "../../components/ui";
import { cn } from "../../core/cn";
import { formatClock } from "../../core/engine";
import { useRun, useStoredState } from "../../core/hooks";
import { play } from "../../core/sound";
import { timerById } from "../registry";
import {
  DONENESS,
  donenessById,
  makePlan,
  planSegments,
  SIZES,
  STEPS,
  TEMPS,
  type DonenessId,
  type EggMeta,
  type SizeId,
  type TempId,
} from "./data";
import { EggPot } from "./EggPot";

const ID = "telur";

const signed = (s: number) => (s === 0 ? "±0:00" : `${s < 0 ? "−" : "+"}${formatClock(Math.abs(s))}`);

/** Little halved-egg icon for the doneness picker. */
function EggSwatch({ color, runny }: { color: string; runny: boolean }) {
  return (
    <span className="relative grid h-11 w-9 shrink-0 place-items-center rounded-[50%/58%_58%_42%_42%] border-[2.5px] border-line bg-[#fffaf0]">
      <span className="mt-1.5 block size-5 rounded-full" style={{ background: color }}>
        {runny && <span className="ml-1 mt-1 block size-1.5 rounded-full bg-white/80" />}
      </span>
    </span>
  );
}

function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => {
        play("tap");
        onChange(!on);
      }}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border-[2.5px] border-line transition-colors disabled:opacity-40",
        on ? "bg-accent" : "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full border-2 border-line bg-surface transition-[left]",
          on ? "left-[calc(100%-1.45rem)]" : "left-0.5",
        )}
      />
    </button>
  );
}

export default function TelurRebus() {
  const def = timerById(ID)!;
  const handle = useRun(ID);
  const { run, pos } = handle;
  const [doneId, setDoneId] = useStoredState<DonenessId>("telur.done", "jammy");
  const [size, setSize] = useStoredState<SizeId>("telur.size", "L");
  const [temp, setTemp] = useStoredState<TempId>("telur.temp", "kulkas");
  const [iceOn, setIceOn] = useStoredState("telur.ice", true);
  const [thermal, setThermal] = useStoredState("telur.thermal", false);
  const coreRef = useRef<HTMLSpanElement | null>(null);

  const plan = makePlan(doneId, size, temp, iceOn);
  const locked = !!run;
  const meta = (run?.meta ?? {}) as Partial<EggMeta>;
  const runDone = donenessById(meta.done ?? doneId);

  const start = () => {
    const segments = planSegments(plan);
    const m: EggMeta = { done: plan.done.id, cook: plan.cook };
    handle.start({
      title: `Telur ${plan.done.name.toLowerCase()}`,
      emoji: def.emoji,
      path: `/${ID}`,
      segments,
      meta: { ...m },
    });
  };

  // ---- Sticker text -------------------------------------------------------
  let big: ReactNode = <BigTime seconds={plan.total} className="text-4xl sm:text-5xl" />;
  let title = plan.done.name;
  let sub = plan.ice ? `rebus ${formatClock(plan.cook)} + es ${formatClock(plan.ice)}` : `rebus ${formatClock(plan.cook)}`;
  if (run && pos) {
    const isIce = pos.segment.kind === "ice";
    const next = run.segments[pos.index + 1];
    big = <BigTime seconds={pos.segRemaining} className="text-4xl sm:text-5xl" />;
    title = isIce ? "Rendam air es 🧊" : "Lagi direbus 🔥";
    sub = next ? `lalu ${next.label.toLowerCase()} ${formatClock(next.seconds)}` : runDone.name;
    if (pos.paused) title = "Dijeda dulu";
    if (run.finished) {
      big = <span className="text-4xl leading-none sm:text-5xl">{runDone.emoji}</span>;
      title = "Siap disantap! 🎉";
      sub = isIce ? "Kupas dari bagian tumpul" : "Angkat & kupas, ya";
    }
  }
  const progress = run && pos ? pos.progress : 0;

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage>
          <EggPot timerId={ID} preview={doneId} thermal={thermal} accent={def.accent} coreRef={coreRef} />
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="pop flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-bold sm:text-sm">
                <Thermometer className="size-4" strokeWidth={2.5} />
                <span className="text-ink-soft">{run ? "inti" : "inti nanti"}</span>
                <span ref={coreRef} className="tabular font-mono">
                  –
                </span>
              </div>
              <button
                type="button"
                aria-pressed={thermal}
                onClick={() => {
                  play("tap");
                  setThermal((v) => !v);
                }}
                className={cn(
                  "pop pressable pointer-events-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold sm:text-sm",
                  thermal ? "bg-ink text-bg" : "bg-surface text-ink",
                )}
              >
                {thermal ? "🌡️ Termal" : "👀 Normal"}
              </button>
            </div>

            <div className="flex justify-center">
              <div className="pop w-full max-w-sm overflow-hidden rounded-3xl bg-surface">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  {big}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-extrabold leading-tight">{title}</div>
                    <div className="truncate text-xs font-semibold text-ink-soft sm:text-sm">
                      {!run && <span className="mr-1 rounded-md bg-accent px-1.5 py-px text-accent-ink">pratinjau</span>}
                      {sub}
                    </div>
                  </div>
                </div>
                <div className="h-1.5 bg-surface-2">
                  <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </Stage>
      }
      controls={
        <div className="space-y-2">
          <RunControls handle={handle} onStart={start} startLabel="Rebus!" canSkip={plan.ice > 0 || (run?.segments.length ?? 0) > 1} />
          {!run && (
            <p className="px-1 text-center text-sm font-semibold text-ink-soft">
              Tekan pas telur masuk ke air yang <b className="text-ink">sudah mendidih</b>.
            </p>
          )}
        </div>
      }
    >
      <Panel title="Matangnya mau gimana?">
        <div className="grid gap-2" role="radiogroup">
          {DONENESS.map((d) => {
            const active = d.id === doneId;
            const p = makePlan(d.id, size, temp, iceOn);
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={locked}
                onClick={() => {
                  play("tap");
                  setDoneId(d.id);
                }}
                className={cn(
                  "pressable flex items-center gap-3 rounded-2xl border-[2.5px] border-line px-3 py-2 text-left disabled:opacity-50",
                  active ? "bg-accent text-accent-ink shadow-pop-sm" : "bg-surface text-ink",
                )}
              >
                <EggSwatch color={d.swatch} runny={d.base <= 420} />
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold leading-tight">
                    {d.name} <span aria-hidden>{d.emoji}</span>
                  </span>
                  <span className={cn("block truncate text-sm font-medium", active ? "opacity-80" : "text-ink-soft")}>
                    {d.desc}
                  </span>
                </span>
                <span className="tabular font-mono text-lg font-bold">{formatClock(p.cook)}</span>
              </button>
            );
          })}
        </div>
        {locked && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
            <Lock className="size-4" /> Ulang dulu timernya buat ganti setelan.
          </p>
        )}
      </Panel>

      <Panel title="Telurnya kayak apa?">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-bold text-ink-soft">Ukuran</div>
            <Segmented
              className="grid grid-cols-4"
              options={SIZES.map((s) => ({ value: s.id, label: s.label, hint: s.hint }))}
              value={size}
              onChange={setSize}
              disabled={locked}
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-bold text-ink-soft">Suhu awal</div>
            <Segmented
              className="grid grid-cols-2"
              options={TEMPS.map((t) => ({ value: t.id, label: t.label, hint: t.hint }))}
              value={temp}
              onChange={setTemp}
              disabled={locked}
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border-[2.5px] border-line bg-surface-2 px-3 py-2.5">
            <Snowflake className="size-5 shrink-0" strokeWidth={2.5} />
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold leading-tight">Rendam air es</span>
              <span className="block text-sm font-medium text-ink-soft">
                Stop matang + gampang dikupas ({formatClock(plan.done.ice)})
              </span>
            </span>
            <Switch on={iceOn} onChange={setIceOn} disabled={locked} />
          </label>
        </div>
      </Panel>

      <Panel title="Hitungannya">
        <div className="font-mono text-sm">
          <Row label={`${plan.done.name} (L, kulkas)`} value={formatClock(plan.done.base)} />
          <Row label={`Ukuran ${size}`} value={signed(plan.sizeDelta)} soft={plan.sizeDelta === 0} />
          <Row label={temp === "ruang" ? "Suhu ruang" : "Dari kulkas"} value={signed(plan.tempDelta)} soft={plan.tempDelta === 0} />
          <div className="my-2 border-t-[2.5px] border-dashed border-line" />
          <Row label="🔥 Rebus" value={formatClock(plan.cook)} bold />
          {plan.ice > 0 && <Row label="🧊 Rendam es" value={formatClock(plan.ice)} />}
          <div className="mt-2 flex items-center justify-between rounded-xl bg-accent px-3 py-2 font-bold text-accent-ink">
            <span>Total</span>
            <span className="tabular text-lg">{formatClock(plan.total)}</span>
          </div>
        </div>
      </Panel>

      <Panel title="Cara rebus">
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full border-[2.5px] border-line bg-accent text-sm font-extrabold text-accent-ink">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-extrabold leading-tight">{s.title}</span>
                <span className="block text-sm font-medium text-ink-soft">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-2xl bg-surface-2 px-3 py-2 text-sm font-semibold text-ink-soft">
          💡 Di dataran tinggi air mendidih di bawah 100°C — tambah ±30 dtk tiap 1000 m. Mode{" "}
          <b className="text-ink">Termal</b> di atas nunjukin panas merambat ke kuning telur.
        </p>
      </Panel>
    </TimerShell>
  );
}

function Row({ label, value, bold, soft }: { label: string; value: string; bold?: boolean; soft?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-0.5", bold && "font-bold", soft && "text-ink-soft")}>
      <span className="min-w-0 truncate font-sans font-semibold">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}
