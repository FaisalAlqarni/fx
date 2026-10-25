# 02: Bug reports, `docs/issues/`, `.scratch/` migration; Phase A gate

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** A: ADR lane and templates

**What to build:** a fixed bug leaves `docs/issues/<YYYY-MM-DD>-<slug>.md`, written from the bug report template at the end of fx-debug's Phase 6 and committed with the fix; a session with no fix writes none. fx's own text retires `.scratch/`: issues go to `docs/issues/`, throwaway material to `.fx/`. `/fx:fx-setup`, finding a `.scratch/` with issues, runs `lib/scratch-migrate.js` as a dry run, shows the moves, every pointer line it will change, the `.gitignore` line it will remove and the rollback, and asks once. On yes it applies: tracked entries move with `git mv --`, untracked or ignored ones with a filesystem move (standing ruling S6); any failure undoes what was done. It commits nothing; the owner runs `git add -- docs/issues`. On no it writes `"scratch_migrate": "declined"` to `.fx.json` and never asks again; with no human to answer it does nothing and writes nothing. Phase A closes with its two ADRs, fx's first ADR index, and a green `check-all`.

**Design:** Phase A: fx-debug bug report; Phase A: issues and `.fx/`; Further Notes; Testing Decisions

**Files:**
- Modify: `skills/fx-debug/SKILL.md` (one Phase 6 checklist line: write the report from `../../references/templates/bug-report-template.md`, commit it with the fix, none without a fix; the prevention-question line points at the report's last section)
- Modify: `skills/fx-brainstorm/SKILL.md` (the `**Never .scratch/. Never docs/superpowers/.**` line names `docs/issues/` for issues and `.fx/` for throwaway material)
- Create: `src/lib/scratch-migrate.ts`, `src/lib/scratch-migrate.test.ts`, built to `lib/scratch-migrate.js`, `lib/scratch-migrate.test.js`
- Modify: `scripts/check-all` (`run scratch-migrate.test.js node lib/scratch-migrate.test.js` after the glossary-migrate line)
- Modify: `commands/fx-setup.md` (a `### .scratch/ issues: move once` step after the glossary step, running `lib/scratch-migrate.js` through the same plugin-root check snippet the glossary step uses), then regenerate `skills/fx-setup/SKILL.md` with `scripts/gen-command-skills`
- Modify: `src/lib/fx-json.ts`, `src/lib/types.ts`, `src/lib/fx-json.test.ts`, built to `lib/fx-json.js`, `lib/fx-json.test.js` (and `lib/types.js` if the build emits it)
- Modify: every Markdown file that documents `glossary_rename` (`grep -rln glossary_rename --include=*.md . --exclude-dir=node_modules --exclude-dir=.worktrees --exclude-dir=docs`): one line documenting `scratch_migrate`
- Create: `docs/adr/0059-<slug>.md` (fx-adr and the supersede rule as standing ruling S5 states it), `docs/adr/0060-<slug>.md` (`references/templates/` and the retirement of `.scratch/`), `docs/adr/index.md`
- Not modified: `skills/fx-plan/COVERAGE.md` (its `.scratch/` row records upstream's path mapping and stays true)

**Interfaces:**
- Consumes: `references/templates/bug-report-template.md` and `skills/fx-adr/SKILL.md` (task 01).
- Produces, `lib/scratch-migrate.js`, on `lib/glossary-migrate.js`'s shape (usage `node scratch-migrate.js <root> [--apply]`, commits nothing):
  - `interface ScratchPlan { moves: { from: string; to: string; tracked: boolean }[]; edits: { file: string; line: number; before: string; after: string }[]; gitignore: { file: string; line: number; text: string } | null; conflicts: string[]; rollback: string[] }`
  - `planScratchMigration(root: string): ScratchPlan`: one move per top-level entry of `.scratch/` to `docs/issues/<name>`; `tracked` when git tracks every file in it. `edits` are lines naming `.scratch/` in `CLAUDE.md`, `AGENTS.md`, `repo.md` and tracked Markdown under `docs/` outside `docs/plans/`, `docs/adr/` and `docs/issues/`, with `.scratch/` replaced by `docs/issues/`. `gitignore` is the root `.gitignore` line that is exactly `.scratch`, `.scratch/`, `/.scratch` or `/.scratch/`. `rollback` holds one shell line per step that undoes it.
  - Conflicts, each one string: `docs/issues/<name> already exists`; `.scratch/<name> mixes tracked and untracked files`; `.scratch has uncommitted changes to tracked files` (from `git status --porcelain --untracked-files=no -- .scratch`); `.scratch/<name> is a symlink`.
  - `applyScratchMigration(root: string): void`: re-plans, refuses on any conflict, then moves, edits, and removes the `.gitignore` line, in that order; on the first failure it undoes every step already done in reverse and throws.
  - CLI output: dry run prints `move <from> -> <to> (git mv | filesystem move)`, `edit <file>:<line>: <before> -> <after>`, `remove <file>:<line>: <text>`, then `rollback:` and the rollback lines; exit 0. Conflicts: `scratch-migrate: refused, repo unchanged:` then one line each, exit 1. Apply failure: `scratch-migrate: failed at <step>: <error>; undone`, exit 1; if an undo step fails too, it prints `scratch-migrate: undo incomplete; run:` and the remaining rollback lines. Nothing to move: `scratch-migrate: nothing to move`, exit 0.
- Produces: `.fx.json` key `scratch_migrate`, value exactly `"declined"`; `parseFxJson` drops any other value with `{ key: 'scratch_migrate', reason: 'scratch_migrate must be "declined"' }`; `scratch_migrate: 'declined';` in `src/lib/types.ts`'s `FxJson` interface, beside `glossary_rename`.

**The fx-setup step, in this order:** skip when `.fx.json` has `"scratch_migrate": "declined"` or `.scratch/` holds no Markdown file; run the dry run and show its whole output; with conflicts, report them and do not ask; ask once; yes: run with `--apply`, then show `git status --short` and tell the owner to run `git add -- docs/issues` and commit; no: write the declined key. No human to answer (an unattended run): do nothing and do not write the key.

**Index rows (mechanical, standing ruling S5):** one row per ADR 0001 to 0060 with number, title (the ADR's first line), date (its status line date, else `git log --diff-filter=A --format=%as -- <file>`), status (its status line's words, else `superseded by NNNN` when a later ADR's `Supersedes:` line names it, else `current`). Generate the rows with one command over `docs/adr/`; do not read each ADR by hand. Edit no ADR.

**Expected sizes (gate: 20,000 bytes):** fx-debug about 19,240 (from 18,983), ceiling 19,700: over it, move `## Quick reference` into `skills/fx-debug/quick-reference.md` behind a markdown link. fx-brainstorm about 18,710. fx-setup about 17,900 (from 16,886).

**Seam:** `planScratchMigration` and `applyScratchMigration` on git fixtures; `parseFxJson`; text gates and `check-all` for the Markdown.

**Tests (scratch-migrate fixtures: `scripts/make-git-fixture <dir under os.tmpdir()>`, the printed main checkout, commits made from node with `git -c user.name=t -c user.email=t@t commit`):**
- Existing target: tracked `.scratch/feat/spec.md` and an existing `docs/issues/feat/`; `conflicts` deep-equals `['docs/issues/feat already exists']`, and the CLI exits 1 with `scratch-migrate: refused, repo unchanged:`; the tree is byte-identical afterwards.
- Dirty: tracked `.scratch/feat/spec.md` modified and uncommitted; `conflicts` includes `.scratch has uncommitted changes to tracked files`.
- Untracked and ignored: `.gitignore` line 2 is `.scratch/`, untracked `.scratch/feat/01-x.md`, and `CLAUDE.md` line 3 naming `.scratch/<feature>/`; the plan has one move `{ from: '.scratch/feat', to: 'docs/issues/feat', tracked: false }`, `gitignore` `{ file: '.gitignore', line: 2, text: '.scratch/' }`, one edit at `CLAUDE.md:3`. After apply: `docs/issues/feat/01-x.md` exists, `.scratch/` does not, `.gitignore` has no `.scratch/` line, `CLAUDE.md` line 3 names `docs/issues/<feature>/`, and `git log` has no new commit.
- Tracked apply: committed `.scratch/feat/spec.md`; after apply `git status --porcelain` shows a rename to `docs/issues/feat/spec.md`.
- Failure undo: an edit target made read-only before apply; apply throws, and `.scratch/feat/` is back with its files and `.gitignore` unchanged.
- Second run after apply: the CLI prints `scratch-migrate: nothing to move` and exits 0.
- `parseFxJson({ scratch_migrate: 'yes' })`: no `scratch_migrate` in `value`; `problems` deep-equals `[{ key: 'scratch_migrate', reason: 'scratch_migrate must be "declined"' }]`. `parseFxJson({ scratch_migrate: 'declined' })`: `value.scratch_migrate === 'declined'`, `problems` `[]`.
- `user-invoked.test.js` passes (generated fx-setup body equals the command body), and `fx-setup-root-check.test.js` passes.

**Risks:** the migration moves owner files: it runs only from `/fx:fx-setup` with the owner's yes, never from a dispatched subagent, never unattended, and commits nothing. The read-only failure case must not run as root; skip it with a printed note when `process.getuid() === 0`.

**Idempotency:** apply re-plans and refuses on any existing target, so a rerun after success prints `nothing to move`; the declined key stops the question on every later run.

**Testing:** unit tests on git fixtures; text gates; the plan-mandated phase gate.

## Acceptance criteria
- [ ] `grep -rn "\.scratch" skills commands references --exclude-dir=vendor --exclude=COVERAGE.md` shows only the fx-setup migration step and its generated copy.
- [ ] fx-debug's Phase 6 names the template by path and says a session with no fix writes no report.
- [ ] `docs/adr/0059-*.md` and `docs/adr/0060-*.md` follow fx's ADR format with numbered decisions; `docs/adr/index.md` has 60 rows with number, title, date and status, and `git diff --stat` shows no other ADR changed.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/lib/scratch-migrate.test.ts` and `src/lib/fx-json.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/scratch-migrate.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/fx-json.test.js`
Expected: both fail: the module does not exist and the key is unknown.

- [ ] **4. Implement the minimum that passes**, then edit fx-debug, fx-brainstorm and the fx-setup command, run `scripts/gen-command-skills`, and document the key

- [ ] **5. Run them: verify GREEN**

Run: the same two commands after `scripts/build`. Expected: both pass.

- [ ] **6. Write ADRs 0059, 0060 and `docs/adr/index.md`** by following `skills/fx-adr/SKILL.md`

- [ ] **7. Run the phase gate**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`. Expected: `ALL GREEN`. If `release-version.test.js` fails because main already carries 0.7.0, set 0.8.0 in the four manifests and rerun.

- [ ] **8. Commit by path**

```
git add skills/fx-debug/SKILL.md skills/fx-brainstorm/SKILL.md src/lib/scratch-migrate.ts src/lib/scratch-migrate.test.ts lib/scratch-migrate.js lib/scratch-migrate.test.js scripts/check-all commands/fx-setup.md skills/fx-setup/SKILL.md src/lib/fx-json.ts src/lib/types.ts src/lib/fx-json.test.ts lib/fx-json.js lib/fx-json.test.js docs/adr/index.md docs/adr/0059-*.md docs/adr/0060-*.md
git commit -m "feat(fx-debug): fixed bugs leave a report in docs/issues; fx-setup moves .scratch issues once on yes"
```

Add `lib/types.js`, `skills/fx-debug/quick-reference.md`, any changed manifests and each file that documents the key when the task changed them.
