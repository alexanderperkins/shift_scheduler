import type { Metadata } from "next";
import { ShiftTable } from "@/app/shifts/shift-table";
import { getShiftRepository } from "@/lib/repositories";

export const metadata: Metadata = {
  title: "Shifts · Event Shift Scheduler",
};

export default async function ShiftsPage() {
  const shifts = await getShiftRepository().listAll();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Shifts</h1>
      <ShiftTable shifts={shifts} />
    </main>
  );
}
