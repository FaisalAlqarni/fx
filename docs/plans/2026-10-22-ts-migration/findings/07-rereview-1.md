# Task 07 re-review, fix round 1

Scope: review Importants 1 and 2 and lens Minors 1 to 5, against the fix diff ae1ef55..6300bb5 (one commit, 6300bb5). Controller rule applied: on malformed input, today's behaviour wins, so a string skill resource must be refused.

Evidence run, read-only, with scratch copies under the session scratchpad:
- `node lib/opencode-malformed.test.js` at 6300bb5 prints `opencode-malformed tests passed`, exit 0.
- The same built test copied into a `git archive d7ce641` tree passes against the old JavaScript plugins, exit 0. Its expectations match today's plugins.
- The same test copied into a `git archive ae1ef55` tree fails with `0 !== 1` on the first v1 config case. The test pins the regression the review reported.
- I did not rerun the suite, the install runs or check-all.

### Finding verdicts

Review Important 1 (v1 `applyConfig` turned malformed values into `{}` and granted task and depth): ADDRESSED.
- src/plugins/fx-opencode-v1.ts:150-156: `asRules` keeps a truthy non-object value in the config and throws a TypeError for `permission` and `permission.skill`, after the same assignments the old code made before its strict-mode throw.
- src/plugins/fx-opencode-v1.ts:200-201: a truthy non-object `agent.general` stays in place and throws before any `task` grant, depth raise or command registration.
- I compared this against d7ce641 plugins/fx-opencode-v1.js:127-130 and :173-174. In ESM strict mode, writing to a primitive throws at the same point, so the config state after the throw matches.
- src/lib/opencode-malformed.test.ts:19-41 asserts, for six malformed configs, one reported config error, no `subagent_depth`, no `command` and an unchanged `agent`. A well-formed config still gets depth 2.

Review Important 2 (v2 string skill resource allowed; null `execute.before` event let a call through): ADDRESSED.
- (a) src/plugins/fx-opencode-v2.ts:199 throws when `resources` is truthy and not an array. The catch at :204-210 records "evaluate failed" and denies a hidden lane named by the wrapped string. This matches the old catch at d7ce641 plugins/fx-opencode-v2.js:164-168. Test src/lib/opencode-malformed.test.ts:73 asserts `deny` for a string naming `fx-grill`. Lines 74-76 assert allow plus one report for other non-list values, as the old plugin behaved.
- (b) src/plugins/fx-opencode-v2.ts:222 throws when the raw event is null or undefined, before the tool check, which is where the old `ev.tool` read threw. Other non-objects return, as before. Test lines 94-97.

Lens Minor 1 (v2 null or non-object event proceeds before the evaluateError throw): ADDRESSED, by the same change as Important 2(b), src/plugins/fx-opencode-v2.ts:220-224. A number event still returns, which is today's behaviour (the old `(42).tool` read gave undefined).

Lens Minor 2 (v1 truthy non-object `agent.general` granted `task`): ADDRESSED. src/plugins/fx-opencode-v1.ts:200-201 throws into the config step's catch, so nothing is granted. This follows the controller rule (old throw path), not the lens's suggestion to skip the grant silently. The test asserts the report and that `agent` is unchanged.

Lens Minor 3 (`attempt` caught only native Promise rejections): ADDRESSED. src/plugins/fx-opencode-v2.ts:93-94 adds `isThenable`, and :132 wraps any thenable in `Promise.resolve(r).catch(report)`. No test covers it, which is acceptable for a Minor.

Lens Minor 4 (comment said only shell is denied without the parser): ADDRESSED. src/plugins/fx-opencode-v2.ts:49-50 now says execute.before refuses every tool call and execute.after cannot forget what was recorded, which matches :218.

Lens Minor 5 (export-less plant-roles or hidden list makes evaluate throw outside every try): ADDRESSED. src/plugins/fx-opencode-v2.ts:76 and :104 check that `USER_INVOKED_LANES` and `READ_ONLY_AGENTS` are arrays at load. The fixer also added the same check for `render` (:33), `inspect` (:43) and `parseOpencodeToolEvent` (:55). An export-less module now takes the same path as a module that throws on load.

### New breakage

Critical: none. Important: none.

Minor 1. src/plugins/fx-opencode-v1.ts:71-73: the fix report says `parseOpencodeToolEvent` is now checked at load, but that check landed in v2 only. v1 loads `parseOpencodeV1Call` with no type check. An export-less lib/opencode-input.js still refuses every call (:267), and its message reads `(undefined)`. This is the v1 half of review Minor 4, which this round marked as handled. The report overstates it, and no behaviour changed.

Minor 2. src/plugins/fx-opencode-v2.ts:101-105, an out-of-scope observation: with the new array check, an export-less lib/plant-roles.js now leaves `READ_ONLY` empty and quiet at load. Before, evaluate threw. The read-only re-imposition in evaluate (:153) is then skipped. A plant-roles module that throws on load already did this before the port. The agent step (:260-264) still fails and reports, so fx's read-only agents are not registered, which leaves little exposure. This is consistent with today's thrown-load path. A later task could fail closed for read-only agents when that list is missing.

Not reviewed: review Minors 2, 3 and 5, which the fixer also touched. The diff hunks for them (:183-193 edit resources, :240 after-event notice) match today's behaviour on the inputs the test covers. Review Minors 1 and 6 stay deferred, as the controller ruled.

## Ledger lines
Task 07: fix round 1/5 (7 addressed, 0 open: v1 malformed config throws into the config catch, v2 string skill resource denied and null before-event refused, thenable attempt, comment, export checks; commits ae1ef55..6300bb5)
Task 07: minor (deferred): v1 loads parseOpencodeV1Call with no type check, so an export-less parser still gives an "(undefined)" refusal message; the fix report claims it is checked.
Task 07: minor (deferred): an export-less or throwing lib/plant-roles.js leaves v2 READ_ONLY empty, so evaluate skips the read-only re-imposition (pre-existing on the throw path).
