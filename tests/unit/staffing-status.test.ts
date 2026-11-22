import { describe, expect, it } from "vitest";
import { staffingStatus } from "@/lib/domain/staffing-status";

function staffing(minStaff: number, maxStaff: number, assignedCount: number) {
  return {
    minStaff,
    maxStaff,
    assignedVolunteerIds: Array.from({ length: assignedCount }, (_, i) => `v${i + 1}`),
  };
}

describe("staffingStatus", () => {
  it("reports understaffed when no one is assigned and minStaff > 0", () => {
    expect(staffingStatus(staffing(2, 4, 0))).toBe("understaffed");
  });

  it("reports understaffed when assigned is one below minStaff", () => {
    expect(staffingStatus(staffing(3, 5, 2))).toBe("understaffed");
  });

  it("reports covered when assigned is exactly minStaff", () => {
    expect(staffingStatus(staffing(3, 5, 3))).toBe("covered");
  });

  it("reports covered when assigned is between minStaff and maxStaff", () => {
    expect(staffingStatus(staffing(3, 5, 4))).toBe("covered");
  });

  it("reports covered when assigned is exactly maxStaff", () => {
    expect(staffingStatus(staffing(3, 5, 5))).toBe("covered");
  });

  it("reports overstaffed when assigned is one above maxStaff", () => {
    expect(staffingStatus(staffing(3, 5, 6))).toBe("overstaffed");
  });

  it("reports covered when minStaff equals maxStaff equals assigned", () => {
    expect(staffingStatus(staffing(2, 2, 2))).toBe("covered");
  });

  it("reports covered when minStaff is 0 and no one is assigned", () => {
    expect(staffingStatus(staffing(0, 3, 0))).toBe("covered");
  });

  it("does not mutate its input", () => {
    const input = staffing(1, 2, 1);
    Object.freeze(input.assignedVolunteerIds);
    Object.freeze(input);
    const snapshot = structuredClone(input);

    staffingStatus(input);

    expect(input).toEqual(snapshot);
  });
});
