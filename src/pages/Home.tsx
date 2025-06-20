import React from "react";
import { Link } from "react-router-dom";
import {
  ChefHat,
  Dumbbell,
  Brain,
  Gamepad2,
  Clock,
  ArrowRight,
} from "lucide-react";

interface TimerCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  categoryPath: string;
  timers: Array<{
    id: string;
    name: string;
    path: string;
  }>;
}

const categories: TimerCategory[] = [
  {
    id: "kitchen",
    name: "Kitchen & Cooking",
    description: "Perfect timing for your culinary adventures",
    icon: <ChefHat className="h-8 w-8" />,
    color: "bg-orange-500",
    categoryPath: "/timers/kitchen",
    timers: [
      { id: "egg", name: "Egg Timer", path: "/timers/kitchen/egg" },
      { id: "steak", name: "Steak Timer", path: "/timers/kitchen/steak" },
      { id: "coffee", name: "Coffee Timer", path: "/timers/kitchen/coffee" },
      { id: "tea", name: "Tea Timer", path: "/timers/kitchen/tea" },
      { id: "dough", name: "Dough Proofing", path: "/timers/kitchen/dough" },
    ],
  },
  {
    id: "fitness",
    name: "Health & Fitness",
    description: "Stay healthy and productive with timed sessions",
    icon: <Dumbbell className="h-8 w-8" />,
    color: "bg-green-500",
    categoryPath: "/timers/fitness",
    timers: [
      { id: "pomodoro", name: "Pomodoro", path: "/timers/fitness/pomodoro" },
      { id: "hiit", name: "HIIT Timer", path: "/timers/fitness/hiit" },
      {
        id: "breathing",
        name: "Box Breathing",
        path: "/timers/fitness/box-breathing",
      },
      {
        id: "meditation",
        name: "Meditation",
        path: "/timers/fitness/meditation",
      },
      { id: "nap", name: "Power Nap", path: "/timers/fitness/power-nap" },
    ],
  },
  {
    id: "productivity",
    name: "Productivity & Study",
    description: "Boost your focus and track your time",
    icon: <Brain className="h-8 w-8" />,
    color: "bg-blue-500",
    categoryPath: "/timers/productivity",
    timers: [
      { id: "52-17", name: "52/17 Method", path: "/timers/productivity/52-17" },
      {
        id: "stopwatch",
        name: "Stopwatch",
        path: "/timers/productivity/stopwatch",
      },
      {
        id: "countdown",
        name: "Countdown to Date",
        path: "/timers/productivity/countdown",
      },
      {
        id: "burst",
        name: "Get It Done",
        path: "/timers/productivity/get-it-done",
      },
    ],
  },
  {
    id: "games",
    name: "Fun & Games",
    description: "Keep the fun going with game timers",
    icon: <Gamepad2 className="h-8 w-8" />,
    color: "bg-purple-500",
    categoryPath: "/timers/games",
    timers: [
      {
        id: "board-game",
        name: "Board Game Timer",
        path: "/timers/games/board-game",
      },
      {
        id: "five-second",
        name: "Five Second Rule",
        path: "/timers/games/five-second-rule",
      },
    ],
  },
];

export const Home: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Beautiful Timers for Every Moment
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          From perfect eggs to productive work sessions, Tunggu.in has the right
          timer for you.
        </p>
      </section>

      {/* Quick Start */}
      <section className="bg-card rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4 flex items-center">
          <Clock className="mr-2" />
          Quick Start
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/timers/fitness/pomodoro"
            className="p-4 bg-background rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl font-bold text-primary">25:00</div>
            <div className="text-sm text-muted-foreground">Pomodoro</div>
          </Link>
          <Link
            to="/timers/kitchen/egg"
            className="p-4 bg-background rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl font-bold text-primary">7:00</div>
            <div className="text-sm text-muted-foreground">Perfect Egg</div>
          </Link>
          <Link
            to="/timers/fitness/hiit"
            className="p-4 bg-background rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl font-bold text-primary">20:10</div>
            <div className="text-sm text-muted-foreground">HIIT</div>
          </Link>
          <Link
            to="/timers/fitness/power-nap"
            className="p-4 bg-background rounded-lg hover:shadow-md transition-shadow text-center"
          >
            <div className="text-3xl font-bold text-primary">20:00</div>
            <div className="text-sm text-muted-foreground">Power Nap</div>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center mb-8">
          Explore Timer Categories
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-card rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <Link to={category.categoryPath} className="block mb-4">
                <div className="flex items-start space-x-4">
                  <div
                    className={`${category.color} text-white p-3 rounded-lg`}
                  >
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1 hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="space-y-2">
                {category.timers.map((timer) => (
                  <Link
                    key={timer.id}
                    to={timer.path}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
                  >
                    <span className="font-medium">{timer.name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
