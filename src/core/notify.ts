import { useSettings } from "./settings";

export async function requestNotify(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const result = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  const ok = result === "granted";
  useSettings.getState().setNotify(ok);
  return ok;
}

/** Shows a system notification, but only when the tab isn't visible. */
export function notify(title: string, body: string) {
  if (!useSettings.getState().notify) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  try {
    new Notification(title, { body, icon: "/icon.svg", tag: "tunggu-in" });
  } catch {
    /* some mobile browsers only allow SW notifications */
  }
}
