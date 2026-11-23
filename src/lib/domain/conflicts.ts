import type { Shift } from "@/lib/domain/shift";

/** True when half-open intervals [start, end) overlap. Assumes valid ISO 8601 UTC and end > start (validated at the boundary). */
export function shiftsOverlap(
  a: Pick<Shift, "start" | "end">,
  b: Pick<Shift, "start" | "end">,
): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}
