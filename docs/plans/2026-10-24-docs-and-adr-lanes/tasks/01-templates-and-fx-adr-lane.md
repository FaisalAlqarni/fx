# 01: Record templates, the `fx-adr` lane and version 0.7.0

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** A: ADR lane and templates

**What to build:** one folder, `references/templates/`, holds the five record shapes fx writes: design, ADR, PR description, retro and bug report. `/fx:fx-pr` and `/fx:fx-retro` read their shapes from it, and every pointer to the old `references/design-template.md` reaches the moved file. `scripts/check-reference-leaves` catches a reference naming a file in any subfolder of `references/`. The owner says "record this decision" and the new model-selectable `fx-adr` lane writes an ADR in the repo's own format, numbering and status form, keeps the index, and supersedes under standing ruling S5. fx-brainstorm, fx-review, fx-architecture and fx-implement's completion report each offer it with one pointer line, only when the decision passes domain-modeling's three tests. The plugin version becomes 0.7.0.

**Design:** Phase A: shared record templates; Phase A: ADR lane; Testing Decisions

**Files:**
- Move: `references/design-template.md` to `references/templates/design-template.md` (`git mv --`, content unchanged)
- Create: `references/templates/adr-template.md`, `references/templates/pr-template.md`, `references/templates/retro-template.md`, `references/templates/bug-report-template.md`
- Modify: `commands/fx-pr.md`, `commands/fx-retro.md`, then regenerate `skills/fx-pr/SKILL.md` and `skills/fx-retro/SKILL.md` with `scripts/gen-command-skills`
- Modify: `references/vocab/domain-modeling.md` (delete `### ADR format`; keep `## ADRs: offer sparingly` and its three tests; `## Where this is used` names `fx-adr` as the writer, by lane name, not file)
- Modify: `skills/fx-brainstorm/SKILL.md` (design-template pointer; one ADR offer line in `## 9. Handoff`), `skills/fx-brainstorm/COVERAGE.md`, `skills/fx-audit/SKILL.md` (design-template pointer)
- Modify: `skills/fx-architecture/SKILL.md` (the "Offer an ADR" bullet in section 3 becomes a pointer to `fx-adr`; the three tests stay stated once, in domain-modeling), `skills/fx-review/SKILL.md` (one offer line in `## 7. Acting on findings`), `skills/fx-implement/references/completion.md` (one offer line under "Rulings I made")
- Create: `skills/fx-adr/SKILL.md`, `tests/lane-triggering/prompts/fx-adr.txt` (one line: `We just decided to keep Postgres as the source of truth and ClickHouse optional. Record this decision.`)
- Modify: `src/tests/gates/brainstorm-confidence.test.ts` (reads the moved path) and `src/tests/gates/user-invoked.test.ts`, built to `tests/gates/brainstorm-confidence.test.js`, `tests/gates/user-invoked.test.js`
- Modify: `scripts/check-reference-leaves` (bash, hand-written); Create: `src/tests/gates/reference-leaves.test.ts`, built to `tests/gates/reference-leaves.test.js`; Modify: `scripts/check-all` (one `run reference-leaves.test.js node tests/gates/reference-leaves.test.js` line)
- Modify: `tests/conformance/rows/09-every-skill-discovered.sh` (`EXPECTED=21`), `README.md` and `SURFACE.md` (a lane row for `fx-adr`; the references list gains `templates/`; the design-template path)
- Modify: `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json` (version 0.7.0)

**Interfaces:**
- Produces: the five template paths, used by tasks 02 and 06. Each template is a leaf.
- Produces: `scripts/check-reference-leaves [root]`, default the repository root. A backticked `name.md` in any `references/**/*.md` fails when a file of that basename exists anywhere under `<root>/references/` except `references/vendor/` and the file itself. Output unchanged: `  <src> -> <basename>`, `FAIL: <n> reference-to-reference link(s)`, `OK: no reference links to another reference`.

**Template content (exact sections, in order):**
- `adr-template.md`: title `# NNNN: <decision in a few words>`; status line `Status: accepted, YYYY-MM-DD.`; when superseding, a `Supersedes: NNNN (decisions 2, 4)` line under it; `## Context`; `## Decision` with numbered decisions, each optionally followed by an indented `Evidence:` line (form fixed in task 05; inert until then); when superseding, `## Still in force` whose items continue the Decision section's numbering, so each is a decision of this ADR; `## Consequences`; `## Alternatives` only when worth remembering. Open with domain-modeling's one-paragraph guidance from the deleted section.
- `pr-template.md`: the four headings and their rules now under `## Write` in `commands/fx-pr.md`, moved word for word, the `Not run:` ending and the "No code, diff or diagram" line included.
- `retro-template.md`: the `tasks/lessons.md` entry line and the `retro.md` shape from `## Write, for the picked candidates only` in `commands/fx-retro.md`, moved word for word. "Citation or drop" and the redaction rule stay in the command.
- `bug-report-template.md`: `# <symptom in a few words>`, `Status: fixed, YYYY-MM-DD.`, then `## Symptom`, `## Reproduction`, `## Root cause` (with `path:line` evidence), `## Fix`, `## Guarding test`, `## Prevention` (the prevention question, ending "A process or lane gap goes to `/fx:fx-retro`.").

**Lane content (`skills/fx-adr/SKILL.md`, in this order):**
1. Frontmatter: `name: fx-adr`; a description that is a trigger list ("record this decision", "write an ADR", "supersede ADR", "is this ADR still current") plus a stakes line ("Skip it and ..."). No `disable-model-invocation`.
2. Read the repo's format first: ADR folder (`docs/adr/`, `docs/decisions/`, or the folder `mkdocs.yml` nav lists), naming (`NNNN-slug.md`, `ADR-NNN-slug.md`), heading form, status form (a `Status:` line, a `## Status` section, a `- **Status:**` bullet), sections in use. Copy that shape and take the next number. No ADRs: use `../../references/templates/adr-template.md` in `docs/adr/`.
3. Numbered decisions in every ADR the lane writes. An older ADR without numbers is named by quoting each replaced decision's lead phrase.
4. Supersede rule, per standing ruling S5: never edit an existing ADR beyond its status line; an ADR with no status line gets exactly one, added under its title. The new ADR has the `Supersedes:` line and `## Still in force` numbered as its own decisions. The old status becomes `Superseded by NNNN (replaced: decisions 2, 4; the rest carried forward)` in the repo's status form; never "Partly superseded".
5. Index: keep `index.md` or `README.md` in the ADR folder, create `index.md` when none exists; one row per ADR: number, title, date, status (current, superseded by NNNN, or the repo's own words). Build rows mechanically: status from the ADR's status line, else from later ADRs' `Supersedes:` lines, else current; date from the status line, else `git log --diff-filter=A --format=%as -- <file>`. When `mkdocs.yml` nav lists ADRs, add the new one there.
6. Evidence lines: a numbered decision may carry an indented `Evidence:` line naming the code it governs; the docs stale check reads it once that exists.
7. fbrain: when the `fbrain` CLI or its MCP `propose` tool exists and the decision spans projects, one `fbrain propose` with a short note linking the ADR; never a copy.
8. Commits: standalone, write files and stage nothing; inside fx-implement, the ADR is committed with the task that made the decision.
9. "Is this ADR still current": report its status line, what supersedes it and, once evidence lines exist, any drift the docs stale check reported; never edit the ADR.

**Expected sizes (gate: 20,000 bytes):** `skills/fx-adr/SKILL.md` at most 9,000; fx-brainstorm about 18,650 (from 18,463); fx-review about 15,850 (from 15,652); fx-architecture about 8,850 (from 9,000); fx-audit about 17,720 (from 17,711); fx-pr about 900 (from 1,359); fx-retro about 2,300 (from 2,990). fx-implement's SKILL.md is not edited.

**Seam:** the `scripts/check-reference-leaves` process on scratch trees; the gate processes `user-invoked.test.js`, `description-overlap.test.js`, `skill-size.test.js`, `brainstorm-confidence.test.js`, `scripts/check-paths`, conformance row 09's tree half.

**Tests:**
- Leaf hit in a subfolder: tree with `references/vocab/a.md` containing `` `adr-template.md` `` and `references/templates/adr-template.md`; `bash scripts/check-reference-leaves <tree>` exits 1 and prints `  references/vocab/a.md -> adr-template.md`.
- Leaf hit from a subfolder: tree with `references/templates/x-template.md` containing `` `wayfinder.md` `` and `references/wayfinder.md`; exits 1 and prints `  references/templates/x-template.md -> wayfinder.md`.
- Vendor is not a target: tree with `references/a.md` containing `` `LICENSE-x.md` `` and `references/vendor/LICENSE-x.md`; exits 0.
- A name that is no reference: tree with `references/a.md` containing `` `design.md` `` and no `design.md` under `references/`; exits 0 and prints `OK: no reference links to another reference`.
- The repository: `scripts/check-reference-leaves` exits 0.
- `user-invoked.test.ts`: the four `## What and why` to `## Merge danger` heading assertions and the `` `Not run:` `` assertion read `references/templates/pr-template.md`; a new assertion that `skills/fx-pr/SKILL.md` contains `references/templates/pr-template.md`, message `fx-pr names its template`; `Never run \`git push\`` and the two fx-retro assertions still read the skills.
- `user-invoked.test.ts`: `skills/fx-adr/SKILL.md` exists and its frontmatter has no `disable-model-invocation` line, message `fx-adr is model-selectable`; the hidden set stays exactly the eight names it asserts today.
- `brainstorm-confidence.test.js` reads `references/templates/design-template.md` and passes.
- `description-overlap.test.js` passes: no quoted trigger of fx-adr shared with another lane, or the pair is declared with evidence on both sides and each description names the other.
- Conformance row 09's node half, run as in the row with `EXPECTED=21`, exits 0.

**Risks:** `gen-command-skills` rewrites `../references/` to `../../references/`; write command pointers as `../references/templates/<name>` and never edit generated skills. fx-architecture's description must still win its own prompts: add no ADR words to it. Offer lines are pointers ("offer `fx-adr`"), never invocations (ADR 0006).

**Testing:** gate tests and text gates, offline, part of `check-all`; the bench prompt runs on request only.

## Acceptance criteria
- [ ] `ls references/templates/` lists exactly the five templates and `references/design-template.md` no longer exists; `grep -rn "references/design-template.md" skills commands references src SURFACE.md` prints nothing.
- [ ] `references/vocab/domain-modeling.md` has no `ADR format` heading and still holds the three tests.
- [ ] `skills/fx-adr/SKILL.md` covers the nine content items, and `grep -c "fx-adr" skills/fx-architecture/SKILL.md skills/fx-brainstorm/SKILL.md skills/fx-review/SKILL.md skills/fx-implement/references/completion.md` shows at least 1 in each.
- [ ] Every SKILL.md touched is under its expected size plus 300 bytes.
- [ ] All four manifests read `0.7.0`; `codex-manifest.test.js` and `release-version.test.js` pass.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/reference-leaves.test.ts` (spawn `bash scripts/check-reference-leaves <tree>` on trees under `os.tmpdir()`), `user-invoked.test.ts` and `brainstorm-confidence.test.ts`, and set `EXPECTED=21`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/reference-leaves.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/user-invoked.test.js`
Expected: the subfolder cases fail (the script ignores `templates/` and takes no root); user-invoked fails on the missing template or `fx-adr is model-selectable`.

- [ ] **4. Implement the leaf gate**, then write the templates, move the design template, update the pointers and commands, run `scripts/gen-command-skills`, write the lane and the offer lines, and set the version

- [ ] **5. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then each of `node tests/gates/reference-leaves.test.js`, `node tests/gates/user-invoked.test.js`, `node tests/gates/brainstorm-confidence.test.js`, `node tests/gates/description-overlap.test.js`, `node tests/gates/skill-size.test.js` with the prefix. Expected: all pass.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope references/templates/adr-template.md commands/fx-pr.md commands/fx-retro.md skills/fx-adr/SKILL.md skills/fx-architecture/SKILL.md src/tests/gates/reference-leaves.test.ts src/tests/gates/user-invoked.test.ts src/tests/gates/brainstorm-confidence.test.ts scripts/check-reference-leaves`

- [ ] **7. Commit by path**

```
git add references/templates/design-template.md references/design-template.md references/templates/adr-template.md references/templates/pr-template.md references/templates/retro-template.md references/templates/bug-report-template.md commands/fx-pr.md commands/fx-retro.md skills/fx-pr/SKILL.md skills/fx-retro/SKILL.md references/vocab/domain-modeling.md skills/fx-brainstorm/SKILL.md skills/fx-brainstorm/COVERAGE.md skills/fx-audit/SKILL.md skills/fx-architecture/SKILL.md skills/fx-review/SKILL.md skills/fx-implement/references/completion.md skills/fx-adr/SKILL.md tests/lane-triggering/prompts/fx-adr.txt src/tests/gates/brainstorm-confidence.test.ts tests/gates/brainstorm-confidence.test.js src/tests/gates/user-invoked.test.ts tests/gates/user-invoked.test.js scripts/check-reference-leaves src/tests/gates/reference-leaves.test.ts tests/gates/reference-leaves.test.js scripts/check-all tests/conformance/rows/09-every-skill-discovered.sh README.md SURFACE.md package.json .claude-plugin/plugin.json .codex-plugin/plugin.json .agents/plugins/marketplace.json
git commit -m "feat(fx-adr): record templates in one folder and a lane that writes, supersedes and indexes ADRs"
```

Add `src/tests/gates/description-overlap.test.ts` and its built file if a pair was declared.
