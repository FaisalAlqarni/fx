### Finding verdicts

- **Important 1 (and the matching Spec Compliance ❌): the fx-setup migration step ran glossary-migrate from an FX root no check had vetted**: ADDRESSED. commands/fx-setup.md:96-125 now runs the migration inside its own `node -e` block on every runtime. The block copies section 6's three checks line for line (commands/fx-setup.md:113-122 against :247-256: not cwd or inside it, a plugin.json naming fx, PREAMBLE.md) and only then spawns `lib/glossary-migrate.js` with cwd as the root. The prose says to report a refusal and skip, and never to take FX from the repository. src/tests/gates/fx-setup-root-check.test.ts:71-90 asserts exactly one block calls glossary-migrate, that a root inside cwd is refused with no code loaded from it (marker file absent), and that the real root runs the dry run. skills/fx-setup/SKILL.md was regenerated (drift gate reported OK).
- **Important 2: applyMigration was not atomic, and a rerun could not finish a partial migration**: ADDRESSED. src/lib/glossary-migrate.ts:24-58: planMigration validates every source before any move. Each source must be tracked (`git ls-files`), each target must be absent, each link must be relative and stay inside the repo, and a linked file that is missing is refused unless its GLOSSARY.md sibling shows it already moved. Every problem lands in `conflicts`, and applyMigration throws before the first `git mv` (:62-65). The CLI catch (:90-95) prints one line with no stack trace. A rerun reads links from GLOSSARY-MAP.md when CONTEXT-MAP.md is gone (:33-34) and rewrites GLOSSARY-MAP.md whenever it exists (:66). New tests in src/lib/glossary-migrate.test.ts:81-122 cover an untracked linked file (exit 1, one stderr line, status unchanged), absolute and `..` links, a missing linked file, and a rerun on a partly migrated repo through to `moved 0` idempotency.

### New breakage in the fix diff

- Minor · src/lib/glossary-migrate.ts:90-95 · The catch prints `refused, repo unchanged` for every exception, including a `git mv` or file write that fails after earlier moves have run (for example a stale `.git/index.lock` or a disk error between moves). Validation covers every failure it can predict, and the new rerun path finishes the job. The message still claims nothing changed when something did, and commands/fx-setup.md tells the agent to relay it. Fix: print `repo unchanged` only when the error comes from the plan check, and otherwise say the migration stopped part way and a rerun finishes it.

Checks run (read only, nothing executed against any repo):
- Compared the fx-setup migration block with the section 6 block: the four check lines are identical; argv handling (`process.argv[1]` = FX, `slice(2,3).filter(Boolean)` = optional `--apply`) matches what the gate test exercises.
- Traced planMigration for: CONTEXT-MAP.md and GLOSSARY-MAP.md both present (GLOSSARY-MAP.md conflict, refused), an untracked map (refused), `./engines/a/CONTEXT.md` (normalised and matched against ls-files), and a linked dir that is a symlink out of the repo (not in ls-files, so refused). Each case refuses or proceeds as the ruling requires.
- Report fix section names the covering tests and RED/GREEN output (RED: `fatal: not under version control` stack after partial moves; GREEN: `glossary-migrate.test.js: ok`, root-check, user-invoked, skill-size, check-prose, check-paths, check-generated OK). No warnings in the reported output.

### Out-of-scope observations

None.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ledger lines

Task 10: fix round 1/5 (2 addressed, 0 open: none; commits a1a6a3f..6d5ce1e)
Task 10: minor (deferred): glossary-migrate prints "refused, repo unchanged" even when a git mv or write fails after earlier moves ran
