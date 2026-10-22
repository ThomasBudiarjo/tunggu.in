import {
  ArrowDownToLine,
  Check,
  Coffee,
  Droplet,
  Droplets,
  Flower2,
  Hourglass,
  Layers,
  Leaf,
  Lightbulb,
  Lock,
  RotateCw,
  Thermometer,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { TimerShell } from "../../components/TimerShell";
import { BigTime, Panel, RunControls, Segmented, Stage, Stepper } from "../../components/ui";
import { cn } from "../../core/cn";
import { formatClock, totalSeconds, type Segment } from "../../core/engine";
import { useRun, useStoredState } from "../../core/hooks";
import { timerById } from "../registry";
import { BrewScene } from "./BrewScene";
import { RECIPES, amounts, clampCups, doseLabel, plan, recipeById, type Recipe, type StepKind } from "./recipes";

const ID = "seduh";

const KIND_ICON: Record<StepKind, LucideIcon> = {
  bloom: Flower2,
  pour: Droplets,
  wait: Hourglass,
  steep: Timer,
  stir: RotateCw,
  press: ArrowDownToLine,
  drip: Droplet,
  settle: Layers,
};

const optionsFor = (group: Recipe["group"], cups: number) =>
  RECIPES.filter((r) => r.group === group).map((r) => ({
    value: r.id,
    label: r.name,
    hint: formatClock(totalSeconds(plan(r, cups).segments)),
  }));

export default function Seduh() {
  const def = timerById(ID)!;
  const handle = useRun(ID);
  const { run, pos } = handle;
  const [recipeId, setRecipeId] = useStoredState("seduh.recipe", "v60");
  const [storedCups, setCups] = useStoredState("seduh.cups", 1);

  const picked = recipeById(recipeId) ?? RECIPES[0];
  // While brewing, everything comes from the run so a reload shows the same brew.
  const recipe = (run && recipeById(run.meta?.recipe)) || picked;
  const cups = clampCups(recipe, run ? Number(run.meta?.cups) || 1 : storedCups);
  const amt = amounts(recipe, cups);
  const preview = plan(recipe, cups);
  const segments: Segment[] = run ? run.segments : preview.segments;
  const total = totalSeconds(segments);

  const done = !!run?.finished || !!pos?.done;
  const idx = run && pos ? (done ? segments.length : pos.index) : -1;
  const current = run && pos && !done ? pos.segment : null;
  const next = idx >= 0 ? segments[idx + 1] : undefined;
  const paused = !!pos?.paused && !done;

  const start = () => {
    const p = plan(picked, storedCups);
    handle.start({
      title: `Seduh ${picked.name}`,
      emoji: def.emoji,
      path: `/${ID}`,
      segments: p.segments,
      meta: { recipe: picked.id, cups: p.amounts.cups, water: p.water },
    });
  };

  const starts: number[] = [];
  segments.reduce((acc, s) => {
    starts.push(acc);
    return acc + s.seconds;
  }, 0);

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage>
          <BrewScene timerId={ID} recipe={picked} cups={clampCups(picked, storedCups)} accent={def.accent} />
          <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4">
            <div className="pop w-[8.75rem] -rotate-2 rounded-3xl bg-surface px-3 py-2 sm:w-48 sm:px-4 sm:py-3">
              <div className="truncate text-[10px] font-extrabold uppercase tracking-wider text-ink-soft sm:text-xs">
                {!run
                  ? `${recipe.name} · ${cups} gelas`
                  : done
                    ? "Selesai 🎉"
                    : `${idx + 1}/${segments.length} · ${paused ? "dijeda" : recipe.name}`}
              </div>
              <div className="truncate text-[15px] font-extrabold leading-tight sm:text-lg">
                {!run ? "Siap seduh" : done ? "Siap diminum!" : current?.label}
              </div>
              <BigTime
                seconds={!run ? total : done ? 0 : (pos?.segRemaining ?? 0)}
                className={cn("mt-0.5 block text-[2.3rem] sm:text-5xl", paused && "opacity-50")}
              />
              {run && !done && pos ? (
                <div className="mt-1.5 h-2 overflow-hidden rounded-full border-2 border-line bg-surface-2 sm:h-2.5">
                  <div className="h-full bg-accent" style={{ width: `${pos.segProgress * 100}%` }} />
                </div>
              ) : (
                <div className="mt-1 truncate text-[10px] font-bold text-ink-soft sm:text-xs">
                  {done ? "Nikmati selagi hangat" : `${segments.length} langkah · ${amt.water} ml`}
                </div>
              )}
            </div>
          </div>
        </Stage>
      }
      controls={
        <>
          <NowCard
            recipe={recipe}
            current={current}
            next={next}
            done={done}
            idle={!run}
            totalLeft={pos?.totalRemaining ?? total}
            summary={`${recipe.group === "kopi" ? "Kopi" : "Teh"} ${doseLabel(recipe, amt.dose)} · Air ${amt.water} ml · ${recipe.temp}°C`}
          />
          <RunControls handle={handle} onStart={start} startLabel="Mulai seduh" canSkip addSeconds={30} />
        </>
      }
    >
      <Panel title="Mau seduh apa?">
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-soft">
              <Coffee className="size-3.5" strokeWidth={3} /> Kopi
            </div>
            <Segmented options={optionsFor("kopi", run ? cups : storedCups)} value={recipe.id} disabled={!!run} onChange={setRecipeId} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-soft">
              <Leaf className="size-3.5" strokeWidth={3} /> Teh
            </div>
            <Segmented options={optionsFor("teh", run ? cups : storedCups)} value={recipe.id} disabled={!!run} onChange={setRecipeId} />
          </div>
          <Stepper
            label="Berapa gelas?"
            value={cups}
            min={1}
            max={recipe.maxCups}
            disabled={!!run}
            onChange={setCups}
            format={(v) => `${v} ${recipe.group === "kopi" ? "☕" : "🍵"}`}
          />

          <div className="grid grid-cols-3 gap-2">
            <Tile icon={recipe.group === "kopi" ? Coffee : Leaf} label={recipe.group === "kopi" ? "Kopi" : "Teh"} value={doseLabel(recipe, amt.dose)} />
            <Tile icon={Droplets} label="Air" value={`${amt.water} ml`} />
            <Tile icon={Thermometer} label="Suhu" value={`${recipe.temp}°C`} />
          </div>
          <div className="rounded-2xl border-[2.5px] border-dashed border-line/40 px-3 py-2.5 text-sm">
            <p className="font-bold">
              {recipe.short}
              {recipe.ratio && <span className="text-ink-soft"> · rasio {recipe.ratio}</span>}
            </p>
            <p className="mt-0.5 font-semibold text-ink-soft">
              {recipe.detailLabel}: {recipe.detail}
            </p>
            <p className="mt-1.5 flex gap-1.5 font-semibold text-ink-soft">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={3} />
              {recipe.tip}
            </p>
          </div>
          {run && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
              <Lock className="size-4" strokeWidth={3} /> Lagi nyeduh. Ulang dulu buat ganti resep.
            </p>
          )}
        </div>
      </Panel>

      <Panel title={`Langkah · total ${formatClock(total)}`}>
        <ol className="space-y-2">
          {segments.map((s, i) => {
            const Icon = KIND_ICON[(s.kind as StepKind) ?? "steep"] ?? Timer;
            const isDone = i < idx;
            const isNow = i === idx;
            return (
              <li
                key={i}
                className={cn(
                  "relative flex items-start gap-3 overflow-hidden rounded-2xl border-[2.5px] border-line px-3 py-2.5 transition-colors",
                  isNow ? "bg-accent text-accent-ink shadow-pop-sm" : "bg-surface-2",
                  isDone && "opacity-55",
                )}
              >
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl border-2 border-line bg-surface text-ink",
                    isNow && !paused && "animate-wiggle",
                  )}
                >
                  {isDone ? <Check className="size-5" strokeWidth={3.5} /> : <Icon className="size-5" strokeWidth={2.5} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn("font-extrabold", isDone && "line-through decoration-2")}>{s.label}</span>
                    <span className="tabular shrink-0 font-mono text-xs font-bold opacity-75">
                      {isNow && pos ? `${formatClock(pos.segRemaining)} lagi` : `${formatClock(starts[i], { ceil: false })}–${formatClock(starts[i] + s.seconds, { ceil: false })}`}
                    </span>
                  </div>
                  <p className={cn("text-sm font-medium leading-snug", isNow ? "opacity-90" : "text-ink-soft")}>{s.note}</p>
                </div>
                {isNow && pos && (
                  <div
                    className="absolute bottom-0 left-0 h-1.5 bg-ink/60"
                    style={{ width: `${pos.segProgress * 100}%` }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
    </TimerShell>
  );
}

function Tile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border-[2.5px] border-line bg-surface-2 px-2 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">
        <Icon className="size-3.5" strokeWidth={3} /> {label}
      </div>
      <div className="tabular mt-0.5 truncate font-mono text-lg font-bold leading-tight sm:text-xl">{value}</div>
    </div>
  );
}

function NowCard({
  recipe,
  current,
  next,
  done,
  idle,
  totalLeft,
  summary,
}: {
  recipe: Recipe;
  current: Segment | null;
  next: Segment | undefined;
  done: boolean;
  idle: boolean;
  totalLeft: number;
  summary: string;
}) {
  let eyebrow: string;
  let body: string;
  let foot: string | null = null;
  if (idle) {
    eyebrow = "Siapkan dulu";
    body = summary;
    foot = `${recipe.detailLabel}: ${recipe.detail}`;
  } else if (done) {
    eyebrow = "Sudah jadi!";
    body = recipe.done;
  } else {
    eyebrow = `Sekarang · sisa ${formatClock(totalLeft)}`;
    body = current?.note ?? "";
    foot = next ? `Berikutnya: ${next.label} (${formatClock(next.seconds)})` : "Ini langkah terakhir!";
  }
  return (
    <div className={cn("pop rounded-3xl px-4 py-3", done ? "bg-accent text-accent-ink" : "bg-surface")} aria-live="polite">
      <div className={cn("text-xs font-extrabold uppercase tracking-wider", done ? "opacity-75" : "text-ink-soft")}>
        {eyebrow}
      </div>
      <p className="mt-0.5 text-lg font-extrabold leading-snug">{body}</p>
      {foot && <p className="mt-1 text-sm font-semibold text-ink-soft">{foot}</p>}
    </div>
  );
}
