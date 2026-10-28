# 11: Proof tooling, the owner's page baseline and the migration proof

**Status:** ready-for-agent (agent work throughout; no lane is invoked)
**Blocked by:** 04, 08
**Phase:** Proof

**What to build:** the measuring tool the two proof runs use, its numbers on the owner's page, and the migration proof. `page-check.js` gains a measure mode that reads any page with one of two selector profiles (`owner` for the owner's hand-built page, `fx` for a generated site) and prints the numbers of the design's Proof table. It is run now on the owner's page to record the baseline. The migration proof copies the first iteration's Shamel.Backend fragments into a scratch git repo, runs `migrate` and `check`, and records that only `schemaVersion`, `look` and `meta.name` changed.

**Design:** Proof; Migration; Testing Decisions

**Files:**
- Modify: `src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts`, built to `docs/plans/2026-10-29-system-flow-site/proof/page-check.js` (`--measure owner|fx`, `--out-dir <dir>` for screenshots)
- Create: `src/docs/plans/2026-10-29-system-flow-site/proof/compare.ts`, built to `docs/plans/2026-10-29-system-flow-site/proof/compare.js` (reads two or three measure JSON files, prints the comparison table as Markdown)
- Create: `docs/plans/2026-10-29-system-flow-site/results.md` (parts `## Baseline: the owner's page` and `## Migration`; parts (a) and (b) are added by tasks 12 and 13)

**Interfaces:**
- Consumes: the DOM contract of tasks 06 to 08 (profile `fx`); the owner's page structure (profile `owner`: read its `index.html` once and name its selectors in the script, with a comment per selector).
- Produces: `page-check.js --measure <profile> <index.html> <out.json>` writes `{ "chapters": n, "proseWordsAvg": n, "proseWords": [{ "id", "words" }], "chaptersWithLeadAndBullets": n, "glossary": n | null, "lifelines": n, "sequences": n, "menu": {...}, "filter": {...}, "cards": {...}, "autoplay": {...}, "labelsMinPx": n, "pageScrollAt390": boolean, "consoleErrors": n, "player": {...} }`; prose words per chapter count the question, the lead and the bullets as rendered text, over the reading chapters only: for profile `fx` exactly `section.chapter[data-group="start"]` and `section.chapter[data-group="how"]` (Reference chapters are not measured, and `chapters` counts the same set); for profile `owner`, the owner's chapter sections named in the script. For profile `fx` every behaviour check of tasks 06, 07 and 08 runs, the Reset and Play/Pause checks of task 07 included, at 1440 and 390, light and dark, reduced motion off and on; for profile `owner`, the checks the owner's page has no control for are `null`.
- Produces: `compare.js <owner.json> <a.json> [<b.json>]` prints one Markdown table with the design's Proof measures as rows, one column per page, and a Pass column per new site against the design's pass lines.

**Seam:** Chromium through `<PW>`; the `system-flow` CLI on a scratch copy.

**Tests:**
- Baseline: `page-check.js --measure owner /mnt/c/Users/Faisal/Desktop/system-flow/system-flow/index.html <SCRATCH>/proof-site/owner.json` exits 0 and reports 19 chapters and an average near 122 prose words per chapter (the research figure; record the measured value and the difference in `results.md`). `results.md` part Baseline states that the owner's number is question plus bullets, because the owner's page has no leads, while a generated site's number is question, lead and bullets.
- Fixture site: `--measure fx` on the task 06 fixture site exits 0 with `chapters` 5 (the four Start here chapters and `s1`; no Reference chapter), `chaptersWithLeadAndBullets` equal to `chapters`, `glossary` 15, `lifelines` equal to `sequences`, `player.reset` and `player.playPause` both `pass: true`.
- Migration: `docs/plans/2026-10-28-system-flow/proof/prepare-scratch /tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend <SCRATCH>/proof-site/migrate-<date>-<n>/Shamel.Backend` (the first iteration's scratch copy: its source, its version-1 fragments, one new commit). Before `migrate`: `check` prints one `run system-flow migrate` line per fragment (10). `migrate` exits 0. After: `check` prints no hint line, and its error lines equal `owed` as sets. `git diff --word-diff` of the fragments shows only `schemaVersion`, `look` and `name` keys added or changed (record the counts per file in `results.md`).
- Nothing under `/mnt` written: `find /mnt/c/Users/Faisal/Desktop/system-flow -newer <SCRATCH>/proof-site/stamp` lists 0 files.

**Idempotency:** each run writes a new `<SCRATCH>/proof-site/...-<date>-<n>` folder; `results.md` parts are rewritten whole.

**Testing:** E2E against real pages, recorded in `results.md`.

## Acceptance criteria
- [ ] `results.md` holds the owner's page numbers and the migration proof, each with its command and output.
- [ ] `page-check.js --measure fx` passes on the fixture site.
- [ ] `scripts/check-all` passes.

## Steps

- [ ] **1. Make `<SCRATCH>/proof-site/` and `touch <SCRATCH>/proof-site/stamp`**

- [ ] **2. Extend `page-check.ts` with `--measure`; write `compare.ts`; run `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`**

- [ ] **3. Run the fixture-site measure; fix the script until it passes**

- [ ] **4. Run the owner's page measure; write `results.md` part Baseline**

- [ ] **5. Run the migration proof; write `results.md` part Migration**

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`

- [ ] **7. Commit this task's paths on `system-flow`**

```
git add -- src/docs/plans/2026-10-29-system-flow-site/proof/page-check.ts docs/plans/2026-10-29-system-flow-site/proof/page-check.js src/docs/plans/2026-10-29-system-flow-site/proof/compare.ts docs/plans/2026-10-29-system-flow-site/proof/compare.js docs/plans/2026-10-29-system-flow-site/results.md
git commit -m "test(system-flow): proof tooling, the owner's baseline and the migration proof"
```

Never push, merge or open a PR.
