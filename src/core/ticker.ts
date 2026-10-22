import { useEffect } from "react";
import { formatClock, position } from "./engine";
import { notify } from "./notify";
import { useRuns } from "./runs";
import { play, vibrate } from "./sound";

/**
 * One global loop for every engine-driven run: announces segment changes,
 * plays the 3-2-1 countdown, fires the alarm and keeps the tab title fresh.
 * Mounted once in <App/>, so cues fire on whatever page you're on.
 */
export function useGlobalTicker() {
  useEffect(() => {
    const beeped = new Map<string, number>();
    const baseTitle = "Tunggu.in";

    const loop = () => {
      const now = Date.now();
      const { runs, markAnnounced, finish } = useRuns.getState();
      let soonest: { left: number; label: string } | null = null;

      for (const run of Object.values(runs)) {
        if (run.finished || run.pausedAt !== null) continue;
        const pos = position(run, now);

        if (pos.done) {
          finish(run.timerId, now);
          play("alarm");
          vibrate([300, 120, 300, 120, 600]);
          notify(`${run.emoji} ${run.title} selesai!`, "Waktunya habis. Yuk cek!");
          continue;
        }

        if (pos.index !== run.lastIndex) {
          markAnnounced(run.timerId, pos.index);
          const cue = pos.segment.cue ?? "beep";
          if (cue !== "none") play(cue);
          if (pos.segment.notify !== false) {
            vibrate(160);
            notify(`${run.emoji} ${pos.segment.label}`, pos.segment.note ?? `${run.title} — lanjut!`);
          }
        }

        if (pos.segment.countdown) {
          const left = Math.ceil(pos.segRemaining);
          const key = `${run.timerId}:${pos.index}`;
          if (left >= 1 && left <= 3 && beeped.get(key) !== left) {
            beeped.set(key, left);
            play("tick");
          }
        }

        if (!soonest || pos.totalRemaining < soonest.left) {
          soonest = { left: pos.totalRemaining, label: `${run.emoji} ${formatClock(pos.totalRemaining)}` };
        }
      }

      document.title = soonest ? `${soonest.label} · ${baseTitle}` : baseTitle;
    };

    loop();
    // Background tabs throttle main-thread timers hard (down to once a
    // minute); a worker's interval keeps alarms on time.
    let worker: Worker | null = null;
    let fallback = 0;
    try {
      const src = "setInterval(() => postMessage(0), 200)";
      const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
      worker = new Worker(url);
      URL.revokeObjectURL(url);
      worker.onmessage = loop;
    } catch {
      fallback = window.setInterval(loop, 200);
    }
    return () => {
      worker?.terminate();
      window.clearInterval(fallback);
    };
  }, []);
}
