import { Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useGlobalTicker } from "./core/ticker";
// Eager so focus time is credited even if /fokus is never opened again.
import "./timers/fokus/stats";
import { Home } from "./pages/Home";
import { timerById } from "./timers/registry";

/** Old URLs from the previous version → the timer that replaced them. */
const LEGACY: Record<string, string> = {
  "timers/kitchen/egg": "telur",
  "timers/kitchen/coffee": "seduh",
  "timers/kitchen/tea": "seduh",
  "timers/fitness/pomodoro": "fokus",
  "timers/productivity/52-17": "fokus",
  "timers/fitness/hiit": "interval",
  "timers/fitness/box-breathing": "napas",
  "timers/fitness/power-nap": "tidur",
  "timers/productivity/stopwatch": "stopwatch",
  "timers/productivity/countdown": "acara",
  "timers/games/board-game": "giliran",
};

function TimerRoute() {
  const { id = "" } = useParams();
  const def = timerById(id);
  if (!def) return <NotFound />;
  const { Page } = def;
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-6xl">
          <span className="animate-wiggle">{def.emoji}</span>
        </div>
      }
    >
      <Page />
    </Suspense>
  );
}

function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div>
        <div className="animate-wiggle text-7xl">🫠</div>
        <h1 className="mt-4 text-3xl font-extrabold">Timer-nya nggak ketemu</h1>
        <Link to="/" className="pop pressable mt-6 inline-flex rounded-2xl bg-surface px-5 py-3 font-bold">
          Balik ke beranda
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  useGlobalTicker();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {Object.entries(LEGACY).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={`/${to}`} replace />} />
          ))}
          <Route path=":id" element={<TimerRoute />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
