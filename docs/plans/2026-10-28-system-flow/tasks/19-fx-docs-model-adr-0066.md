# 19: fx-docs on the model, ADR 0066 and the first-run offer

**Status:** ready-for-agent
**Blocked by:** 13, 15, 16, 17
**Phase:** Hardening

**What to build:** after an fx-implement build, when the owner says yes to the docs step in a repo that has a system model, fx-docs runs two paths. The model path updates only the model items whose evidence the branch touched: `query --diff <merge-base>` (every root), add an inventory entry for each new engine, job or integration among the diff's `added` paths, re-read each listed item at HEAD, edit the fragments with a corrections entry for every changed or removed fact, `verify` each re-read item, `build --only` those items (with `--archify <dir>` when `detect` finds archify), list every other `stale` item without rewriting it, and list inventory entries no chapter covers with a pointer to `/fx:fx-system-flow`. Then the Markdown path runs as today over the hand-written docs, skipping every file that carries the generated marker. A repo without a model keeps today's branch mode, HTML pages included. fx-docs' full run is replaced: on "document the system" fx-docs says in one line that the full run is `/fx:fx-system-flow` and that the owner types it; fx-implement's first-run offer names the same command. ADR 0066 records the change, supersedes ADR 0062 decisions 2 and 4, and records the Markdown location rule.

**Design:** Stale, query and the fx-docs branch step; What it replaces; The ADR; Corrections log; Output location

**Files:**
- Modify: `skills/fx-docs/SKILL.md` (section 1 states the model exception in one sentence; section 4 gains the model path as numbered steps with the exact commands `node <skill base directory>/../../scripts/system-flow --root <worktree> detect`, `... query --diff <merge-base>`, `... verify <handle>...`, `... build --only <handles> --archify <detect's archify.dir>` (the `--archify` part only when `detect` printed one), `... stale`, the inventory step for `added` paths, then the sentence that the Markdown path runs next and skips every file carrying `<!-- fx-system-flow generated`; the report lines `Docs: <n> model items updated, <n> listed stale, <n> uncovered, <n> inventory added, <n> diagrams rebuilt` and, for the Markdown path, `Docs: <n> updated, <n> written, <n> listed stale`; section 6 becomes one paragraph naming `/fx:fx-system-flow`; section 7 keeps the HTML pages for a repo without a system model and says that in a repo with one the site replaces them; the description keeps "document the system")
- Delete with `git rm -q --`: `skills/fx-docs/full-run.md`
- Modify: `skills/fx-docs/html-pages.md` (one opening sentence: these steps run only in a repo without a system model)
- Modify: `skills/fx-implement/references/final-review.md` (the first-run offer: "This repo's docs carry no evidence lines. The first full documentation run is `/fx:fx-system-flow`, which you type in this repo. Want it named in the completion report, or not now?"; on not now, write `"docs_first_run": "declined"` and ledger `Docs: not run: no evidence-bearing docs, first run declined`; otherwise ledger `Docs: not run: no evidence-bearing docs, /fx:fx-system-flow named`; the branch offer keeps "with pages" only for a repo without a model; its ledger line follows fx-docs' report lines)
- Modify: `skills/fx-implement/references/completion.md` only where it repeats the old Docs line
- Modify: `src/tests/gates/docs-lanes.test.ts` (move the full-run interview assertions to `skills/fx-system-flow/interview.md`; add the assertions below), and any ledger gate the new Docs lines touch (`src/tests/gates/ledger-lines.test.ts` if it pins the old wording)
- Create through `fx-adr`: `docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md` (title "A system model is the record for the system-flow site; its Markdown is generated"), with `Supersedes: 0062 (decisions 2, 4)`, the decisions the design's "The ADR" section lists, one more decision: generated Markdown lives in `<docs_dir>/system/` (or `<docs_dir>/system-generated/` when `system/` holds hand-written docs), never in a section folder that holds hand-written docs, which departs from the design's first output rule; decisions 1, 3 and 5 of 0062 under "Still in force"; and the note that it reverses the Out of Scope line of `docs/plans/2026-10-24-docs-and-adr-lanes/design.md`
- Modify through `fx-adr`: `docs/adr/0062-fx-docs-keeps-docs-on-evidence-lines-and-the-docs-step-is-offered.md` status line to `Superseded by 0066 (replaced: decisions 2, 4; the rest carried forward)`; `docs/adr/index.md` gains the 0066 row and 0062's status

**Interfaces:**
- Consumes: `detect` and its `archify` field (06, 12); `query --diff` with `added`, `stale`, `verify <handle>` (task 13); `build --only` and `BuildResult.rebuilt.diagrams` (task 17); the corrections rule (task 16); the lane name `fx-system-flow` and `skills/fx-system-flow/interview.md` (task 15); the generated marker text (task 04).
- Produces: the report line `Docs: <n> model items updated, <n> listed stale, <n> uncovered, <n> inventory added, <n> diagrams rebuilt`; ADR 0066.

**Seam:** gate tests on text, in the existing style (design seam 3).

**Tests:** in `docs-lanes.test` unless named otherwise; `has(file, text)` is the gate's whitespace-normalised substring test.
- `skills/fx-docs/SKILL.md` has `/fx:fx-system-flow`, `system-flow --root <worktree> query --diff <merge-base>`, `build --only`, `--archify`, `added`, and `Docs: <n> model items updated, <n> listed stale, <n> uncovered, <n> inventory added, <n> diagrams rebuilt`.
- Both paths: `skills/fx-docs/SKILL.md` has `In a repo with a system model, the model path runs first and the Markdown path runs after it` and `The Markdown path skips every file that carries <!-- fx-system-flow generated` (the marker in backticks).
- Inventory: `skills/fx-docs/SKILL.md` has `For each new engine, job or integration among the added paths, add an inventory entry`.
- `skills/fx-docs/SKILL.md` no longer has `full-run.md`; that file does not exist. It still links `html-pages.md`, and has `only in a repo without a system model`.
- `skills/fx-docs/html-pages.md` has `only in a repo without a system model`.
- `skills/fx-docs/SKILL.md` has the sentence `The full run is /fx:fx-system-flow, which the owner types; a lane cannot invoke it (ADR 0055).` (with the command in backticks); the old `says yes to fx-implement's first-run offer` assertion is replaced by this one.
- `skills/fx-system-flow/interview.md` has `Every question carries a recommended answer` and `or take the recommended answer for every question`.
- `skills/fx-implement/references/final-review.md` has `/fx:fx-system-flow`, `"docs_first_run": "declined"` and `Docs: not run: no evidence-bearing docs`.
- `docs/adr/0062-...md` status reads `Superseded by 0066 (replaced: decisions 2, 4; the rest carried forward)`; `docs/adr/0066-...md` exists with a `Supersedes` line naming 0062 and the text `<docs_dir>/system/`; `docs/adr/index.md` has a row linking `0066-a-system-model-is-the-record-for-the-system-flow-site.md`.
- docs-index sees 0062 as superseded: `node scripts/docs-index --root <repo> build` on the worktree lists 0062's claims with `status: "superseded"`.
- `user-invoked.test` still shows `fx-docs` as model-selectable.
- `visual-kit.test` passes with `PAGE_LANES` unchanged (`skills/fx-docs/html-pages.md` stays in it).
- `skill-size.test`: `skills/fx-docs/SKILL.md` is under 20,000 bytes.

**Risks:** ADR 0055: a lane names a user-invoked command and never invokes it; fx-implement's offer must not promise to run the full run. Invoke `fx-adr` for the ADR and `fx-authoring` for the lane text. ADR 0065 belongs to the codex-catalog branch: leave the gap in the index. The two paths can both touch a doc only if a generated doc loses its marker; the skip rule keys on the marker alone, so say so in the lane text.

**Testing:** gates in `check-all`.

## Acceptance criteria
- [ ] In a repo with a model, fx-docs' branch mode touches only model items the branch's diff cites in any root, adds inventory entries for new engines, jobs and integrations, lists the rest as stale, and then runs the Markdown path over hand-written docs only.
- [ ] In a repo without a model, branch mode behaves as before, HTML pages included.
- [ ] fx-implement's first-run offer names `/fx:fx-system-flow` and never runs it.
- [ ] ADR 0066 is indexed, records the Markdown location rule, and 0062 reads as superseded to docs-index.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Invoke `fx-tdd`**, then `fx-authoring` for the lane text and `fx-adr` for the ADR

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/docs-lanes.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/docs-lanes.test.js`
Expected: the new assertions fail on the current fx-docs text.

- [ ] **4. Edit the lanes and `html-pages.md`; delete `full-run.md` with `git rm -q --`**

- [ ] **5. Write ADR 0066 and update 0062 and the index through `fx-adr`**

- [ ] **6. Run them: verify GREEN**

Run: same. Expected: `docs-lanes.test.js` passes.

- [ ] **7. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **8. Commit by path**

```
git add skills/fx-docs/SKILL.md skills/fx-docs/full-run.md skills/fx-docs/html-pages.md skills/fx-implement/references/final-review.md skills/fx-implement/references/completion.md src/tests/gates/docs-lanes.test.ts tests/gates/docs-lanes.test.js docs/adr/0066-a-system-model-is-the-record-for-the-system-flow-site.md docs/adr/0062-fx-docs-keeps-docs-on-evidence-lines-and-the-docs-step-is-offered.md docs/adr/index.md
git commit -m "feat(fx-docs): keep the system model current in branch mode; ADR 0066"
```

Add `src/tests/gates/ledger-lines.test.ts tests/gates/ledger-lines.test.js` to the `git add` only if that gate changed. No attribution trailers. Then continue to the next task: never stop and wait.
