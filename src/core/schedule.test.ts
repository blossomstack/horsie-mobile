import { describe, expect, it } from "vitest";
import { describeSchedule } from "./schedule";
import type { RoutineSchedule } from "@/api/types";

describe("describeSchedule", () => {
  it("names the coarsest unit an interval divides into", () => {
    const every = (intervalSecs: number): RoutineSchedule => ({
      type: "Every",
      value: { intervalSecs },
    });
    expect(describeSchedule(every(60))).toBe("Every minute");
    expect(describeSchedule(every(900))).toBe("Every 15 minutes");
    expect(describeSchedule(every(3600))).toBe("Every hour");
    expect(describeSchedule(every(86_400))).toBe("Every day");
    // Not a whole number of anything larger, so it stays in seconds rather
    // than rounding to a figure that would be wrong.
    expect(describeSchedule(every(90))).toBe("Every 90 seconds");
  });

  it("pads the clock so times line up in a list", () => {
    expect(
      describeSchedule({
        type: "Daily",
        value: { timezone: "UTC", hour: 9, minute: 5 },
      }),
    ).toBe("Daily at 09:05 UTC");
  });

  it("uses the English ordinal, including the teens", () => {
    const monthly = (dayOfMonth: number): RoutineSchedule => ({
      type: "Monthly",
      value: { timezone: "UTC", hour: 0, minute: 0, dayOfMonth },
    });
    expect(describeSchedule(monthly(1))).toContain("The 1st");
    expect(describeSchedule(monthly(2))).toContain("The 2nd");
    expect(describeSchedule(monthly(3))).toContain("The 3rd");
    expect(describeSchedule(monthly(4))).toContain("The 4th");
    // The case a naive `n % 10` lookup gets wrong.
    expect(describeSchedule(monthly(11))).toContain("The 11th");
    expect(describeSchedule(monthly(12))).toContain("The 12th");
    expect(describeSchedule(monthly(13))).toContain("The 13th");
    expect(describeSchedule(monthly(21))).toContain("The 21st");
  });

  it("says a manual routine fires for nobody", () => {
    expect(describeSchedule({ type: "Manual", value: {} })).toBe("Only when run by hand");
  });

  it("names the month rather than its number", () => {
    expect(
      describeSchedule({
        type: "Yearly",
        value: { timezone: "UTC", hour: 6, minute: 0, month: 3, dayOfMonth: 15 },
      }),
    ).toBe("March 15th at 06:00 UTC");
  });
});
