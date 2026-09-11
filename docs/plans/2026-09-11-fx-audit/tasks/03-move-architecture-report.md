# 03: Move the architecture report into the plan directory

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** MVP

**What to build:** `fx-architecture` writes its HTML report where a user can
open it again a week later, and `fx-review`'s throwaway worktree goes to the
ignored directory fx already uses for worktrees. **This task leaves the
artifact gate red at 8 lines**, because the visual companion is task 04's.

**Files:**
- Modify: `skills/fx-architecture/SKILL.md`
- Modify: `skills/fx-architecture/HTML-REPORT.md`
- Modify: `skills/fx-architecture/COVERAGE.md`
- Modify: `skills/fx-review/reviewer-prompt.md`
- Modify: `skills/fx-review/COVERAGE.md`

**Interfaces:**
- Consumes: the `artifact-gate: ok` marker (from task 02).
- Consumes: `scripts/check-artifacts` (from task 02).
- Produces: the report path convention
  `docs/plans/<slug>/report-<timestamp>.html`, used unchanged by task 08.

**Seam:** `scripts/check-artifacts` line count, and `scripts/check-paths` for
any citation this touches.

**Risks:** `fx-architecture` is often invoked standalone, with no plan
directory in existence. The skill must say what happens then, or an agent will
invent a location. It creates `docs/plans/YYYY-MM-DD-architecture-review/`.

The two COVERAGE files record what upstream said. Those lines are quotations
and must keep their temp paths, or the record stops being accurate. They get
the marker, not an edit to the quote.

**Idempotency:** text edits to five files, each replacing a named rule with
another. Re-running finds the new text already present and changes nothing.

**Testing:** the artifact gate's count, the prose gate, the citation gate, and
the combined gate.

## Acceptance criteria

- [ ] `fx-architecture/SKILL.md` names `docs/plans/<slug>/report-<timestamp>.html`
      and no longer resolves a temp directory.
- [ ] `fx-architecture/SKILL.md` says what happens when there is no active plan:
      it creates `docs/plans/YYYY-MM-DD-architecture-review/`.
- [ ] The open-command table and the rule that the absolute path is printed
      regardless both survive unchanged. They are about a silent failure to
      open, which the move does not affect.
- [ ] `HTML-REPORT.md` names the same path, and its opening paragraph no longer
      claims the file is in the OS temp directory.
- [ ] `HTML-REPORT.md` still says the report is local and is never published.
- [ ] `fx-architecture/COVERAGE.md` gains a supersession row recording that the
      restored upstream temp rule is now superseded locally, citing ADR 0015.
      Without it, COVERAGE misdescribes the shipped file.
- [ ] The two quoted upstream lines in `fx-architecture/COVERAGE.md` keep their
      temp paths and carry `artifact-gate: ok`.
- [ ] `fx-review/reviewer-prompt.md` directs a throwaway worktree to
      `.worktrees/review-<SHA>` instead of a temp path, and still says never to
      move HEAD in the checkout under review.
- [ ] The quoted line in `fx-review/COVERAGE.md` carries `artifact-gate: ok`.
- [ ] `python3 scripts/check-artifacts` reports **exactly 8 lines**, all of them
      in `skills/fx-brainstorm/`. A count other than 8 means something outside
      this task's file list moved.
- [ ] `scripts/check-all` still exits 0.

## Steps

- [ ] **1. Record the starting count**

Run: `python3 scripts/check-artifacts`
Expected: exit 1, 16 lines across 9 files. Paste the output into the report.

- [ ] **2. Edit the five files**

- [ ] **3. Run it: verify the intended red**

Run: `python3 scripts/check-artifacts`
Expected: exit 1, **8 lines**, every one under `skills/fx-brainstorm/`.

- [ ] **4. Confirm the exemptions are counted, not hidden**

Run: `python3 scripts/check-artifacts`
Expected: the report states 3 exempted lines, which are the two COVERAGE
quotations plus none elsewhere yet. If it states a different exemption count,
a marker landed on a line that was not meant to have one.

- [ ] **5. Verify citations still resolve**

Run: `python3 scripts/check-paths`
Expected: PASS.

- [ ] **6. Run the prose gate**

Run: `python3 scripts/check-prose skills/fx-architecture skills/fx-review`
Expected: PASS.

- [ ] **7. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0.

- [ ] **8. Commit**

```
git add skills/fx-architecture/SKILL.md skills/fx-architecture/HTML-REPORT.md skills/fx-architecture/COVERAGE.md skills/fx-review/reviewer-prompt.md skills/fx-review/COVERAGE.md
git commit -m "refactor(architecture,review): keep reports and worktrees in the repo"
```

No attribution trailers. Then continue to the next task: never stop and wait.
