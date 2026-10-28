### Spec Compliance

- ✅ Spec compliant. Read the diff in passes (lib, player, template, tests, proof); the diff's context lines were enough, no changed file was read separately.
- ⚠️ Cannot verify from the diff: the 21 player checks in page-check.ts were not re-run (not asked; the report shows 30 of 30 on Chromium 130). The card-observer resume uses play(), which shows the next step at once on return; the brief says only "resumes", so this is a reading, not a violation.

Implementer's three items judged:
- seq-turn.html as the paged first page: covered by the standing ruling ("the fallback first page keeps the name seq-turn.html"). Test at src/scripts/system-flow-only.test.ts (9-message case) asserts seq-turn-p2.html exists, so the sequence really is paged, and the link is seq-turn.html, "Open in archify", after both the full build and `--only bullet:b1`. Accepted.
- Zero-step figure on injected data: accepted. The brief's own Empty figure case cannot come from a valid model (nodes need edges, edges become steps). The check mounts a spec with `steps: []`, asserts `0 / 0`, disabled Play/Next/Reset, 0 console errors (fx-flow-2.ts `spec.steps.length === 0` branch and `mount(root)`).
- Three assertions never seen failing alone: judged below. The archify label assertion is covered red-first by the --only test; the checksum gate is deterministic (I confirmed nothing needs it separately); C11 judged real below.

Ruling C11 (build failing in the deep diagram step leaves index.html unchanged, no stamps): present and real.
- src/scripts/system-flow-page.test.ts (block "All or nothing (ruling C11)"): seeds an old marked index.html, puts a regular file at `diagrams/src`, snapshots all fragment texts, runs `build --prefer cheap`, asserts non-zero status, index.html byte-equal to the old text, fragments byte-equal.
- The provocation reaches the deep step: `writeSpecs` writes `diagrams/src/<name>.json` (sf-build.ts, `for (const g of groups) writeSpecs(g)`), which throws because `src` is a file. Nothing before that step touches `diagrams/src`.
- It would fail at the base: index.html was written before the deep step there, so the byte-equality assertion could not hold. In the new order index.html is written after the diagram loop (sf-build.ts, "The page follows the deep diagrams") and stamps are the last step.
- I ran `node scripts/system-flow-page.test.js` once: `system-flow-page.test.js: OK`.

Rulings checked: C3 (caption compared with tags stripped, page.test `strip`): kept. Fallback name ruling: kept. Proof scripts carry no `/// <reference lib="dom" />` (module-local declarations in page-check.ts). Dashes: none in added lines I read.

### Strengths

- Card markup matches the contract exactly, including `aria-label="<title>, scrolls sideways"` using the bare title while h3 carries the prefix (sf-page.ts figure()).
- `deepBase` is one shared helper used by both sf-page.ts and sf-build.ts, so the page and the on-disk lookup agree on `level-x` to `arch-x`.
- `--only` lookup uses the generated marker (`hasMarker`) as the brief says; `svgPage` now writes the marker, so a rebuilt SVG page reads as `svg`.
- Player: one `halt`/`play`/`by` trio gives the exact behaviours (Play shows next step at once, last step stops for good, `parked` so the card observer resumes only what it paused, no `aria-pressed`). Sideways follow scrolls `.fig` only, instant under reduced motion.
- Template gate pins the sticky bar, `.card` without overflow, `.fig` overflow-x, 84 px and 36 px floors, and no svg width:100% rule. CSS matches the gate.
- Tests assert behaviour from the model (title and summary taken from the model JSON, not recomputed from renderer code).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)

- src/scripts/system-flow-page.test.ts (C11 block) · it asserts only `status !== 0`, so a build that failed for another reason (say a model problem) would pass the status line; the byte-equality of index.html and fragments would still hold, so the test could pass vacuously. Add an assertion that stderr names the `diagrams/src` path (or ENOTDIR/EEXIST) to pin the failure to the deep step.
- src/lib/sf-build.ts (the `${base}-p1` lookup) and src/lib/sf-page.ts (`input.deep.find(... -p1)`) · the build names a paged diagram's first page `<name>.html`, so the `-p1` branch is unreachable from this build's own output and untested; it exists only because the brief's interface says so. Delete it once the plan wording is corrected, or keep and note it.
- src/references/visual/fx-flow-2.ts (`by(...)`, Back/Next) · a manual Back or Next marks the figure as touched and permanently disables autoplay and card-observer resume for it. The brief lists only Pause, Reset and the last step; the report states it. Reasonable, but it is behaviour the brief did not specify. `mount(root = document)` also exists only as a test hook.

Tripwire note: the report's silent-failure item (a card linking `diagrams/<base>.html` when no page exists under `--only`) is as the brief specifies; no further tripwire found.

### Assessment

**Task quality:** Approved
**Reasoning:** The diff meets the brief and every live ruling; C11 is a real, provocable test that would fail on the old write order, and the implementer's three reported items are acceptable. Remaining points are minor.

## Ledger lines

Task 07: minor (deferred): C11 test asserts only a non-zero status; pin the failure to the deep step with a stderr check.
Task 07: minor (deferred): the `-p1` first-page lookup in sf-build.ts and sf-page.ts is unreachable from the build's own names; remove after the plan wording is fixed.
Task 07: minor (deferred): manual Back/Next permanently disables autoplay and resume for that figure, which the brief did not specify; `mount(root)` is a test-only hook.
