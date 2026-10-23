import { ArrowLeft } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "../core/cn";
import { timerById } from "../timers/registry";

/**
 * Page frame shared by every timer: back link + title, a big animation
 * stage on the left (top on mobile), and controls/settings on the right.
 */
export function TimerShell({
  id,
  stage,
  controls,
  children,
  className,
}: {
  /** Registry id, e.g. "fokus". */
  id: string;
  /** Usually a <Stage> with the canvas + overlay. */
  stage: ReactNode;
  /** Primary controls, shown right under the stage. */
  controls?: ReactNode;
  /** Settings / extra panels. */
  children?: ReactNode;
  className?: string;
}) {
  const def = timerById(id);
  const style = def ? ({ "--accent": def.accent, "--accent-ink": def.accentInk } as CSSProperties) : undefined;
  return (
    <div style={style} className={cn("animate-pop-in", className)}>
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Kembali"
          className="pop pressable grid size-11 shrink-0 place-items-center rounded-2xl bg-surface"
        >
          <ArrowLeft className="size-5" strokeWidth={3} />
        </Link>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
            <span className="animate-float inline-block">{def?.emoji}</span> {def?.name}
          </h1>
          <p className="truncate text-sm font-semibold text-ink-soft">{def?.tagline}</p>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
        <div className="min-w-0 space-y-4 lg:sticky lg:top-24">
          {stage}
          {controls}
        </div>
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </div>
  );
}
