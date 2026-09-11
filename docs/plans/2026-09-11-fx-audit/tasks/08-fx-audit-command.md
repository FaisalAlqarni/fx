# 08: `/fx:audit`

**Status:** ready-for-agent
**Blocked by:** 02, 05, 07
**Phase:** Core

**What to build:** the command a user types to have a whole system read, mapped,
compared against any reference implementation, reported on with evidence, and
turned into a target architecture that `fx-plan` consumes without an extra step.
Four phases, each ending in a summary of ten lines or fewer and a stop.

**Files:**
- Create: `commands/fx-audit.md`

**Interfaces:**
- Consumes: `../references/audit-template.md` (from task 07).
- Consumes: `../references/design-template.md` (already exists). **The command
  names both and composes them**, because the templates may not reference each
  other.
- Consumes: `fx-lens-pipeline` (from task 05), dispatched in Phase 3.
- Consumes: the report path convention `docs/plans/<slug>/report-<timestamp>.html`
  (from task 03).
- Produces: `docs/plans/YYYY-MM-DD-<slug>/01-current.md`, `02-reference.md`,
  `03-gaps.md`, `design.md` and `report-<timestamp>.html`.

**Seam:** a run of the command that stops after Phase 1. This is the behaviour
most likely to fail and the cheapest to observe, and a four-phase run per
iteration is a project in its own right.

**Risks:** a command that gates correctly on paper and runs straight through in
practice looks identical in review. It is checked by running it.

Phase 4 has a bias toward recommending a rewrite, because a rewrite is a more
interesting document to write. The defeater clause is the guard: a
recommendation that cannot name what would beat it is a preference wearing a
verdict.

**Idempotency:** the command writes documents into a slug directory and resumes
from whichever already exist, so re-running it continues rather than restarting.
Creating the command file itself is a single fixed write.

**Testing:** a gate-stop run against a scratch project, plus the citation,
prose and artifact gates.

## Acceptance criteria

- [ ] The command takes an optional target and an optional `--against`, and
      `--against` accepts a filesystem path, a branch, a tag or a revision.
- [ ] A filesystem path is read in place. A branch, tag or revision resolves
      into a worktree under `.worktrees/`, **removed at the Phase 2 gate**.
- [ ] The command **never guesses a branch name**. An unresolvable reference
      stops and asks.
- [ ] `.worktrees/` is confirmed git-ignored before anything is created there.
- [ ] Phase 2 runs only when `--against` is given, and is skipped silently
      otherwise.
- [ ] Each of the four phases ends with a summary of ten lines or fewer and a
      stop.
- [ ] Re-running the command resumes at the first phase whose document is
      missing, and says which phase it resumed at.
- [ ] Phase 1 dispatches parallel read-only explorers, each writing to `.fx/`
      and returning a path and a summary rather than its full text.
- [ ] An explorer returning nothing is re-dispatched once with more context,
      and if it returns nothing again the area is listed under **Areas not
      covered** in `01-current.md`.
- [ ] Phase 3 dispatches `fx-lens-pipeline` and `fx-architecture`, **and no
      other lens**, because the other four read a diff and an audit has none.
- [ ] Every verdict in `03-gaps.md` carries a file and line, and the command
      says the line is opened before the claim is written. A citation is a
      claim, not a check.
- [ ] `03-gaps.md` is ordered by impact.
- [ ] Phase 4 writes `design.md`, not a differently named target file, so
      `fx-plan` consumes it unchanged.
- [ ] Phase 4's recommendation names what would have to be true for the opposite
      recommendation to win.
- [ ] Phase 4 writes the HTML report into the same slug directory. **It names no
      temp directory**, proven by the artifact gate.
- [ ] A sound architecture is a stated outcome: the command says so, names what
      it checked, and writes no `design.md`.
- [ ] The command states its boundary: it edits no code, and it hands to
      `fx-plan` rather than starting implementation.
- [ ] The command does not restate what the template or the lens own, the way
      `/fx:critique` refuses to restate the agent it dispatches.
- [ ] `python3 scripts/check-paths` passes: both reference citations are
      anchored as `../references/...` and resolve.
- [ ] `python3 scripts/check-artifacts` exits 0.
- [ ] `scripts/check-all` exits 0.

## Steps

- [ ] **1. Write the failing test**

The test is a run that must stop. Build a scratch project with something to
audit, outside this repository:

```bash
mkdir -p /var/tmp/fx-audit-probe/src && cd /var/tmp/fx-audit-probe
git init -q
cat > src/sender.js <<'JS'
const queue = require('./queue');
async function send(ids) {
  for (const id of ids) await queue.push('sends', { id });
}
module.exports = { send };
JS
```

- [ ] **2. Run it: verify RED**

From the scratch project, run the command through the working tree rather than
the installed cache:

```bash
claude -p "/fx:audit" --plugin-dir /development/fx --dangerously-skip-permissions --max-turns 12 --output-format stream-json --verbose > run.json 2>&1
```

Expected before the file exists: the command does not resolve, and `run.json`
contains no phase-one document. Confirm `01-current.md` was not written.

- [ ] **3. Implement the minimum that passes**

Write `commands/fx-audit.md`. No body here: `fx-tdd` drives it.

- [ ] **4. Run it: verify GREEN, and verify the gate**

Re-run the same command. Expected, all three:
- `docs/plans/<date>-<slug>/01-current.md` exists in the scratch project.
- `02-reference.md` and `03-gaps.md` do **not** exist, because the run stopped
  at the Phase 1 gate.
- The final message is ten lines or fewer.

A run that produced `03-gaps.md` did not gate, and that is the failure this
step exists to catch.

- [ ] **5. Verify resume**

Run the same command again in the same scratch project. Expected: it says it
resumed, and it does not rewrite `01-current.md` from scratch.

- [ ] **6. Verify the citations resolve**

Run: `python3 scripts/check-paths`
Expected: PASS, with the count risen by two.

- [ ] **7. Verify no temp path crept in**

Run: `python3 scripts/check-artifacts`
Expected: PASS, exit 0.

- [ ] **8. Clean up the probe**

Remove `/var/tmp/fx-audit-probe`.

- [ ] **9. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0.

- [ ] **10. Commit**

```
git add commands/fx-audit.md
git commit -m "feat: add the four-phase whole-system audit command"
```

No attribution trailers. Then continue to the next task: never stop and wait.
