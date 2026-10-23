import { Minus, Pause, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../core/cn";
import { formatClock } from "../core/engine";
import type { RunHandle } from "../core/hooks";
import { play } from "../core/sound";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "accent" | "ink" | "plain";
  size?: "sm" | "md" | "lg";
};

/** Chunky outlined button with a hard shadow that squishes on press. */
export function Button({ variant = "plain", size = "md", className, onClick, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        play("tap");
        onClick?.(e);
      }}
      className={cn(
        "pop pressable inline-flex select-none items-center whitespace-nowrap justify-center gap-2 rounded-2xl font-bold disabled:opacity-40",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-12 px-5 text-base",
        size === "lg" && "h-16 px-8 text-xl",
        variant === "accent" && "bg-accent text-accent-ink",
        variant === "ink" && "bg-ink text-bg",
        variant === "plain" && "bg-surface text-ink",
        className,
      )}
      {...rest}
    />
  );
}

export interface Option<T extends string | number> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
}

/** Row of pill toggles. Wraps on small screens. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  className,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => {
              play("tap");
              onChange(o.value);
            }}
            className={cn(
              "pressable flex min-h-10 flex-col items-start justify-center rounded-xl border-[2.5px] border-line px-3 py-1.5 text-left text-sm font-bold leading-tight disabled:opacity-60",
              active ? "bg-accent text-accent-ink shadow-pop-sm" : "bg-surface text-ink",
            )}
          >
            <span>{o.label}</span>
            {o.hint && <span className="text-xs font-medium opacity-70">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** − value + with a label; good for minutes, rounds, players. */
export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format = (v) => String(v),
  disabled,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => ReactNode;
  disabled?: boolean;
}) {
  const set = (v: number) => {
    play("tap");
    onChange(Math.min(max, Math.max(min, Math.round(v * 1000) / 1000)));
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-[2.5px] border-line bg-surface px-3 py-2">
      <span className="text-sm font-bold text-ink-soft">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Kurangi"
          disabled={disabled || value <= min}
          onClick={() => set(value - step)}
          className="pressable grid size-8 place-items-center rounded-lg border-2 border-line bg-surface-2 disabled:opacity-30"
        >
          <Minus className="size-4" strokeWidth={3} />
        </button>
        <span className="tabular min-w-14 text-center font-mono text-lg font-bold">{format(value)}</span>
        <button
          type="button"
          aria-label="Tambah"
          disabled={disabled || value >= max}
          onClick={() => set(value + step)}
          className="pressable grid size-8 place-items-center rounded-lg border-2 border-line bg-surface-2 disabled:opacity-30"
        >
          <Plus className="size-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

/** Outlined card section with an optional title. */
export function Panel({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("pop rounded-3xl bg-surface p-4 sm:p-5", className)}>
      {title && <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink-soft">{title}</h2>}
      {children}
    </section>
  );
}

/** Big monospace clock digits. */
export function BigTime({ seconds, className, ceil }: { seconds: number; className?: string; ceil?: boolean }) {
  return (
    <span className={cn("tabular font-mono font-bold leading-none tracking-tight", className)}>
      {formatClock(seconds, { ceil })}
    </span>
  );
}

/**
 * The framed animation area. Put a full-size <canvas> as the first child
 * and any overlay (digits, labels) after it — overlays are centred on top.
 */
export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "pop relative isolate aspect-square w-full overflow-hidden rounded-[2rem] bg-surface-2 sm:aspect-[4/3] lg:aspect-square",
        "[&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:-z-10 [&>canvas]:h-full [&>canvas]:w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Standard controls for engine runs: Start → (Pause/Resume, +1 mnt,
 * Skip, Reset). `onStart` should call `handle.start({...})`.
 */
export function RunControls({
  handle,
  onStart,
  startLabel = "Mulai",
  canSkip = false,
  addSeconds = 60,
  className,
}: {
  handle: RunHandle;
  onStart: () => void;
  startLabel?: ReactNode;
  canSkip?: boolean;
  addSeconds?: number | null;
  className?: string;
}) {
  const { run, running } = handle;
  if (!run) {
    return (
      <div className={cn("flex", className)}>
        <Button
          variant="accent"
          size="lg"
          className="w-full text-2xl"
          onClick={() => {
            play("go");
            onStart();
          }}
        >
          <Play className="size-7 fill-current" /> {startLabel}
        </Button>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2 [&>button]:px-4 sm:[&>button]:px-8", className)}>
      {!run.finished && (
        <Button variant={running ? "ink" : "accent"} size="lg" className="flex-1" onClick={handle.toggle}>
          {running ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
          {running ? "Jeda" : "Lanjut"}
        </Button>
      )}
      {addSeconds ? (
        <Button size="lg" onClick={() => handle.addTime(addSeconds)} className={run.finished ? "flex-1" : ""}>
          +{addSeconds >= 60 ? `${addSeconds / 60} mnt` : `${addSeconds} dtk`}
        </Button>
      ) : null}
      {canSkip && !run.finished && (
        <Button size="lg" aria-label="Lewati" title="Lewati tahap ini" onClick={handle.skip}>
          <SkipForward className="size-6" />
        </Button>
      )}
      <Button
        size="lg"
        variant={run.finished ? "accent" : "plain"}
        aria-label="Ulang"
        title="Ulang dari awal"
        onClick={handle.reset}
        className={run.finished ? "flex-1" : ""}
      >
        <RotateCcw className="size-6" />
        {run.finished && "Selesai"}
      </Button>
    </div>
  );
}
