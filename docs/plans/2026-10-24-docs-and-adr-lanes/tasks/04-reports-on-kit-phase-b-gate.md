# 04: fx-architecture and fx-audit reports on the kit; Phase B gate

**Status:** ready-for-agent
**Blocked by:** 01, 02, 03
**Phase:** B: Visual kit

**What to build:** fx-architecture's report and fx-audit's Phase 4 report are written on the visual kit, so the owner learns one page layout. fx-architecture keeps every content rule (candidate cards, badge row, files, problem, solution, wins in glossary terms, before and after diagrams, ADR callout, top recommendation), its report path and its "never publish" rule; its scaffold, styling and diagrams come from the kit, with before and after diagrams as static or animated SVG by default and archify when the owner sets `detailed`. fx-audit's Phase 4 report renders `design.md` with the kit page template and the same copy rules; the Mermaid lifecycle diagram the audit template requires stays Mermaid in `design.md` and renders in the report with the static SVG recipe. Its gates and resume rules do not change. Once no fx page loads Tailwind or Mermaid, both leave `references/vendor/` with `references/report-assets.md`; a repo's existing `docs/plans/_assets/` copies are never deleted. ADR 0061 records the kit and supersedes the sentence of ADR 0015 that names `report-assets.md`. Phase B closes with a green `check-all`.

**Design:** Phase B: fx-architecture and fx-audit on the kit; Phase B: visual kit; Further Notes

**Files:**
- Modify: `skills/fx-architecture/HTML-REPORT.md` (scaffold from `../../references/visual/page-template.html`; copy rule from `../../references/visual/visual-assets.md`; diagram patterns from the SVG recipes and the archify adapter; Mermaid and Tailwind gone; path, opening table and never-publish rule unchanged; the visual check per `visual-check.md`)
- Modify: `skills/fx-architecture/SKILL.md` (the card's "Before / After diagram" bullet: SVG by default, archify on `detailed`, no Mermaid), `skills/fx-architecture/COVERAGE.md` (the row naming the report-assets reference)
- Modify: `skills/fx-audit/SKILL.md` (the "Both HTML reports load the offline libraries" bullet and Phase 4 step 4 point at the kit page template and `visual-assets.md`, and say Mermaid diagrams from `design.md` render with `svg-static.md`)
- Delete with `git rm --`: `references/report-assets.md`, `references/vendor/tailwindcss-play-3.4.17.js`, `references/vendor/mermaid-11.17.2.min.js`, `references/vendor/LICENSE-tailwindcss`, `references/vendor/LICENSE-mermaid`
- Modify: `scripts/handwritten-js-allowlist.txt` (drop the two `references/vendor/` lines for Tailwind and Mermaid; keep the `docs/plans/_assets/` lines for fx's own old reports)
- Modify: `SURFACE.md` (drop `report-assets.md` and the Tailwind and Mermaid mentions). `THIRD_PARTY_NOTICES.md` is not edited.
- Modify: `src/tests/gates/visual-kit.test.ts`, built to `tests/gates/visual-kit.test.js` (the repository case also checks `skills/fx-architecture/HTML-REPORT.md`)
- Create: `docs/adr/0061-<slug>.md`; Modify: `docs/adr/0015-artifacts-live-in-the-repository.md` (status line only, standing ruling S5), `docs/adr/index.md`

**Interfaces:**
- Consumes: `kitErrors(root, files)` and its messages, the page template slots, the map data shape and `visual-check.md` (task 03); `skills/fx-adr/SKILL.md` (task 01); `docs/adr/index.md` (task 02).

**ADR 0061 (standing ruling S5):** decisions numbered: the visual kit replaces the Tailwind and Mermaid reports; HTML pages load only kit assets; Mermaid stays in Markdown. A `Supersedes:` line naming 0015 and quoting its decision that names `report-assets.md` as where the vendored copy lives, and `## Still in force` restating, as numbered decisions of 0061, every other decision of 0015. ADR 0015 has no status line: add exactly one under its title, `Status: superseded by 0061 (replaced: <quoted lead phrase>; the rest carried forward).` No other edit to 0015.

**Expected sizes (gate: 20,000 bytes):** fx-architecture about 8,900 (from about 8,850 after task 01); fx-audit about 17,830 (from about 17,720).

**Seam:** the `visual-kit.test.js` process; the text gates and `check-all`.

**Tests:**
- `kitErrors(<repo>, [<kit files>, 'skills/fx-architecture/HTML-REPORT.md'])` returns `[]`.
- A scratch copy of `HTML-REPORT.md` with `<script src="../_assets/mermaid-11.17.2.min.js"></script>` added returns `['skills/fx-architecture/HTML-REPORT.md: loads ../_assets/mermaid-11.17.2.min.js, which is not in the assets table']`.
- `grep -rln "tailwindcss-play\|mermaid-11\|report-assets" skills commands references agents` prints nothing.
- `scripts/check-paths` exits 0.

**Risks:** fx's own `docs/plans/_assets/` holds Tailwind and Mermaid for old reports; leave those files and their allowlist lines. `tests/gates/check-artifacts-remote.sh` uses Tailwind and Mermaid URLs as fixtures only; do not edit it. This is the supersede rule's first real use; the reviewer checks 0061 and 0015 against `skills/fx-adr/SKILL.md` item 4 (standing ruling S3).

**Testing:** gate test; text gates; the plan-mandated phase gate. No browser in the build runtime: the report ledgers `Visual check: not run: no browser` for the kit template, never a pass.

## Acceptance criteria
- [ ] HTML-REPORT.md still lists every card element and the Top recommendation section, and its scaffold loads only kit assets.
- [ ] fx-audit's Phase 4 step names the kit page template, `visual-assets.md`, and `svg-static.md` for the Mermaid lifecycle diagram; its gate and resume text is unchanged.
- [ ] `references/vendor/` holds only the kit's vendored files and their licences.
- [ ] `docs/adr/0061-*.md` has numbered decisions, a `Supersedes:` line and a `## Still in force` section; `git diff docs/adr/0015-*.md` shows one added status line and nothing else.
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/tests/gates/visual-kit.test.ts`

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/visual-kit.test.js`
Expected: the HTML-REPORT.md case fails with `loads ../_assets/tailwindcss-play-3.4.17.js, which is not in the assets table`.

- [ ] **4. Move both reports onto the kit, then remove Tailwind, Mermaid and report-assets**

- [ ] **5. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/visual-kit.test.js`. Expected: `visual-kit: OK`.

- [ ] **6. Write ADR 0061, the 0015 status line and the index rows** by following `skills/fx-adr/SKILL.md`

- [ ] **7. Run the phase gate**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`. Expected: `ALL GREEN`. If `release-version.test.js` fails because main already carries this branch's version, raise the minor version in the four manifests and rerun.

- [ ] **8. Commit by path**

```
git add skills/fx-architecture/HTML-REPORT.md skills/fx-architecture/SKILL.md skills/fx-architecture/COVERAGE.md skills/fx-audit/SKILL.md references/report-assets.md references/vendor/tailwindcss-play-3.4.17.js references/vendor/mermaid-11.17.2.min.js references/vendor/LICENSE-tailwindcss references/vendor/LICENSE-mermaid scripts/handwritten-js-allowlist.txt SURFACE.md src/tests/gates/visual-kit.test.ts tests/gates/visual-kit.test.js docs/adr/0061-*.md docs/adr/0015-artifacts-live-in-the-repository.md docs/adr/index.md
git commit -m "feat(fx-architecture): reports on the visual kit; Tailwind and Mermaid leave the plugin"
```

Add any changed manifests to the `git add` line.
