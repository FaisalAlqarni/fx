# Pre-flight conflict scan: system-flow site plan

Scope: `plan.md` (156 lines), `design.md` as needed, `tasks/01` to `tasks/13`. Read only. Line numbers are of the file named; every quote was checked against the file. "OK" means the two texts agree on that interface. Conflict ids (C1 to C15) are defined in the last section.

Repo facts used (checked in `/development/fx/.worktrees/system-flow`): `src/lib/sf-evidence.ts:164`, `src/references/visual/fx-flow-1.ts:35`, `src/tests/gates/visual-kit.test.ts:260`, `src/lib/sf-page.ts:186-190`, `src/tests/helpers/sf-fixture.ts` (goodSet at version 1, one chapter `s1`, no glossary), `scripts/build` (compiles every `src/**/*.ts`, so the proof `.ts` files need no build edit).

## Pair rows

Columns: pair | shared file or interface | Produces vs Consumes | finding.

| # | Pair | Shared file / interface | Produces vs Consumes | Finding |
|---|---|---|---|---|
| P01 | 01, 02 | schema `section` def, `sf-model.ts`, `sf-rules.ts`, `system-flow-check.test.ts` | 01 gives `Section` `role?, lead?, notOwned?` (01:24); 02 consumes them (02:18) and drops `required` to `["id"]` (02:12) | OK. 01 keeps today's `required` on section, 02 relaxes it; sequential. |
| P02 | 01, 03 | `sf-fixture.ts`, all `system-flow-*.test.ts`, `Model` fields | 01 makes fixture version 2 with `look` (01:15); 03 grows `goodSet()` (03:27) | Files agree. 03 invalidates 01's exact-three-line version-1 test by input, not by value: see C4. |
| P03 | 01, 04 | `Look` type, schema v2, the hint | 01 produces `type Look` (01:21); 04 `lookOf(...): Look` (04:19) | OK. Hint text `schemaVersion 1: run system-flow migrate` identical in 01:38 and design line 107 area. |
| P04 | 01, 05 | `Message.short/reply`, `Look`, `sf-model.ts` | 01 adds `short?: string; reply?: boolean` (01:22); 05 consumes (05:26) | OK. `Message` has no `short` today (`sf-model.ts:21`); `Edge.short` exists and 05:29 uses today's `ruleShort`, which exists (`sf-layout.ts:38`). |
| P05 | 01, 06 | `Look` to legend, fixture looks | 01 `look` on nodes; 06 legend per look (06:35) | OK. Fixture looks `service, store, client, external` (03:27) match 06:44. |
| P06 | 01, 07 | test files `system-flow-archify/only/page.test.ts` | 01 edits them for version and `look` (01:16); 07 edits them (07:19) | OK, sequential. |
| P07 | 01, 08 | `GlossaryTerm`, `CodeMapEntry`, `notOwned` | 01 types (01:25-26); 08 consumes (08:21) | OK. |
| P08 | 01, 09 | same types, `Section.folder` | 01 types; 09 consumes `folder` (09:18) | OK. `folder` already exists in `Section` (`sf-model.ts:35`, schema line 343). |
| P09 | 01, 12 | `system-flow-estimate.test.ts` | 01 edits for version and `look` (01:16); 12 recomputes expected values (12:14) | OK, sequential. |
| P10 | 01, 02 vs evidence | folder evidence on `code:` items | 01 test needs a code map entry with `{ "path": "app/" }` to pass `check` (01:46); `sf-evidence.ts` not in 01 Files (01:11-17) | CONFLICT C1. |
| P11 | 02, 03 | `fieldOrigin`, `originOf`, check/build tests | 02 produces both (02:19); 03 calls them itself (03:24) | OK on the interface. 02's own tests break under 03's `goodSet()`: see C4. |
| P12 | 02, 04 | `mergeFragments`, `writeAll` | 04 calls `checkProse(model,'whole')` on a merged model (04:18) | OK. `writeAll` exists (`sf-model.ts:268`). |
| P13 | 02, 06 | merged `Section` with `lead` | 02 merged sections; 06 renders `p.lead` (06:33) | OK. |
| P14 | 02, 08 | merged sections, `notOwned` | 02 merges `notOwned` (02:7); 08 renders `ul.not-owned` (08:23) | OK. |
| P15 | 02, 09 | merged sections | 09 consumes `lead`, `notOwned`, `folder` (09:18); blocked by 03 only (09:4) | OK via 03 transitively. |
| P16 | 03, 04 | `checkProse`, message table, `owed` | 03 messages (03:29-50); 04 quotes `meta.intro missing` and `Start here role what missing` (04:29) | Messages and pointers match 03:33 and 03:35. Line format of `owed` vs the glossary-size line: C8. |
| P17 | 03, 05 | `sf-build.ts`, `proseStats.lifelines`, `system-flow-prose.test.ts`, `FigureSpec.lanes` | 03: `lifelines` is 0 until 05 (03:25, 03:73); 05: equals the number of sequences, 1 on `goodSet()` (05:54) | OK, and 05 lists the prose test (05:23). 03 `turn` has 4 participants (03:27): width 748 matches 05's table (05:42). |
| P18 | 03, 06 | `sf-build.ts`, `check-all`, chapter ids | 03: four Start here chapters first (plan:20); 06 `ch-01-start-what` to `ch-05-s1` (06:42) | OK. `meta.name "Fixture"`, `title "Fixture system"` (03:27) match 06:43-44. |
| P19 | 03, 07 | `sf-build.ts`, page/only tests | 03 `checkModel`; 07 reorders page write (07:15) | OK, sequential. |
| P20 | 03, 08 | `goodSet()` content, `check-all`, chapter ids | 03 gives 15 terms, `link` with alias `links`, `short-link`, lead with `link` twice (03:27); 08 tests term links on bullets, captions, `code.at` (08:42) | Chapter ids and counts OK (5 chapters, 15 terms). 08's test inputs are not in 03's `goodSet()`: C5. |
| P21 | 03, 09 | `sf-build.ts`, `check-all`, `folder: "start-here"` | 03 declares folder `start-here` (03:27); 09 paths `start-here/...` (09:24) | OK. |
| P22 | 03, 10 | message table quoted by the lane | 10:18 "quoted, never restated with other words" | OK; 10's tests do not check any quote (see Task row 10). |
| P23 | 03, 11 | prose words definition | 03 `words` = lead + bullets + not-owned (03:25); 11 `prose words` = question + lead + bullets (11:18) | CONFLICT C7. |
| P24 | 03, 12 | `build` stdout `prose` | 12 records `build` stdout `prose` (12:23) | OK. |
| P25 | 04, 06 | `scripts/check-all` | each adds one line (04:15, 06:18) | OK, sequential. |
| P26 | 04, 08 | `scripts/check-all` | one line each | OK. |
| P27 | 04, 09 | `scripts/check-all` | one line each | OK. |
| P28 | 04, 10 | `migrate`, `owed` | 10 consumes (10:18) and tests only phrases (10:31) | OK. |
| P29 | 04, 11 | `migrate` on the Shamel copy | 11:26 "`check` prints one `run system-flow migrate` line per fragment (10)"; after, "error lines equal `owed` as sets" | OK with 01:38 (one hint per fragment) and 04:29. Same set-equality caveat as C8. |
| P30 | 05, 06 | `sf-page.ts`, `sf-build.ts`, `visual-kit.test.ts`, `system-flow-page.test.ts`, `leaves` | 05 `rows[].leaves` (05:29); 06 legend "Call that leaves <name>" (06:35) | OK. 05 edits `visual-kit.test.ts` file list and checksum; 06 later replaces the `page-template.html` assertions; no overlap. |
| P31 | 05, 07 | `fx-flow-2.ts`, `visual-assets.md`, `sf-diagrams.ts`, `sf-page.ts`, `sf-build.ts`, step shape | 05 step `{edges,nodes,caption,where}` (05:30); 07 narration "the step's `caption` followed by `<code>` holding `where`" (07:36) | Shape OK. Global "A kit file's byte change renames it" (plan:43) vs 07 changing `fx-flow-2.js` bytes in place: covered by plan Deviations line 109, no conflict. `validateFigure` wording: C2. |
| P32 | 05, 08 | `sf-page.ts`, figure `summary`/caption | 08 links terms in `p.cap` (08:7); 05 does not touch captions | OK. Box-figure step `caption` text is not defined in 05 (05:30 defines it only for sequences); 07 narration test uses only `fig-seq-turn` (07:51), so no failing assertion. |
| P33 | 05, 09 | `sf-build.ts` | 05 `layoutChecked`/`ASSETS`; 09 `glossary.md` write | OK, different functions, sequential. |
| P34 | 05, 11 | `lifelines` count | 11 `lifelines equal sequences` (11:25) | OK. |
| P35 | 06, 07 | `site-template.html`, `site-template.test.ts`, `sf-page.ts`, `page-check.ts`, `fixture-site.ts`, `visual-kit.test.ts` | 06 DOM contract (06:26-35); 07 `figure.card`, `.ctl[data-fx-flow]` (07:27-33) | OK. 07's `.card` has no overflow (07:48) and 06's `#side` sticky: no clash. 07 adds `wide` and a tall level diagram to the fixture; 06's tests assume the plain fixture (06:42-45) and the new items sit in an area fragment, not in the asserted chapters. |
| P36 | 06, 08 | `site-template.html`, `site-template.test.ts`, `sf-page.ts`, `page-check.ts`, `nav#menu` | 06: `#menu-bar` has only `<summary>` and `nav#menu` (06:27); 08: filter is the first child of `nav#menu` (08:29) | Menu structure OK. 08's term links change what 06 asserts about `p.lead` and bullets: C3. 06:42 "plus today's fixed chapters present on the fixture" is lenient enough for 08's removal of `components`/`open-questions`. |
| P37 | 06, 09 | `sf-build.ts`, `check-all` | different functions | OK. |
| P38 | 06, 11 | `data-group`, DOM contract | 11:18 "exactly `section.chapter[data-group=\"start\"]` and `section.chapter[data-group=\"how\"]`"; 06:32 declares them | Names OK. No 06 test asserts `data-group` on chapters: C10. |
| P39 | 07, 08 | `site-template.html`, `site-template.test.ts`, `sf-page.ts`, `page-check.ts` | 07 `p.cap` equals `summary` (07:45); 08 links terms in captions (08:42) | CONFLICT C3. |
| P40 | 07, 09 | `sf-build.ts` | different functions | OK. |
| P41 | 07, 11 | `page-check.ts`, player checks | 07 check names `reset`, `playPause` (07:54-56); 11 `player.reset`, `player.playPause` `pass: true` (11:25) | Names OK. 11:18 says every check runs "at 1440 and 390, light and dark, reduced motion off and on"; 06 and 07 fix viewport and motion per check: C12. |
| P42 | 08, 09 | table columns | 08 `table.stores` `Store kind, Rows, Shown in`, `table.code-map` `Folder, What it owns, Start reading at` (08:25); 09 same headers (09:28) | OK, identical. Row cell `app/x.rb:1-4 Link` identical (08:40, 09:28). |
| P43 | 08, 10 | `start-here` section ids | 10:18 uses `start-what`..`start-code` | OK. |
| P44 | 08, 11 | `#glossary`, `ul.not-owned`, filter ids | 11:25 `glossary` 15 | OK. |
| P45 | 09, 10 | folder `start-here`, `glossary.md` | 10:7 mentions neither beyond ids | OK. |
| P46 | 10, 12 | the lane | 12:17 consumes the lane | OK. 12:50 step prompts rely on first-iteration lane prompts; not contradicted. |
| P47 | 11, 12 | `compare.js`, `page-check.js --measure fx`, `results.md` | 11:19 `compare.js <owner.json> <a.json> [<b.json>]`; 12:59 uses it | OK. 11 creates `results.md`, 12 modifies it (12:13). |
| P48 | 11, 13 | same | 13:22 `compare.js <owner.json> <a.json> <b.json>` | OK. |
| P49 | 12, 13 | `results.md`, `run-a.md` pattern, `ESTIMATE`, measure JSON of (a) | 13:16 "site (a)'s measure JSON"; 12 never names where it saves that JSON (12:11-14, 59) | CONFLICT C13 (gap). Also `run-b.md` is "as `run-a.md`" (13:42) and inherits C6. |
| P50 | 04, 05 | none shared | disjoint files | OK (no row content). |
| P51 | 04, 07 | none shared | disjoint | OK. |
| P52 | 05, 10 | none shared | disjoint | OK. |
| P53 | 09, 11 | none shared | disjoint | OK. |

Pairs not listed share no file or interface (for example 04 with 05, 07, 09 on source files; 10 with 05, 06, 07).

## Task rows

For each task: self-agreement, reviewer-defect mandates, Global Constraints contradictions.

| Task | Self-agreement | Mandated defects a reviewer would reject | Contradiction with plan Global Constraints |
|---|---|---|---|
| 01 | Tests vs code: the Items test (01:46) cannot pass without folder evidence on `code:` items, which `sf-evidence.ts:164` refuses ("a folder entry is allowed only on catalogue and inventory entries") and which is not in Files (01:11-17): C1. Tests field lists only `check` and `stale` tests (01:17) yet specifies `verify term:link` (01:48) and an evidence-range test said to match `system-flow-evidence.test.ts` (01:47); step 3 runs only those two files (01:69): the file for those cases is not named. Files vs steps otherwise agree (15 test files named, 15 listed in plan:21). | None found. | None. Dash ban respected. |
| 02 | Tests, Files and steps agree. Test "Order" and "Missing title: `chapters.json:/sections/1`" (02:25, 02:28) assume `goodSet()` has only `s1`; true at 02, false after 03: C4. | None. | None. |
| 03 | Files list matches the commit paths (03:11-17 vs 03:110). `goodSet()` arithmetic checks: 2 x 20 + 4 x 20 = 120; start-what 140; average (140 + 4 x 120) / 5 = 124 (03:73). Pointer `chapters.json:/sections/4` correct (s1 is the fifth section). "update expected values only, never weaken an assertion" (03:76) contradicts the input changes 01 and 02 need: C4. | The `sentences` bullet "counts 3 (fails a 2-to-4 bound only when 5)" (03:59) states a bound, not an assertion; harmless. | None. |
| 04 | Files, tests, commit paths agree (`scripts/system-flow` is the extensionless build output, `scripts/build` case list). `owed` described as `"file:pointer: message"` (04:20) but the glossary-size message may have no file (03:49 "else `system-flow: check:`"): C8. | None. | None. |
| 05 | Arithmetic verified: widths 748, 856, 860, 964, 1276; rows 72, 112, 168, height 232; label limit 734 (748 - 14). Files agree with commit list. `validateFigure` messages "as today" are not today's text: C2. Delete of `fx-flow-1` staged by `git rm -q --` (05:86), allowed by plan:57. Build script `scripts/build` line for browser files and both tsconfigs are in Files (05:18-19), matching the repo (`scripts/build` and `tsconfig*.json` name `fx-flow-1.ts`). | Test "No ELK for sequences" (05:48) asserts only that a build succeeds and that `crossings` is absent or 0; it cannot fail for the stated reason ("no ELK error path reached" is not observable). Weak, not vacuous. | "A kit file's byte change renames it" (plan:43): 05 creates `fx-flow-2.js` new, consistent. |
| 06 | Files agree with commit paths. Contract vs tests agree except: no test asserts `data-group` on chapters (06:32, needed by 11:18) and none asserts the `lang="en" dir="ltr"` default: C10. `p.lead` equal to the lead (06:45) breaks under 08: C3. Does not state the `../_assets/` link convention that `sf-page.ts:186-190` rewrites (`fx-tokens-1.css` regex, `theme.css` insert, `replace(/\.\.\/_assets\//g,'assets/')`); the template must keep it: C15. Step 3 RED runs only the page and gate tests (06:76), step 5 adds browser runs: fine. | None. | Plan:37 "Pages default to `lang="en" dir="ltr"`" has no test: C10. Plan:57 "Every command a task runs is prefixed `TMPDIR=...scratch-env`" vs 06:83 browser commands without it; plan:58 gives the browser form, so accepted. |
| 07 | Files agree. Behaviour list and tests agree on timing: Play at t0 gives step 1; steps at 1.6 s; end at 6.4 s; test reads 7.5 s (07:58). `p.cap` equal to `summary` breaks under 08: C3. Plan:25 says a build that fails between the deep diagrams and the page "still writes nothing stamped"; 07 has no test or step for it: C11. Marker for `svgPage` has no direct test, only the `--only` outcome (07:50). | None. | Plan:43: 07 changes `fx-flow-2.js` bytes without renaming, covered by plan:109. |
| 08 | Files omit the fixture while its tests need content `goodSet()` lacks (bullet holding `short link`, a caption holding a term, a term inside `code.at`, 08:42): C5. "the site index JSON holds `<script>`" (08:44) vs plan:44 (inline JSON writes `<` as `<`): C14. `<root>` means the level-0 diagram id in `fig-level-<root>` (08:24) and the evidence root in `code-map` (08:25); the test fixes both (08:38, 08:40). | None. | None beyond C14. |
| 09 | Files, tests, commit paths agree; table headers match 08. | None. | None. |
| 10 | Files, tests, commit agree. Test "ADR 0066 ... renumbered with no gap (`docs-lanes` or the ADR index gate, whichever reads ADR text today)" (10:33) leaves the test file undecided; only `docs-lanes.test.ts` is in Files (10:15): C9. | Several literal-substring asserts pass on any prose: `look`, `short`, `reply`, `store`, `client`, `external`, `security`, `service`, `Prose`, `glossary`, `lifelines` (10:27-29). They cannot fail when the sidecar is wrong. C9. | None. SKILL.md under 20,000 bytes is gated (10:31-32). |
| 11 | Files agree with commit. Step list has no `fx-tdd` step, consistent with "agent work throughout; no lane is invoked" (11:3). `page-check.js --measure` interface lists the output keys (11:18) and the fixture test reads them (11:25): agree. Every check "at 1440 and 390, light and dark, reduced motion off and on" (11:18) contradicts the per-check states in 06 to 08: C12. `proseWords` definition: C7. | Step 3 "fix the script until it passes" (11:44) is fine for tooling. | Nothing written under `/mnt` is asserted by `find -newer` (11:27), matches plan:51. |
| 12 | Step 1 makes only `<run>/home/.claude` and `<run>/tmp` (12:44) but the controller setup runs `cp -rL /home/faisal/.claude/skills/archify <run>/home/.claude/skills/archify` (12:48): the parent `skills/` is missing, so `cp` fails: C6. `compare.js` pass line "average prose at least 120" uses 11's definition: C7. Credential copy deleted with `find ... -delete` (12:53), matches plan:23. | Calibration (12:27, 12:61): constants are set from the run, then a test asserts the run's numbers within 10 percent. Circular by design; it pins constants, not accuracy. | Plan:57 "Every command ... prefixed `TMPDIR=...scratch-env`" vs the controller `claude -p` and `find` commands (12:50-53); they use their own `TMPDIR=<run>/tmp`; acceptable. |
| 13 | Same C6 via "as `run-a.md`" (13:42). Step 1 writes `<run>/status-before-<name>.txt` before it names making `<run>` (13:40): order only. Needs site (a) measure JSON with no named location: C13. Clone names `android` and `advantage-store` match the `--repo` flags (13:42); all four source paths exist. | None. | Same as 12. |

## Conflicts needing a ruling

Each conflict once, with a suggested resolution grounded in `design.md`.

**C1. Code map entries need folder evidence; `sf-evidence.ts` forbids it and 01 does not touch the file.**
- 01:46: code map entry with evidence `[{ "path": "app/" }, { "path": "app/x.rb", ... }]` must `check` with exit 0. 03:27 repeats it for `goodSet()` ("evidence the folder `app/` then `app/x.rb`").
- `src/lib/sf-evidence.ts:164`: `if (item.kind !== 'catalogue' && item.kind !== 'inventory') return fail(... 'a folder entry is allowed only on catalogue and inventory entries' ...)`.
- 01 Files (01:11-17) do not list `src/lib/sf-evidence.ts` or `sf-evidence` tests.
- Resolution: design line 90 says "A folder entry is allowed on code map entries, as on catalogue and inventory entries." Add `src/lib/sf-evidence.ts` (allow kind `code`) and its commit path to task 01, plus one test that a folder entry on a `term` still fails.

**C2. 05 claims `validateFigure` messages are "as today"; they are not.**
- 05:35: "`step <i> names missing row <id>` for a step edge that is not a row id, `step <i> names missing edge <id>` for a box spec as today"; 05:52: `['step 1 names missing row turn#9']`.
- `fx-flow-1.ts:35`: `figure ${spec.key}: step ${i} names a missing edge ${e}`, 0-based `i`; `visual-kit.test.ts:260` expects `figure seq-turn: step 0 names a missing edge e9`.
- Resolution: design (Testing, seam 2) only requires that `validateFigure` "rejects a step naming a missing row". Keep today's form: `figure <key>: step <i> names a missing row <id>`, 0-based like the box case, and write both expected strings in 05 (the step-naming-`turn#9` case then reads `step 0` or the index of that step, stated explicitly).

**C3. 06 and 07 assert exact lead, bullet and caption markup that 08 rewrites with term links.**
- 06:45: "`p.lead` equal to the lead, 4 `li` in `ul.facts`, the first with `<code class="at">app/x.rb:4</code>`"; 07:45: "`p.cap` (the model `summary`)".
- 08:7: "Terms in leads, bullets, not-owned items and captions link to the glossary on first use per chapter"; 03:27: "the word `link` twice in `s1`'s lead"; 08:15: nothing leaves `system-flow-page.test.ts` except the `validateMapData` assertion.
- Resolution: design line 210 puts links on first occurrence in leads, bullets and captions. Make 06 and 07 compare text content (tags stripped), and list in 08 Files and text the assertions it adjusts in `system-flow-page.test.ts`.

**C4. 03 says "update expected values only"; the tests of 01 and 02 need changed inputs once `goodSet()` has leads and four bullets.**
- 03:76: "update expected values only, never weaken an assertion."
- 02:24: `links.json` sets `s1` `"lead": "Links expire. The job checks them."` and expects bullet ids `["b1", "b2"]`; 02:26 expects an error only when `lead` is set twice; 02:28 expects `chapters.json:/sections/1`. After 03, `chapters.json` already holds `s1` with a lead (03:27) and 4 bullets, so the first test errors and the pointers move to `/sections/5`.
- 01:38: the version-1 set "holds `meta.json`, `level0.json` and `chapters.json`" with exactly three stderr lines; 03:27 adds `glossary.json` and the sequence fragment, so the line count changes.
- Resolution: reword 03:76 to "update expected values and, where `goodSet()` now sets the field, the test's own input (use a field `goodSet()` leaves unset, or build the set locally)". Design Testing seam 1 lists these as separate behaviours, so the assertions stay.

**C5. 08 tests inputs that `goodSet()` does not provide and 08 Files omit the fixture.**
- 08:42: "`short link` in a bullet links to `term-short-link`... a term inside `code.at` is not linked; a term in a card caption is linked."
- 03:27 specifies terms `link` and `short-link`, `link` twice in the `s1` lead, summaries "one sentence of 6 to 30 words" with no stated term, and no bullet with `short link`.
- Resolution: either add those strings to 03's `goodSet()` (with the word counts held at 20 per bullet) or state in 08 that the test edits `s1` and a summary after `goodSet()`, as 03:63 does for word counts.

**C6. The controller setup copies archify into a folder the prep step never creates.**
- 12:44: "make `<run>/home/.claude` and `<run>/tmp`"; 12:48: `cp -rL /home/faisal/.claude/skills/archify <run>/home/.claude/skills/archify`. `cp -rL SRC DST` fails when `DST`'s parent `skills/` is absent. 13:42 says "as `run-a.md`".
- Resolution: step 1 of 12 and 13 also makes `<run>/home/.claude/skills`.

**C7. Two definitions of "prose words per chapter".**
- 03:25: `words` is "lead plus bullets plus not-owned", `averageWords` the mean; 11:18: "prose words per chapter count the question, the lead and the bullets as rendered text" (no not-owned); design line 336: "Reading prose per chapter (question, lead, bullets)... average at least 120".
- The floor (design, "at least 100 words ... lead plus bullets plus not-owned") and the pass line differ on purpose, but both are called "prose words" and 12:23-24 records both.
- Resolution: keep 03 for the floor and 11 for the proof pass line (design line 336), and name the two fields differently in `results.md` (for example `floorWords` and `readingWords`).

**C8. Format of `owed` lines when a problem has no file.**
- 04:20: `owed` is `["file:pointer: message"...]` and "exactly the error lines `checkProse` gives ... in the format `check` prints"; 03:49: glossary size is reported "at the first glossary fragment's `/glossary`, else `system-flow: check:`"; a version-1 migrated set has no glossary fragment.
- Resolution: state that `owed` holds the stderr lines `check` prints verbatim, including `system-flow: check: ...`, and compare the sets after stripping nothing (design line 100: "the same list `check` would fail on").

**C9. Task 10 leaves a test file undecided and asserts words that cannot fail.**
- 10:33: "(`docs-lanes` or the ADR index gate, whichever reads ADR text today)"; 10:15 lists only `docs-lanes.test.ts`.
- 10:27-29: substrings such as `look`, `short`, `reply`, `store`, `client`, `external`, `security`, `service`, `Prose`, `glossary`, `lifelines`.
- Resolution: name the gate that reads ADR text and add it to Files; replace the single common words with the full sentence each sidecar must contain (as the other listed phrases already do).

**C10. Global Constraints with no test in the task that owns them.**
- Plan:37: "Pages default to `lang="en" dir="ltr"` and use logical properties"; 06:50 gates logical properties but no 06 test asserts `lang="en" dir="ltr"` on `index.html` or the template.
- 11:18 measures `section.chapter[data-group="start"]`/`"how"`; 06:32 puts `data-group` in the contract but no 06 test asserts it on chapters.
- Resolution: add both assertions to 06's page test (design Global Constraints, "Pages default to ...").

**C11. A plan risk with no owning test.**
- Plan:25: "Task 07 moves the page write after the deep diagrams; a build that fails between them still writes nothing stamped." 07 has no test or step for it.
- Resolution: add one test to 07 (a failing deep diagram step leaves `index.html` unchanged and no stamps written), or remove the sentence from the plan risk. Design "Kept" list: all-or-nothing fragment writes.

**C12. 11 runs every check in every viewport and motion state; 06 to 08 fix a state per check.**
- 11:18: "every behaviour check of tasks 06, 07 and 08 runs ... at 1440 and 390, light and dark, reduced motion off and on". 06:54-56 `menuSticky` (1440), `phoneBar` (390); 07:51 player checks "reduced motion on, 1440 x 900"; 07:61 `autoplay` "reduced motion off".
- Resolution: design line 328 ("Chromium, reduced motion off and on, light and dark, 1440 and 390") describes the measure run; write in 11 that a check runs in each state where it is defined, and `null` elsewhere (as it already does for the owner profile).

**C13. Site (a)'s measure JSON has no named home.**
- 13:16 consumes "site (a)'s measure JSON for the three-column table"; 12:11-14 and 12:59 write only `results.md`, `run-a.md` and estimate files.
- Resolution: 12 step 4 saves `<run>/measure-a.json` and lists the path in `results.md`; 13 reads it from there.

**C14. "Site index JSON holds `<script>`" against the inline JSON rule.**
- 08:44: "the site index JSON holds `<script>`"; plan:44: "inline JSON writes `<` as `<` (`inlineJson` in `src/lib/sf-page.ts`)".
- Resolution: say the parsed JSON holds `<script>` and the raw block contains `<script>` and no `<script>` (design line 210, "inline JSON still writes `<` as `<`").

**C15. 06 does not carry the asset-link convention `sf-page.ts` relies on.**
- `src/lib/sf-page.ts:188` inserts `theme.css` after a `<link rel="stylesheet" href="../_assets/fx-tokens-1.css">` match and `:190` rewrites `../_assets/` to `assets/`; 06:12-25 says `renderPage` input is "unchanged except `template`" but its gate lists only "no `http://` or `https://`" (06:50).
- Resolution: add to 06's gate that the site template loads kit files through `../_assets/<file>` links the renderer rewrites, and that the `fx-tokens-1.css` link line is kept verbatim; design "Pages load only files under the site's `assets/`".

Counts: 53 pair rows (P01 to P53; P50 to P53 record disjoint pairs), 13 task rows, 15 conflicts.
