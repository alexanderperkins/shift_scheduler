import { describe, expect, it } from "vitest";
import { shiftsOverlap } from "@/lib/domain/conflicts";

const DAY = "2026-12-05";

/** A [start, end) interval on one fixed UTC day, from "HH:MM" times. */
function interval(start: string, end: string) {
  return { start: `${DAY}T${start}:00.000Z`, end: `${DAY}T${end}:00.000Z` };
}

describe("shiftsOverlap", () => {
  it("reports overlap when one shift starts before the other ends", () => {
    const a = interval("13:00", "15:00");
    const b = interval("14:00", "16:00");
    expect(shiftsOverlap(a, b)).toBe(true);
    expect(shiftsOverlap(b, a)).toBe(true);
  });
});
