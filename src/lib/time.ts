/** Unix millis → "4m", "3h", "2d", or a date once it stops being recent. */
export function relativeTime(atMs: number, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - atMs) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(atMs).toLocaleDateString();
}

/** Millis → "1.2s" / "3m 04s", for how long a turn or a tool call took. */
export function duration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.round((ms % 60_000) / 1000);
  return `${mins}m ${String(secs).padStart(2, "0")}s`;
}

/** A span, at the coarsest unit that still says something: `840ms`, `1.4s`,
 * `7m`, `2h 05m`. Used on graph nodes, where the label has to stay short. */
export function humanDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/** A moment, 24-hour, so a label stays five characters wide however long the
 * session ran. */
export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
