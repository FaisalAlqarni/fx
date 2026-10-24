# 05: check-artifacts and check-collisions on Node

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Core

**What to build:** `node scripts/check-artifacts [root]` applies the temp-directory rule and the remote-script rule exactly as the Python version does, and `node scripts/check-collisions [repo-path]` lists the same skill pools and flags the same collisions. The remote-asset test moves to TypeScript. `check-collisions` stays out of `check-all`, as today.

**Design:** Implementation Decisions > 1; Implementation Decisions > 3; Implementation Decisions > 5

**Files:**
- Create: `src/scripts/check-artifacts.ts`, `src/scripts/check-collisions.ts` (built over the Python files)
- Create: `src/tests/gates/check-artifacts-remote.test.ts` (built to `tests/gates/check-artifacts-remote.test.js`)
- Delete: `tests/gates/check-artifacts-remote.sh`
- Create: `tests/equivalence/check-artifacts.json`, `tests/equivalence/check-collisions.json` and their goldens
- Modify: `src/scripts/check-all.ts` (row `check-artifacts` runs `node scripts/check-artifacts`; row `check-artifacts-remote.sh` keeps its name and runs `node tests/gates/check-artifacts-remote.test.js`; the comment naming `check-collisions` as a manual check now reads `node scripts/check-collisions`)

**Interfaces:**
- Consumes: `toPosixRel`, `runNode` (task 01). The home directory is `os.homedir()`, which reads `HOME` on POSIX as Python's `Path.home()` does.

**Seam:** `equiv check`, the remote-asset test, `check-all`.

**Tests:**
- check-artifacts cases (root given as `{root}/t`): `clean` (both `OK:` lines and the exemption count line), one case per temp spelling in a skill (`/tmp`, `$TMPDIR`, `${TMPDIR`, `%TEMP%`, `os.tmpdir`, `tmpdir`), `temp-in-scripts-not-scanned`, `gate-ok-tag` (`artifact-gate: ok` on the line: exempted and counted), `vendor-skipped` (the `skipped for the remote rule (upstream code): references/vendor/` line), `binary-skipped` (`skipped, not text: <rel>`), `not-a-root` (the `FAIL: not a directory holding any of skills/, agents/, ...` message and its exit code), `no-argument` (no root argument, run on a root holding only written `skills/a/SKILL.md`).
- `check-artifacts-remote.test`: every `expect` row of the bash test, same label, same input, same expected exit code and same reported line number (nine remote loads named in the bash file plus its passing rows); prints the bash test's final pass line verbatim.
- check-collisions cases, `env: { HOME: "{root}/home" }`: `no-pools` (`0 skills across all pools`, `no collisions: one claimant per intent holds`, exit 0); `name-in-two-pools` (same skill name under `{root}/home/.claude/skills` and repo `.claude/skills`: the `! name ... appears in both` line, exit 1); `intent-match` (a repo skill described as `run tdd first`: flagged against fx-tdd); `folded-description` (`description: >` block); `truncation-warning` (481 generated skills: the `! 481 is past the point` lines); `repo-argument`.
- Live compare of check-artifacts on the whole repo (no argument): identical, in the ledger.

**Risks:** check-collisions' `LANE_INTENTS` are regex fragments (`test.first`, `review.*(diff|pr|branch)`); they must be compiled with the same semantics in JavaScript (no flag that changes `.` or anchors). The truncation case writes 481 directories; keep it in the cases file as a loop the tool cannot express, so write them with `write` entries generated once by a small script whose output is pasted into the cases file and committed.

**Testing:** recorded equivalence; gate test; `check-all`.

## Acceptance criteria
- [ ] Both cases files check identical; the live compare of check-artifacts is identical.
- [ ] `tests/gates/check-artifacts-remote.sh` is deleted and its replacement passes in `check-all`.
- [ ] `check-collisions` is not a `check-all` row.
- [ ] `git grep -nE "(python3?|bash|sh) [^ ]*scripts/check-(artifacts|collisions)"` outside `docs/plans/` prints nothing.

## Steps

- [ ] **1. Invoke `fx-tdd`**
- [ ] **2. Record `old.rev`; write both cases files; record goldens**
- [ ] **3. Write the remote-asset test**
- [ ] **4. Verify RED**: `scripts/build && node scripts/equiv check tests/equivalence/check-artifacts.json; node scripts/equiv check tests/equivalence/check-collisions.json; node tests/gates/check-artifacts-remote.test.js`
- [ ] **5. Port both gates**
- [ ] **6. Verify GREEN**: same commands, then the live compare
- [ ] **7. Run the scope**

Run: `node scripts/check-all` (tracked background command)

- [ ] **8. Commit by path**

```
git rm tests/gates/check-artifacts-remote.sh
git add src/scripts/check-artifacts.ts src/scripts/check-collisions.ts scripts/check-artifacts scripts/check-collisions src/tests/gates/check-artifacts-remote.test.ts tests/gates/check-artifacts-remote.test.js tests/equivalence/check-artifacts.json tests/equivalence/check-artifacts.golden.json tests/equivalence/check-collisions.json tests/equivalence/check-collisions.golden.json src/scripts/check-all.ts scripts/check-all
git commit -m "build: check-artifacts and check-collisions on Node"
```
