# 10: The lane: sidecars, SKILL.md, ADR 0066

**Status:** ready-for-agent
**Blocked by:** 04, 08, 09
**Phase:** Core

**What to build:** `/fx:fx-system-flow` produces the prose the floor demands. The plan always carries the four Start here chapters first, names the main request and its area, and names one writer per chapter; `meta.json` carries `name`, a first `intro` and `schemaVersion` 2. Each area brief asks for its chapters' lead and bullets, `summary` on every figure, `look`, `short` and `reply`, its code map entries, and returns `Prose:` and `Glossary candidates`. After the last area returns, the controller writes the `what`, `parts` and `code` prose, `glossary.json` and the final intro, each checked with `--fragment`. The rerun path offers "Bring the prose up to date": `migrate` when the model is version 1, run only on a clean working tree and undone with `git restore` on the fragments folder, then the `owed` list. A chapter that passes with the 120 to 200 words warning goes back to its writer once; a short glossary gets one extra round of candidates. The interview keeps every chapter on the floor. The report prints a Prose block beside Depth. fx-docs sets `look` on nodes it adds and, on a prose floor or migrate failure, stops and points the owner to the rerun choice. ADR 0066 is amended through `fx-adr`.

**Design:** Lane changes; Who writes what; Data flow; The ADR; Error handling

**Files:**
- Modify: `skills/fx-system-flow/SKILL.md`, `planning.md`, `area-brief.md`, `fragment-guide.md`, `check-and-report.md`, `interview.md`
- Modify: `skills/fx-docs/SKILL.md` (model path: every node or participant it adds carries `look`; on a prose floor problem or `schemaVersion 1: run system-flow migrate` from `build --only`, it stops and points the owner to `/fx:fx-system-flow`, "Bring the prose up to date")
- Modify: `docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md` and `docs/adr/index.md` (through `fx-adr`)
- Modify: `src/tests/gates/docs-lanes.test.ts` (the phrases below)

**Interfaces:**
- Consumes: task 03's message table (quoted, never restated with other words); `system-flow migrate` and its `owed` output (task 04); `BuildResult.prose` (task 03); the section ids `start-what`, `start-parts`, `start-request`, `start-code`, folder `start-here`.
- Produces: the area return gains two lines, `Prose: <chapter ids written>` and a `Glossary candidates` block of one JSON line per term (`{"term","tag","meaning","evidence"}`).

**Not this task:** any CLI change.

**Seam:** gate tests on text.

**Tests:** `docs-lanes` asserts, each a literal substring:
- `planning.md`: `start-what`, `start-parts`, `start-request`, `start-code`, `"schemaVersion": 2`, `the main request`, `one writer per chapter`, `"name"`, `"intro"`, `120 to 200 words`, `at least 100 words`.
- `area-brief.md`: `## Prose`, `2 to 4 sentences`, `4 to 8 bullets`, `at most 40 words`, `120 to 200 words`, `at least 100 words`, `one sentence of 6 to 30 words`, `look`, `short`, `reply`, `codeMap`, `Prose: <chapter ids written>`, `Glossary candidates`, `no "who uses it"`.
- `fragment-guide.md`: `look`, the five looks `service`, `store`, `client`, `external`, `security`, `term:<id>`, `code:<id>`, `chapters.json declares every section`, `a scalar set in two fragments is an error`.
- `check-and-report.md`: `Prose`, `words per chapter`, `glossary`, `lifelines`, `at most 2 rounds`, `merge the chapter into a neighbour, or drop it`, `There is no flag that waives the floor`, `a chapter with the 120 to 200 words warning goes back to its writer once`, `ask each area for more glossary candidates, one round`.
- `interview.md`: `at least 100 words`, `goes back to its writer` (an answer that drops a chapter below the floor sends that chapter back to its writer).
- `SKILL.md`: `system-flow migrate`, `Bring the prose up to date`, `glossary.json`, `only on a clean working tree`, `git restore -- <site>/model/fragments`; `skill-size` keeps it under 20,000 bytes.
- `skills/fx-docs/SKILL.md`: ``every node or participant it adds carries `look` ``, `Bring the prose up to date`; `skill-size` keeps it under 20,000 bytes.
- ADR 0066: holds `site template`, `Start here`, `schema version 2`, `lifelines`, and its "Still in force" list is renumbered with no gap (`docs-lanes` or the ADR index gate, whichever reads ADR text today).
- No dash: the six lane files, `skills/fx-docs/SKILL.md` and the ADR hold no U+2013 or U+2014.

**Risks:** fx-docs edits model items in branch mode; a node it adds now needs `look`, and its `build --only` now fails on a version-1 model or a chapter below the floor. Its SKILL.md says both; it never runs `migrate` or writes the owed prose itself, since the full run is user-invoked (ADR 0055).

**Testing:** gate tests.

## Acceptance criteria
- [ ] A fresh lane run is told, at each step, who writes which prose and what floor it must meet.
- [ ] The rerun path brings a version-1 site up to date through `migrate`, only on a clean tree, with the undo named.
- [ ] fx-docs, meeting a model below the floor, stops and names the rerun choice.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`; invoke `fx-authoring` for the sidecar wording**

- [ ] **2. Write each gate assertion the Tests field names**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `... node tests/gates/docs-lanes.test.js`
Expected: `planning.md holds start-what` fails.

- [ ] **4. Write the sidecars, both SKILL.md files and `interview.md`; amend ADR 0066 through `fx-adr`**

- [ ] **5. Run them: verify GREEN**

Run: same, plus `... node tests/gates/skill-size.test.js`. Expected: `OK` from both.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- skills/fx-system-flow/SKILL.md skills/fx-system-flow/planning.md skills/fx-system-flow/area-brief.md skills/fx-system-flow/fragment-guide.md skills/fx-system-flow/check-and-report.md skills/fx-system-flow/interview.md skills/fx-docs/SKILL.md docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md docs/adr/index.md src/tests/gates/docs-lanes.test.ts tests/gates/docs-lanes.test.js
git commit -m "docs(system-flow): the lane writes the prose; amend ADR 0066"
```

Never push, merge or open a PR.
