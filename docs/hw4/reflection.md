# HW4 Reflection: Claude Code Workflow and TDD

## 1. How does Explore → Plan → Implement → Commit compare to our previous approach?

Before this homework, our AI workflow was mostly code generation: we asked ChatGPT for a function and pasted it in, accepted Copilot's inline completions, or had an AI generate code straight from a rough plan. Then we fixed whatever broke. That approach is fast for small changes. Its problem is that the AI starts writing before it understands the codebase, so the code it produces often ignores existing conventions or guesses at requirements.

The four-phase workflow changed that in three ways.

**Explore separated understanding from changing.** For conflict detection, a read-only subagent searched the codebase and wrote `docs/explore/conflict-detection.md`. It found things we would have had to rediscover by hand:
- times are stored as ISO UTC strings, with no date library
- the repository already uses a `Date.parse` comparator
- the seed data contains no conflicts

It also surfaced three real design questions before any code existed: event scope, return shape, and whether the UI was in scope.

**Plan mode made decisions explicit and reviewable.** In Plan mode, Claude asked those three questions as multiple choice, then produced a plan with 19 acceptance criteria and one commit per red, green and refactor step. We reviewed a document instead of a diff. Because the plan was committed (`a15446b`), it became the contract for implementation. Later, when Claude noticed the code's tie-break order differed from the plan, it stopped and asked rather than silently changing behavior.

**Implement + Commit with TDD kept every step small and verifiable.** Each commit does one thing, and the history reads as a story: explore, plan, red, green, test, red, green, refactor, docs. Two moments stood out:
- When edge-case tests passed immediately, Claude labeled them `test:` instead of faking a red commit. It then proved they were meaningful by temporarily breaking the code (`<` changed to `<=`) and watching the back-to-back test fail.
- It skipped a refactor with nothing to improve instead of making an empty commit. A real refactor followed in Cycle 2 (`ed19cde`).

The cost is speed: the feature took about 90 minutes, including screenshots, where a one-shot prompt might take 10. But the result has 21 tests, a clean history, and no surprises, and we understand every line of it. On earlier projects, generated code often looked right but broke on edge cases nobody had thought about, such as boundary values and empty inputs. Without tests, we only found those bugs by clicking around manually, often much later, and then had to work out which pasted block caused them. This time the edge cases were written down as tests before any code existed, so the back-to-back, one-minute-overlap, and cancelled-shift cases were handled from the start.

## 2. Which context-management strategies worked best?

We wrote the strategy down first (`docs/hw4/context-management.md`) and imported it into CLAUDE.md. That alone mattered: Claude followed it without being reminded. After saving the plan, it stopped on its own and told us to run `/context` and `/clear`.

**`/clear` at the Plan → Implement boundary** worked best. `/context` showed Messages drop from **43.3k to 130 tokens**, while Memory files stayed at 5.1k. Nothing was lost, because everything that mattered was already in files: rules in CLAUDE.md, behavior in the PRD, findings in the explore notes, and the design in the plan. Implementation started with a clean context and only `@docs/plans/conflict-detection.md`. The lesson: **`/clear` is safe exactly when durable facts live in files, not in chat.**

**`/compact` with a focus hint** was the right tool mid-task. Before the Cycle 2 refactor, we compacted with the hint "keep the TDD progress: which acceptance criteria are red/green, the commits so far, … the next step is the Cycle 2 refactor". Messages went from **39.9k to 21.2k**. When asked "Where are we?", Claude reproduced every commit hash, the status of all 19 criteria, and the exact refactor steps. A generic compact might have kept the gist but lost that red/green state.

**Subagents for exploration** kept the main context small. The explore subagent read many files, but the main session grew to only about 21k tokens of messages, because it received just the summary.

**`--continue` and `--resume`** made interruptions cheap. After quitting, `claude --continue` restored the session, and Claude summarized progress immediately. Naming the session with `/rename` made it easy to find in the `--resume` list.

**What we would do differently:** With a 1M-token context window, we never came close to the limit: the largest session used only 82k tokens (8%). So `/compact` and `/clear` mattered more for focus than for space. Clearing old exploration output kept Claude anchored to the plan. On a smaller window, or a longer feature, the same habits would decide whether a session finishes at all. We would also export the transcript before each `/compact`, because `/export` only saves the conversation from the last compact onward.

## Session log

The annotated session log is in `docs/hw4/session-log.md`, with screenshots in `docs/hw4/session-logs/` and the exported transcript in `docs/hw4/session-logs/conflict-detection-session.txt`.
