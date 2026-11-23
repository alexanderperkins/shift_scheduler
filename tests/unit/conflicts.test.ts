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

  it("reports no overlap for back-to-back shifts", () => {
    const a = interval("13:00", "15:00");
    const b = interval("15:00", "17:00");
    expect(shiftsOverlap(a, b)).toBe(false);
    expect(shiftsOverlap(b, a)).toBe(false);
  });

  it("reports overlap for a one-minute overlap", () => {
    const a = interval("13:00", "15:00");
    const b = interval("14:59", "17:00");
    expect(shiftsOverlap(a, b)).toBe(true);
    expect(shiftsOverlap(b, a)).toBe(true);
  });

  it("reports overlap when one shift is fully inside another", () => {
    const outer = interval("13:00", "18:00");
    const inner = interval("14:00", "15:00");
    expect(shiftsOverlap(outer, inner)).toBe(true);
    expect(shiftsOverlap(inner, outer)).toBe(true);
  });

  it("reports overlap for identical intervals", () => {
    const a = interval("13:00", "15:00");
    const b = interval("13:00", "15:00");
    expect(shiftsOverlap(a, b)).toBe(true);
    expect(shiftsOverlap(b, a)).toBe(true);
  });

  it("reports no overlap for disjoint shifts with a gap", () => {
    const a = interval("09:00", "11:00");
    const b = interval("13:00", "15:00");
    expect(shiftsOverlap(a, b)).toBe(false);
    expect(shiftsOverlap(b, a)).toBe(false);
  });
});
