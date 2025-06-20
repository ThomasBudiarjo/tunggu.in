# Tunggu.in - Beautiful Timer Collection

A modern, themeable timer application built as a Progressive Web App (PWA) with React, TypeScript, and Vite. Tunggu.in provides various timer types for different use cases, from cooking to productivity, with beautiful animations and sound notifications.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19.x-61dafb)
![Vite](https://img.shields.io/badge/Vite-6.x-646cff)
![PWA](https://img.shields.io/badge/PWA-Ready-5a0fc8)

## ✨ Features

- **🎯 Multiple Timer Categories**

  - 🍳 Kitchen & Cooking (Egg Timer, Steak Timer, Coffee Brewer, Tea Steeper, Dough Proofing)
  - 💪 Health & Fitness (Pomodoro, HIIT/Tabata, Box Breathing, Meditation, Power Nap)
  - 💡 Productivity & Study (52/17 Method, Stopwatch, Countdown to Date, Get It Done)
  - 🎲 Fun & Games (Board Game Timer, Five Second Rule)

- **🎨 Beautiful Themes**

  - Each timer category has its own unique visual identity
  - Light/Dark mode support
  - Smooth animations with Framer Motion

- **🔊 Sound & Notifications**

  - Custom sounds for each timer type
  - Browser notifications support
  - Volume control and mute options

- **📱 Progressive Web App**

  - Install as native app on any device
  - Works offline
  - Fast and responsive

- **💾 Data Persistence**
  - Timer history tracking
  - Custom presets
  - Settings sync across sessions

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

- **Frontend Framework:** React 19 with TypeScript
- **Build Tool:** Vite 6.x
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Routing:** React Router v6
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **PWA:** Vite PWA Plugin
- **Date/Time:** date-fns

## 🎯 Timer Types

### Kitchen & Cooking

- **Egg Timer**: Perfect eggs every time with altitude adjustment
- **Steak Timer**: Cook steaks to your preferred doneness
- **Coffee Brewer**: Step-by-step brewing for various methods
- **Tea Steeper**: Optimal steeping times for different tea types
- **Dough Proofing**: Long-duration timer for bread making

### Health & Fitness

- **Pomodoro Timer**: Classic productivity technique
- **HIIT Timer**: Customizable interval training
- **Box Breathing**: 4-4-4-4 breathing pattern for relaxation
- **Meditation Timer**: Peaceful meditation sessions
- **Power Nap Timer**: 20-minute power naps

### Productivity & Study

- **52/17 Method**: DeskTime's productivity technique
- **Stopwatch**: Track elapsed time with lap functionality
- **Countdown to Date**: Count down to important events
- **Get It Done**: Quick 15-minute focused work sessions

### Fun & Games

- **Board Game Timer**: Turn-based timer for board games
- **Five Second Rule**: Quick-thinking party game timer

## 📱 PWA Features (Coming soon)

- **Offline Support**: All timers work without internet connection
- **Install Prompt**: Users can install the app on their devices
- **Background Sync**: Timer history syncs when back online
- **Push Notifications**: Get notified when timers complete`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Lucide](https://lucide.dev/)
- UI components inspired by [shadcn/ui](https://ui.shadcn.com/)
- Sound effects from various open-source collections
