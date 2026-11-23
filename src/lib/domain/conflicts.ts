import type { Shift } from "@/lib/domain/shift";

type TimeRange = Pick<Shift, "start" | "end">;

/** True when half-open intervals [start, end) overlap. Assumes valid ISO 8601 UTC and end > start (validated at the boundary). */
export function shiftsOverlap(a: TimeRange, b: TimeRange): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}

export type Conflict = {
  readonly volunteerId: string;
  readonly shiftIds: readonly [string, string]; // [earlier, later] by start, then id
};

/** Locale-independent string order, so output never depends on the runtime's locale. */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Orders shifts by start instant (epoch ms), then by id to break ties deterministically. */
function byStartThenId(a: Pick<Shift, "id" | "start">, b: Pick<Shift, "id" | "start">): number {
  return Date.parse(a.start) - Date.parse(b.start) || compareStrings(a.id, b.id);
}

/** Maps each volunteer to their non-cancelled shifts; a volunteer repeated within one shift counts once. */
function groupByVolunteer(shifts: readonly Shift[]): Map<string, Shift[]> {
  const groups = new Map<string, Shift[]>();
  for (const shift of shifts) {
    if (shift.cancelled) continue;
    for (const volunteerId of new Set(shift.assignedVolunteerIds)) {
      const group = groups.get(volunteerId) ?? [];
      group.push(shift);
      groups.set(volunteerId, group);
    }
  }
  return groups;
}

/** Every overlapping pair in one volunteer's shifts, which must already be sorted by byStartThenId. */
function overlappingPairs(volunteerId: string, sortedShifts: readonly Shift[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (let i = 0; i < sortedShifts.length; i++) {
    for (let j = i + 1; j < sortedShifts.length; j++) {
      if (shiftsOverlap(sortedShifts[i], sortedShifts[j])) {
        conflicts.push({ volunteerId, shiftIds: [sortedShifts[i].id, sortedShifts[j].id] });
      }
    }
  }
  return conflicts;
}

/** Applies the PRD conflict rules: same volunteer + overlapping time, cancelled shifts ignored, any event. */
export function findConflicts(shifts: readonly Shift[]): Conflict[] {
  return [...groupByVolunteer(shifts)]
    .sort(([a], [b]) => compareStrings(a, b))
    .flatMap(([volunteerId, volunteerShifts]) =>
      overlappingPairs(volunteerId, volunteerShifts.sort(byStartThenId)),
    );
}
