# Final branch review: docs-adr-visual, 67584d9..b874cd4

Reviewer: broad final reviewer (one seat, no subagents). Read: the branch package stat and commit list, plan.md (S1 to S8), state.md, coverage-audit.md, every source file the seams cross (listed per finding). Ran, with TMPDIR in the session scratchpad and through `scripts/scratch-env`: `lib/doc-evidence.test.js`, `lib/doc-index.test.js`, `lib/scratch-migrate.test.js`, `lib/fx-json.test.js`, `tests/gates/visual-kit.test.js`, `tests/gates/fx-setup-root-check.test.js`, `tests/gates/reference-leaves.test.js`, `skills/fx-implement/scripts/compile-brief.test.js`: all pass. `scripts/build --out <scratch>` reproduces the committed JavaScript byte for byte for the ten generated files I compared. `buildIndex` over the worktree (in memory, no file written): 20 claims, 0 problems, all 20 `recheck/unverified`. I did not run `scripts/check-all` (it can rewrite generated files in the worktree, and the review is read-only); the exit gate reruns it.

## Strengths

- `src/lib/scratch-migrate.ts` is careful where it counts: re-plans before apply, refuses on any conflict, lstat-checks `.scratch`, every entry, `docs`, `docs/issues`, `.gitignore` and every pointer file, undoes only finished steps newest first, commits nothing, prints a rollback. The dry run is the default.
- The plugin-root check is one command for both migrations (`commands/fx-setup.md:126-130`), with an allowlist of the two script names, and the gate test proves a planted root is refused for the scratch script too and an unlisted script is refused (`src/tests/gates/fx-setup-root-check.test.ts:117-129`).
- The evidence parser and the index are small, typed and tested; the 20-claim cap lives once (`src/scripts/docs-index.ts:30-42`), `--limit 0` lifts it for branch mode only.
- The five new ADRs follow the repo's own shape (title, `Status:` line, Context, Decision, Consequences, Alternatives, as 0054 and 0058) with numbered decisions and parseable evidence lines; the index is built mechanically.
- Every SKILL.md is under 20,000 bytes (largest: fx-tdd 19,368, fx-debug 19,335). No em or en dash in any added line outside `references/vendor/`; no attribution trailer in any commit.
- The page template already carries the theme storage key, legend, evidence toggle and logical properties (`references/visual/page-template.html:18,35,75-76`); only the assertion is missing (I7).

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

I1. src/lib/doc-index.ts:29-38, 45, 115 · Ruling G2 is not built, and the store the ruling names cannot hold the state. Every ADR claim is `recheck/unverified` on every run (verified on HEAD: 20 of 20). The ruling puts an ADR's verified commit in `.fx/docs-index.json`'s `verified` map, but `buildIndex` sets `verified[doc]` only from the doc's own marker and `writeIndex` overwrites the file whole on any doc change, so a stored ADR entry is lost on the next rebuild. `.fx/` is also git-ignored, deleted on a clean run and absent in every fresh build worktree, which is where fx-docs branch mode runs; the saving would almost never apply. Fix wave must change: `buildIndex` (carry ADR entries forward from the cached index, or read them from a tracked place), `loadIndex:67` (its `sameDocs` test compares `Object.keys(verified)` to the doc list, so extra keys would force a rebuild each time), `stalePassOne:115`, a way to record the commit (for example `docs-index verify <adr-path> <sha>` in `src/scripts/docs-index.ts`), `skills/fx-docs/SKILL.md:95` (say when fx-docs records it), and a test in `src/lib/doc-index.test.ts`. Plan issue for the owner: a tracked home would survive worktrees, for example one `<!-- fx-docs verified: <sha> -->` marker in the ADR folder's `index.md` (lane-owned, not an ADR, so S5(c) allows it) read as the verified commit for every ADR in that folder.

I2. skills/fx-implement/references/final-review.md:5-6 · Ruling G5 is not built. Step 1 still ledgers `Docs: not run: no docs/` when no doc carries evidence lines, so a repo with plain docs or none never gets the first full run. Fix wave must change: `final-review.md:5-6` (no evidence-bearing docs and no `docs_first_run: declined` in `.fx.json`: offer the first full documentation run once; a no writes the key), `completion.md:47` (Docs line names the offer outcome), `src/lib/fx-json.ts` beside `scratch_migrate` (`docs_first_run` must be `"declined"`) with a case in `src/lib/fx-json.test.ts`, `skills/fx-docs/SKILL.md:99` (full run trigger names the offer), and ADR 0062 decision 4 (body still editable: the ADR is unmerged). The ledger text `no docs/` must match the pre-flight skip condition wording.

I3. docs/adr/0015-artifacts-live-in-the-repository.md:3 and docs/adr/0061-the-visual-kit-replaces-the-tailwind-and-mermaid-reports.md:5, 39-40 · The first real supersession breaks S5's "exactly one live copy". 0015's status line names the replaced decision as "A report vendors what it needs instead of reaching for a CDN at render time", while 0061 decision 8 carries that same rule forward as still in force ("A report vendors what it needs and never reaches for a CDN at render time"). 0061's own `Supersedes:` line quotes the whole sentence, so the two records disagree on what was replaced. What 0061 actually replaced is the location clause, "`references/report-assets.md` is where that copy lives". Fix: change 0015's status line (the one edit S5(c) allows) to quote that clause; make 0061's `Supersedes:` line quote the same clause; keep decision 8's vendoring rule and drop its last clause's restatement of decisions 1 and 2 (also clears deferred minor T04-1). Must happen before merge: after merge S5(c) freezes both bodies.

I4. commands/fx-retro.md:16-24, skills/fx-retro/SKILL.md:19, skills/fx-debug/SKILL.md:78 · G1 confirmed: nothing reads `docs/issues/`. The only mentions in skills, commands and references are the write line (`skills/fx-debug/SKILL.md:369`), fx-brainstorm's "Issues go to" line and the migration. The reverse index excludes `docs/issues/` by design (`src/lib/doc-index.ts:12`). Missing assertion: a gate that greps a `docs/issues/` read line in fx-retro's `## Read` (both copies) and in fx-debug's "Inputs that shape the loop".

I5. skills/fx-implement/references/completion.md:47 · G4 confirmed: `Docs claim wrong:` ledger lines (`handling-reports.md:11-13`) reach the owner only when the docs step runs. With the step declined or the owner away the completion Docs line lists stale docs only. Missing assertion: the Docs bullet lists every `Docs claim wrong:` ledger line when the step did not run; a text gate on completion.md.

I6. src/lib/doc-evidence.ts:50-51 · G3 confirmed. `kind` is `adr` only under a folder named `adr` or `decisions`; status is superseded only on "superseded by". fx-adr (`skills/fx-adr/SKILL.md:24-25`) accepts a mkdocs-nav folder and keeps the repo's own status words, so a `Deprecated` or `Ignored` ADR, or any ADR in another folder, is returned as a current claim to all seven readers. Missing assertion: parser cases for `Status: Deprecated`, `Status: Ignored` and `## Status` + `Superseded`, in `src/lib/doc-evidence.test.ts`; either a nav-folder case or one sentence in fx-adr and ADR 0063 saying the index recognises only `adr/` and `decisions/`.

I7. src/tests/gates/visual-kit.test.ts:98-99 · G8 confirmed. `kitErrors` covers `references/visual/*` and `skills/fx-architecture/HTML-REPORT.md` only. `skills/fx-docs/html-pages.md` and fx-audit's Phase 4 step (`skills/fx-audit/SKILL.md:303-307`) are outside the host and unlisted-load gate. No assertion checks that the template keeps `fx-theme` storage, the legend, the evidence toggle and no physical `margin-left/right` or `left/right`; `mount` never runs in the test. fx-audit's step does not point at `references/visual/archify-adapter.md`, so its diagrams carry no choice line (story 16). Missing assertions: add both files to the `kitErrors` list; one structural assertion on `page-template.html`; one positive check that HTML-REPORT.md names `page-template.html` and `visual-assets.md`.

I8. skills/fx-docs/SKILL.md:73 · G6 confirmed: branch mode step 3 ("list the docs elsewhere that the change made stale") has no mechanism; step 1 only finds claims citing changed paths. The HTML out-of-date list (`skills/fx-docs/html-pages.md:24-27`) has no place in the report line at :79. Fix: step 3 runs `docs-index stale` and lists every `recheck` claim in docs outside the step 2 set; the report line adds `<n> HTML pages out of date`. Missing assertion: a text gate on both.

### Minor (Nice to Have)

M1. skills/fx-adr/SKILL.md:86-87 · G7 confirmed: "Inside fx-implement: commit the ADR with the task that made the decision" has no path to execution; the only fx-implement ADR hook is `completion.md:46`, after task commits. Drop the sentence, or add a handling-reports line. Fix in the wave (one line).

M2. src/skills/fx-implement/scripts/compile-brief.ts:126 · G9: a `- Delete:` Files line is not queried, so the docs citing a deleted file never reach the implementer. Add `Delete` to the regex and a case in compile-brief.test.ts. Fix in the wave.

M3. skills/fx-docs/SKILL.md:53-54 · G9: a declined `exclude_docs` proposal is not recorded, so it is asked again on every first-run detection. Record it in `.fx.json` as `scratch_migrate` does, or say the question is asked once per full run. Can wait.

M4. src/lib/doc-index.ts:114 · G9: an `owner, <date>` claim is `skip/owner` forever, and none of the new lane behaviours (mkdocs nav, fbrain, three-test offer, flavour, interview skip) is exercised: the lane-triggering bench is on request only. State the owner rule in fx-docs section 5. Can wait.

M5. skills/fx-architecture/SKILL.md:159 and skills/fx-implement/references/completion.md:46 · Both cite `domain-modeling.md` by bare name; every other new pointer uses the relative path. Use `../../references/vocab/domain-modeling.md` (and `../../../references/vocab/...` from completion.md). Fix in the wave.

M6. src/lib/doc-index.ts:25, 44-45 · Named check 4: `writeIndex` writes through a symlinked `.fx/` or `.fx/docs-index.json`, and `listDocs` follows a symlinked `docs/` root (entries below are not followed). fx never creates such links, and the write is fx's own cache, so the risk is low; lstat `.fx` and the file and skip the write when either is a link. Can wait.

M7. skills/fx-docs/SKILL.md:42 · The verified marker records a branch commit. After a squash or rebase merge that commit is unreachable in other clones, and `stalePassOne:116` marks every claim of that doc `unverified`, so pass one frees nothing. Say in fx-docs to rewrite markers after merge, or accept and note it. Can wait.

M8. src/lib/scratch-migrate.ts:46-55 vs commands/fx-setup.md:134-135 · Setup gates the step on Markdown in `.scratch/`, but the script moves every entry, drafts and test material included, into `docs/issues/`, which the owner is then told to `git add`. ADR 0060 decision 3 sends throwaway material to `.fx/`. The dry run shows every move, so nothing is hidden. Move only Markdown issue entries, or say in setup's question that everything moves. Can wait.

## Named checks

1. Coverage gaps:
   - G1: absent, not asserted. Missing: a read line for `docs/issues/` in fx-retro `## Read` and fx-debug inputs, with a grep gate (I4).
   - G3: absent, not asserted. Missing: parser cases for `Deprecated`, `Ignored`, and a non-`adr` folder (or a scope sentence) (I6).
   - G4: absent, not asserted. Missing: completion Docs bullet lists `Docs claim wrong:` lines when the step did not run (I5).
   - G6: absent, not asserted. Missing: step 3 mechanism (`docs-index stale` outside the touched set) and the HTML out-of-date count (I8).
   - G7: sentence present, no execution path, not asserted. Missing: drop it or a handling-reports line (M1).
   - G8: template behaviour present, not asserted; html-pages.md and fx-audit outside the gate. Missing: the two files in `kitErrors`, a structural template assertion, a positive kit reference check (I7).
   - G9: Delete lines not queried (M2); `exclude_docs` decline unrecorded (M3); owner-claim skip unstated, lane behaviour unexercised (M4). None asserted.
2. Rulings G2 and G5: neither built. G2 must change `src/lib/doc-index.ts` (buildIndex, loadIndex:67, stalePassOne:115), `src/scripts/docs-index.ts` (a verify subcommand), `skills/fx-docs/SKILL.md:95` and `src/lib/doc-index.test.ts`; and the store should be tracked, not `.fx/` (I1). G5 must change `skills/fx-implement/references/final-review.md:5-6`, `completion.md:47`, `src/lib/fx-json.ts` and its test, `skills/fx-docs/SKILL.md:99`, ADR 0062 decision 4 (I2).
3. Every SKILL.md under 20,000 bytes: yes (max 19,368). Every new ADR (0059 to 0063) in the fx-adr shape: yes (repo shape, `Status:` line, numbered decisions, evidence lines parse with 0 problems, index rows built from status lines). 0015 by 0061 under S5: 0015 got exactly one added status line (allowed), 0061 has `Supersedes:` and `## Still in force` numbered on from 3; but the replaced item named in 0015 is the rule 0061 decision 8 keeps, and the two quotes differ (I3). Not yet compliant.
4. Unattended migration and symlink writes: nothing runs a migration unattended. The only caller is fx-setup, which dry-runs first, asks once, does nothing with no human and never runs from a subagent (`commands/fx-setup.md:134-146`); no lane, hook or script calls `scratch-migrate.js` otherwise. The migration writes through no symlink: every path it reads or writes is lstat-checked (`src/lib/scratch-migrate.ts:35, 42, 49, 64`), and moving a directory moves a contained link, not its target. One low-risk exception outside migrations: `writeIndex` writes through a symlinked `.fx/` (M6).

## Spec compliance

- ❌ Issues found: rulings G2 and G5 unbuilt (I1, I2); S5 supersession mismatch (I3); design stories 10, 25, 33, 34, 37 partly unbuilt (I4 to I8).
- ⚠️ Cannot verify from the branch: the light, dark and 390 px visual check (ledgered not run, no browser); the lane-triggering bench (on request only); `scripts/check-all` on HEAD (the exit gate reruns it).

## Carried findings triage (22)

- Task 01, fx-retro SKILL.md over the 2,600 estimate: confirmed deferred. Ratified; now 2,854 bytes, far under 20,000.
- Task 01, package-lock.json 0.6.0: resolved. Reads 0.7.0 at lines 3 and 9.
- Task 01, SURFACE.md:235 reference count: resolved. The heading at SURFACE.md:238 no longer carries counts and the tree lists templates and visual.
- Task 02, undo leaves an empty docs/: resolved. `dropMade` removes the directories mkdir created (src/lib/scratch-migrate.ts:88-94).
- Task 02, rollback `sed Ni` no-op on a last line without newline, GNU only: confirmed deferred. The printed rollback is used only when undo itself fails.
- Task 02, ADR 0060 decision 3 omits fx-setup's migration step: must fix before merge. ADR bodies freeze at merge under S5(c); one clause.
- Task 02, fx-debug prevention line rewrap (now SKILL.md:372): confirmed deferred. Cosmetic.
- Task 02, edit and .gitignore steps leave a truncated file and print "undone" when the write fails after open: must fix before merge. A failed step is not undone (`scratch-migrate.ts:156-160`), so CLAUDE.md or .gitignore stays truncated while the tool reports success of the undo; restore `original` in the step's own catch, as the move step does at :101.
- Task 02, failed-move cleanup error masks the move error, no test: confirmed deferred. Fold into the previous fix if the same hands touch :101.
- Task 02, a tracked pointer symlink (CLAUDE.md -> AGENTS.md) blocks the whole migration: confirmed deferred. It refuses safely and says why; skipping a link whose target is itself a candidate is the later fix.
- Task 03, SURFACE.md:237 kit counts and vendored wording: resolved (SURFACE.md:245 lists the new vendor files).
- Task 03, visual-kit.test.ts runs its assertions on import: confirmed deferred. Only a double run.
- Task 03, unguarded JSON.parse in fx-map-1.ts (now :168): confirmed deferred. Malformed data shows a console error instead of the on-page message; no wrong output.
- Task 03, fixed-size map nodes clip long labels: confirmed deferred. Needs the browser check that has not run.
- Task 04, ADR 0061 decision 8 repeats decisions 1 and 2: must fix before merge, as part of I3.
- Task 04, fx-architecture SKILL.md badge row and ADR callout name emerald, amber and slate (SKILL.md:100-101, 124): must fix before merge. With Tailwind removed those names map to nothing in the kit and invite Tailwind classes back; name the kit tokens HTML-REPORT.md uses.
- Task 04, visual-assets.md edited outside the Files list: confirmed deferred. Disclosed and correct.
- Task 05, fence length ignored: confirmed deferred. Rare four-backtick fences.
- Task 05, `stale` and `build` have no process-level test: confirmed deferred. The library functions are tested.
- Task 06, compile-brief docsOut discards docs-index stderr: confirmed deferred. The exit code is reported; the cause is one rerun away.
- Task 06, final-review.md branch-pass text sits under the Docs step heading: must fix before merge. The G5 fix edits these lines anyway; add `## Branch pass` before line 18.
- Task 06, no test for docsOut die paths: confirmed deferred.

Must fix before merge from the carried list: 5 (T02 ADR 0060 decision 3; T02 truncated-file undo; T04 ADR 0061 decision 8; T04 badge colour names; T06 branch-pass heading).

## Recommendations

- Settle I1's store with the owner before coding it: `.fx/` state does not survive into a build worktree, so the ruling as written buys almost nothing.
- Do the ADR text fixes (I3, T02 ADR 0060, any ADR 0062 or 0063 wording from I2 and I6) in one commit before merge; after merge only status lines may change.
- One text gate file can carry the new assertions of I4, I5, I7 and I8.

## Assessment

**Ready to merge?** With fixes.
**Reasoning:** No defect loses owner data on the normal path and the migration is safe by construction, but the two owner rulings (G2, G5) are unbuilt, the first supersession contradicts S5, and five carried minors must land before the ADR bodies freeze.

## Ledger lines

Task 06: minor (deferred): fx-adr says commit the ADR with the task inside fx-implement, but nothing in fx-implement does so (skills/fx-adr/SKILL.md:86-87)
Task 06: minor (deferred): compile-brief does not query paths on Delete Files lines (src/skills/fx-implement/scripts/compile-brief.ts:126)
Task 06: minor (deferred): a declined exclude_docs proposal is not recorded and is asked again (skills/fx-docs/SKILL.md:53-54)
Task 05: minor (deferred): owner-only claims are skipped forever, unstated in fx-docs; new lane behaviour unexercised (src/lib/doc-index.ts:114)
Task 01: minor (deferred): fx-architecture SKILL.md:159 and completion.md:46 cite domain-modeling.md by bare name
Task 05: minor (deferred): writeIndex writes through a symlinked .fx/ and listDocs follows a symlinked docs/ root (src/lib/doc-index.ts:25, 44-45)
Task 06: minor (deferred): the verified marker names a branch commit that is unreachable after a squash merge (skills/fx-docs/SKILL.md:42)
Task 02: minor (deferred): scratch-migrate moves every .scratch entry, drafts included, while setup gates on Markdown (src/lib/scratch-migrate.ts:46-55)
