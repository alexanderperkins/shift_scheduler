import type { Shift } from "@/lib/domain/shift";
import type { ShiftRepository } from "@/lib/repositories/shift-repository";

function copyShift(shift: Shift): Shift {
  return { ...shift, assignedVolunteerIds: [...shift.assignedVolunteerIds] };
}

function byStartThenId(a: Shift, b: Shift): number {
  const diff = Date.parse(a.start) - Date.parse(b.start);
  if (diff !== 0) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function createInMemoryShiftRepository(seed: readonly Shift[]): ShiftRepository {
  const shifts = seed.map(copyShift);

  return {
    async listAll() {
      return shifts.map(copyShift).sort(byStartThenId);
    },
  };
}
