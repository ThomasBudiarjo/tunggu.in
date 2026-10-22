import { Check, Copy, Flag, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TimerShell } from "../../components/TimerShell";
import { Button, Panel, Stage } from "../../components/ui";
import { cn } from "../../core/cn";
import { useStoredState } from "../../core/hooks";
import { play, vibrate } from "../../core/sound";
import { timerById } from "../registry";
import { OrbitScene } from "./OrbitScene";
import { FAST_COLOR, SLOW_COLOR, planetColor } from "./palette";
import { EMPTY, copyText, elapsedOf, fmt, fmtDelta, lapInfo, sanitize, splitClock, type SwState } from "./state";

const ID = "stopwatch";

/** Text that follows the stopwatch every animation frame without re-rendering React. */
function Live({ sw, of, className }: { sw: SwState; of: (elapsed: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    let last = "";
    const tick = () => {
      const txt = of(elapsedOf(sw));
      if (txt !== last) node.textContent = last = txt;
      if (sw.startedAt !== null) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [sw, of]);
  return <span ref={ref} className={className} />;
}

const mainOf = (ms: number) => splitClock(ms).main;
const csOf = (ms: number) => splitClock(ms).cs;

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border-2 border-line bg-surface px-1.5 py-px font-mono text-[11px] font-bold text-ink shadow-pop-sm">
      {children}
    </kbd>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border-[2.5px] border-line bg-surface-2 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">
        {color && <span className="size-2.5 shrink-0 rounded-full border-2 border-line" style={{ background: color }} />}
        <span className="truncate">{label}</span>
      </div>
      <div className="tabular truncate font-mono text-base font-bold sm:text-lg">{value}</div>
    </div>
  );
}

export default function Stopwatch() {
  const def = timerById(ID)!;
  const [stored, setStored] = useStoredState<SwState>("stopwatch.state", EMPTY);
  const sw = useMemo(() => sanitize(stored), [stored]);
  const running = sw.startedAt !== null;
  const hasTime = running || sw.acc > 0;
  const info = useMemo(() => lapInfo(sw.laps), [sw.laps]);
  const lastTotal = sw.laps.length ? sw.laps[sw.laps.length - 1] : 0;
  const lapOf = useMemo(() => (ms: number) => fmt(ms - lastTotal), [lastTotal]);

  // Latest state for keyboard handlers and rapid taps (before React re-renders).
  const swRef = useRef(sw);
  useEffect(() => {
    swRef.current = sw;
  }, [sw]);
  const commit = (next: SwState) => {
    swRef.current = next;
    setStored(next);
  };

  const toggle = () => {
    const s = swRef.current;
    const now = Date.now();
    if (s.startedAt !== null) {
      commit({ ...s, startedAt: null, acc: elapsedOf(s, now) });
    } else {
      if (s.acc === 0) play("go");
      commit({ ...s, startedAt: now });
    }
  };
  const lap = () => {
    const s = swRef.current;
    if (s.startedAt === null) return;
    const t = elapsedOf(s);
    const prev = s.laps.length ? s.laps[s.laps.length - 1] : 0;
    if (t - prev < 50) return; // ignore accidental double taps
    play("pop");
    vibrate(15);
    commit({ ...s, laps: [...s.laps, t] });
  };
  const reset = () => {
    const s = swRef.current;
    if (s.startedAt !== null || (s.acc === 0 && !s.laps.length)) return;
    commit(EMPTY);
  };

  const actions = useRef({ toggle, lap, reset });
  actions.current = { toggle, lap, reset };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (e.code === "Space" || k === " ") {
        e.preventDefault();
        // Don't let a focused button also "click" on keyup.
        if (t instanceof HTMLButtonElement || t instanceof HTMLAnchorElement) t.blur();
        play("tap");
        actions.current.toggle();
      } else if (k === "l") {
        actions.current.lap();
      } else if (k === "r") {
        play("tap");
        actions.current.reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The canvas keeps the solar system clear of the readout card.
  const cardRef = useRef<HTMLDivElement>(null);
  const insetRef = useRef(0);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => {
      const parent = el.offsetParent as HTMLElement | null;
      if (parent) insetRef.current = parent.clientHeight - el.offsetTop;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.offsetParent) ro.observe(el.offsetParent);
    return () => ro.disconnect();
  }, []);

  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);
  const copy = async () => {
    const text = copyText(swRef.current);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
  };

  const fast = info.find((l) => l.kind === "fast");
  const slow = info.find((l) => l.kind === "slow");
  const avg = info.length ? lastTotal / info.length : 0;
  const status = !hasTime ? "Siap meluncur 🚀" : running ? null : "Dijeda dulu ☕";

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage className="aspect-[4/5] sm:aspect-[4/3] lg:aspect-square">
          <OrbitScene sw={sw} accent={def.accent} bottomInset={insetRef} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <span className="rounded-full border-2 border-line bg-surface/85 px-2.5 py-1 text-[11px] font-extrabold text-ink-soft backdrop-blur-sm sm:text-xs">
              ☄️ 1 putaran = 1 menit
            </span>
            {info.length > 0 && (
              <span
                key={info.length}
                className="animate-pop-in rounded-full border-2 border-line bg-accent px-2.5 py-1 text-[11px] font-extrabold text-accent-ink shadow-pop-sm sm:text-xs"
              >
                🪐 {info.length} lap
              </span>
            )}
          </div>
          <div ref={cardRef} className="absolute inset-x-0 bottom-0 flex justify-center p-4 sm:p-5">
            <div className="pop max-w-full rounded-3xl bg-surface px-5 py-2.5 text-center sm:px-7 sm:py-4">
              <div
                className={cn(
                  "tabular whitespace-nowrap font-mono font-bold leading-none tracking-tight",
                  "text-[clamp(2.25rem,11vw,4.25rem)]",
                )}
              >
                <Live sw={sw} of={mainOf} />
                <Live sw={sw} of={csOf} className="text-[0.6em] text-ink-soft" />
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-2 text-sm font-bold text-ink-soft">
                {status ?? (
                  <>
                    <span className="rounded-full bg-accent px-2 py-px text-xs font-extrabold text-accent-ink">
                      LAP {info.length + 1}
                    </span>
                    <Live sw={sw} of={lapOf} className="tabular font-mono" />
                  </>
                )}
              </div>
            </div>
          </div>
        </Stage>
      }
      controls={
        <div className="space-y-2.5">
          <div className="flex gap-2">
            {!hasTime ? (
              <Button variant="accent" size="lg" className="w-full text-2xl" onClick={toggle}>
                <Play className="size-7 fill-current" /> Mulai
              </Button>
            ) : (
              <>
                <Button variant={running ? "ink" : "accent"} size="lg" className="flex-1" onClick={toggle}>
                  {running ? <Pause className="size-6 fill-current" /> : <Play className="size-6 fill-current" />}
                  {running ? "Jeda" : "Lanjut"}
                </Button>
                {running ? (
                  <Button variant="accent" size="lg" className="flex-1" onClick={lap}>
                    <Flag className="size-6" strokeWidth={2.5} /> Lap
                  </Button>
                ) : (
                  <Button size="lg" className="flex-1" onClick={reset}>
                    <RotateCcw className="size-6" strokeWidth={2.5} /> Reset
                  </Button>
                )}
              </>
            )}
          </div>
          <p className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-bold text-ink-soft pointer-fine:flex">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>Spasi</Kbd> mulai/jeda
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>L</Kbd> lap
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>R</Kbd> reset
            </span>
          </p>
        </div>
      }
    >
      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-ink-soft">
            Catatan lap {info.length > 0 && <span className="text-ink">· {info.length}</span>}
          </h2>
          <Button size="sm" onClick={copy} disabled={!info.length} title="Salin semua lap">
            {copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" strokeWidth={2.5} />}
            {copied ? "Tersalin!" : "Salin"}
          </Button>
        </div>

        {info.length >= 3 ? (
          <div className="mb-3 grid grid-cols-3 gap-2">
            <Stat label="Rata-rata" value={fmt(avg)} />
            <Stat label="Tercepat" value={fast ? fmt(fast.duration) : "—"} color={FAST_COLOR} />
            <Stat label="Terlama" value={slow ? fmt(slow.duration) : "—"} color={SLOW_COLOR} />
          </div>
        ) : info.length > 0 ? (
          <p className="mb-3 text-xs font-bold text-ink-soft">
            {3 - info.length} lap lagi buat lihat yang tercepat 🟢 & terlama 🔴
          </p>
        ) : null}

        {hasTime || info.length ? (
          <ol className="-mr-1 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {hasTime && (
              <li className="flex items-center gap-3 rounded-2xl border-[2.5px] border-dashed border-line px-3 py-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-dashed border-line text-xs font-extrabold">
                  {info.length + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <Live sw={sw} of={lapOf} className="tabular block font-mono text-lg font-bold" />
                  <div className="text-xs font-bold text-ink-soft">{running ? "lagi jalan…" : "dijeda"}</div>
                </div>
                <Live sw={sw} of={fmt} className="tabular font-mono text-xs font-bold text-ink-soft" />
              </li>
            )}
            {[...info].reverse().map((l) => (
              <li
                key={l.n}
                className={cn(
                  "animate-pop-in flex items-center gap-3 rounded-2xl border-[2.5px] border-line px-3 py-2",
                  l.kind === "normal" && "bg-surface-2",
                )}
                style={
                  l.kind === "fast"
                    ? { background: `color-mix(in srgb, ${FAST_COLOR} 30%, var(--surface))` }
                    : l.kind === "slow"
                      ? { background: `color-mix(in srgb, ${SLOW_COLOR} 26%, var(--surface))` }
                      : undefined
                }
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-line text-xs font-extrabold text-[#1b1424] shadow-pop-sm"
                  style={{ background: planetColor(l) }}
                >
                  {l.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="tabular font-mono text-lg font-bold">{fmt(l.duration)}</div>
                  <div className="text-xs font-bold text-ink-soft">
                    {l.kind === "fast" ? "🟢 Tercepat" : l.kind === "slow" ? "🔴 Terlama" : `Lap ${l.n}`}
                  </div>
                </div>
                <div className="text-right">
                  {l.delta !== null && (
                    <div
                      className={cn(
                        "tabular font-mono text-sm font-bold",
                        l.delta < 0 && "text-emerald-700 dark:text-emerald-400",
                        l.delta > 0 && "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {fmtDelta(l.delta)}
                    </div>
                  )}
                  <div className="tabular font-mono text-xs font-bold text-ink-soft">{fmt(l.total)}</div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl border-[2.5px] border-dashed border-line bg-surface-2 px-4 py-6 text-center">
            <div className="animate-float mb-2 inline-block text-4xl">🪐</div>
            <p className="font-bold">Belum ada lap.</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">
              Tekan <b className="text-ink">Lap</b> pas stopwatch jalan — tiap lap jadi planet baru yang ikut ngorbit.
            </p>
          </div>
        )}
      </Panel>
    </TimerShell>
  );
}
