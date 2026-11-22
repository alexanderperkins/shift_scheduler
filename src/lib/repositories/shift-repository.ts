import type { Shift } from "@/lib/domain/shift";

/** Data-access boundary for shifts. HW4 uses an in-memory implementation; P3 swaps in PostgreSQL. */
export interface ShiftRepository {
  /** All shifts, including cancelled ones, ordered by start time then id. */
  listAll(): Promise<Shift[]>;
}
