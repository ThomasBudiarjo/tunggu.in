import { useSettingsStore } from "../stores/settingsStore";

type Theme = "light" | "dark";

class ThemeService {
  private mediaQuery: MediaQueryList | null = null;
  private currentTheme: Theme = "light";

  constructor() {
    if (typeof window !== "undefined") {
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.initialize();
    }
  }

  private initialize() {
    // Load theme from settings
    const settings = useSettingsStore.getState();
    this.applyTheme(settings.theme);

    // Listen for system theme changes
    if (this.mediaQuery) {
      this.mediaQuery.addEventListener("change", this.handleSystemThemeChange);
    }

    // Subscribe to settings changes
    useSettingsStore.subscribe((state) => {
      this.applyTheme(state.theme);
    });
  }

  private handleSystemThemeChange = (e: MediaQueryListEvent) => {
    const settings = useSettingsStore.getState();
    if (settings.theme === "system") {
      this.setTheme(e.matches ? "dark" : "light");
    }
  };

  private applyTheme(themeSetting: "light" | "dark" | "system") {
    let theme: Theme;

    if (themeSetting === "system") {
      theme = this.getSystemTheme();
    } else {
      theme = themeSetting;
    }

    this.setTheme(theme);
  }

  private setTheme(theme: Theme) {
    this.currentTheme = theme;
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        theme === "dark" ? "#1a1a1a" : "#ffffff"
      );
    }

    // Dispatch custom event for components that need to react to theme changes
    window.dispatchEvent(
      new CustomEvent("theme-changed", { detail: { theme } })
    );
  }

  private getSystemTheme(): Theme {
    if (this.mediaQuery) {
      return this.mediaQuery.matches ? "dark" : "light";
    }
    return "light";
  }

  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  toggleTheme() {
    const settings = useSettingsStore.getState();
    const currentSetting = settings.theme;

    let newSetting: "light" | "dark" | "system";

    if (currentSetting === "light") {
      newSetting = "dark";
    } else if (currentSetting === "dark") {
      newSetting = "system";
    } else {
      newSetting = "light";
    }

    useSettingsStore.getState().setTheme(newSetting);
  }

  // Get theme icon based on current setting
  getThemeIcon(): string {
    const settings = useSettingsStore.getState();

    switch (settings.theme) {
      case "light":
        return "☀️";
      case "dark":
        return "🌙";
      case "system":
        return "💻";
      default:
        return "☀️";
    }
  }

  // Get theme label based on current setting
  getThemeLabel(): string {
    const settings = useSettingsStore.getState();

    switch (settings.theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "Light";
    }
  }

  // Clean up event listeners
  destroy() {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener(
        "change",
        this.handleSystemThemeChange
      );
    }
  }
}

export const themeService = new ThemeService();
