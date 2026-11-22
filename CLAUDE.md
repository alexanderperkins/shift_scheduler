# CLAUDE.md

Guidance for Claude Code when working in this repository.

@docs/PRD.md
@docs/hw4/context-management.md

## Project

Event Shift Scheduler: organizers create shifts with staffing limits, assign volunteers, and see coverage status and double-booking warnings. Volunteers see their own shifts. The PRD above is the source of truth for behavior. If a request conflicts with it, ask before going ahead.

Status: HW4 in progress. Done: staffing status (`src/lib/domain/staffing-status.ts`), an in-memory shift repository with seed data (`src/lib/repositories/`), and the `/shifts` list page. Not started: shift creation, conflict detection, the volunteer view, and org admin. HW4 covers domain logic and UI with no database, login, or deployment. Those come in P3.

## Context management

Follow the strategy in `docs/hw4/context-management.md` (imported above): one task per session, durable facts in files, `/clear` between Plan and Implement, and `/compact` with a focus hint mid-task.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript 5**, `strict` mode
- **Tailwind CSS 4**, configured in CSS (`src/app/globals.css`) through the `@tailwindcss/turbopack` loader in `next.config.ts`. There is no `tailwind.config.js` or PostCSS config.
- **Vitest 5** for unit and integration tests
- **ESLint 9** flat config (`eslint.config.mjs`). The `lint` script runs `eslint` directly, not `next lint`.
- **PostgreSQL** is planned for after HW4. Don't add a DB driver or ORM before then.
- **E2E runner**: not installed yet. Playwright is the intended choice. Ask before adding it.

## Commands

```bash
npm run dev                       # dev server at http://localhost:3000
npm run build                     # production build
npm run lint                      # ESLint
npm test                          # vitest run (single pass)
npx vitest run tests/unit/x.test.ts   # one file
npx vitest run -t "name"          # tests matching a name
npx tsc --noEmit                  # type-check
```

`vitest.config.mts` resolves the `@/*` alias and runs tests in the Node environment (no jsdom). Test Server Components by rendering them to HTML with `renderToStaticMarkup` from `react-dom/server`; async pages can be awaited first (`renderToStaticMarkup(await Page())`). Anything that imports `next/font` (such as `layout.tsx`) can't be loaded in Vitest.

## Architecture decisions

- **Pure domain core.** Staffing status, conflict detection, and validation live in `src/lib/domain/` as pure, framework-free functions: no React, no Next, no I/O. This is the most heavily tested layer.
- **Repository boundary.** Data access goes through interfaces in `src/lib/repositories/`. HW4 uses in-memory implementations. P3 swaps in PostgreSQL without touching domain or UI code.
- **Thin UI.** `src/app/` routes and components call into domain and repository code. Business rules never live in components.
- **Server-first.** Use Server Components by default. Add `"use client"` only for interactivity. Use Server Actions or route handlers for mutations.
- **Time model.** Store timestamps as ISO 8601 UTC. Shifts are half-open intervals `[start, end)`, so back-to-back shifts don't overlap. Convert to local time only for display.
- **Imports** use the `@/*` alias (maps to `./src/*`).

## Coding conventions

- Use named exports. Use default exports only where Next.js requires them (`page.tsx`, `layout.tsx`, etc.).
- Never use `any`. Prefer `unknown` and narrow it. Model statuses as string-literal unions (`"understaffed" | "covered" | "overstaffed"`).
- Domain functions return new values and never mutate their inputs.
- Field names follow the PRD exactly: `id`, `eventId`, `start`, `end`, `minStaff`, `maxStaff`, `cancelled`, `assignedVolunteerIds`.
- Files are kebab-case (`staffing-status.ts`), components are PascalCase, and functions and variables are camelCase.
- Validate input at boundaries (forms, actions, route handlers). Domain functions may assume valid input.
- Keep `lint` and `tsc --noEmit` clean before every commit. Use Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Testing strategy: strict test-first TDD

**Red → Green → Refactor, every time.** Write a failing test first, run it, and confirm it fails for the expected reason. Then write the minimum code that makes it pass, then refactor with the tests green. Don't write production code without a failing test that requires it.

| Layer | Location | Scope |
|---|---|---|
| Unit | `tests/unit/` | Pure domain functions: staffing status, conflicts, validation |
| Integration | `tests/integration/` | Repositories, Server Actions, and route handlers working together |
| E2E | `tests/e2e/` | Full user stories in a browser (Playwright, once added) |

- Every PRD rule gets explicit tests, including edge cases: exactly `minStaff`, exactly `maxStaff`, zero assigned, back-to-back shifts (no conflict), one-minute overlaps, a shift fully inside another, and cancelled shifts (ignored).
- Each PRD user story gets at least one E2E test.
- Name tests by behavior (`"reports understaffed when assigned < minStaff"`), not by implementation.
- Don't weaken, skip, or delete a failing test to make the suite pass. Fix the code, or ask if the test itself looks wrong.
- Keep tests deterministic: inject the clock and IDs, and don't depend on real time or network.

## Do's and don'ts

**Do**
- Re-read the PRD rules before implementing or changing domain logic.
- Keep each change small and focused on a single behavior.
- Update this file when the architecture changes.

**Don't**
- Add a database, auth, or deployment config during HW4.
- Add dependencies without asking.
- Put business rules in React components or route files.
- Use `Date` arithmetic in local time for overlap checks.
- Commit `.env*` files or secrets.

## Security notes (OWASP awareness)

- **Broken access control (A01):** Enforce roles on the server for every mutation. Organizers manage their own org's events, volunteers see only their own shifts, and org admins manage organizers. Hiding buttons in the UI is not access control.
- **Injection (A03):** When PostgreSQL lands, use only parameterized queries or ORM query builders. Never build SQL with string concatenation.
- **XSS:** Rely on React's escaping. Don't use `dangerouslySetInnerHTML` with user content.
- **Input validation:** Check types, ranges (`0 ≤ minStaff ≤ maxStaff`, `end > start`), and ID ownership on the server.
- **Secrets & config (A05):** Load secrets from environment variables, never commit them, and never expose them through `NEXT_PUBLIC_*`.
- **Data exposure:** Return only the fields a role needs. Don't leak other volunteers' details to a volunteer.
- **Dependencies (A06):** Run `npm audit` periodically and keep Next.js patched.
