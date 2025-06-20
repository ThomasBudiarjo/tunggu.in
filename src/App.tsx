import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { Settings } from "./pages/Settings";
import TimerTest from "./pages/TimerTest";

// Kitchen timers
import KitchenCategory from "./pages/timers/kitchen";
import EggTimer from "./pages/timers/kitchen/EggTimer";
import SteakTimer from "./pages/timers/kitchen/SteakTimer";
import CoffeeBrewer from "./pages/timers/kitchen/CoffeeBrewer";
import TeaSteeper from "./pages/timers/kitchen/TeaSteeper";
import DoughProofing from "./pages/timers/kitchen/DoughProofing";

// Fitness timers
import FitnessCategory from "./pages/timers/fitness";
import PomodoroTimer from "./pages/timers/fitness/PomodoroTimer";
import HIITTimer from "./pages/timers/fitness/HIITTimer";
import BoxBreathing from "./pages/timers/fitness/BoxBreathing";
import MeditationTimer from "./pages/timers/fitness/MeditationTimer";
import PowerNapTimer from "./pages/timers/fitness/PowerNapTimer";

// Productivity timers
import ProductivityCategory from "./pages/timers/productivity";
import FiftyTwoSeventeen from "./pages/timers/productivity/FiftyTwoSeventeen";
import Stopwatch from "./pages/timers/productivity/Stopwatch";
import CountdownToDate from "./pages/timers/productivity/CountdownToDate";
import GetItDone from "./pages/timers/productivity/GetItDone";

// Game timers
import GamesCategory from "./pages/timers/games";
import BoardGameTimer from "./pages/timers/games/BoardGameTimer";
import FiveSecondRule from "./pages/timers/games/FiveSecondRule";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />

          {/* Kitchen Timer Routes */}
          <Route path="/timers/kitchen" element={<KitchenCategory />} />
          <Route path="/timers/kitchen/egg" element={<EggTimer />} />
          <Route path="/timers/kitchen/steak" element={<SteakTimer />} />
          <Route path="/timers/kitchen/coffee" element={<CoffeeBrewer />} />
          <Route path="/timers/kitchen/tea" element={<TeaSteeper />} />
          <Route path="/timers/kitchen/dough" element={<DoughProofing />} />

          {/* Fitness Timer Routes */}
          <Route path="/timers/fitness" element={<FitnessCategory />} />
          <Route path="/timers/fitness/pomodoro" element={<PomodoroTimer />} />
          <Route path="/timers/fitness/hiit" element={<HIITTimer />} />
          <Route
            path="/timers/fitness/box-breathing"
            element={<BoxBreathing />}
          />
          <Route
            path="/timers/fitness/meditation"
            element={<MeditationTimer />}
          />
          <Route path="/timers/fitness/power-nap" element={<PowerNapTimer />} />

          {/* Productivity Timer Routes */}
          <Route
            path="/timers/productivity"
            element={<ProductivityCategory />}
          />
          <Route
            path="/timers/productivity/52-17"
            element={<FiftyTwoSeventeen />}
          />
          <Route
            path="/timers/productivity/stopwatch"
            element={<Stopwatch />}
          />
          <Route
            path="/timers/productivity/countdown"
            element={<CountdownToDate />}
          />
          <Route
            path="/timers/productivity/get-it-done"
            element={<GetItDone />}
          />

          {/* Game Timer Routes */}
          <Route path="/timers/games" element={<GamesCategory />} />
          <Route path="/timers/games/board-game" element={<BoardGameTimer />} />
          <Route
            path="/timers/games/five-second-rule"
            element={<FiveSecondRule />}
          />

          {/* Legacy routes - to be updated */}
          <Route path="/egg-timer" element={<EggTimer />} />
          <Route path="/steak-timer" element={<SteakTimer />} />
          <Route path="/coffee-timer" element={<CoffeeBrewer />} />
          <Route path="/tea-timer" element={<TeaSteeper />} />
          <Route path="/dough-proofing" element={<DoughProofing />} />
          <Route path="/pomodoro" element={<PomodoroTimer />} />
          <Route path="/hiit" element={<HIITTimer />} />
          <Route path="/box-breathing" element={<BoxBreathing />} />
          <Route path="/meditation" element={<MeditationTimer />} />
          <Route path="/power-nap" element={<PowerNapTimer />} />
          <Route path="/52-17" element={<FiftyTwoSeventeen />} />
          <Route path="/stopwatch" element={<Stopwatch />} />
          <Route path="/countdown" element={<CountdownToDate />} />
          <Route path="/quick-burst" element={<GetItDone />} />
          <Route path="/board-game" element={<BoardGameTimer />} />
          <Route path="/five-second-rule" element={<FiveSecondRule />} />

          {/* Other routes */}
          <Route path="/timers" element={<div>All Timers - Coming Soon</div>} />
          <Route
            path="/statistics"
            element={<div>Statistics - Coming Soon</div>}
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="/timer-test" element={<TimerTest />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
