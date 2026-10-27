# Every task ledgers its dispatch and its cost, and the controller caps outstanding reviews and re-dispatches

Status: Superseded by 0064 (replaced: decisions 3; the rest carried forward)

## Context

`scripts/build-cost` reports a whole build. Nothing says what one task cost, so a task that burned tokens on repeated dispatches looked the same as a cheap one until the end. Three findings from the pipeline lens on the 2026-10-21 audit sit on the same gap:

- A controller resuming after compaction had no record of which commit a task started from, so it could not tell committed work from work never begun, and re-dispatched finished tasks.
- Reviews could pile up while the next implementer ran, each holding a diff and a report in the controller's context.
- A task returning NEEDS_CONTEXT or BLOCKED had no cap on re-dispatches.

## Decision

- **Two ledger lines per task.** `Task <NN>: dispatched <BASE7> <ISO-8601>` is appended right after `BASE` is recorded. `Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>` is appended before the `complete` line. The cost line extends the design's `cost <tokens> <minutes> <dispatches>` form with units and the fx-tdd count.
- **`build-cost --task <NN> --since <time>` prints the cost line.** Controller calls from `--since` count, plus every subagent whose first user message names the task. The attribution is by dispatch text, so a review running beside the next implementer is counted once, under its own task. `k/i` is how many implementers invoked `fx-tdd` out of all implementers. `fx-tdd 0/<i>` with `i` above 0 goes to the task reviewer, and a report with no captured RED run is then an Important finding.
- **The SessionStart hook records the transcript path** in `<cwd>/.fx/transcript-path`, so the cost step never guesses the file. It writes only outside a git work tree, or where `.fx` is git-ignored (checked with `git check-ignore` under a 2 second timeout), so it never dirties a tree. Whenever it writes nothing it removes an existing file instead (except where git says `.fx` is not ignored, a tree the hook does not touch), so an earlier session's path is never read as this one's. The preamble is always emitted. A subagent start writes nothing. With no recorded path, the script prints `cost unavailable` and the reason.
- **Resume checks `git log <BASE>..HEAD`** for a task with a dispatch line and no complete line. Committed work goes to review.
- **At most one task review is outstanding** while the next implementer runs.
- **NEEDS_CONTEXT and BLOCKED re-dispatch at most twice**, then the task gets `Task <NN>: parked: <reason>` and the owner is told.

## Consequences

Every later change in the audit plan can be measured per task. The transcript path is absent in a git work tree that does not ignore `.fx`, and the cost line then says so. `build-cost --task` never prints a normal-looking line from partial data: an unreadable or malformed subagent file, an unlistable subagents directory, or a transcript with no timestamps gives `cost unavailable (<reason>)`, and it always exits 0 with one line. The cost step also runs before the task reviewer is dispatched, so the `fx-tdd 0/<i>` signal exists when the reviewer needs it. The task number match is a text match on the dispatch prompt (`task <NN>`, with an optional colon), so a dispatch that never names its task is not attributed.

## Supersedes

Nothing.
