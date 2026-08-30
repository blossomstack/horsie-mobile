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
