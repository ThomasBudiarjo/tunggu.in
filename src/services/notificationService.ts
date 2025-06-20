import { useSettingsStore } from "../stores/settingsStore";

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

class NotificationService {
  private permission: NotificationPermission = "default";
  private originalTitle: string = "";
  private titleInterval: number | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.originalTitle = document.title;
      this.checkPermission();
    }
  }

  private async checkPermission() {
    if ("Notification" in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === "granted";
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    const settings = useSettingsStore.getState();

    if (!settings.notificationsEnabled) return;

    if (this.permission !== "granted") {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || "/icon-192x192.png",
        tag: options.tag,
        requireInteraction: options.requireInteraction,
      });

      // Auto-close notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error("Failed to show notification:", error);
    }
  }

  showTimerComplete(timerName: string) {
    this.showNotification({
      title: "Timer Complete!",
      body: `Your ${timerName} timer has finished.`,
      tag: "timer-complete",
      requireInteraction: true,
    });
  }

  showIntervalChange(intervalName: string, nextInterval: string) {
    this.showNotification({
      title: "Interval Changed",
      body: `${intervalName} completed. Starting ${nextInterval}.`,
      tag: "interval-change",
    });
  }

  updateTabTitle(text: string) {
    document.title = text;
  }

  resetTabTitle() {
    document.title = this.originalTitle;
  }

  startTabTitleAnimation(getRemainingTime: () => string, timerName?: string) {
    this.stopTabTitleAnimation();

    this.titleInterval = window.setInterval(() => {
      const time = getRemainingTime();
      const prefix = timerName ? `${timerName} - ` : "";
      this.updateTabTitle(`${prefix}${time} | ${this.originalTitle}`);
    }, 1000);
  }

  stopTabTitleAnimation() {
    if (this.titleInterval !== null) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
      this.resetTabTitle();
    }
  }

  // Visual notification within the app
  showInAppNotification(
    message: string,
    type: "success" | "info" | "warning" | "error" = "info"
  ) {
    // This will be implemented with a toast notification system
    // For now, we'll dispatch a custom event that components can listen to
    const event = new CustomEvent("in-app-notification", {
      detail: { message, type },
    });
    window.dispatchEvent(event);
  }

  // Check if notifications are supported
  isSupported(): boolean {
    return "Notification" in window;
  }

  // Check if notifications are enabled in settings and granted by browser
  isEnabled(): boolean {
    const settings = useSettingsStore.getState();
    return settings.notificationsEnabled && this.permission === "granted";
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

export const notificationService = new NotificationService();
