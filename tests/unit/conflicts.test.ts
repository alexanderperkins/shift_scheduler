import { describe, expect, it } from "vitest";
import { findConflicts, shiftsOverlap } from "@/lib/domain/conflicts";
import type { Shift } from "@/lib/domain/shift";

const DAY = "2026-12-05";

/** A [start, end) interval on one fixed UTC day, from "HH:MM" times. */
function interval(start: string, end: string) {
  return { start: `${DAY}T${start}:00.000Z`, end: `${DAY}T${end}:00.000Z` };
}

/** A shift on the fixed UTC day, from "HH:MM" times. Every field is explicit or overridable. */
function makeShift(
  id: string,
  start: string,
  end: string,
  volunteerIds: readonly string[],
  overrides: Partial<Shift> = {},
): Shift {
  return {
    id,
    eventId: "evt-1",
    ...interval(start, end),
    minStaff: 1,
    maxStaff: 5,
    cancelled: false,
    assignedVolunteerIds: volunteerIds,
    ...overrides,
  };
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

describe("findConflicts", () => {
  it("reports a conflict when the same volunteer is on two overlapping shifts", () => {
    const shifts = [
      makeShift("s1", "13:00", "15:00", ["vol-ana"]),
      makeShift("s2", "14:00", "16:00", ["vol-ana"]),
    ];
    expect(findConflicts(shifts)).toEqual([{ volunteerId: "vol-ana", shiftIds: ["s1", "s2"] }]);
  });

  it("reports no conflict for back-to-back shifts for the same volunteer", () => {
    const shifts = [
      makeShift("s1", "13:00", "15:00", ["vol-ana"]),
      makeShift("s2", "15:00", "17:00", ["vol-ana"]),
    ];
    expect(findConflicts(shifts)).toEqual([]);
  });

  it("reports a conflict for a one-minute overlap for the same volunteer", () => {
    const shifts = [
      makeShift("s1", "13:00", "15:00", ["vol-ana"]),
      makeShift("s2", "14:59", "17:00", ["vol-ana"]),
    ];
    expect(findConflicts(shifts)).toEqual([{ volunteerId: "vol-ana", shiftIds: ["s1", "s2"] }]);
  });

  it("reports a conflict when a shift is fully inside another for the same volunteer", () => {
    const shifts = [
      makeShift("outer", "13:00", "18:00", ["vol-ana"]),
      makeShift("inner", "14:00", "15:00", ["vol-ana"]),
    ];
    expect(findConflicts(shifts)).toEqual([
      { volunteerId: "vol-ana", shiftIds: ["outer", "inner"] },
    ]);
  });

  it.each([
    { which: "earlier", cancelledId: "s1" },
    { which: "later", cancelledId: "s2" },
  ])("ignores a cancelled shift when it is the $which one", ({ cancelledId }) => {
    const shifts = [
      makeShift("s1", "13:00", "15:00", ["vol-ana"], { cancelled: cancelledId === "s1" }),
      makeShift("s2", "14:00", "16:00", ["vol-ana"], { cancelled: cancelledId === "s2" }),
    ];
    expect(findConflicts(shifts)).toEqual([]);
  });

  it("never reports a conflict between different volunteers on overlapping shifts", () => {
    const shifts = [
      makeShift("s1", "13:00", "15:00", ["vol-ana"]),
      makeShift("s2", "14:00", "16:00", ["vol-ben"]),
    ];
    expect(findConflicts(shifts)).toEqual([]);
  });

  it("reports a conflict only for the shared volunteer when overlapping shifts share some volunteers", () => {
    const shifts = [
      makeShift("s1", "13:00", "15:00", ["vol-ana", "vol-ben"]),
      makeShift("s2", "14:00", "16:00", ["vol-ben", "vol-cy"]),
    ];
    expect(findConflicts(shifts)).toEqual([{ volunteerId: "vol-ben", shiftIds: ["s1", "s2"] }]);
  });

  it("reports conflicts across different events", () => {
    const shifts = [
      makeShift("s1", "13:00", "15:00", ["vol-ana"], { eventId: "evt-1" }),
      makeShift("s2", "14:00", "16:00", ["vol-ana"], { eventId: "evt-2" }),
    ];
    expect(findConflicts(shifts)).toEqual([{ volunteerId: "vol-ana", shiftIds: ["s1", "s2"] }]);
  });

  it("returns [] for an empty list or a single shift", () => {
    expect(findConflicts([])).toEqual([]);
    expect(findConflicts([makeShift("s1", "13:00", "15:00", ["vol-ana"])])).toEqual([]);
  });

  it("reports each pair once with shiftIds ordered [earlier, later], whatever the input order", () => {
    const earlier = makeShift("s-z", "13:00", "15:00", ["vol-ana"]);
    const later = makeShift("s-a", "14:00", "16:00", ["vol-ana"]);
    const expected = [{ volunteerId: "vol-ana", shiftIds: ["s-z", "s-a"] }];
    expect(findConflicts([earlier, later])).toEqual(expected);
    expect(findConflicts([later, earlier])).toEqual(expected);

    // Same start: the lower id counts as earlier.
    const sameStartB = makeShift("s-b", "13:00", "15:00", ["vol-ana"]);
    const sameStartA = makeShift("s-a", "13:00", "14:00", ["vol-ana"]);
    expect(findConflicts([sameStartB, sameStartA])).toEqual([
      { volunteerId: "vol-ana", shiftIds: ["s-a", "s-b"] },
    ]);
  });

  it("reports all three pairs for a three-way overlap, sorted deterministically", () => {
    const shifts = [
      makeShift("s-c", "15:00", "18:00", ["vol-ben", "vol-ana"]),
      makeShift("s-a", "13:00", "16:00", ["vol-ben", "vol-ana"]),
      makeShift("s-b", "14:00", "17:00", ["vol-ben", "vol-ana"]),
    ];
    expect(findConflicts(shifts)).toEqual([
      { volunteerId: "vol-ana", shiftIds: ["s-a", "s-b"] },
      { volunteerId: "vol-ana", shiftIds: ["s-a", "s-c"] },
      { volunteerId: "vol-ana", shiftIds: ["s-b", "s-c"] },
      { volunteerId: "vol-ben", shiftIds: ["s-a", "s-b"] },
      { volunteerId: "vol-ben", shiftIds: ["s-a", "s-c"] },
      { volunteerId: "vol-ben", shiftIds: ["s-b", "s-c"] },
    ]);
  });

  it("doesn't treat a volunteer ID repeated within one shift as a conflict", () => {
    expect(findConflicts([makeShift("s1", "13:00", "15:00", ["vol-ana", "vol-ana"])])).toEqual([]);
    expect(
      findConflicts([
        makeShift("s1", "13:00", "15:00", ["vol-ana", "vol-ana"]),
        makeShift("s2", "14:00", "16:00", ["vol-ana"]),
      ]),
    ).toEqual([{ volunteerId: "vol-ana", shiftIds: ["s1", "s2"] }]);
  });

  it("doesn't mutate its input", () => {
    const input = [
      makeShift("s2", "14:00", "16:00", ["vol-ben", "vol-ana"]),
      makeShift("s1", "13:00", "15:00", ["vol-ana"]),
    ];
    for (const shift of input) {
      Object.freeze(shift.assignedVolunteerIds);
      Object.freeze(shift);
    }
    Object.freeze(input);
    const snapshot = structuredClone(input);

    findConflicts(input);

    expect(input).toEqual(snapshot);
  });
});
