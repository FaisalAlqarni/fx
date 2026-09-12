# 03: The pipeline lens hunts all six groups in a file set

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Core

**What to build:** when `fx-lens-pipeline` reads an audit's file set, it reports
all six queue problems it was measured on: head-of-line blocking between unlike
workloads, redelivery with no idempotency check, poison messages that requeue
forever, a lease shorter than the work it covers, retries with no jitter, and
unbounded enqueue outrunning consumers. When it reads a diff in branch review,
it stays exactly as narrow as today. The audit's soundness check counts findings
across all six groups, and a lens output with no `Unread:` line fails it.

**Files:**
- Modify: `agents/fx-lens-pipeline.md`
- Modify: `tests/lens-pipeline/KEY.md` (the status section only, never the six table rows)
- Modify: `tests/lens-pipeline/README.md`
- Modify: `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md`
- Modify: `skills/fx-audit/SKILL.md`

**Interfaces:**
- Consumes: the lens's existing output format: `N. [Critical|Important|Minor] <file>:<line>: <what is wrong> -> <what it causes in production>.`, and for a file set a final `Unread:` line naming every unread file on the hunted paths, or `Unread: none`.
- Produces: the same output format in both modes. In a file set, findings may come from any of the six groups; in a diff, only from unbounded enqueue.
- Produces: the audit's soundness rule: sound only when both Phase 3 dispatches ran and returned, the lens output has an `Unread:` line naming no file in the file set, the lens reported nothing Critical or Important in any of the six groups, the verdict table has no high-impact row marked wrong, missing or over-engineered, and the Phase 3 gate choice reads `none`.

**Seam:** two blind smoke runs on the unchanged fixture and key (design seam 4).

**Risks:**
- Tuning the lens to its smoke runs. Write the lens edit before any run, run each mode once, and if a run fails, stop and report: never edit the lens in response to a run.
- Changing diff mode by accident. Keep the diff-mode hunt, ceding rules and severity text byte-identical; prove it in step 9.
- Editing the fixture or the six key rows, which would falsify the committed measurement. Prove both unchanged in step 9.

**Idempotency:** text edits and two read-only smoke runs whose working copies live in the ephemeral workspace. Re-running rewrites the same text; the smoke-run copies are rebuilt from the fixture.

**Testing:** two blind smoke runs, scored against `tests/lens-pipeline/KEY.md`; record-integrity checks by checksum and diff.

## Acceptance criteria

- [ ] Given a diff, the lens's hunt list, ceding rules and severity definitions are unchanged from before this task.
- [ ] Given a file set, the lens hunts all six groups, cedes only per-record queries and enqueue inside a transaction to `fx-lens-database` and swallowed errors to `fx-lens-silent-failure`, and defines Critical, Important and Minor for the five added groups.
- [ ] The lens description and body name no framework, language, vendor or file extension.
- [ ] `tests/lens-pipeline/KEY.md`'s status section states the expected result per mode: a file set finds rows 1 to 6, a diff finds row 6 only, and neither says anything about `schema.sql`.
- [ ] `tests/lens-pipeline/README.md`'s regression signal states the same for each mode.
- [ ] ADR 0014 records the file-set mode and its measured basis, and its "What it costs" section no longer says an audit has no pass for the other queue groups.
- [ ] The audit skill's Boundary says the lens hunts all six groups for the audited file set, and Phase 4's soundness check fails a lens output with no `Unread:` line.
- [ ] The file-set smoke run finds rows 1 to 6 as numbered findings naming each row's mechanism and says nothing about `schema.sql`; the diff smoke run finds row 6 and none of rows 1 to 5 as a numbered finding.
- [ ] `tests/lens-pipeline/fixture/` is unchanged since `d496d1e`, and the six rows of `KEY.md` hash the same as at `d496d1e`.
- [ ] `python3 scripts/check-manifest`, `python3 scripts/check-prose` on the changed files, and `scripts/check-all` pass.

## Steps

- [ ] **1. Record the diff-mode text before editing**

```bash
mkdir -p .fx/2026-09-12-fx-audit-followups/lens
cp agents/fx-lens-pipeline.md .fx/2026-09-12-fx-audit-followups/lens/before.md
git show d496d1e:tests/lens-pipeline/KEY.md | grep '^| ' | sha256sum > .fx/2026-09-12-fx-audit-followups/lens/key-rows.sha256
```

- [ ] **2. Write the failing check**

```bash
grep -c 'head-of-line' agents/fx-lens-pipeline.md
grep -c 'no `Unread:` line' skills/fx-audit/SKILL.md
```

- [ ] **3. Run it: verify RED**

Run the two commands above.
Expected: the first shows the phrase only inside the ceding rules; the second shows `0`.

- [ ] **4. Implement the minimum that passes**

Invoke `fx:fx-authoring` before editing: the lens and the skill are instructions agents follow, and the lens is a measured document. Then:
- In the lens's Input section, state that a diff means the narrow hunt and a file set means all six groups.
- Add a hunt section that applies to a file set only, naming the five groups by the mechanism each keyed row describes, in categories, with no framework or vendor.
- Make the ceding bullet that hands the five groups to branch review's passes apply to a diff only.
- Add severity definitions for the five groups in a file set.
- Leave the output format, the `Unread:` rule and every diff-mode sentence as they are.
- Update `KEY.md`'s status section, the README's regression signal, ADR 0014, and the audit skill's Boundary bullet and soundness check as the acceptance criteria say.

Write all of it before running either smoke run.

- [ ] **5. Build the two blind subjects**

```bash
S=.fx/2026-09-12-fx-audit-followups/lens
mkdir -p "$S/subject" "$S/subject-diff"
cp tests/lens-pipeline/fixture/worker.js tests/lens-pipeline/fixture/schema.sql "$S/subject/"
{ git diff --no-index -- /dev/null tests/lens-pipeline/fixture/worker.js || true
  git diff --no-index -- /dev/null tests/lens-pipeline/fixture/schema.sql || true; } > "$S/subject-diff/fixture.diff"
diff -r "$S/subject" tests/lens-pipeline/fixture && test -s "$S/subject-diff/fixture.diff" && echo "subjects ready"
```

Write `$S/brief-file-set.md`:

```markdown
# Lens run brief

Read `<absolute path to agents/fx-lens-pipeline.md>`. Everything below its frontmatter is your brief. Act as that lens exactly as it describes: its input modes, scope, hunt list, method, output format and red flags.

## What you review

Every file in `<absolute path to .fx/2026-09-12-fx-audit-followups/lens/subject/>`. There is no diff: treat the file set as the change under review, as the lens brief says for a file set.

## Rules

- Open nothing except this brief, the lens file named above, and the directory above.
- Read-only. Do not create, modify or delete any file. Do not dispatch subagents. Do not run the code.

## Output

The lens's output format exactly, with a file and line on every finding. Then one final line listing every path you opened.
```

Write `$S/brief-diff.md` the same, except: "What you review" is `<absolute path to .fx/2026-09-12-fx-audit-followups/lens/subject-diff/fixture.diff>`, described as a diff to review as the lens brief says for a diff, and the rules name that one file instead of the directory.

- [ ] **6. Run the file-set smoke run**

Dispatch one read-only general-purpose agent on the top tier with only: `Read <absolute path to brief-file-set.md> and do exactly what it says.`
Save its output verbatim to `$S/run-file-set.md`.

- [ ] **7. Run the diff smoke run**

Dispatch a second, fresh read-only general-purpose agent on the top tier with only: `Read <absolute path to brief-diff.md> and do exactly what it says.`
Save its output verbatim to `$S/run-diff.md`.

- [ ] **8. Score both runs against the key**

A row is found when a numbered finding names that row's keyed mechanism at or near its keyed lines in `tests/lens-pipeline/KEY.md`. A finding at the right line naming a different mechanism does not count, and a finding about two overlapping scheduled runs racing is the key's unscored issue 7, not row 6.

- File-set run passes when rows 1 to 6 are each found, nothing is said about `schema.sql`, the output ends with an `Unread:` line, and the paths opened are only the brief, the lens and the subject.
- Diff run passes when row 6 is found, none of rows 1 to 5 is a numbered finding, nothing is said about `schema.sql`, and the paths opened are only the brief, the lens and the diff.

Write one line per row per run, citing the finding it rests on. **If either run fails, stop and report. Do not edit the lens in response.**

- [ ] **9. Prove the record and diff mode are unchanged**

```bash
git diff --quiet d496d1e -- tests/lens-pipeline/fixture && echo "fixture unchanged"
grep '^| ' tests/lens-pipeline/KEY.md | sha256sum | diff - .fx/2026-09-12-fx-audit-followups/lens/key-rows.sha256 && echo "key rows unchanged"
diff .fx/2026-09-12-fx-audit-followups/lens/before.md agents/fx-lens-pipeline.md
```

Expected: both lines printed. In the last diff, every changed hunk is an addition for file-set mode or a qualifier limiting an existing sentence to a diff; no diff-mode rule is reworded. Paste it into the report.

- [ ] **10. Run the gates**

Run: `python3 scripts/check-manifest && python3 scripts/check-prose agents/fx-lens-pipeline.md tests/lens-pipeline/KEY.md tests/lens-pipeline/README.md docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md skills/fx-audit/SKILL.md && scripts/check-all`
Expected: all pass, `ALL GREEN`.

- [ ] **11. Commit**

```
git add agents/fx-lens-pipeline.md tests/lens-pipeline/KEY.md tests/lens-pipeline/README.md docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md skills/fx-audit/SKILL.md
git commit -m "feat(lens): hunt all six measured queue groups when reading an audit's file set"
```

No attribution trailers. Then continue to the next task: never stop and wait.
