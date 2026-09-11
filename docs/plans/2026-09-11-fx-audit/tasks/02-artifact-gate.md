# 02: The artifact gate, red, plus ADR 0015

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** a gate that fails when a skill, agent or command tells an
agent to write something into the OS temp directory, and the record explaining
why that rule reversed an inherited one. **This task ends with the gate red.
That is the intended result**, because the violations it finds are real and
tasks 03 and 04 are what fix them.

**Files:**
- Create: `scripts/check-artifacts`
- Create: `docs/adr/0015-artifacts-live-in-the-repository.md`

**Interfaces:**
- Produces: `scripts/check-artifacts`, exit 0 when clean, exit 1 listing every
  offending file and line otherwise.
- Produces: the escape marker `artifact-gate: ok`. A line carrying it anywhere
  is exempt. Tasks 03 and 04 both consume this.

**Seam:** `scripts/check-artifacts` exit code and its printed line list.

**Risks:** an allowlist of exempt files would be a promise to maintain it
forever, and ADR 0011 records that failure. The per-line marker puts the
exemption at the site where the person adding a temp path can see the rule,
which is the same choice `check-prose` made when it tagged prose fences rather
than inferring them.

**Idempotency:** creates two files with fixed content. Re-running rewrites the
same bytes and changes no scanned file.

**Testing:** run the gate against the current tree and count the reported
lines; then against a scratch copy with a marker added, and confirm the count
drops by exactly one.

## Acceptance criteria

- [ ] The gate scans `skills/`, `agents/` and `commands/`, every file
      extension, and **does not scan `scripts/` or `tests/`**, which hold test
      scaffolding that legitimately uses a temp directory.
- [ ] The gate matches `/tmp`, `$TMPDIR`, `${TMPDIR`, `%TEMP%`, `os.tmpdir`
      and `tmpdir`.
- [ ] A line containing `artifact-gate: ok` is exempt, and the gate says how
      many lines were exempted so an exemption cannot be silent.
- [ ] Run against the tree as it stands, the gate exits 1 and reports
      **16 lines across 9 files**.
- [ ] Adding `artifact-gate: ok` to one reported line drops the count to 15,
      proven by running it, and the line is then restored by copying it back.
- [ ] `docs/adr/0015` states the rule, names the inherited rule it reverses,
      quotes the original reason, and explains why a plan directory is not the
      repository root that reason was about.
- [ ] `docs/adr/0015` records that reports become committed files, because that
      is the consequence a future reader will be surprised by.
- [ ] `scripts/check-prose` passes on the new ADR.
- [ ] `scripts/check-all` still exits 0. The new gate is not wired into it in
      this task, because a red gate inside the combined command would block
      tasks 03 and 04 from committing.

## Steps

- [ ] **1. Write the failing test**

The gate is the test, and it does not exist yet:

```bash
python3 scripts/check-artifacts
```

- [ ] **2. Run it: verify RED**

Run: `python3 scripts/check-artifacts`
Expected: FAIL, `can't open file ... check-artifacts: No such file or directory`

- [ ] **3. Implement the minimum that passes**

Write the gate. No code here: `fx-tdd` drives it.

- [ ] **4. Run it: verify the intended red**

Run: `python3 scripts/check-artifacts`
Expected: exit 1, and the report names 16 lines across these 9 files:

```
skills/fx-brainstorm/scripts/stop-server.sh      3
skills/fx-brainstorm/visual-companion.md         2
skills/fx-brainstorm/scripts/start-server.sh     2
skills/fx-architecture/SKILL.md                  2
skills/fx-architecture/HTML-REPORT.md            2
skills/fx-architecture/COVERAGE.md               2
skills/fx-review/reviewer-prompt.md              1
skills/fx-review/COVERAGE.md                     1
skills/fx-brainstorm/scripts/server.cjs          1
```

A different total means the gate's scope or its pattern is wrong. Report the
difference rather than adjusting the number to match.

- [ ] **5. Prove the marker works**

Append `artifact-gate: ok` as a trailing comment to one reported line in
`skills/fx-review/COVERAGE.md`, re-run the gate, confirm it reports 15 lines
and 1 exemption, then restore the file by copying back a backup taken before
the edit.

- [ ] **6. Confirm the exempt directories are really exempt**

Run: `python3 scripts/check-artifacts`
Expected: no path beginning `scripts/` or `tests/` appears in the report, even
though `scripts/make-git-fixture` and `tests/lane-triggering/run-test.sh` both
contain temp paths.

- [ ] **7. Write ADR 0015**

- [ ] **8. Run the prose gate**

Run: `python3 scripts/check-prose docs/adr/0015-artifacts-live-in-the-repository.md`
Expected: PASS.

- [ ] **9. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0.

- [ ] **10. Commit**

```
git add scripts/check-artifacts docs/adr/0015-artifacts-live-in-the-repository.md
git commit -m "feat: add the artifact-location gate and record the rule"
```

No attribution trailers. Then continue to the next task: never stop and wait.
