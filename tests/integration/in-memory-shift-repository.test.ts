import { describe, expect, it } from "vitest";
import type { Shift } from "@/lib/domain/shift";
import { createInMemoryShiftRepository } from "@/lib/repositories/in-memory-shift-repository";

function makeShift(id: string, start: string, overrides: Partial<Shift> = {}): Shift {
  return {
    id,
    eventId: "e1",
    start,
    end: "2026-12-31T23:00:00.000Z",
    minStaff: 1,
    maxStaff: 2,
    cancelled: false,
    assignedVolunteerIds: ["v1"],
    ...overrides,
  };
}

describe("in-memory ShiftRepository.listAll", () => {
  it("returns an empty list when seeded with no shifts", async () => {
    const repo = createInMemoryShiftRepository([]);
    expect(await repo.listAll()).toEqual([]);
  });

  it("returns shifts ordered by start time, then by id", async () => {
    const repo = createInMemoryShiftRepository([
      makeShift("c", "2026-12-02T09:00:00.000Z"),
      makeShift("b", "2026-12-01T09:00:00.000Z"),
      makeShift("a", "2026-12-01T09:00:00.000Z"),
    ]);

    const ids = (await repo.listAll()).map((s) => s.id);

    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("includes cancelled shifts", async () => {
    const repo = createInMemoryShiftRepository([
      makeShift("s1", "2026-12-01T09:00:00.000Z", { cancelled: true }),
    ]);

    const shifts = await repo.listAll();

    expect(shifts).toHaveLength(1);
    expect(shifts[0].cancelled).toBe(true);
  });

  it("does not let callers alter stored shifts by mutating the result", async () => {
    const repo = createInMemoryShiftRepository([makeShift("s1", "2026-12-01T09:00:00.000Z")]);

    const first = await repo.listAll();
    first.pop();
    const again = await repo.listAll();
    (again[0].assignedVolunteerIds as string[]).push("intruder");
    (again[0] as { minStaff: number }).minStaff = 99;

    const fresh = await repo.listAll();
    expect(fresh).toHaveLength(1);
    expect(fresh[0].assignedVolunteerIds).toEqual(["v1"]);
    expect(fresh[0].minStaff).toBe(1);
  });

  it("is not affected by later mutation of the seed array", async () => {
    const seed = [makeShift("s1", "2026-12-01T09:00:00.000Z")];
    const repo = createInMemoryShiftRepository(seed);

    seed.push(makeShift("s2", "2026-12-02T09:00:00.000Z"));

    expect((await repo.listAll()).map((s) => s.id)).toEqual(["s1"]);
  });
});
