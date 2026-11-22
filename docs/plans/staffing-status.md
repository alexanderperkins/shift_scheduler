# Plan: Staffing Status + `/shifts` List Page

## Context

PRD user story 2 says an organizer can see each shift's staffing status (understaffed, covered, or overstaffed). Right now the repo only has the `create-next-app` scaffold: no `src/lib/`, no tests, and no `vitest.config.ts` (see `docs/hw4/explore-notes.md`). This plan adds the pure domain rule, a repository boundary with an in-memory implementation, and a Server Component page at `/shifts` that lists every shift with its status.

Decisions already made by the user:
- The page lives at `/shifts`.
- Cancelled shifts are shown with a "Cancelled" label.
- All shifts are listed, not filtered by event.
- No new dependencies.

Out of scope: creating or editing shifts (story 1), conflict detection (story 3), auth, the DB, and Playwright E2E.

## Design

### Domain: `src/lib/domain/` (pure, no I/O, no mutation)
- `shift.ts`: the `Shift` type with PRD fields exactly: `id`, `eventId`, `start`, `end` (ISO 8601 UTC strings), `minStaff`, `maxStaff`, `cancelled`, `assignedVolunteerIds: readonly string[]`.
- `staffing-status.ts`:
  - `type StaffingStatus = "understaffed" | "covered" | "overstaffed"`
  - `staffingStatus(shift: Pick<Shift, "minStaff" | "maxStaff" | "assignedVolunteerIds">): StaffingStatus`. This follows the PRD rules exactly and doesn't look at `cancelled`.
  - `type ShiftDisplayStatus = StaffingStatus | "cancelled"`
  - `shiftDisplayStatus(shift)`: returns `"cancelled"` when `shift.cancelled` is true, otherwise `staffingStatus(shift)`. This keeps the "cancelled overrides staffing" rule out of the component, as CLAUDE.md requires.

### Repository: `src/lib/repositories/`
- `shift-repository.ts`: `interface ShiftRepository { listAll(): Promise<Shift[]> }`. It's async so a PostgreSQL version can replace it in P3 without changes elsewhere.
- `in-memory-shift-repository.ts`: `createInMemoryShiftRepository(seed: readonly Shift[]): ShiftRepository`.
  - `listAll()` returns copies sorted by `start` ascending, with `id` as the tiebreaker. Callers changing the result can't change the stored data.
- `seed-shifts.ts`: fixed ISO UTC seed data. It includes one understaffed, one covered at exactly `minStaff`, one covered at exactly `maxStaff`, one overstaffed, and one cancelled shift.
- `index.ts`: `getShiftRepository()` returns a module-level in-memory instance built from the seed data. This is the only place the page gets its data from.

### Formatting: `src/lib/format/shift-time.ts`
- `formatShiftRange(start, end, options?: { timeZone?: string; locale?: string })` uses `Intl.DateTimeFormat`.
- Tests pass `timeZone: "UTC"` and `locale: "en-US"` so results are deterministic. The page uses the defaults.
- Note: a Server Component renders in the server's time zone. Showing the viewer's own time zone needs a client component, which is deferred.

### Page: `src/app/shifts/page.tsx` (Server Component, default export)
- Awaits `getShiftRepository().listAll()`, then renders a table with columns for time range, event, assigned/min/max, and status badge.
- The badge text and Tailwind color come from a static `Record<ShiftDisplayStatus, {label, className}>` map. That map is presentation only, not logic.
- Cancelled rows are dimmed and show a "Cancelled" badge.
- If there are no shifts, the page shows an empty-state message.
- Optionally pass the repository as a prop to a `ShiftTable` component. Keep it as a Server Component with no `"use client"`.
- Also update the layout metadata in `src/app/layout.tsx` to "Event Shift Scheduler". The starter `/` page is left alone apart from a link to `/shifts`.

### Test config: `vitest.config.ts` (no new deps; vitest already brings vite)
- `resolve.alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }`
- `test.environment: "node"`
- `include: ["tests/**/*.test.{ts,tsx}"]`

## TDD steps (red, then green, then refactor; one commit each)

1. **chore:** add `vitest.config.ts`. Check it with a trivial alias-import test, which goes away once real tests exist.
2. **test, then feat:** `staffingStatus` in `tests/unit/staffing-status.test.ts`. Cases:
   - 0 assigned with min > 0 gives understaffed
   - min − 1 gives understaffed
   - exactly min gives covered
   - between min and max gives covered
   - exactly max gives covered
   - max + 1 gives overstaffed
   - min = max = assigned gives covered
   - min = 0 with 0 assigned gives covered
   - the input is not mutated (freeze it)
3. **test, then feat:** `shiftDisplayStatus`. A cancelled shift gives `"cancelled"` whether it's understaffed, covered, or overstaffed. A shift that isn't cancelled gives the same result as `staffingStatus`.
4. **test, then feat:** `formatShiftRange`, with UTC and en-US fixed, in `tests/unit/shift-time.test.ts`.
5. **test, then feat:** in-memory repository in `tests/integration/in-memory-shift-repository.test.ts`. Cases:
   - an empty seed gives `[]`
   - results are sorted by start, then by id
   - cancelled shifts are included
   - changing a returned array or shift doesn't affect the next `listAll()`
6. **test, then feat:** the `/shifts` page in `tests/integration/shifts-page.test.tsx`.
   - Call the async page component, then use `renderToStaticMarkup` from `react-dom/server`, which is already a dependency.
   - Check that each status label appears for the matching seed shift, and that the cancelled shift shows "Cancelled".
   - The page reads `getShiftRepository()`, so the test runs against the known seed data.
   - Risk: if the page imports anything Next-specific that doesn't work in Node, fall back to testing `ShiftTable` on its own with injected shifts.
7. **feat:** layout metadata and a link from `/` to `/shifts`.
8. **docs:** update CLAUDE.md, replacing the "scaffold only" status and noting that `vitest.config.ts` now exists.

## Verification
- `npm test` passes. `npx tsc --noEmit` and `npm run lint` are clean.
- `npm run dev`, then open http://localhost:3000/shifts and check:
  - five seed rows sorted by start time
  - correct status badges
  - the cancelled row is dimmed and labeled
  - times are formatted
- E2E for story 2 waits until Playwright is approved. Until then this manual check covers it.
