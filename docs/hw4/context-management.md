# Context Management Strategy

How we keep Claude Code's context window focused while working on Event Shift Scheduler. CLAUDE.md imports this file, so Claude reads these rules at the start of every session.

## Why it matters

Everything in a session shares one context window: CLAUDE.md, every file read, every test run's output, and every message. As it fills, older details get compacted or pushed out, and Claude starts to forget decisions, re-read files, or drift from the plan. The rules below keep each session small and make sure anything important lives in a file, not only in chat history.

## Principles

1. **Durable facts go in files, not in chat.** If something must survive past this session (a convention, a decision, a plan), write it down before moving on:
   - Project-wide rules and architecture go in `CLAUDE.md`.
   - Product behavior goes in `docs/PRD.md`, imported from CLAUDE.md.
   - Findings from the Explore phase go in `docs/hw4/explore-notes.md` (or `docs/explore/<feature>.md`).
   - The design for a feature goes in `docs/plans/<feature>.md`.
2. **One session, one task.** A session covers one feature or one bug. Unrelated work gets a fresh context.
3. **The plan file is the handoff.** Because the plan is saved to disk, we can clear the conversation after planning and start implementing with nothing but CLAUDE.md and `@docs/plans/<feature>.md` in context.
4. **Keep noisy output out of the main thread.** Broad searches and long logs belong in a subagent or a narrow command, not in the main conversation.

## Commands and when we use them

| Command | When we use it | Why |
|---|---|---|
| `/context` | At phase boundaries, and whenever a session feels slow or forgetful | Shows how much of the window is used and by what (system prompt, CLAUDE.md, tool output, messages). We check it before deciding between `/compact` and `/clear`. |
| `/clear` | When switching to an unrelated task, and between **Plan** and **Implement** once the plan is saved | Starts with an empty conversation. CLAUDE.md and its imports load again, so project rules are never lost. Old exploration output stops competing with the task at hand. |
| `/compact <focus>` | Mid-task, when `/context` shows the window getting full but we still need the thread of the current work | Summarizes the conversation and keeps what we name. Example: `/compact keep the TDD progress: which acceptance criteria are red/green, the files touched, and the next failing test`. Without a focus hint the summary may drop details we need. |
| `claude --continue` (`-c`) | Resuming the most recent session in this repo, such as after closing the terminal mid-feature | Restores the full previous conversation, so we don't re-explain the task. |
| `claude --resume` (`-r`) | Going back to an older, specific session (for example, the planning session for a feature) | Lets us pick from a list of past sessions. We name sessions with `/rename` so they are easy to find. |
| `/rewind` (or `Esc` `Esc`) | When Claude went down a wrong path | Rolls the conversation (and optionally code) back to an earlier point instead of piling corrections on top. |
| `/export` | At the end of every HW4 or P3 feature session | Saves the transcript for the annotated session log in `docs/hw4/session-logs/`. |
| `/memory` | When a correction should stick (for example, "always run `npx tsc --noEmit` before committing") | Opens CLAUDE.md for editing, so the rule is written down instead of repeated in every session. |

## Workflow by phase

This is how the strategy maps onto Explore → Plan → Implement → Commit and our TDD loop.

1. **Explore.** Start in a fresh session (`/clear` or a new `claude`). Use Glob, Grep, and Read to look around, or ask a subagent ("use a subagent to find every place that reads `assignedVolunteerIds`") so the search results stay out of the main context. Write the findings to an explore-notes file.
2. **Plan.** Switch to Plan mode (`Shift+Tab` twice) and refer to the notes with `@docs/hw4/explore-notes.md` instead of re-reading code. Save the approved plan to `docs/plans/<feature>.md` and commit it.
3. **Reset.** Run `/context` to record the usage, then `/clear`.
4. **Implement with TDD.** Start with `implement @docs/plans/<feature>.md step 1 using red-green-refactor`. Run single test files (`npx vitest run tests/unit/x.test.ts`) instead of the whole suite so test output stays short. If `/context` shows the window getting full, run `/compact` with a focus hint that names the current red/green state.
5. **Commit.** Commit each red, green, and refactor step with a Conventional Commit message. When the feature is done, `/export` the session and `/clear` before the next one.
6. **Interrupted?** Use `claude --continue` to resume the same session, or `claude --resume` to pick an older one.

## What not to do

- Don't keep one long session going across several features. Exploration from the previous feature crowds out the current one.
- Don't paste large logs or whole files into the chat. Point to the file with `@path` or ask Claude to read the relevant lines.
- Don't rely on Claude remembering a decision from earlier in the conversation. If it matters, it belongs in CLAUDE.md, the PRD, or the plan file.
- Don't run `/compact` without a focus hint during TDD. The red/green state is exactly what a generic summary tends to lose.

## Evidence

Screenshots and exported transcripts showing these commands in real sessions are stored in `docs/hw4/session-logs/` and annotated in the session log.
