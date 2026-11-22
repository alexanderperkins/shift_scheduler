import { describe, expect, it } from "vitest";
import type { Shift } from "@/lib/domain/shift";
import { shiftDisplayStatus, staffingStatus } from "@/lib/domain/staffing-status";

function makeShift(overrides: Partial<Shift> & { assignedCount?: number } = {}): Shift {
  const { assignedCount = 2, ...rest } = overrides;
  return {
    id: "s1",
    eventId: "e1",
    start: "2026-12-01T14:00:00.000Z",
    end: "2026-12-01T16:00:00.000Z",
    minStaff: 2,
    maxStaff: 3,
    cancelled: false,
    assignedVolunteerIds: Array.from({ length: assignedCount }, (_, i) => `v${i + 1}`),
    ...rest,
  };
}

describe("shiftDisplayStatus", () => {
  it.each([
    ["understaffed", 1],
    ["covered", 2],
    ["overstaffed", 4],
  ])("reports cancelled for a cancelled shift that would be %s", (_label, assignedCount) => {
    expect(shiftDisplayStatus(makeShift({ cancelled: true, assignedCount }))).toBe("cancelled");
  });

  it.each([1, 2, 3, 4])(
    "matches staffingStatus for an active shift with %i assigned",
    (assignedCount) => {
      const shift = makeShift({ assignedCount });
      expect(shiftDisplayStatus(shift)).toBe(staffingStatus(shift));
    },
  );
});
