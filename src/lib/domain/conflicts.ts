import type { Shift } from "@/lib/domain/shift";

/** True when half-open intervals [start, end) overlap. Assumes valid ISO 8601 UTC and end > start (validated at the boundary). */
export function shiftsOverlap(
  a: Pick<Shift, "start" | "end">,
  b: Pick<Shift, "start" | "end">,
): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

export type Conflict = {
  readonly volunteerId: string;
  readonly shiftIds: readonly [string, string]; // [earlier, later] by start, then id
};

/** Applies the PRD conflict rules: same volunteer + overlapping time, cancelled shifts ignored, any event. */
export function findConflicts(shifts: readonly Shift[]): Conflict[] {
  const shiftsByVolunteer = new Map<string, Shift[]>();
  for (const shift of shifts) {
    if (shift.cancelled) continue;
    for (const volunteerId of new Set(shift.assignedVolunteerIds)) {
      const list = shiftsByVolunteer.get(volunteerId) ?? [];
      list.push(shift);
      shiftsByVolunteer.set(volunteerId, list);
    }
  }

  const conflicts: Conflict[] = [];
  for (const [volunteerId, volunteerShifts] of shiftsByVolunteer) {
    volunteerShifts.sort((a, b) => {
      const byStart = Date.parse(a.start) - Date.parse(b.start);
      if (byStart !== 0) return byStart;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    for (let i = 0; i < volunteerShifts.length; i++) {
      for (let j = i + 1; j < volunteerShifts.length; j++) {
        if (shiftsOverlap(volunteerShifts[i], volunteerShifts[j])) {
          conflicts.push({ volunteerId, shiftIds: [volunteerShifts[i].id, volunteerShifts[j].id] });
        }
      }
    }
  }

  conflicts.sort((a, b) => (a.volunteerId < b.volunteerId ? -1 : a.volunteerId > b.volunteerId ? 1 : 0));
  return conflicts;
}
