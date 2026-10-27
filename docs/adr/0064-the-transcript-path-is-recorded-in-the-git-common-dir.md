# The transcript path is recorded in the git common dir

Status: accepted, 2026-10-27.

Supersedes: 0040 (decisions 3)

## Context

ADR 0040 had the SessionStart hook write `<cwd>/.fx/transcript-path`, and only where `.fx` is git-ignored or outside git. A fresh repo had no such ignore rule, so the hook wrote nothing there, and a build run in a worktree looked for the file under the worktree, not where the session started. `build-cost` then printed `cost unavailable`.

## Decision

1. **The SessionStart hook records the transcript path** in `<git common dir>/fx/transcript-path`. Git never tracks that directory and every worktree of the repo shares it, so a fresh repo needs no ignore rule and `build-cost` finds the path from the build worktree. Outside git, or when git fails or times out (2 seconds), the hook writes nothing. With no transcript it removes the file, so an earlier session's path is never read as this one's. The preamble is always emitted and a subagent start writes nothing. `build-cost` reads the old `<cwd>/.fx/transcript-path` only as a fallback. With no recorded path, the script prints `cost unavailable` and the reason.
   Evidence: `src/hooks/fx-context.ts` `recordTranscriptPath`; `src/scripts/build-cost.ts` `recordedTranscript`

## Still in force

From ADR 0040, unchanged:

2. **Two ledger lines per task.** `Task <NN>: dispatched <BASE7> <ISO-8601>` is appended right after `BASE` is recorded. `Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>` is appended before the `complete` line.
3. **`build-cost --task <NN> --since <time>` prints the cost line.** Controller calls from `--since` count, plus every subagent whose first user message names the task. `fx-tdd 0/<i>` with `i` above 0 goes to the task reviewer, and a report with no captured RED run is then an Important finding.
4. **Resume checks `git log <BASE>..HEAD`** for a task with a dispatch line and no complete line. Committed work goes to review.
5. **At most one task review is outstanding** while the next implementer runs.
6. **NEEDS_CONTEXT and BLOCKED re-dispatch at most twice**, then the task gets `Task <NN>: parked: <reason>` and the owner is told.

## Consequences

- `build-cost` finds the transcript from any worktree of the repo, and no repo needs an ignore rule for it.
- A transcript path recorded under `.fx/` by an older hook is still read, only when the shared file is absent.
- The 0040 consequence that the path is absent in a work tree that does not ignore `.fx` no longer holds.

## Alternatives

- Keep `.fx/transcript-path` and require an ignore rule. Rejected: a fresh repo has none, so the cost line was unavailable until someone added one.
