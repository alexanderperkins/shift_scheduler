import type { Shift } from "@/lib/domain/shift";
import { shiftDisplayStatus, type ShiftDisplayStatus } from "@/lib/domain/staffing-status";
import { formatShiftRange, type FormatOptions } from "@/lib/format/shift-time";

const STATUS_BADGE: Record<ShiftDisplayStatus, { label: string; className: string }> = {
  understaffed: {
    label: "Understaffed",
    className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  },
  covered: {
    label: "Covered",
    className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  },
  overstaffed: {
    label: "Overstaffed",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
};

type ShiftTableProps = {
  shifts: readonly Shift[];
  formatOptions?: FormatOptions;
};

export function ShiftTable({ shifts, formatOptions }: ShiftTableProps) {
  if (shifts.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No shifts yet.</p>;
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-300 dark:border-zinc-700">
          <th scope="col" className="py-2 pr-4 font-semibold">Time</th>
          <th scope="col" className="py-2 pr-4 font-semibold">Event</th>
          <th scope="col" className="py-2 pr-4 font-semibold">Assigned</th>
          <th scope="col" className="py-2 pr-4 font-semibold">Needed (min–max)</th>
          <th scope="col" className="py-2 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody>
        {shifts.map((shift) => {
          const status = shiftDisplayStatus(shift);
          const badge = STATUS_BADGE[status];
          return (
            <tr
              key={shift.id}
              data-shift-id={shift.id}
              data-status={status}
              className={`border-b border-zinc-200 dark:border-zinc-800 ${
                status === "cancelled" ? "text-zinc-400 line-through dark:text-zinc-600" : ""
              }`}
            >
              <td className="py-2 pr-4">{formatShiftRange(shift.start, shift.end, formatOptions)}</td>
              <td className="py-2 pr-4">{shift.eventId}</td>
              <td className="py-2 pr-4">{shift.assignedVolunteerIds.length}</td>
              <td className="py-2 pr-4">{`${shift.minStaff}–${shift.maxStaff}`}</td>
              <td className="py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium no-underline ${badge.className}`}
                >
                  {badge.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
