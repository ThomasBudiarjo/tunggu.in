import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { cn } from "../core/cn";
import { formatClock, position } from "../core/engine";
import { useNow } from "../core/hooks";
import { useRuns } from "../core/runs";
import { TIMERS } from "../timers/registry";

/** One-tap presets that open Timer Bebas pre-filled. */
const QUICK = [
  { label: "Mie instan", emoji: "🍜", seconds: 180 },
  { label: "Masker wajah", emoji: "🧖", seconds: 15 * 60 },
  { label: "Jemur cucian", emoji: "👕", seconds: 2 * 3600 },
  { label: "Rebus pasta", emoji: "🍝", seconds: 9 * 60 },
  { label: "Parkir", emoji: "🅿️", seconds: 60 * 60 },
  { label: "Gosok gigi", emoji: "🪥", seconds: 120 },
  { label: "Istirahat mata", emoji: "👀", seconds: 20 },
  { label: "Nasi matang", emoji: "🍚", seconds: 25 * 60 },
];

const FEATURED = new Set(["timer", "fokus"]);

export function Home() {
  const runs = useRuns((s) => s.runs);
  const anyRunning = Object.keys(runs).length > 0;
  const now = useNow(500, anyRunning);

  return (
    <div className="space-y-10">
      <section className="relative pt-2 text-center sm:pt-6">
        <p className="pop mx-auto mb-5 inline-flex rotate-[-2deg] items-center gap-2 rounded-full bg-[#7bd88f] px-4 py-1 text-sm font-extrabold text-[#0f2414]">
          10 timer · tanpa iklan · jalan offline
        </p>
        <h1 className="mx-auto max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
          Nunggu jadi{" "}
          <span className="relative inline-block">
            <span className="relative z-10">seru</span>
            <span className="absolute inset-x-[-6px] bottom-1 -z-0 h-4 -rotate-2 rounded-md bg-[#ff7eb6] sm:h-6" />
          </span>
          .
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg font-semibold text-ink-soft">
          Timer yang beneran kepake — dari telur setengah matang sampai deep work — dan semuanya punya animasi sendiri.
        </p>
      </section>

      <section aria-label="Mulai cepat" className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-2">
        <div className="animate-marquee flex w-max gap-3 hover:[animation-play-state:paused]">
          {[...QUICK, ...QUICK].map((q, i) => (
            <Link
              key={i}
              to={`/timer?d=${q.seconds}&l=${encodeURIComponent(q.label)}`}
              className="pop pressable flex shrink-0 items-center gap-2 rounded-full bg-surface px-4 py-2 font-bold"
            >
              <span className="text-xl">{q.emoji}</span>
              {q.label}
              <span className="font-mono text-sm text-ink-soft">{formatClock(q.seconds)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {TIMERS.map((t, i) => {
          const run = runs[t.id];
          const pos = run ? position(run, now) : null;
          const featured = FEATURED.has(t.id);
          return (
            <Link
              key={t.id}
              to={`/${t.id}`}
              style={{ "--accent": t.accent, "--accent-ink": t.accentInk, animationDelay: `${i * 40}ms` } as CSSProperties}
              className={cn(
                "pop pressable group animate-pop-in relative flex min-h-44 flex-col justify-between overflow-hidden rounded-3xl bg-accent p-4 text-accent-ink sm:min-h-52 sm:p-5",
                featured && "col-span-2",
                i % 2 ? "hover:rotate-1" : "hover:-rotate-1",
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-white/25 transition-transform duration-500 group-hover:scale-150 sm:size-36"
              />
              <div className="relative flex items-start justify-between gap-2">
                <span className="text-4xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.25)] transition-transform group-hover:scale-125 group-hover:-rotate-12 sm:text-5xl">
                  {t.emoji}
                </span>
                {pos && (
                  <span className="rounded-full border-2 border-current bg-white/40 px-2 py-0.5 font-mono text-xs font-bold">
                    {run.finished ? "selesai!" : formatClock(pos.totalRemaining)}
                  </span>
                )}
              </div>
              <div className="relative">
                <h2 className="text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">{t.name}</h2>
                <p className="text-sm font-bold opacity-80">{t.tagline}</p>
                <p className={cn("mt-2 text-sm font-medium opacity-75", !featured && "hidden sm:block")}>{t.blurb}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
