# Explore Notes: Staffing Status + Shift List Page

Branch: `feature/staffing-status` (clean, no feature commits yet).
Scope: what exists and what's missing for (a) shift staffing status
(understaffed / covered / overstaffed) and (b) a page listing shifts.
Read-only exploration. No code was changed.

## What the PRD requires (docs/PRD.md)

- **User story 1:** organizers create shifts with start, end, minStaff, maxStaff.
- **User story 2:** organizers see each shift's staffing status.
- **Shift fields:** `id, eventId, start, end, minStaff, maxStaff, cancelled, assignedVolunteerIds`
- **Staffing rules:**
  - understaffed: `assigned < minStaff`
  - covered: `minStaff <= assigned <= maxStaff`
  - overstaffed: `assigned > maxStaff`
- The rules are exhaustive and don't overlap when `minStaff <= maxStaff`. That
  invariant is enforced at the boundary (CLAUDE.md: `0 ≤ minStaff ≤ maxStaff`, `end > start`).

## What exists

| Area | State |
|---|---|
| `src/app/page.tsx` | Unmodified `create-next-app` starter page (Next logo, Vercel links). Nothing shift-related. |
| `src/app/layout.tsx` | Starter layout. Metadata is still "Create Next App". Uses typed `LayoutProps<"/">`. |
| `src/app/globals.css` | Tailwind 4 `@import` plus starter light/dark tokens. |
| `src/lib/` | **Does not exist.** No `domain/` or `repositories/`. |
| `tests/` | **Empty directory.** No unit, integration, or e2e tests. |
| `vitest.config.ts` | **Missing.** The `@/*` alias won't resolve in tests, and the environment is Node only. |
| `tsconfig.json` | `strict: true`, `@/*` → `./src/*`. Ready to use. |
| `package.json` | `test` = `vitest run`, `lint` = `eslint`. Deps: next 16.4.6, react 19.3.0, vitest ^5.1.1, tailwind 4.3.3. |
| `.claude/settings.json` | Allows npm test/lint, vitest, tsc, and read-only git commands. Denies `.env` reads and force push. |
| `README.md` | Stock create-next-app README. |
| `docs/hw4/init-output.md` | Saved `/init` output (earlier CLAUDE.md draft). |

A search for `shift`, `staff`, `volunteer`, and `status` under `src/` found nothing.
No feature code exists yet.

## What's missing

### Staffing status (domain, `src/lib/domain/`)
- [ ] `Shift` type matching the PRD field names exactly. `start`/`end` are ISO 8601 UTC strings.
- [ ] `StaffingStatus` string-literal union: `"understaffed" | "covered" | "overstaffed"`.
- [ ] Pure `staffingStatus(shift)` (e.g. `staffing-status.ts`), with no React, Next, or I/O, and no mutation.
- [ ] Unit tests in `tests/unit/` covering: zero assigned, one below min,
      exactly `minStaff`, between min and max, exactly `maxStaff`, one above max,
      and `minStaff === maxStaff`. Optionally `minStaff = 0` with zero assigned (covered).

### Shift list page
- [ ] Repository interface in `src/lib/repositories/` (e.g. `ShiftRepository.list()`).
- [ ] In-memory implementation with seed data. IDs and clock should be injectable for deterministic tests.
- [ ] Integration test for the repository in `tests/integration/`.
- [ ] Route that lists shifts (e.g. `src/app/shifts/page.tsx`, or replace the starter `page.tsx`)
      as a **Server Component**. It reads from the repository and calls the domain function
      for each shift. Nothing in the component decides the status.
- [ ] Display: start and end converted to local time for display only, assigned/min/max counts,
      and a status badge. Need to decide how cancelled shifts appear. The PRD only says
      cancelled shifts are ignored for *conflicts*, not whether they're hidden from the list.
- [ ] Update layout metadata (title/description) from the starter values.
- [ ] E2E test for user story 2. Playwright isn't installed and adding it needs approval.

### Tooling prerequisites
- [ ] `vitest.config.ts` with the `@/*` alias. This is needed before the first test that imports via `@/`.
- [ ] jsdom and `@testing-library/react` for component tests. These **aren't installed**, so they need
      approval to add. They can be skipped if the page is tested only via integration and E2E.
- Note: `zod` exists in `node_modules` only as a transitive dependency, not a declared one.
  Don't rely on it for boundary validation without adding it explicitly (with approval).

## Open questions for the user

1. Should the shift list replace `/` or live at `/shifts`?
2. Should cancelled shifts be hidden, shown with a "cancelled" label, or shown with a status?
3. Is adding Playwright (E2E) and jsdom/testing-library (component tests) approved now, or later?
4. Is the shift list scoped to one event (`eventId`) or all shifts for now?

## Suggested TDD order

1. Add `vitest.config.ts` (alias). Write a red unit test for `staffingStatus`, then make it pass.
2. Add the `Shift` type and repository interface, then write a red integration test for the in-memory `list()`.
3. Build the shift list Server Component on top of both.
4. Add the E2E test for story 2 once Playwright is approved.
