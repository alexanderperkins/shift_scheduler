# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Freshly scaffolded shift-scheduler app (Next.js App Router + TypeScript + Tailwind v4 + Vitest). Only the `create-next-app` starter page exists so far; `docs/` and `tests/` are empty placeholders. Update this file as real architecture lands.

## Commands

```bash
npm run dev          # Next.js dev server (Turbopack) at http://localhost:3000
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint (flat config, next/core-web-vitals + next/typescript)
npm test             # vitest run (single pass, no watch)
npx vitest run tests/foo.test.ts     # run a single test file
npx vitest run -t "test name"        # run tests matching a name
npx tsc --noEmit     # type-check (no dedicated script)
```

There is no `vitest.config.*` yet, so Vitest uses defaults (picks up `**/*.test.ts(x)` / `**/*.spec.ts(x)`, Node environment, no `@/` alias). If tests need the `@/*` path alias or a DOM environment (jsdom/happy-dom for React components), add a `vitest.config.ts` first.

## Stack notes

- **Versions are recent**: Next.js 16, React 19, Tailwind CSS 4, ESLint 9 flat config, Vitest 5. Don't assume older APIs (e.g. no `tailwind.config.js`; `next lint` is not used — the `lint` script calls `eslint` directly).
- **Tailwind v4 via Turbopack loader**: Tailwind is wired through `@tailwindcss/turbopack` as a CSS loader rule in `next.config.ts` (not PostCSS — there is no `postcss.config`). Styles are configured in CSS: `src/app/globals.css` starts with `@import "tailwindcss";` and defines theme tokens there.
- **Source layout**: app code lives under `src/` (App Router in `src/app/`); import via the `@/*` alias, which maps to `./src/*` (`tsconfig.json`).
- TypeScript is `strict`.
