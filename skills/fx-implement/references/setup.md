**Legacy plans:** older plans use `tickets/` where current ones use `tasks/`.
Treat the two names as the same thing everywhere below, and rename the
directory to `tasks/` on your first commit so the old name drains out.

### 1. Workspace

Detect existing isolation first (the submodule guard matters), prefer the
harness's native worktree tool over raw `git worktree add`, verify the
directory is git-ignored before creating anything, and never start on
main/master without explicit consent.

Full procedure and its rationalizations: `../../../references/vocab/worktree-setup.md`.

**You create the worktree. You do not enter it.** Isolation is for the work,
not for the coordination. A native worktree tool typically **pins the whole
session**, and a pinned controller cannot reach any other repository, cannot
run compound commands, and reads every refusal as a guard catching a mistake
when the mistake was its own location. Pass the absolute worktree path to each
implementer, which is what the dispatch template already does, and reach it
yourself with `git -C <path>` or `cd <path> && …`.

The "#1 mistake" warning in `worktree-setup.md` (bypassing the native tool) is
written for an implementer. For a controller it inverts: entering is the mistake.

**An uncommitted plan is not a blocker.** `git worktree add` works fine
against a dirty tree. The only real consequence: a worktree checked out from a
commit won't contain files that were never committed, so an uncommitted
`docs/plans/<slug>/` opens with no tasks in it. **Fix:** copy
`docs/plans/<slug>/` into the worktree once it exists, so the branch's first
commit carries it, and the ledger travels with the work. Warn; do not gate.

**Detached HEAD: do not commit.** Those commits become unreachable the moment
HEAD moves. Create a branch first.

### 2. Project setup

Run the `setup` command from **`.fx.json`**: never guess it, or any command named there.
Rails is not `npm install`; .NET is not `pytest`.

**`test_all` runs once in a run, at the exit gate.** There is no baseline run
before task 01: on a suite measured in tens of minutes it cost a build as much
again before any work began, and the exit gate's classification (below)
answers the question it was for. Per-task gates use `test_scope` with the paths
that task touched, named by `repo.md`. A full suite per task multiplies one slow
command by the task count. No `test_scope` in `.fx.json` means the repo has no
safe partition, and every gate uses `test_all`.

No `.fx.json`, or the command is `null`? **Ask**: with one greenfield
exception: no `.fx.json` **and** no test suite means a new project.
Proceed; task 01 establishes both the app and `.fx.json`.
Asking here would turn every new project into a stall. Ask only when
`.fx.json` is missing from a repo that plainly already has tests.

**Before task 01, check the test command can start.** Take the first word of
`test_scope`, or of `test_all` when there is no `test_scope`: a name must
resolve with `command -v`, a path must exist. When it does not, stop and ask
the owner once:

```markdown
The test command `<first word>` cannot run here. How should the build go?

1. Install or fix the runner, then I retry (recommended)
2. Build on review alone: every task ledgered "tests written, not run"
3. Stop here
```

Ledger the answer as `Ruling: test runner: <1, 2 or 3>: <owner's words>`.
A build that finds this at the exit gate has spent every task on tests that
never ran. The greenfield case above skips the check: task 01 creates the runner.

Then load `../../../references/stacks/<name>.md` for each entry in `stacks`. These carry
ecosystem traps only. **A name with no file is not an error**: it means no
traps file exists for that stack yet, and nothing else changes.

Report:

```
Worktree ready at <full-path> on <branch>
Ready to implement <feature>
```

### 3. Two workspaces, split by lifetime

**Durable: `docs/plans/<slug>/`, committed:** `design.md` · `plan.md` ·
`tasks/NN-*.md` · `state.md` (the ledger).
This is the record of what was decided and what happened. **Never delete it.**

**Ephemeral: `.fx/<slug>/`, git-ignored:** `reports/NN-*-report.md`
(implementer reports) · `review/*.diff` (review packages).
These are working artifacts: verbose, and regenerable from git. **Create the
directory, then verify it is ignored** (`git check-ignore -q .fx`): a `.fx/`
pattern matches directories only, so checking before it exists always fails;
that's the wrong moment, not "not ignored". If it fails once created, add
`.fx/` and `.worktrees/` to the ignore file.

**On a repo with no application yet**, put those entries in
`.git/info/exclude` instead of `.gitignore`. Most generators, `rails new`
included, only append their own line onto an *existing* `.gitignore` instead
of writing their full default block: a pre-existing `.gitignore` at
generation time silently commits database files and logs. `.git/info/exclude`
has the same effect, is invisible to the generator, and leaves the project's
own ignore file for the project to write.

Another slug's directory is never yours to read or write.
