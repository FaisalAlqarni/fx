### Finding verdicts

- **Important 1: apply failure undoes the failed step too (false "undo incomplete", bad mv line, blanking a file when the read fails)**: ADDRESSED. src/lib/scratch-migrate.ts:159 undoes only `done`, newest first; an edit or `.gitignore` step that fails is never undone, so the `original = ''` write at :123 and :138 can only run for a step whose read succeeded. A failed move cleans up its own directories (:98-101). The CLI test now asserts the brief's message: stderr starts `scratch-migrate: failed at edit CLAUDE.md` and ends `; undone`, the tree is identical and no `docs/` remains (src/lib/scratch-migrate.test.ts:483-490), plus the read-only `.gitignore` case (:492-497).
- **Important 2: symlinked .scratch, docs, docs/issues, .gitignore are followed out of the repo**: ADDRESSED. `isLink` uses lstat (src/lib/scratch-migrate.ts:31); `.scratch` is refused first (:35), `docs`, `docs/issues`, `.gitignore` before any change (:42), pointer files now refused instead of skipped (:64). Fixture test: `docs` and `.gitignore` linked outside, apply refused with exit 1, outside dir and file unchanged; `.scratch` and `docs/issues` links each refused (src/lib/scratch-migrate.test.ts:507-527).
- **Important 3: duplicated 17-line plugin-root check in fx-setup**: ADDRESSED. One snippet takes the script as `process.argv[1]` with an allowlist of the two migrations and the mode as `argv.slice(2)` (commands/fx-setup.md:126-130, skills/fx-setup/SKILL.md:129-133); the scratch step cites it (commands/fx-setup.md:136-138). fx-setup-root-check asserts one fenced block, runs the scratch script through the check (refused for a root inside cwd, dry run on the real root) and refuses an unknown script (src/tests/gates/fx-setup-root-check.test.ts:101-118).
- **Important 4: package-lock.json not bumped to 0.7.0**: ADDRESSED. Both `version` fields read 0.7.0 at 530aa89 (package-lock.json:3, :9), matching package.json.
- **Spec Compliance ❌ (ruling, false undo message, writes through symlinks)**: ADDRESSED, by Important 4, 1 and 2 above.

Checks run: worktree files for the fix paths are identical to 530aa89 (`git diff --stat 530aa89 --` on them is empty). With TMPDIR under the scratchpad: `node lib/scratch-migrate.test.js` printed `scratch-migrate.test.js: ok`; `node tests/gates/fx-setup-root-check.test.js` printed `fx-setup-root-check: passed`. Checked `fs.mkdirSync(..., {recursive})` returns the joined path as given for a relative root, so the `made !== abs(...)` comparison at :92 holds for relative roots too. The fix report states `ALL GREEN` for test-scope without showing output; the two focused runs above cover the claim.

### New breakage in the fix diff

- Minor: src/lib/scratch-migrate.ts:117-121, :132-136. An edit or `.gitignore` step whose `writeFileSync` fails after the open truncated the file (ENOSPC, EIO) is no longer restored, since failed steps are not undone and `run` has no catch that writes `original` back; the CLI then prints `; undone` over a truncated owner file. Read-only files fail at open and are unaffected. Fix: wrap the write in try/catch that rewrites `original` before rethrowing, as the move step does with `dropMade`.
- Minor: src/lib/scratch-migrate.ts:101. If `dropMade` throws inside the move step's catch (for example `docs/issues` not empty after a partial `git mv`), its error replaces the move error and the message still ends `; undone`. The failed-move cleanup path has no test; the report's "a failed move removes the directories it created" is not exercised by any test.
- Minor: src/lib/scratch-migrate.ts:64. A tracked pointer symlink such as `CLAUDE.md -> AGENTS.md` (a common layout) now blocks the whole migration, where before it was skipped and its in-repo target edited directly. This follows the controller's ruling; noting the cost for the final review.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 02: fix round 1/5 (4 addressed, 0 open; commits e1d5e27..530aa89)
Task 02: minor (deferred): scratch-migrate edit and .gitignore steps leave a truncated file and print "undone" when the write fails after open (src/lib/scratch-migrate.ts:117-121, 132-136)
Task 02: minor (deferred): scratch-migrate failed-move cleanup error masks the move error and still prints "undone"; the path has no test (src/lib/scratch-migrate.ts:101)
Task 02: minor (deferred): scratch-migrate refuses a tracked pointer symlink such as CLAUDE.md -> AGENTS.md, blocking the whole migration (src/lib/scratch-migrate.ts:64)
