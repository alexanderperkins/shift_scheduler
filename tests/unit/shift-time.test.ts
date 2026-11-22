import { describe, expect, it } from "vitest";
import { formatShiftRange } from "@/lib/format/shift-time";

// ICU may emit narrow/thin no-break spaces (e.g. before AM/PM); compare on plain spaces.
const normalize = (s: string) => s.replace(/\s/g, " ");

describe("formatShiftRange", () => {
  it("shows the date once for a shift that starts and ends on the same day", () => {
    const text = formatShiftRange("2026-12-01T14:00:00.000Z", "2026-12-01T16:30:00.000Z", {
      timeZone: "UTC",
      locale: "en-US",
    });
    expect(normalize(text)).toBe("Dec 1, 2026, 2:00 PM – 4:30 PM");
  });

  it("shows both dates for a shift that crosses midnight", () => {
    const text = formatShiftRange("2026-12-01T22:00:00.000Z", "2026-12-02T02:00:00.000Z", {
      timeZone: "UTC",
      locale: "en-US",
    });
    expect(normalize(text)).toBe("Dec 1, 2026, 10:00 PM – Dec 2, 2026, 2:00 AM");
  });

  it("converts UTC timestamps into the requested time zone", () => {
    const text = formatShiftRange("2026-12-01T14:00:00.000Z", "2026-12-01T16:00:00.000Z", {
      timeZone: "America/New_York",
      locale: "en-US",
    });
    expect(normalize(text)).toBe("Dec 1, 2026, 9:00 AM – 11:00 AM");
  });

  it("decides same-day versus multi-day in the display time zone, not UTC", () => {
    // 03:00Z–05:00Z is one UTC day but spans midnight in New York (22:00–00:00 EST).
    const text = formatShiftRange("2026-12-02T03:00:00.000Z", "2026-12-02T05:00:00.000Z", {
      timeZone: "America/New_York",
      locale: "en-US",
    });
    expect(normalize(text)).toBe("Dec 1, 2026, 10:00 PM – Dec 2, 2026, 12:00 AM");
  });
});
