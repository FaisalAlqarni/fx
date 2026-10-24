### Spec Compliance

- ❌ Issues found: one ruling not met. commands/fx-setup.md:92-102 runs the migration from "the vetted `FX` of section 6", but no check has run at that point (see Important 1).
- ⚠️ Cannot verify from diff: the "before regenerating it fails with `fx-setup: skill body has drifted`" RED for tests/gates/user-invoked.test.js. The report says the pre-regeneration run errored with a stack trace nobody read. The controller should accept the GREEN gate or ask for the RED to be captured.

Checks run (scratch repos under TMPDIR, built lib/glossary-migrate.js at 1c1bc1f, never on a real repo):
- Owner shape, read only: /development/advantage-backend/CONTEXT-MAP.md:12-17 uses inline links `[..](engines/<e>/CONTEXT.md)` plus `(CONTEXT.md)`, all six files tracked. The link regex at src/lib/glossary-migrate.ts:29 matches every one of them.
- Untracked linked file: map links engines/a (tracked) and engines/b (untracked). `--apply` exits 1 with a node stack trace after it has already moved CONTEXT-MAP.md and engines/a. GLOSSARY-MAP.md is not rewritten. A second dry run prints only `dry run: nothing changed`.
- Absolute link `[a](/engines/a/CONTEXT.md)`: planMigration returns from `/engines/a/CONTEXT.md`, and `--apply` dies on `git mv` with `Invalid path '/engines'`. A reference-style link `[c]: engines/c/CONTEXT.md` is not planned.
- Conflict dry run: stdout `git mv CONTEXT.md GLOSSARY.md`, `conflict GLOSSARY.md already exists`, `dry run: nothing changed`, exit 0.
- grep list: `grep -rln "CONTEXT.md\|CONTEXT-MAP" skills references commands README.md INSTALL.md` prints exactly the 8 files the ruling leaves (domain-modeling.md, commands/fx-setup.md, skills/fx-setup/SKILL.md, five COVERAGE files).
- Each of the six lanes has exactly one `old name: see domain-modeling` pointer. No em or en dash appears in any added line.

### Strengths

- Never overwrites: conflicts are computed for every `to` (src/lib/glossary-migrate.ts:40), and `--apply` exits 1 before any move (:66-69). `git mv` without `-f` refuses an existing destination as well. The conflict test (src/lib/glossary-migrate.test.ts:72-80) proves no file moved and the existing GLOSSARY.md kept its content.
- The script follows the map's links and moves each one in place with `path.posix.dirname` (:36-39). It refuses `..` links (:32) and rewrites whole names only (:12), as the ruling requires. docs/plans and docs/adr are skipped (:19), and the apply test checks docs/plans/x.md is left alone.
- Dry run by default, commit count checked, idempotent second apply tested (test :68-70). The tests run against real git repos with no mocks.
- The conflict line in the dry run is a safe addition: it appears only when a conflict exists, the no-conflict output stays exactly as specified (test :51-53), and without it the user would say yes to a list that `--apply` then refuses.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

1. commands/fx-setup.md:96-98 (regenerated at skills/fx-setup/SKILL.md:95) · Ruling violated: "The fx-setup migration step runs glossary-migrate from the same vetted FX root that commands/fx-setup.md already establishes and checks (tests/gates/fx-setup-root-check), never from a new or repo-supplied path." The FX check lives inside the Codex-only `node -e` block in section 6 (commands/fx-setup.md:205-236). That block runs after step 2 and does not run on Claude Code at all. So `node <fx root>/lib/glossary-migrate.js` runs on an FX that has not been checked: no refusal when FX is the current directory or inside it, no plugin.json naming fx, no PREAMBLE.md. · Why it matters: this is the "running code from an unvetted path" cost the ruling names, and fx-setup-root-check passes because it only inspects the plant-roles block. · Fix: run the migration through the same vetting as section 6. Either move the FX definition and check into a step that runs before step 2 on every runtime, or wrap the call in a `node -e` that does the same three checks and then requires `lib/glossary-migrate`. Then extend fx-setup-root-check to cover it.

2. src/lib/glossary-migrate.ts:49-58 · `applyMigration` is not atomic and cannot be resumed. If any `git mv` fails (ran: an untracked linked CONTEXT.md), earlier moves stay done, the map's links are never rewritten, and the CLI prints a raw stack trace. On the rerun the plan starts from CONTEXT-MAP.md, which is gone, so the remaining engine files are never found, and GLOSSARY-MAP.md keeps links to files that no longer exist. · Why it matters: the brief requires idempotency, and a half-migrated glossary with dead links needs manual repair. · Fix: in planMigration, report every `from` that `git ls-files --error-unmatch` rejects as a conflict, so `--apply` refuses before it moves anything. Also let the plan read links from GLOSSARY-MAP.md when CONTEXT-MAP.md is absent, so a rerun finishes the job. Add a test for each.

#### Minor (Nice to Have)

1. src/lib/glossary-migrate.ts:29-32 · Link parsing: an absolute link (`/engines/a/CONTEXT.md`) passes the `exists` check and then crashes `git mv`. A reference-style link (`[c]: engines/c/CONTEXT.md`) is not planned, yet its text is rewritten to GLOSSARY.md when the map is edited (:53-56), which leaves a dead link. The owner's map uses neither form. · Fix: strip a leading `/` or reject it, and match `^\[..\]:\s*path` too.
2. src/lib/glossary-migrate.ts:44-45 · Any `CONTEXT.md` mention in CLAUDE.md, AGENTS.md, repo.md or docs is rewritten even when it names a file the plan does not move (an engine missing from the map). That mention then points at a file that does not exist. · Fix: list such references as conflicts, or rewrite only paths that are in `moves` plus bare names.
3. src/lib/glossary-migrate.ts:67 vs :76 · The conflict wording differs between stderr (`conflict: X already exists`) and stdout (`conflict X already exists`). commands/fx-setup.md:92-102 does not say what to do when the list shows conflicts, so the agent may ask, get a yes, and then hit exit 1. · Fix: use one format, and add a sentence to fx-setup telling the agent to report conflicts and not ask.
4. references/vocab/domain-modeling.md:50-51 · "show the dry-run list from the fx-setup migration" gives a lane outside fx-setup no command and no FX root, so "the next lane that writes to the glossary" cannot do it reliably. · Fix: name the command and the same vetted-root rule as fx-setup.
5. Report, TDD evidence · The pre-regeneration RED for user-invoked.test.js was not captured (the report says its text was not read). The main RED (MODULE_NOT_FOUND for lib/glossary-migrate.js) is valid.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The migration never overwrites a GLOSSARY file, follows the owner's map links, and dry-runs by default, all proven on real scratch repos. The fx-setup step still calls an FX root whose check has not run, against the ruling, and a failed `git mv` leaves a half-migrated repo that a rerun cannot finish.

## Ledger lines

Task 10: minor (deferred): glossary-migrate mishandles absolute and reference-style map links (crash, or a rewritten dead link)
Task 10: minor (deferred): glossary-migrate rewrites CONTEXT.md mentions of files it does not move, leaving dead references
Task 10: minor (deferred): conflict wording differs between stderr and stdout, and fx-setup does not say how to handle a conflict list
Task 10: minor (deferred): domain-modeling.md tells lanes to show the migration dry run without naming the command or the vetted root
Task 10: minor (deferred): user-invoked drift-check RED before regeneration not captured
