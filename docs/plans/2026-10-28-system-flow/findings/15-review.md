# Task 15 review: the fx-system-flow lane (815ac07..dc03b54)

### Spec Compliance
- ❌ Issues found: the cross-fragment id contract between the controller's fragments and the area fragments is missing (Important 1).
- ⚠️ Cannot verify from diff: that `fx-authoring` was invoked (step 1); the report names only the skipped pressure tests. The lane has not been run end to end (task 20 owns that).

Named risks, one focused check each:
- CLI flags: `--repo`, `--write`, `--fragment`, `--archify`, `--prefer`, `--page-limit`, `--svg`, `--root` (global, before the subcommand, as area-brief.md writes it), `estimate`, `stale`, `query`, `verify` all exist in src/scripts/system-flow.ts:12 (USAGE) and :25 to :61. `--rebuild` is a lane argument only and is never passed to the CLI. No invented flag.
- Outputs: `output.site`, `output.markdown`, `roots`, `mkdocs.nav`, `mkdocs.excludeDocs`, `archify.dir`, `docsConfig`, `theme` match `Detected` (src/lib/sf-detect.ts:13 to :20); `note` and `warnings` match sf-estimate.ts:52 to :53; `depth.areas[].planned/built` and `depth.total` (primaryNodes, contextNodes, edges, messages, storeRows, chapters) match sf-estimate.ts:61 to :101; `<site>/model/plan.json` is the path build reads (sf-build.ts:125); plan fields match the `Plan` type (sf-estimate.ts:10). Owner evidence `{ owner: <date>, question }` matches `OwnerEvidence` (sf-model.ts:10).
- Schema link `../../references/system-flow/system-model.schema.json` resolves at HEAD (SKILL.md and fragment-guide.md).
- Red-team 3: depth in planning.md (Levels per area, plan file), area-brief.md (Depth rules, Return line 2), check-and-report.md (Depth table from `depth.areas`, totals from `depth.total`). Red-team 4: fragment-guide.md Ids, "Every node id starts with its area id and a dash". Red-team 11: planning.md Fragments written now, `meta.roots` copied from detect's roots ids, host first. Red-team 22: SKILL.md step 1 "The build command" passes `--archify <archify.dir>` when detect found one.
- Ruling 25: interview.md Gather holds "Every question carries a recommended answer", asserted in user-invoked.test.ts.
- Area subagents never invoke the lane: SKILL.md Boundary and area-brief.md You own.
- SKILL.md is 9,240 bytes; sidecars cite only `../../references/...` leaves and the schema, one level deep.
- Conformance rows 09 (EXPECTED 22 to 23, hidden list), 13 and 14 (hidden lists, "eight" to "nine") are the minimum.
- Ran in scratch: `opencodeCommands(root, '/DEST')['fx-system-flow'].template`; the base-directory sentence is replaced and every sidecar, the schema and the bare `../../` become `/DEST/...`. The lane's CLI commands need a repo with a model and were not run.

### Strengths
- Every flag and output field traces to code at HEAD; the build command is defined once and reused, so `--archify` and `--prefer` cannot be dropped on a later build.
- The stop table lists every wait point; the planning stop, the interview opening sentence and the depth report are each stated once with no escape wording. The zero-questions case is explicit.
- gen-command-skills generalises fx-audit's one-off into a `HAND_WRITTEN` list instead of copying it; `SKILL_PATH_RE` gains one alternative, and the opencode test proves each rewritten sidecar path exists.

### Issues
#### Critical (Must Fix)
None.

#### Important (Should Fix)
1. skills/fx-system-flow/SKILL.md step 3 ("While subagents run, the controller writes its own fragments", `level0.json` and `chapters.json`) with area-brief.md You own and planning.md The plan file: no one fixes the ids the two sides must share, and the order guarantees early failures. `check --fragment` checks the merged model and reports, against the area file, a sequence or store flow whose `chapter` names a missing section (src/lib/sf-rules.ts, "names a missing chapter"). When a subagent writes before `chapters.json` exists, its check fails on a problem it cannot fix from the code, and it burns its 2 fix rounds or rewrites chapter ids by guess. The slice passes "its chapters with their questions" but `plan.json` holds only a chapter count, so the section ids are not stated. In the other direction, the level-0 node's `children` must name the area's level-1 diagram, whose `parent` must be the level-0 diagram id (sf-rules.ts:40 to :43). Neither id is in the plan or the slice, so the controller's "checked until it exits 0" on `level0.json` cannot pass while areas are still out. The controller has nothing to do but loop or invent the ids. Fix: write `chapters.json` and `level0.json` in step 2 or before the first dispatch (with planned area level-1 ids such as `<area>-l1`), and put the section ids, the level-0 diagram id and the area's level-1 diagram id in the slice the area brief names.

#### Minor (Nice to Have)
1. skills/fx-system-flow/area-brief.md Check: "Fix each from the code" gives no rule for a problem that names another file. With up to 4 subagents writing at once, `check --fragment` exits 1 on another fragment's load or merge problem (sf-build.ts:61, the filter at :78 runs only after those pass). One line ("a problem naming another file: report it in your return, do not edit that file") closes it.
2. tests/conformance/rows/13-audit-lane-not-model-facing.sh: the edited comment block still says "skill.list holds all 20"; the count is now 23.

### Assessment
**Task quality:** Needs fixes
**Reasoning:** The lane names only real flags and outputs and covers every named risk, but it dispatches area subagents before the shared chapter and diagram ids exist. Their checks then fail for reasons the brief gives them no way to fix.

## Ledger lines
Task 15: minor (deferred): area-brief.md gives no rule for a check problem that names another fragment file.
Task 15: minor (deferred): conformance row 13 comment still says skill.list holds all 20 skills.
