import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ShiftsPage from "@/app/shifts/page";
import { ShiftTable } from "@/app/shifts/shift-table";
import type { Shift } from "@/lib/domain/shift";
import { shiftDisplayStatus } from "@/lib/domain/staffing-status";
import { seedShifts } from "@/lib/repositories/seed-shifts";

const utc = { timeZone: "UTC", locale: "en-US" };
const normalize = (s: string) => s.replace(/\s/g, " ");

function makeShift(id: string, overrides: Partial<Shift> = {}): Shift {
  return {
    id,
    eventId: "spring-fair",
    start: "2026-12-01T14:00:00.000Z",
    end: "2026-12-01T16:00:00.000Z",
    minStaff: 2,
    maxStaff: 3,
    cancelled: false,
    assignedVolunteerIds: ["v1", "v2"],
    ...overrides,
  };
}

function rowStatus(html: string, id: string): string | undefined {
  const match = html.match(new RegExp(`<tr[^>]*data-shift-id="${id}"[^>]*data-status="([a-z]+)"`));
  return match?.[1];
}

describe("ShiftTable", () => {
  const shifts = [
    makeShift("under", { assignedVolunteerIds: ["v1"] }),
    makeShift("covered"),
    makeShift("over", { assignedVolunteerIds: ["v1", "v2", "v3", "v4"] }),
    makeShift("gone", { cancelled: true, assignedVolunteerIds: [] }),
  ];

  it("renders one row per shift tagged with its display status", () => {
    const html = renderToStaticMarkup(<ShiftTable shifts={shifts} formatOptions={utc} />);

    expect(rowStatus(html, "under")).toBe("understaffed");
    expect(rowStatus(html, "covered")).toBe("covered");
    expect(rowStatus(html, "over")).toBe("overstaffed");
    expect(rowStatus(html, "gone")).toBe("cancelled");
  });

  it("shows a human-readable status label for each shift, including Cancelled", () => {
    const html = renderToStaticMarkup(<ShiftTable shifts={shifts} formatOptions={utc} />);

    for (const label of ["Understaffed", "Covered", "Overstaffed", "Cancelled"]) {
      expect(html).toContain(`>${label}<`);
    }
  });

  it("shows the event, assigned count, staffing range, and formatted time", () => {
    const html = normalize(
      renderToStaticMarkup(<ShiftTable shifts={[makeShift("s1")]} formatOptions={utc} />),
    );

    expect(html).toContain("spring-fair");
    expect(html).toContain("Dec 1, 2026, 2:00 PM – 4:00 PM");
    expect(html).toContain(">2<");
    expect(html).toContain(">2–3<");
  });

  it("shows an empty-state message when there are no shifts", () => {
    const html = renderToStaticMarkup(<ShiftTable shifts={[]} formatOptions={utc} />);

    expect(html).toContain("No shifts yet.");
    expect(html).not.toContain("<table");
  });
});

describe("/shifts page", () => {
  it("lists every seeded shift with its display status", async () => {
    const html = renderToStaticMarkup(await ShiftsPage());

    expect(seedShifts.length).toBeGreaterThan(0);
    for (const shift of seedShifts) {
      expect(rowStatus(html, shift.id)).toBe(shiftDisplayStatus(shift));
    }
  });

  it("seeds at least one shift in each display status", () => {
    const statuses = new Set(seedShifts.map(shiftDisplayStatus));

    expect(statuses).toEqual(new Set(["understaffed", "covered", "overstaffed", "cancelled"]));
  });
});
