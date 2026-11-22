/** A volunteer shift. `start`/`end` are ISO 8601 UTC strings; the interval is half-open [start, end). */
export type Shift = {
  readonly id: string;
  readonly eventId: string;
  readonly start: string;
  readonly end: string;
  readonly minStaff: number;
  readonly maxStaff: number;
  readonly cancelled: boolean;
  readonly assignedVolunteerIds: readonly string[];
};
