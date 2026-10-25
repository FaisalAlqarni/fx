### Spec Compliance

- ❌ Issues found: ruling violated (package-lock.json not aligned to 0.7.0); apply failure prints a false "undo incomplete" in the very failure case the brief names (src/lib/scratch-migrate.ts:144); the migration writes through symlinks (src/lib/scratch-migrate.ts:33, 45, 66, 86, 122).
- ⚠️ Cannot verify from diff: that `fx-setup-root-check.test.js` exercises the new snippet at commands/fx-setup.md:145-161 and not only the first one; the report says check-all was ALL GREEN, which covers it running, not what it asserts.

Checks run (read-only on the checkout; fixtures only under TMPDIR, never a real repo):
- `git grep -n '\.scratch' f231895 -- skills commands references` minus vendor and COVERAGE.md: only commands/fx-setup.md:130,132, skills/fx-setup/SKILL.md:133,135 and fx-brainstorm's kept line skills/fx-brainstorm/SKILL.md:315 (allowed by ruling). Acceptance grep holds.
- `git show <sha>:package-lock.json`: version 0.6.0 at both 22df560 and f231895; package.json is 0.7.0.
- Built lib/scratch-migrate.js at f231895 run on a TMPDIR fixture matching the brief's "Failure undo" case (.gitignore `.scratch/`, read-only CLAUDE.md naming `.scratch/x`, untracked `.scratch/feat/a.md`): dry run exit 0 and correct; `--apply` printed `scratch-migrate: undo incomplete; run:` and `sed -i '1s#docs/issues/#.scratch/#g' 'CLAUDE.md'`, exit 1, although CLAUDE.md was never changed; an empty `docs/` directory was left behind.
- Same lib on a TMPDIR fixture with tracked symlinks `docs -> <outside>` and `.gitignore -> <outside>/gi`: dry run listed no conflict; `--apply` moved `.scratch/feat` into `<outside>/issues/feat` and truncated `<outside>/gi` to 0 bytes, exit 0, `moved 1, edited 0, committed nothing`.
- ADR 0059 and 0060 checked against skills/fx-adr/SKILL.md: status line form copies the repo's recent ADRs, decisions numbered, Evidence lines indented under decisions. Index has 60 rows (docs/adr/index.md:5-64); no other ADR in the diff stat.
- Dry run by default: src/lib/scratch-migrate.ts:156 (`--apply` required). Never unattended / never from a subagent: commands/fx-setup.md:132-143. Tracked moves use `git mv --` (line 87), untracked or ignored use `fs.renameSync` (line 87), `.gitignore` line shown in dry run (line 172): S6 holds.

### Strengths

- scratch-migrate follows glossary-migrate's shape: pure plan, re-plan inside apply, conflicts refuse before any write (src/lib/scratch-migrate.ts:137-138), commits nothing (test asserts commit count unchanged, src/lib/scratch-migrate.test.ts:78).
- Tests are real git fixtures, not mocks, and cover every case the brief lists plus a symlinked entry (src/lib/scratch-migrate.test.ts:104-109); the root skip for the read-only case is in place (line 92).
- Valid RED: runtime module-not-found for scratch-migrate, assertion failure for fx-json.
- parseFxJson change mirrors glossary_rename exactly (src/lib/fx-json.ts, the scratch_migrate block after glossary_rename), with both brief tests.
- fx-debug Phase 6 line names the template by path and says no fix means no report (skills/fx-debug/SKILL.md:368-370). Sizes under the gate.
- Index built mechanically; 0033, 0047, 0048 show `superseded by` from later `Supersedes:` lines.

Deviations judged:
- lane-rules.test.ts unedited: acceptable. The asserted prevention sentence is kept, the gate is green, nothing weakened.
- Rollback sed limit: acceptable as a labelled shortcut (src/lib/scratch-migrate.ts:77-78), since rollback lines are advice printed for a human, but see Minor 2 for a second sed gap.
- domain-modeling.md not given a scratch_migrate line: acceptable. references/vocab/domain-modeling.md:54 describes the glossary pointer behaviour, which has no scratch counterpart; a line there would document nothing true.
- fx-setup at 19,053 bytes: under 20,000, but the excess is the duplicated snippet (Important 3), so the deviation is a symptom, not a ruling.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. src/lib/scratch-migrate.ts:144 · on failure the loop undoes `[...done, s]`, so it also undoes the step that failed. For an edit or `.gitignore` step that failed on write, `undo` writes again and fails again, giving `UndoIncomplete` and the message `scratch-migrate: undo incomplete; run: sed ...` while the repo is in fact fully restored (reproduced on the brief's own read-only fixture). For a move step that failed at rename, `undo` renames a path that does not exist and prints `mv -- docs/issues/feat .scratch/feat`, a command that cannot work, and skips removing the `docs/issues` it created. Worse, the edit and gitignore steps start with `original = ''` (lines 100, 115): if `readFileSync` is the call that fails, `undo` (lines 109, 124) writes an empty string over the owner's file. · Messages must always be true and rollback must never destroy data; the brief's specified message `failed at <step>: <error>; undone` is unreachable in its own test case. · Undo only `done` in reverse; make each `run` clean up its own partial work (move: remove the `docs/issues` it made if the rename throws); guard undo on `original` having been read. Make the failure-undo test run the CLI and assert stderr starts `scratch-migrate: failed at edit CLAUDE.md:` and ends `; undone` (src/lib/scratch-migrate.test.ts:98 only asserts `throws`).

2. src/lib/scratch-migrate.ts:33, 45, 66, 86, 122 · only `.scratch/<name>` entries and pointer files are checked for symlinks. `.scratch` itself, `docs`, `docs/issues` and `.gitignore` are followed: `existsSync`, `mkdirSync({recursive})`, `renameSync` and `writeFileSync` all go through the link. Reproduced: with `docs` and `.gitignore` as tracked symlinks to a directory outside the repo, apply moved the issues outside the repo and truncated the outside file, with no conflict reported. · The task requires never writing through a symlink; this moves owner files out of the repository. · Add conflicts `<path> is a symlink` for `.scratch`, `docs`, `docs/issues` and `.gitignore` (lstat each that exists) and a fixture test for at least `docs` and `.gitignore`.

3. commands/fx-setup.md:145-161 (and skills/fx-setup/SKILL.md, generated) · the 17-line plugin-root security check is copied verbatim from the glossary step at commands/fx-setup.md:111-127; only the script name differs. · A second copy of a security check is a second place for it to drift, and it is why fx-setup grew to 19,053 bytes against a 17,900 estimate. The brief asked to run the script "through the same plugin-root check snippet", which a single snippet taking the script name as an argument satisfies. · One snippet with `process.argv[1]` as the script name (`glossary-migrate.js` or `scratch-migrate.js`) and `process.argv[2]` as the optional `--apply`; both steps cite it. Keep `fx-setup-root-check.test.js` green.

4. package-lock.json (not in the diff) · ruling violated: "Ruling: package-lock.json is bumped to 0.7.0 by task 02 (its brief already says to align it)". At f231895 package-lock.json reads 0.6.0 (top level and packages[""]) while package.json reads 0.7.0. · A stale lock version is the drift the ruling assigned to this task. · Set both `version` fields in package-lock.json to 0.7.0 and commit by path.

#### Minor (Nice to Have)

1. src/lib/scratch-migrate.ts:86, 92 · `mkdirSync('docs/issues', {recursive})` may also create `docs/`, but only `docs/issues` is recorded in `made`, so undo leaves an empty `docs/` (seen in the reproduction). The test's file-only snapshot cannot catch it. · Record the first directory actually created (mkdirSync's return value) and remove up to it.

2. src/lib/scratch-migrate.ts:125 · the `.gitignore` rollback `sed -i 'Ni text'` does nothing when the removed line was the last line of a file without a trailing newline (N is then past the end), and `sed -i` without a suffix is GNU only. · Printed rollback that silently does nothing is a false instruction. · Use `Na` on line N-1, or print the exact original line and `printf` append form; note GNU sed in the output.

3. docs/adr/0060-templates-live-in-one-folder-and-scratch-is-retired.md:15 · decision 3 says fx's own text names `.scratch/` only where it forbids writing designs there; the fx-setup migration step (commands/fx-setup.md:130) names it too. · Add "and in fx-setup's migration step".

4. skills/fx-debug/SKILL.md:372 · the edited prevention line runs to 122 characters, breaking the file's wrap. · Rewrap.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The happy paths and the S6 split are correct and well tested, but the failure path reports false undo state (and can blank a file if a read fails), and the migration follows symlinked `docs`, `docs/issues`, `.scratch` and `.gitignore` out of the repo; both were reproduced on TMPDIR fixtures. The package-lock ruling is also unmet.

## Ledger lines

Task 02: minor (deferred): scratch-migrate undo leaves an empty docs/ when mkdir created it (src/lib/scratch-migrate.ts:86)
Task 02: minor (deferred): .gitignore rollback sed Ni is a no-op for a last line without newline, and sed -i is GNU only (src/lib/scratch-migrate.ts:125)
Task 02: minor (deferred): ADR 0060 decision 3 omits fx-setup's migration step as a place that still names .scratch/
Task 02: minor (deferred): fx-debug prevention line rewrap at skills/fx-debug/SKILL.md:372
