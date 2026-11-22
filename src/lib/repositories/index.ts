import { createInMemoryShiftRepository } from "@/lib/repositories/in-memory-shift-repository";
import { seedShifts } from "@/lib/repositories/seed-shifts";
import type { ShiftRepository } from "@/lib/repositories/shift-repository";

export type { ShiftRepository } from "@/lib/repositories/shift-repository";

const shiftRepository: ShiftRepository = createInMemoryShiftRepository(seedShifts);

/** The app's shift repository. HW4: in-memory seed data. P3: PostgreSQL. */
export function getShiftRepository(): ShiftRepository {
  return shiftRepository;
}
