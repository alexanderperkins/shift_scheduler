# Plan: Conflict Detection (domain function)

## Context

PRD user story 3 says an organizer is warned when a volunteer is double-booked. The PRD conflict rules:
- Two shifts conflict when they overlap in time for the same volunteer.
- Back-to-back shifts don't conflict.
- Cancelled shifts are ignored.

Explore findings are in `docs/explore/conflict-detection.md`. No conflict code exists yet. This plan adds the rule as a pure domain function in `src/lib/domain/conflicts.ts`, built test-first.

Decisions made by the user:
- **Cross-event:** overlapping shifts in *different* events still conflict, so `eventId` is ignored.
- **Return shape:** a flat list of conflict pairs, `{ volunteerId, shiftIds: [earlierId, laterId] }`.
- **Scope:** domain function only. Showing the warning on `/shifts` (ShiftTable prop, row marker, overlapping seed shift) is a separate session with its own plan.

Out of scope: UI, repository changes, seed changes, story 4, and new dependencies.

## Design: `src/lib/domain/conflicts.ts`

Follow the patterns in `src/lib/domain/staffing-status.ts`:
- named `export function` declarations
- `import type { Shift } from "@/lib/domain/shift"`
- narrowed parameters with `Pick<>`
- explicit return types
- one-line doc comments that state assumptions
- no mutation

```ts
export type Conflict = {
  readonly volunteerId: string;
  readonly shiftIds: readonly [string, string]; // [earlier, later] by start, then id
};

/** True when half-open intervals [start, end) overlap. Assumes valid ISO 8601 UTC and end > start (validated at the boundary). */
export function shiftsOverlap(a: Pick<Shift, "start" | "end">, b: Pick<Shift, "start" | "end">): boolean;

/** Applies the PRD conflict rules: same volunteer + overlapping time, cancelled shifts ignored, any event. */
export function findConflicts(shifts: readonly Shift[]): Conflict[];
```

**Overlap:** `Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end)`.
- Compare epoch milliseconds, not strings and not local time. This reuses the `Date.parse` approach from `byStartThenId` in `src/lib/repositories/in-memory-shift-repository.ts`.
- Strict `<` means back-to-back shifts don't overlap.

**`findConflicts` algorithm:**
1. Drop cancelled shifts.
2. Build a map from volunteer to their shifts. Within one shift, use a `Set` so a repeated volunteer ID counts once.
3. For each volunteer, sort their shifts by start, then id.
4. Check every pair `i < j` with `shiftsOverlap`. This O(n²) per volunteer is fine for HW4 sizes.
5. Sort the output by `volunteerId`, then by the earlier shift (start, then id), then by the later shift (start, then id).

This gives the following guarantees:
- each pair is reported once
- a shift never conflicts with itself
- a three-way overlap produces three pairs
- output order is deterministic

## Acceptance criteria → test cases

Tests go in `tests/unit/conflicts.test.ts`.
- Use a local `makeShift(id, start, end, volunteerIds, overrides?)` builder with explicit UTC times on one day, e.g. `"2026-12-05T13:00:00.000Z"`.
- Don't copy the repo test's catch-all default `end`.

**`describe("shiftsOverlap")`**: the time rules, checked in both argument orders.
1. reports overlap when one shift starts before the other ends (13:00–15:00 vs 14:00–16:00)
2. reports no overlap for back-to-back shifts (13:00–15:00 vs 15:00–17:00)
3. reports overlap for a one-minute overlap (13:00–15:00 vs 14:59–17:00)
4. reports overlap when one shift is fully inside another (13:00–18:00 vs 14:00–15:00)
5. reports overlap for identical intervals
6. reports no overlap for disjoint shifts with a gap

**`describe("findConflicts")`**: the PRD rules.
1. reports a conflict when the same volunteer is on two overlapping shifts
2. reports no conflict for back-to-back shifts for the same volunteer
3. reports a conflict for a one-minute overlap for the same volunteer
4. reports a conflict when a shift is fully inside another for the same volunteer
5. ignores a cancelled shift, whether it is the earlier or the later one (`it.each`)
6. never reports a conflict between different volunteers on overlapping shifts
7. reports a conflict only for the shared volunteer when overlapping shifts share some volunteers
8. reports conflicts across different events
9. returns `[]` for an empty list or a single shift
10. reports each pair once with `shiftIds` ordered [earlier, later], whatever the input order
11. reports all three pairs for a three-way overlap, sorted deterministically
12. doesn't treat a volunteer ID repeated within one shift as a conflict
13. doesn't mutate its input (frozen input plus a `structuredClone` snapshot, as in `tests/unit/staffing-status.test.ts`)
14. orders pairs that share an earlier shift by the later shift's start, then id

## TDD steps (red, green, refactor; one commit each)

Commit messages follow the repo's existing convention (`test(red):`, `feat(green):`, `refactor:`) and end with the Co-Authored-By line. Run only `npx vitest run tests/unit/conflicts.test.ts` during the loop.

0. **docs:** copy this plan to `docs/plans/conflict-detection.md`.
   - Commit: `docs: add conflict detection plan`
   - Then `/context` and `/clear`, per the context-management strategy.

**Cycle 1: `shiftsOverlap`**

1. **Red:** write the 6 `shiftsOverlap` tests. Confirm they fail because the module or export is missing.
   - Commit: `test(red): add shiftsOverlap tests for half-open intervals`
2. **Green:** add `Conflict` and `shiftsOverlap` with the epoch-ms predicate.
   - Commit: `feat(green): add shiftsOverlap with half-open interval rule`
3. **Refactor:** tidy the doc comment and extract a small `toMillis` helper if it reads better. Tests, `tsc`, and lint stay green.
   - Commit: `refactor: tidy shiftsOverlap`

**Cycle 2: `findConflicts`**

4. **Red:** write the 13 `findConflicts` tests. Confirm they fail because `findConflicts` doesn't exist.
   - Commit: `test(red): add findConflicts tests for PRD conflict rules`
5. **Green:** write the minimum `findConflicts` that passes every test.
   - Commit: `feat(green): add findConflicts for volunteer double-booking`
6. **Refactor:** extract a `byStartThenId` comparator and a group-by-volunteer helper, and simplify the output sort. Keep everything in `conflicts.ts` and leave the repository's private helper alone.
   - Commit: `refactor: simplify findConflicts grouping and ordering`

7. **docs:** update the CLAUDE.md status to "conflict detection (domain) done; UI warning not started".
   - Commit: `docs: update CLAUDE.md status for conflict detection`

If a refactor step has nothing worth changing, say so instead of making an empty commit.

## Files

- New: `src/lib/domain/conflicts.ts`, `tests/unit/conflicts.test.ts`, `docs/plans/conflict-detection.md`
- Edited: `CLAUDE.md` (status line only)
- Unchanged: `Shift` type, repositories, seed, UI

## Verification

- `npx vitest run tests/unit/conflicts.test.ts` passes all 19 tests.
- `npm test` passes, so existing tests are unaffected.
- `npx tsc --noEmit` and `npm run lint` are clean.
- `git log` shows the red, green, and refactor commits in order.
- Manual check: run `findConflicts` against `src/lib/repositories/seed-shifts.ts`. It should return `[]`: vol-ana's shifts are back-to-back, and vol-eli's later shift is cancelled.
