import type { Shift } from "@/lib/domain/shift";

export type StaffingStatus = "understaffed" | "covered" | "overstaffed";

/** Applies the PRD staffing rules. Assumes 0 <= minStaff <= maxStaff (validated at the boundary). */
export function staffingStatus(
  shift: Pick<Shift, "minStaff" | "maxStaff" | "assignedVolunteerIds">,
): StaffingStatus {
  const assigned = shift.assignedVolunteerIds.length;
  if (assigned < shift.minStaff) return "understaffed";
  if (assigned > shift.maxStaff) return "overstaffed";
  return "covered";
}

export type ShiftDisplayStatus = StaffingStatus | "cancelled";

/** Status shown to organizers: a cancelled shift reads "cancelled" regardless of staffing. */
export function shiftDisplayStatus(shift: Shift): ShiftDisplayStatus {
  return shift.cancelled ? "cancelled" : staffingStatus(shift);
}
