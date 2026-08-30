import type { RoutineSchedule } from "@/api/types";

const WEEKDAY: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

const MONTH = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const hhmm = (hour: number, minute: number) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/** `1` → `1st`, `22` → `22nd`. */
function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

function interval(secs: number): string {
  if (secs % 86_400 === 0) {
    const days = secs / 86_400;
    return days === 1 ? "day" : `${days} days`;
  }
  if (secs % 3_600 === 0) {
    const hours = secs / 3_600;
    return hours === 1 ? "hour" : `${hours} hours`;
  }
  if (secs % 60 === 0) {
    const mins = secs / 60;
    return mins === 1 ? "minute" : `${mins} minutes`;
  }
  return `${secs} seconds`;
}

/**
 * When a routine fires, in one line.
 *
 * Exhaustive with no `default`, so a schedule kind added to the `.fl` schema is
 * a type error here rather than a routine that silently reads as "unscheduled"
 * — which is the one wrong answer that looks like a real one.
 */
export function describeSchedule(schedule: RoutineSchedule): string {
  switch (schedule.type) {
    case "Manual":
      return "Only when run by hand";
    case "Every":
      return `Every ${interval(schedule.value.intervalSecs)}`;
    case "Once":
      return `Once, at ${new Date(schedule.value.atMs).toLocaleString()}`;
    case "Daily":
      return `Daily at ${hhmm(schedule.value.hour, schedule.value.minute)} ${schedule.value.timezone}`;
    case "Weekly": {
      const days = schedule.value.weekdays.map((d) => WEEKDAY[d] ?? d).join(", ");
      return `${days || "no days"} at ${hhmm(schedule.value.hour, schedule.value.minute)} ${schedule.value.timezone}`;
    }
    case "Monthly":
      return `The ${ordinal(schedule.value.dayOfMonth)} of each month at ${hhmm(schedule.value.hour, schedule.value.minute)} ${schedule.value.timezone}`;
    case "Yearly":
      return `${MONTH[schedule.value.month - 1] ?? `month ${schedule.value.month}`} ${ordinal(schedule.value.dayOfMonth)} at ${hhmm(schedule.value.hour, schedule.value.minute)} ${schedule.value.timezone}`;
  }
}
