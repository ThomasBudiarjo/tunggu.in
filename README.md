# Tunggu.in - Beautiful Timer Collection

A modern, themeable timer application built as a Progressive Web App (PWA) with React, TypeScript, and Vite. Tunggu.in provides various timer types for different use cases, from cooking to productivity, with beautiful animations and sound notifications.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19.x-61dafb)
![Vite](https://img.shields.io/badge/Vite-6.x-646cff)
![PWA](https://img.shields.io/badge/PWA-Ready-5a0fc8)

## ✨ Features

Ten timers that are actually useful, each with its own hand-built animation
(Canvas 2D, pixel-by-pixel simulations, or WebGL shaders) that reacts to the
timer's state — running, paused, phase changes, finished.

| Timer | What it's for | Animation |
| --- | --- | --- |
| ⏳ **Timer Bebas** | Any countdown, one-tap presets (mie instan, masker, parkir…) | WebGL water tank that drains |
| 🌱 **Fokus** | Pomodoro 25/5, 50/10, 52/17, 90/20 with auto cycles + daily stats | Procedural tree that grows as you focus |
| 🔥 **Interval** | Tabata, HIIT (sets/rounds), EMOM with 3-2-1 beeps | Pixel "Doom fire" campfire |
| 🫧 **Napas** | Box, 4-7-8, 4-6 and coherent breathing | WebGL breathing orb |
| 🥚 **Telur Rebus** | Boil time from doneness, egg size and start temp, plus ice bath | Per-pixel heat-diffusion egg cross-section |
| ☕ **Seduh** | V60, French press, tubruk, AeroPress, teas — step by step, scaled per cup | Pouring kettle, rising & darkening brew |
| 🌙 **Tidur Siang** | Power nap with fall-asleep buffer and gentle wake-up | Dithered pixel night sky turning to dawn |
| ♟️ **Jam Giliran** | Chess clock / board-game turns for 2–6 players, Fischer increment | Falling-sand hourglass |
| ⏱️ **Stopwatch** | Laps with fastest/slowest, keyboard shortcuts | Orbiting comet, laps become planets |
| 🎆 **Hitung Mundur Acara** | Countdowns to saved dates (Lebaran, 17 Agustus, birthdays…) | Fireworks that build up toward the day |

- **Drift-free & persistent** — timers are computed from wall-clock timestamps,
  survive reloads and navigation, and alarms fire from a Web Worker so they
  stay on time in background tabs.
- **Running dock** — every active timer shows as a pill at the bottom of any page.
- **Sound, vibration & notifications** — synthesized with Web Audio (no audio files).
- **Light/dark theme**, mobile-first layout, installable PWA that works offline.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/tunggu-in.git
cd tunggu-in
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🛠️ Tech Stack

React 19 + TypeScript, Vite, Tailwind CSS v4, Zustand, React Router, Lucide
icons, vite-plugin-pwa. Animations use plain Canvas 2D and WebGL — no
animation libraries.

## 🗂️ Project Structure

```
src/
  core/        engine (segments → position), runs store, global ticker,
               sound, notifications, canvas/shader hooks
  components/  UI kit (Button, Segmented, Stepper, Stage, RunControls…),
               TimerShell, Layout
  pages/       Home
  timers/      registry.ts + one folder per timer (page + animation)
```

Adding a timer: create `src/timers/<id>/index.tsx` and register it in
`src/timers/registry.ts` — it gets a route at `/<id>` and a card on the home page.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Sound effects from various open-source collections
