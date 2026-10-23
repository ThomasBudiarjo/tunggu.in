import { Hand } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../core/cn";
import {
  clockText,
  DANGER,
  INK,
  leftMs,
  mmss,
  PLAYER_COLORS,
  totalUsed,
  type Match,
  type Settings,
} from "./game";

/**
 * One player's big tappable clock. The active tile glows in the player's
 * colour; tapping it ends the turn.
 */
export function PlayerTile({
  i,
  name,
  match,
  settings,
  now,
  onTap,
  className,
}: {
  i: number;
  name: string;
  match: Match | null;
  settings: Settings;
  now: number;
  onTap: (i: number) => void;
  className?: string;
}) {
  const color = PLAYER_COLORS[i];
  const mode = match?.mode ?? settings.mode;

  if (!match) {
    const t = (mode === "catur" ? settings.base : settings.turn) * 1000;
    return (
      <button
        type="button"
        onClick={() => onTap(i)}
        className={cn(
          "pop pressable relative flex min-h-28 w-full flex-col justify-between gap-1 overflow-hidden rounded-3xl bg-surface p-3 text-left",
          className,
        )}
      >
        <TileHead name={name} color={color} right={null} />
        <span className="tabular font-mono text-3xl font-bold leading-none sm:text-4xl">{mmss(t)}</span>
        <span className="text-xs font-bold text-ink-soft">Tap = dia jalan duluan</span>
        <span className="absolute inset-x-0 bottom-0 h-2" style={{ background: color }} />
      </button>
    );
  }

  const active = match.active === i;
  const out = match.out[i];
  const flagged = match.flagged === i;
  const left = leftMs(match, i, now);
  const live = active && match.status === "running";
  const low = live && left < 10000;
  const turns = match.turns[i];
  const used = totalUsed(match, i, now);
  const avg = turns > 0 ? match.used[i] / turns : 0;
  const full = (match.mode === "catur" ? match.base : match.turn) * 1000;
  const frac = full > 0 ? Math.min(1, left / full) : 0;

  const lit = active && !out;
  const bg = flagged ? DANGER : low ? DANGER : lit ? color : undefined;

  let big: string;
  let caption: string;
  if (match.mode === "giliran" && !active) {
    big = mmss(used);
    caption = turns ? `total · rata² ${mmss(avg)}` : "total mikir";
  } else {
    big = clockText(left);
    caption =
      match.mode === "giliran"
        ? `total ${mmss(used)}`
        : turns
          ? `rata² ${mmss(avg)}/langkah`
          : "belum jalan";
  }
  if (flagged) caption = "Waktu habis!";
  else if (out) caption = "Gugur ☠️";
  else if (live) caption = "Udah? Tap di sini";
  else if (active && match.status === "paused") caption = "Dijeda";

  const right = (
    <span className="shrink-0 whitespace-nowrap rounded-full border-2 border-current px-2 py-0.5 text-[11px] font-extrabold leading-none tabular">
      {turns} lgkh
      {match.mode === "giliran" && match.flags[i] > 0 ? ` · ${match.flags[i]}× telat` : ""}
    </span>
  );

  return (
    <button
      type="button"
      onClick={() => onTap(i)}
      aria-pressed={active}
      aria-label={`${name}: ${big}${live ? ", tap untuk akhiri giliran" : ""}`}
      style={bg ? { background: bg, color: INK } : undefined}
      className={cn(
        "pop pressable relative flex min-h-28 w-full flex-col justify-between gap-1 overflow-hidden rounded-3xl p-3 text-left transition-[background-color,opacity,transform] duration-200",
        !bg && "bg-surface",
        lit && "z-10 shadow-pop-lg",
        low && "animate-pulse",
        out && !flagged && "opacity-50",
        !active && match.status === "running" && "opacity-80",
        className,
      )}
    >
      <TileHead name={name} color={color} right={right} ring={!!bg} />
      <span
        className={cn(
          "tabular font-mono font-bold leading-none tracking-tight",
          lit ? "text-5xl sm:text-6xl" : "text-3xl sm:text-4xl",
          out && "line-through",
        )}
      >
        {big}
      </span>
      <span className={cn("flex items-center gap-1 text-xs font-bold", !bg && "text-ink-soft")}>
        {live && <Hand className="size-3.5" strokeWidth={3} />}
        {caption}
        {live && <kbd className="ml-auto hidden rounded border-2 border-current px-1 text-[10px] sm:inline">Spasi</kbd>}
      </span>
      {match.mode === "catur" || active ? (
        <span className="absolute inset-x-0 bottom-0 h-2 bg-black/10">
          <span
            className="block h-full"
            style={{ width: `${frac * 100}%`, background: bg ? INK : color, opacity: bg ? 0.35 : 1 }}
          />
        </span>
      ) : (
        <span className="absolute inset-x-0 bottom-0 h-2" style={{ background: color }} />
      )}
    </button>
  );
}

function TileHead({
  name,
  color,
  right,
  ring,
}: {
  name: string;
  color: string;
  right: ReactNode;
  ring?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="size-4 shrink-0 rounded-full border-2"
        style={{ background: color, borderColor: ring ? INK : "var(--line)" }}
      />
      <span className="min-w-0 truncate text-base font-extrabold">{name}</span>
      <span className="ml-auto">{right}</span>
    </span>
  );
}
