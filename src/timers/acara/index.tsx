import { CalendarPlus, Check, Repeat, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TimerShell } from "../../components/TimerShell";
import { Button, Panel, Segmented, Stage } from "../../components/ui";
import { cn } from "../../core/cn";
import { useNow, useStoredState } from "../../core/hooks";
import { play, vibrate } from "../../core/sound";
import { timerById } from "../registry";
import {
  DAY,
  EMOJIS,
  chip,
  fmtDate,
  fmtShort,
  fmtTime,
  friendly,
  newId,
  parseLocal,
  parts,
  resolve,
  sortEvents,
  suggestions,
  type Ev,
  type Repeat as RepeatKind,
  type Resolved,
} from "./events";
import { Fireworks, type SkyState } from "./Fireworks";

const ID = "acara";

interface Draft {
  name: string;
  emoji: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  repeat: RepeatKind;
}

const EMPTY_DRAFT: Draft = { name: "", emoji: "🎉", date: "", time: "00:00", repeat: "once" };

function seed(): Ev[] {
  const s = suggestions(Date.now())[0];
  return [{ id: "seed-ny", name: s.name, emoji: s.emoji, at: s.at, created: Date.now() }];
}

export default function Acara() {
  const def = timerById(ID)!;
  const now = useNow(250);
  const [events, setEvents] = useStoredState<Ev[]>("acara.events", seed());
  const [activeId, setActiveId] = useStoredState<string | null>("acara.active", null);
  const [draft, setDraft] = useStoredState<Draft>("acara.draft", EMPTY_DRAFT);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const formRef = useRef<HTMLElement | null>(null);
  const dateRef = useRef<HTMLInputElement | null>(null);

  const list = useMemo(() => sortEvents(events.filter((e) => !Number.isNaN(parseLocal(e.at))).map((e) => resolve(e, now))), [events, now]);
  const active = list.find((r) => r.ev.id === activeId) ?? list[0] ?? null;

  // Live cues for the selected event: soft ticks in the last 10 s, alarm at T-0.
  const prev = useRef<{ id: string; rem: number } | null>(null);
  useEffect(() => {
    if (!active) return;
    const p = prev.current;
    prev.current = { id: active.ev.id, rem: active.rem };
    if (!p || p.id !== active.ev.id) return;
    if (p.rem > 0 && active.rem <= 0 && p.rem < 5000) {
      play("alarm");
      vibrate([300, 120, 300, 120, 600]);
    } else if (active.rem > 0 && active.rem <= 10_000 && Math.ceil(p.rem / 1000) !== Math.ceil(active.rem / 1000)) {
      play("tick");
    }
  }, [active]);

  const sky: SkyState = useMemo(
    () => (active ? { at: active.target, from: active.from, key: `${active.ev.id}:${active.ev.at}` } : { at: null, from: 0, key: "none" }),
    [active?.ev.id, active?.ev.at, active?.target, active?.from], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const addEvent = (e: Omit<Ev, "id" | "created">) => {
    const ev: Ev = { ...e, id: newId(), created: Date.now() };
    setEvents((l) => [...l, ev].slice(-40));
    setActiveId(ev.id);
    play("pop");
  };

  const remove = (id: string) => {
    setEvents((l) => l.filter((e) => e.id !== id));
    setConfirmId(null);
    if (activeId === id) setActiveId(null);
  };

  const ideas = suggestions(now).filter((s) => !events.some((e) => e.name === s.name));
  const openBirthday = () => {
    setDraft({ ...draft, name: "Ulang tahunku", emoji: "🎂", repeat: "year" });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => dateRef.current?.focus(), 350);
  };

  const draftAt = draft.date ? `${draft.date}T${draft.time || "00:00"}` : "";
  const draftValid = !!draftAt && !Number.isNaN(parseLocal(draftAt));
  const draftPast = draftValid && draft.repeat === "once" && parseLocal(draftAt) <= now;
  const save = () => {
    if (!draftValid) return;
    addEvent({ name: draft.name.trim() || "Acara spesial", emoji: draft.emoji, at: draftAt, repeat: draft.repeat });
    setDraft({ ...EMPTY_DRAFT, emoji: draft.emoji });
  };

  return (
    <TimerShell
      id={ID}
      stage={
        <Stage className="bg-[#120d33]">
          <Fireworks sky={sky} accent={def.accent} />
          <Overlay active={active} now={now} />
        </Stage>
      }
      controls={
        <Panel title={`Acaramu${events.length ? ` · ${events.length}` : ""}`}>
          {list.length === 0 ? (
            <p className="text-sm font-semibold text-ink-soft">Masih kosong. Ambil dari ide cepat atau bikin sendiri 👇</p>
          ) : (
            <ul className="space-y-2 [contain:inline-size]">
              {list.map((r) => {
                const on = r.ev.id === active?.ev.id;
                const party = r.rem <= 0 && r.rem > -DAY;
                const past = r.rem <= -DAY;
                return (
                  <li key={r.ev.id} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        play("tap");
                        setActiveId(r.ev.id);
                        setConfirmId(null);
                      }}
                      aria-pressed={on}
                      className={cn(
                        "pressable flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border-[2.5px] border-line p-2 text-left",
                        on ? "bg-accent text-accent-ink shadow-pop-sm" : "bg-surface-2 text-ink",
                        past && !on && "opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-xl border-2 border-line bg-surface text-2xl",
                          party && "animate-wiggle",
                        )}
                      >
                        {r.ev.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 break-words font-extrabold leading-tight">{r.ev.name}</span>
                        <span className="flex items-center gap-1 truncate text-xs font-semibold opacity-75">
                          {fmtShort(r.target)} · {fmtTime(r.target)}
                          {r.ev.repeat && r.ev.repeat !== "once" && (
                            <Repeat
                              className="size-3 shrink-0"
                              strokeWidth={3}
                              aria-label={r.ev.repeat === "year" ? "tiap tahun" : "tiap bulan"}
                            />
                          )}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "tabular shrink-0 whitespace-nowrap rounded-full border-2 border-line px-2 py-0.5 text-xs font-extrabold",
                          on ? "bg-surface text-ink" : party ? "bg-accent text-accent-ink" : "bg-surface text-ink",
                        )}
                      >
                        {chip(r, now)}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={confirmId === r.ev.id ? `Yakin hapus ${r.ev.name}` : `Hapus ${r.ev.name}`}
                      onClick={() => {
                        play("tap");
                        if (confirmId === r.ev.id) remove(r.ev.id);
                        else setConfirmId(r.ev.id);
                      }}
                      className={cn(
                        "pressable grid min-w-10 shrink-0 place-items-center rounded-2xl border-[2.5px] border-line px-2 text-xs font-extrabold",
                        confirmId === r.ev.id ? "bg-[#ff5a36] text-white" : "bg-surface text-ink-soft",
                      )}
                    >
                      {confirmId === r.ev.id ? "Hapus?" : <Trash2 className="size-4" strokeWidth={2.5} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      }
    >
      <Panel title="Ide cepat">
        <div className="grid grid-cols-2 gap-2">
          {ideas.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => addEvent({ name: s.name, emoji: s.emoji, at: s.at, repeat: s.repeat })}
              className="pop pressable flex items-center gap-2 rounded-2xl bg-surface-2 p-2.5 text-left"
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold leading-tight">{s.name}</span>
                <span className="block truncate text-xs font-semibold text-ink-soft">{s.hint}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              play("tap");
              openBirthday();
            }}
            className="pop pressable flex items-center gap-2 rounded-2xl bg-accent p-2.5 text-left text-accent-ink"
          >
            <span className="text-2xl">🎂</span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight">Ulang tahunku</span>
              <span className="block truncate text-xs font-semibold opacity-75">isi tanggal lahir</span>
            </span>
          </button>
        </div>
      </Panel>

      <section ref={formRef} className="pop rounded-3xl bg-surface p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ink-soft">
          <CalendarPlus className="size-4" strokeWidth={3} /> Bikin acara sendiri
        </h2>
        <div className="space-y-3">
          <input
            value={draft.name}
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="mis. Liburan ke Bali, Sidang skripsi"
            className="w-full rounded-2xl border-[2.5px] border-line bg-surface-2 px-4 py-3 font-bold outline-none placeholder:text-ink-soft/60 focus:bg-surface"
          />
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Pilih ${e}`}
                aria-pressed={draft.emoji === e}
                onClick={() => {
                  play("tap");
                  setDraft({ ...draft, emoji: e });
                }}
                className={cn(
                  "pressable grid aspect-square place-items-center rounded-xl border-2 text-xl",
                  draft.emoji === e ? "border-line bg-accent shadow-pop-sm" : "border-transparent bg-surface-2",
                )}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-ink-soft">Tanggal</span>
              <input
                ref={dateRef}
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="w-full min-w-0 rounded-2xl border-[2.5px] border-line bg-surface-2 px-3 py-2.5 font-mono font-bold outline-none focus:bg-surface"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-ink-soft">Jam</span>
              <input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                className="w-full rounded-2xl border-[2.5px] border-line bg-surface-2 px-3 py-2.5 font-mono font-bold outline-none focus:bg-surface"
              />
            </label>
          </div>
          <Segmented<RepeatKind>
            options={[
              { value: "once", label: "Sekali" },
              { value: "year", label: "Tiap tahun", hint: "ultah, anniv" },
              { value: "month", label: "Tiap bulan", hint: "gajian, tagihan" },
            ]}
            value={draft.repeat}
            onChange={(v) => setDraft({ ...draft, repeat: v })}
          />
          {draftPast && (
            <p className="text-sm font-semibold text-ink-soft">
              Tanggalnya sudah lewat — nanti dihitung &ldquo;sudah lewat berapa hari&rdquo;. Kalau ulang tahun, pilih &ldquo;Tiap tahun&rdquo;.
            </p>
          )}
          <Button variant="accent" size="lg" className="w-full" disabled={!draftValid} onClick={save}>
            <Check className="size-6" strokeWidth={3} /> Simpan acara
          </Button>
        </div>
      </section>
    </TimerShell>
  );
}

function Tile({ value, label, tilt, dim }: { value: number; label: string; tilt: string; dim?: boolean }) {
  const text = String(value).padStart(2, "0");
  return (
    <div
      className={cn(
        "pop flex min-w-0 flex-col items-center rounded-2xl bg-surface px-1.5 py-2 sm:rounded-3xl sm:px-3 sm:py-3",
        tilt,
        dim && "opacity-80",
      )}
    >
      <span
        className={cn(
          "tabular font-mono font-bold leading-none tracking-tighter",
          text.length > 3 ? "text-2xl sm:text-4xl" : text.length > 2 ? "text-3xl sm:text-5xl" : "text-4xl sm:text-6xl",
        )}
      >
        {text}
      </span>
      <span className="mt-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft sm:text-xs">{label}</span>
    </div>
  );
}

function Overlay({ active, now }: { active: Resolved | null; now: number }) {
  if (!active) {
    return (
      <div className="pointer-events-none flex h-full flex-col items-center justify-center p-6 pb-[28%] [contain:inline-size]">
        <div className="pop -rotate-2 rounded-3xl bg-surface px-6 py-4 text-center">
          <div className="animate-float text-4xl">🎆</div>
          <div className="mt-1 text-xl font-extrabold">Belum ada acara</div>
          <div className="text-sm font-semibold text-ink-soft">Tambah satu, langitnya nunggu 👇</div>
        </div>
      </div>
    );
  }
  const { ev, rem, target, nth } = active;
  const party = rem <= 0 && rem > -DAY;
  const past = rem <= -DAY;
  const p = parts(Math.abs(rem));
  return (
    <div className="pointer-events-none flex h-full flex-col p-3 [contain:inline-size] sm:p-5">
      <div className="pop flex max-w-full items-center gap-2.5 self-start rounded-2xl bg-surface py-1.5 pl-1.5 pr-3.5 sm:gap-3 sm:rounded-3xl sm:py-2 sm:pl-2">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-2xl sm:size-12 sm:text-3xl", party && "animate-wiggle")}>
          {ev.emoji}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-extrabold leading-tight sm:text-lg">
            {ev.name}
            {nth ? <span className="text-ink-soft"> ke-{nth}</span> : null}
          </span>
          <span className="block truncate text-xs font-semibold text-ink-soft sm:text-sm">
            {fmtDate(target)} · {fmtTime(target)}
          </span>
        </span>
      </div>

      <div className="flex-1" />

      {party ? (
        <div className="mx-auto flex flex-col items-center gap-2">
          <div className="pop animate-pop-in -rotate-2 rounded-3xl bg-accent px-6 py-3 text-center text-accent-ink sm:px-8 sm:py-4">
            <div className="text-4xl font-extrabold tracking-tight sm:text-6xl">Sudah tiba! 🎉</div>
          </div>
          <div className="pop rotate-1 rounded-full bg-surface px-3 py-1 text-xs font-bold text-ink-soft sm:text-sm">
            sejak {p.h ? `${p.h} jam ${p.m} menit` : p.m ? `${p.m} menit ${p.s} detik` : `${p.s} detik`} lalu
          </div>
        </div>
      ) : (
        <>
          {past && (
            <div className="mx-auto mb-2 rounded-full bg-black/45 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white">
              sudah lewat
            </div>
          )}
          <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1.5 sm:gap-3">
            <Tile value={p.d} label="hari" tilt="-rotate-2" dim={past} />
            <Tile value={p.h} label="jam" tilt="rotate-1" dim={past} />
            <Tile value={p.m} label="menit" tilt="-rotate-1" dim={past} />
            <Tile value={p.s} label="detik" tilt="rotate-2" dim={past} />
          </div>
        </>
      )}

      <div className="mx-auto mt-3 max-w-full rounded-full border-2 border-line bg-surface px-3.5 py-1 text-center text-sm font-bold sm:text-base">
        <span className="block truncate">{friendly(active, now)}</span>
      </div>

      <div className="flex h-[19%] items-end justify-center">
        <span className="flex items-center gap-1 text-[11px] font-bold text-white/55 sm:text-xs">
          <Sparkles className="size-3" /> ketuk langitnya buat nyalain kembang api
        </span>
      </div>
    </div>
  );
}

