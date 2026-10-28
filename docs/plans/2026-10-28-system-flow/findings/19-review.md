# Task 19 review: fx-docs on the model, ADR 0066 and the first-run offer

Base 4f6918f, head ae1f0a9 (one commit, ten files by path). Cost line: unavailable.

Ran in scratch: `node scripts/docs-index --root <worktree> build`: 0062's claims carry `status: "superseded"`, 0066's `current`. Checked outside the diff, one check per named risk: `src/scripts/system-flow.ts` (flags), `src/lib/sf-detect.ts:18` (archify shape), `src/lib/sf-stale.ts:67,111` (unbased roots, unverified items), `skills/fx-adr/SKILL.md:48-75` (supersede format), ADR 0062 body (decisions 1, 3, 5). I read `skills/fx-docs/SKILL.md:58-125` because the diff file elides its context lines.

### Spec Compliance
- ✅ Spec compliant. Each command in fx-docs exists at HEAD with the flag as written: `--root`, `detect` (prints `archify.dir`, sf-detect.ts:18), `query --diff <base>` (prints `added` per root, system-flow.ts:147), `verify <handle>...`, `build --only`, `--archify <dir>` and `stale`. The model path runs first and the Markdown path runs after it, and the Markdown path skips files that carry the marker (SKILL.md:79-80, 101-104). The inventory step for added paths is at SKILL.md:89-90. In ADR 0066, decisions 1 to 5 match the design's "The ADR" section and the output-location rule. Decisions 6 to 8 under "Still in force" repeat 0062 decisions 1, 3 and 5 word for word. 0066 reverses the Out of Scope line. 0062's status line and its index row are updated, and there is no 0065 row. The first-run offer text and both of its ledger lines match the brief exactly (final-review.md:6-12). `html-pages.md` keeps its steps for a repo without a model. Ruling 28 holds: the Markdown Docs line is kept. Ruling 29 holds: full-run.md is deleted in the commit. Ruling 30 holds: the ADR follows the format in skills/fx-adr section 3.
- ⚠️ Cannot verify from the diff: whether check-all is green. The report says ALL GREEN, and I did not re-run it.

### Strengths
- ADR 0066 follows fx-adr's supersede rules: a `Supersedes:` line, "Still in force" numbered on from the Decision section, an exact status string, and an index row built in the repo's form.
- The lane says the marker alone decides the skip, which covers the edge case named in the brief's Risks.
- The first-run offer never promises to run the command (ADR 0055), and completion.md tells the owner to type it.
- The RED run failed on the missing behaviour ("fx-docs names the user-invoked full run").

### Issues
#### Critical (Must Fix)
None.

#### Important (Should Fix)
- Plan-mandated. `skills/fx-docs/SKILL.md:115-117`: in a repo with a model, Markdown path step 4 ("Write a new doc when the change adds an engine, subsystem, public flow, command or integration that no doc covers") still runs after model steps 3 and 7. Those steps already added an inventory entry for the new engine, job or integration and listed it as uncovered, pointing to `/fx:fx-system-flow`. The Markdown path skips generated files, so no doc "covers" the new engine, and the lane then writes a hand-written doc for it. That gives the same fact two records, which ADR 0066 decision 1 rules out. The brief says the Markdown path runs "as today", which is why this is plan-mandated. Fix: one clause making step 4 apply only in a repo without a model.

#### Minor (Nice to Have)
- `skills/fx-docs/SKILL.md:94`: `build --only <handles>` does not say how to pass several handles. The CLI takes them comma-separated or as repeated `--only` (system-flow.ts:56). Space-separated handles exit 2 with a usage error.
- `skills/fx-docs/SKILL.md:87-88`: "in every root" overstates the command. `query --diff` skips a non-host root that no item has verified and reports it in `unbased` (sf-stale.ts:78). The lane neither reads `unbased` nor passes `--base`.
- `skills/fx-docs/SKILL.md:89-93`: the inventory entries added in step 3 never go through `verify`, because step 4 verifies only re-read items. Step 6 `stale` then lists them as `unverified` (sf-stale.ts:111), which inflates "listed stale".
- `src/tests/gates/docs-lanes.test.ts:424`: the `'added'` assertion is a bare substring that any English text containing "added" satisfies, so it does not pin the `added` field.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** Every named risk checks out against the CLI and the ADR format. One lane sentence lets the Markdown path write a hand-written doc for an engine the model path has just inventoried, which gives one fact two records.

## Ledger lines
Task 19: minor (deferred): fx-docs build --only does not say that handles are comma-separated or passed as repeated --only.
Task 19: minor (deferred): fx-docs model path says "every root" but ignores query's unbased roots and --base.
Task 19: minor (deferred): fx-docs never verifies the inventory entries it adds, so stale lists them as unverified.
Task 19: minor (deferred): docs-lanes asserts the bare word "added", which pins nothing.
