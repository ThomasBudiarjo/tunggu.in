import { Bell, BellOff, Monitor, Moon, Sun, Volume2, VolumeX, X } from "lucide-react";
import type { CSSProperties } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "../core/cn";
import { formatClock, position } from "../core/engine";
import { useNow } from "../core/hooks";
import { requestNotify } from "../core/notify";
import { useRuns } from "../core/runs";
import { useSettings } from "../core/settings";
import { timerById } from "../timers/registry";

function IconToggle({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="pop pressable grid size-10 place-items-center rounded-xl bg-surface"
    >
      {children}
    </button>
  );
}

function Header() {
  const { muted, toggleMute, theme, cycleTheme, notify, setNotify } = useSettings();
  return (
    <header className="sticky top-0 z-40 border-b-[2.5px] border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="group flex items-center gap-2">
          <span className="pop grid size-10 place-items-center rounded-xl bg-[#ffd23f] text-xl transition-transform group-hover:rotate-12">
            ⏳
          </span>
          <span className="text-2xl font-extrabold tracking-tight">
            tunggu<span className="text-[#ff5a36]">.in</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <IconToggle label={muted ? "Nyalakan suara" : "Matikan suara"} onClick={toggleMute}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </IconToggle>
          <IconToggle
            label={notify ? "Matikan notifikasi" : "Nyalakan notifikasi"}
            onClick={() => (notify ? setNotify(false) : void requestNotify())}
          >
            {notify ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          </IconToggle>
          <IconToggle
            label={`Tema: ${theme === "system" ? "ikut sistem" : theme === "dark" ? "gelap" : "terang"}`}
            onClick={cycleTheme}
          >
            {theme === "system" ? <Monitor className="size-5" /> : theme === "dark" ? <Moon className="size-5" /> : <Sun className="size-5" />}
          </IconToggle>
        </div>
      </div>
    </header>
  );
}

/** Floating pills for every engine run that's in progress, on any page. */
function RunningDock() {
  const runs = useRuns((s) => s.runs);
  const reset = useRuns((s) => s.reset);
  const now = useNow(250);
  const { pathname } = useLocation();
  const list = Object.values(runs).filter((r) => `/${r.timerId}` !== pathname);
  if (!list.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto p-1">
        {list.map((run) => {
          const def = timerById(run.timerId);
          const pos = position(run, now);
          const style = { "--accent": def?.accent, "--accent-ink": def?.accentInk } as CSSProperties;
          return (
            <div
              key={run.timerId}
              style={style}
              className={cn(
                "pop animate-pop-in flex shrink-0 items-center overflow-hidden rounded-full bg-surface",
                run.finished && "animate-wiggle bg-accent text-accent-ink",
              )}
            >
              <Link to={run.path} className="relative flex items-center gap-2 py-1.5 pl-2 pr-3">
                <span
                  className="absolute inset-y-0 left-0 -z-0 bg-accent/40"
                  style={{ width: `${pos.progress * 100}%` }}
                />
                <span className="relative text-xl">{run.emoji}</span>
                <span className="relative font-mono text-sm font-bold">
                  {run.finished ? "Selesai!" : formatClock(pos.totalRemaining)}
                </span>
                {pos.paused && !run.finished && <span className="relative text-xs font-bold opacity-60">jeda</span>}
              </Link>
              {run.finished && (
                <button
                  type="button"
                  aria-label="Tutup"
                  onClick={() => reset(run.timerId)}
                  className="mr-1 grid size-7 place-items-center rounded-full border-2 border-current"
                >
                  <X className="size-4" strokeWidth={3} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:pt-8">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-6xl px-4 pb-24 text-center text-sm font-semibold text-ink-soft">
        Dibuat dengan sabar di Indonesia 🇮🇩 · semua timer jalan offline
      </footer>
      <RunningDock />
    </div>
  );
}
