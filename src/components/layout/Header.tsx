import React from "react";
import { Link } from "react-router-dom";
import {
  Timer,
  Settings,
  BarChart3,
  Menu,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useState } from "react";
import { useSettingsStore } from "../../stores/settingsStore";
import { themeService } from "../../services/themeService";

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme } = useSettingsStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Timer className="h-6 w-6" />
            <span className="font-bold text-xl">Tunggu.in</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Home
            </Link>
            <Link
              to="/timers"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              All Timers
            </Link>
            <Link
              to="/statistics"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              <BarChart3 className="h-4 w-4" />
            </Link>
            <Link
              to="/settings"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              onClick={() => themeService.toggleTheme()}
              className="text-sm font-medium transition-colors hover:text-primary p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title={`Current theme: ${themeService.getThemeLabel()}`}
            >
              {theme === "light" && <Sun className="h-4 w-4" />}
              {theme === "dark" && <Moon className="h-4 w-4" />}
              {theme === "system" && <Monitor className="h-4 w-4" />}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 space-y-2">
            <Link
              to="/"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/timers"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              All Timers
            </Link>
            <Link
              to="/statistics"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Statistics
            </Link>
            <Link
              to="/settings"
              className="block py-2 text-sm font-medium transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
};
