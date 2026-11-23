# Explore: Conflict Detection (PRD user story 3)

> "As an organizer, I am warned when a volunteer is double-booked, so no one is scheduled twice at once."

Explore-phase findings for `feature/conflict-detection`, at the same commit as `main` (c38dcf1). No code has been written yet. The next step is the plan in `docs/plans/conflict-detection.md`.

## PRD rules (source of truth)

- Two shifts conflict if they overlap in time for the same volunteer.
- Back-to-back shifts (one ends when the next starts) do not conflict.
- Cancelled shifts are ignored.

Edge cases CLAUDE.md requires tests for: back-to-back (no conflict), one-minute overlap, a shift fully inside another, and cancelled shifts (ignored).

## 1. Shift type

`src/lib/domain/shift.ts`:

```ts
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
```

- There are no `Volunteer` or `Event` types. Volunteers and events are plain string IDs.
- Related types in `src/lib/domain/staffing-status.ts`:
  - `StaffingStatus = "understaffed" | "covered" | "overstaffed"`
  - `ShiftDisplayStatus = StaffingStatus | "cancelled"`

## 2. Time representation

- `start` and `end` are ISO 8601 UTC strings with milliseconds and a `Z` suffix, e.g. `"2026-12-05T13:00:00.000Z"`.
- No date library is installed (no date-fns, dayjs, luxon, or Temporal polyfill). Don't add one without asking.
- Existing helpers:
  - `src/lib/repositories/in-memory-shift-repository.ts`: a private `byStartThenId` sorts with `Date.parse(a.start) - Date.parse(b.start)`. That epoch-ms comparison is the pattern to reuse.
  - `src/lib/format/shift-time.ts`: `formatShiftRange(start, end, options?: FormatOptions)` uses `Intl.DateTimeFormat` and is for display only. Tests pass `{ timeZone: "UTC", locale: "en-US" }` and normalize ICU narrow no-break spaces with `s.replace(/\s/g, " ")`.
- **Overlap predicate** for half-open intervals, comparing epoch ms rather than strings:
  `Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end)`
  String comparison would only be safe if every timestamp used exactly the same format, and nothing enforces that. CLAUDE.md also forbids local-time `Date` arithmetic for overlap checks.

## 3. Uses of `assignedVolunteerIds`

**src/**
- `src/lib/domain/shift.ts:10`: field declaration.
- `src/lib/domain/staffing-status.ts:7,9`: `.length` (via a `Pick<>` parameter) for staffing status.
- `src/lib/repositories/in-memory-shift-repository.ts:5`: `copyShift` makes a defensive copy of the array.
- `src/lib/repositories/seed-shifts.ts:13,23,33,43,53`: seed values.
- `src/app/shifts/shift-table.tsx:60`: renders `.length` in the "Assigned" column. Individual IDs are never shown.

**tests/**
- `tests/integration/in-memory-shift-repository.test.ts:14,54,59`: `makeShift` default `["v1"]`, plus the mutation-isolation test.
- `tests/integration/shifts-page.test.tsx:21,33,35,36`: `makeShift` default `["v1","v2"]`, plus per-status overrides.
- `tests/unit/shift-display-status.test.ts:15`: generates IDs from `assignedCount` (`v1..vN`).
- `tests/unit/staffing-status.test.ts:8`: the `staffing()` helper builds `v1..vN`.

## 4. Domain patterns (`src/lib/domain/`)

- Named `export function` declarations, not arrow constants.
- Type imports look like `import type { Shift } from "@/lib/domain/shift";`
- Parameters are narrowed with `Pick<Shift, ...>` where possible, e.g. `staffingStatus(shift: Pick<Shift, "minStaff" | "maxStaff" | "assignedVolunteerIds">): StaffingStatus`.
- Return types are explicit, and statuses are string-literal unions.
- Each function has a one-line `/** ... */` doc comment stating the rule and its assumptions (e.g. "Assumes 0 <= minStaff <= maxStaff (validated at the boundary)").
- Functions are pure: no mutation, no React, Next, or I/O. Tests freeze inputs and compare against a `structuredClone` snapshot.

## 5. Repository layer (`src/lib/repositories/`)

- `shift-repository.ts`: `interface ShiftRepository { listAll(): Promise<Shift[]> }` returns all shifts, including cancelled ones, sorted by start then id. **This is the only method.** There are no by-volunteer, by-event, or mutation methods.
- `in-memory-shift-repository.ts`: `createInMemoryShiftRepository(seed)` copies data on the way in and out and sorts by start then id.
- `index.ts`: a module-level singleton exposed through `getShiftRepository()`. The only consumer is `src/app/shifts/page.tsx`.

### Seed shifts (`seed-shifts.ts`)

| id | event | start → end (UTC) | min–max | cancelled | volunteers |
|---|---|---|---|---|---|
| shift-setup | spring-fair | 12-05 13:00 → 15:00 | 3–5 | no | vol-ana |
| shift-tickets | spring-fair | 12-05 15:00 → 18:00 | 2–4 | no | vol-ana, vol-ben |
| shift-cleanup | spring-fair | 12-05 18:00 → 20:00 | 1–2 | no | vol-cho, vol-dev |
| shift-sorting | food-drive | 12-06 14:00 → 17:00 | 2–3 | no | vol-ben, vol-cho, vol-dev, vol-eli |
| shift-delivery | food-drive | 12-06 17:00 → 19:00 | 2–4 | **yes** | vol-eli |

- **No seed shifts overlap today.**
- Back-to-back cases:
  - setup → tickets share vol-ana at 15:00, so no conflict.
  - sorting → delivery share vol-eli at 17:00, and delivery is also cancelled.
- `shifts-page.test.tsx:85-89` asserts that the seed covers all four display statuses. Any seed change must keep that true.

## 6. Test patterns

- **Files:** `tests/unit/<kebab>.test.ts` and `tests/integration/<kebab>.test.ts(x)`. Vitest includes `tests/**/*.test.{ts,tsx}`.
- **Imports:** `import { describe, expect, it } from "vitest";` with no globals.
- **Naming:** `describe` names the function or component (`"staffingStatus"`, `"ShiftTable"`, `"/shifts page"`). `it` names the behavior (`"reports understaffed when assigned is one below minStaff"`, `"does not mutate its input"`). `it.each` is used where it fits.
- **Factories:** each test file defines its own local `makeShift`; there is no shared fixture module.
  - The repo test's default `end` (`2026-12-31T23:00Z`) makes every shift overlap, so don't copy it.
  - A new `tests/unit/conflicts.test.ts` should define its own builder with explicit `start` and `end`.
- **Clock and IDs:** nothing is injected today, and conflict detection needs no clock.
- **Rendering:** `renderToStaticMarkup(<ShiftTable … formatOptions={utc} />)` or `renderToStaticMarkup(await ShiftsPage())`. Assertions use regex on `data-shift-id` / `data-status` (via a `rowStatus(html, id)` helper) and `toContain(">Label<")`. Tests run in the Node environment, with no jsdom or testing-library.

## 7. `/shifts` page and where a warning could plug in

- `src/app/shifts/page.tsx` is an async Server Component. It calls `getShiftRepository().listAll()` and renders `<main><h1>Shifts</h1><ShiftTable shifts={shifts} /></main>`.
- `src/app/shifts/shift-table.tsx`:
  - Props are `{ shifts: readonly Shift[]; formatOptions?: FormatOptions }`.
  - Columns: Time, Event, Assigned, Needed, Status.
  - Each row has `data-shift-id` and `data-status`. A `STATUS_BADGE` map holds the badge labels and Tailwind classes. Cancelled rows are dimmed and struck through. An empty list shows "No shifts yet."
- Integration options. In every case the rule itself stays in `src/lib/domain/`.
  1. Compute conflicts in `page.tsx` with a pure domain function and pass them to `ShiftTable` as a new optional prop, e.g. a map from shift ID to conflicting volunteer IDs.
  2. Add a per-row marker, such as `data-conflict="true"` plus a badge or text naming the volunteer. This fits the existing regex test style.
  3. Add a summary alert above the table in `page.tsx`.

## 8. Config

- `vitest.config.mts`: alias `@` → `./src`, `environment: "node"`.
- `tsconfig.json`: `strict`, `@/*` path alias, target ES2017.
- Dependencies: next 16.4.6, react 19.3.0, vitest ^5.1.1, typescript ^5, tailwind 4.3.3, eslint ^9. No date library.

## 9. Existing mentions of conflict, overlap, or double-booking

- `docs/PRD.md` L14 (story 3) and L26-29 (conflict rules).
- `CLAUDE.md`:
  - L10/12: conflict detection is "Not started".
  - L44: it belongs in the pure domain layer.
  - L71: the required edge cases.
  - L88: no local-time `Date` arithmetic.
- `docs/plans/staffing-status.md:13`: conflict detection was explicitly out of scope there.
- `docs/hw4/explore-notes.md:58`: notes that cancelled shifts are ignored for conflicts.
- `src/app/layout.tsx:17`: the metadata description mentions "catch double-bookings".
- There is no conflict code or test yet, and no `docs/plans/conflict-detection.md`.

## 10. Gaps, risks, and open questions

1. **Where the logic lives:** the repo has no by-volunteer query. Recommendation: a pure domain function over `readonly Shift[]` (e.g. `findConflicts(shifts)` in `src/lib/domain/conflicts.ts`). It needs no repository change and stays compatible with the P3 swap.
2. **Return shape (decide in Plan):** pairs (`{ volunteerId, shiftIds: [a, b] }`), a per-shift lookup, or a per-volunteer lookup. Requirements:
   - Ordering must be deterministic (start then id, like the repo).
   - Each pair is reported once.
   - Three-way overlaps are handled.
   - The shape should be reusable for story 4 (volunteer view).
3. **Event scope: needs user confirmation.** The PRD says "same volunteer" with no event qualifier, which implies shifts in *different* events still conflict.
4. **Invalid intervals:** if `end <= start` or a timestamp is unparsable (`NaN`), the comparisons silently return false. Domain code may assume valid input, since CLAUDE.md puts validation at the boundary. State that assumption in the doc comment.
5. **Duplicate volunteer IDs within one shift** are unspecified. Ignore them, and never treat a shift as conflicting with itself.
6. **Cancelled shifts** must be excluded on both sides of a pair.
7. **The seed has no real conflict.** Demoing or page-testing the warning needs either a new overlapping seed shift (keeping all four statuses covered) or a fixture injected through `ShiftTable` props.
8. **UI on cancelled rows:** by the rule, they never show a conflict badge.
