/**
 * Time utility functions for timer operations
 */

/**
 * Format seconds into a readable time string
 * @param seconds - Total seconds to format
 * @param format - Format type: 'mm:ss' or 'hh:mm:ss'
 * @returns Formatted time string
 */
export function formatTime(
  seconds: number,
  format: "mm:ss" | "hh:mm:ss" = "mm:ss"
): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (format === "hh:mm:ss") {
    return [hours, minutes, secs]
      .map((val) => val.toString().padStart(2, "0"))
      .join(":");
  }

  // For mm:ss format, include hours in minutes if > 59
  const totalMinutes = Math.floor(seconds / 60);
  return [totalMinutes, secs]
    .map((val) => val.toString().padStart(2, "0"))
    .join(":");
}

/**
 * Parse time input string to seconds
 * Supports formats: "5" (5 seconds), "1:30" (1 minute 30 seconds), "1:30:00" (1 hour 30 minutes)
 * @param input - Time string to parse
 * @returns Total seconds, or null if invalid
 */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();

  // Just a number - treat as seconds
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Split by colons
  const parts = trimmed.split(":").map((part) => parseInt(part, 10));

  // Validate all parts are numbers
  if (parts.some(isNaN)) {
    return null;
  }

  // Handle different formats
  if (parts.length === 2) {
    // mm:ss
    const [minutes, seconds] = parts;
    if (seconds >= 60) return null;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // hh:mm:ss
    const [hours, minutes, seconds] = parts;
    if (minutes >= 60 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

/**
 * Calculate progress percentage
 * @param elapsed - Elapsed time in seconds
 * @param total - Total duration in seconds
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(elapsed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, (elapsed / total) * 100);
}

/**
 * Get remaining time from elapsed and total
 * @param elapsed - Elapsed time in seconds
 * @param total - Total duration in seconds
 * @returns Remaining time in seconds
 */
export function getRemainingTime(elapsed: number, total: number): number {
  return Math.max(0, total - elapsed);
}

/**
 * Format time for display with optional milliseconds
 * @param seconds - Time in seconds
 * @param showMillis - Whether to show milliseconds
 * @returns Formatted time string
 */
export function formatTimeWithMillis(
  seconds: number,
  showMillis: boolean = false
): string {
  const wholeSeconds = Math.floor(seconds);
  const millis = Math.floor((seconds - wholeSeconds) * 1000);

  const base = formatTime(wholeSeconds);

  if (showMillis) {
    return `${base}.${millis.toString().padStart(3, "0")}`;
  }

  return base;
}

/**
 * Get human-readable duration
 * @param seconds - Duration in seconds
 * @returns Human-readable string like "5 minutes", "1 hour 30 minutes"
 */
export function getHumanReadableDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);
  }

  if (secs > 0 && hours === 0) {
    parts.push(`${secs} second${secs !== 1 ? "s" : ""}`);
  }

  return parts.join(" ");
}
