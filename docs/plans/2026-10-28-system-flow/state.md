# fx ledger: plan: docs/plans/2026-10-28-system-flow/plan.md

## Standing rulings

(none: docs/plans/rulings.md does not exist)

## Log

Setup: worktree /development/fx/.worktrees/system-flow on system-flow, plan dir committed 44278de. Controller on the most capable tier. Capable because: controller for a 21-task build.
Setup: .fx.json read: setup scripts/setup, test_scope scripts/check-generated && scripts/test-scope {paths}, test_all scripts/check-all. Pre-flight scan delegated to one read-only agent (deviation: keeps 176 KB of task text out of the controller context); table at .fx/2026-10-28-system-flow/preflight.md, rulings below.
Waiting: pre-flight scan agent outstanding; task 01 dispatch follows its rulings.
Setup: scripts/setup ran in the scratch env (npm ci ok). Scratch root for every command: /tmp/claude-1000/sf-build (tmp, home, npm created).

### Pre-flight rulings (table: .fx/2026-10-28-system-flow/preflight.md; numbers are its "Needs ruling" items)

Ruling: every task runs its commands as `TMPDIR=/tmp/claude-1000/sf-build/tmp HOME=/tmp/claude-1000/sf-build/home npm_config_cache=/tmp/claude-1000/sf-build/npm scripts/scratch-env <command>`; never type rm, trap, bash -c or sh -c; python3 -I only; nothing written under /home/faisal or /mnt. Why: owner rules; the scratch folders exist (item 35). Cost if wrong: a test fails on a missing folder, caught by the implementer's first run.
Ruling: (1) sfFixture runs `git init -q -b main` for the git roots, tasks 01 and 13. Why: git 2.43 in a scratch HOME defaults to master and task 13 diffs against main. Cost if wrong: task 13 RED for the wrong reason, caught by task 13's review.
Ruling: (2) task 01's tests give every added item (node turn, group g1, store rows, sequence turn, second edge) evidence citing app/x.rb lines 1-4 symbol Link, give node turn an edge, and give sequence turn `chapter: "s1"`, so tasks 02 and 03 need no change to task 01's tests. Why: 02's orphan and chapter rules and 03's verifier would otherwise break 01's cases. Cost if wrong: test churn in 02 and 03, caught by their reviews.
Ruling: (3) an edge resolves its from and to among nodes of its own diagram (tasks 02 and 03); task 03's `--fragment` case becomes engine.json holding sequence turn with `chapter: "s1"` from chapters.json, plus the bad range in level0.json. Why: a diagram lives in one fragment. Cost if wrong: a cross-fragment edge rejected, caught by task 18's smoke run.
Ruling: (4) task 04's Mermaid escape is one pass `s.replace(/[#;:"]/g, map)` then line breaks to a space; expected output unchanged. Why: sequential replaces double-escape. Cost if wrong: one test, caught by task 04's review.
Ruling: (5) task 04's table-cell test splits the row on unescaped pipes (`/(?<!\\)\|/`) and expects 5 cells, without parseDoc. Cost if wrong: a weaker test, caught by task 04's review.
Ruling: (6) task 04 stamping: every item citing the host carries verified.backend equal to host HEAD; b2, citing only guide, carries only verified.guide. Cost if wrong: stale miscounts in task 13, caught by task 13's review.
Ruling: (7) task 04's sf-markdown escapes &, < and > in prose and table text outside code spans, with one test using a `<script>` label. Why: a repository string must never become HTML in Markdown. Cost if wrong: an injection in generated docs, caught by the final branch review.
Ruling: (8) the CLI output contract has two forms: a problem tied to a file is `<file>:<pointer>: <message>`; one with no file (usage included) is `system-flow: <subcommand>: <message>`; warnings use the same two forms; applies to tasks 01, 03, 06, 13, 14 and 17. Why: some problems have no file. Cost if wrong: inconsistent stderr, caught by the final branch review.
Ruling: (9) the site keeps `assets/`; task 08 words its output-root row and one copy-rule sentence as the site's exception to `../_assets/`; task 10's renderPage rewrites the template's `../_assets/` prefix to `assets/`, swaps fx-map-1.js for fx-map-2.js and adds fx-flow-1.js and theme.css; task 11 follows the same prefix. Cost if wrong: broken asset links, caught by task 18's visual check.
Ruling: (10) task 10 writes other-root evidence in map data as `@<root id>/<path>`, as the Markdown does (tasks 08 and 10). Cost if wrong: unclickable evidence, caught by task 18.
Ruling: (11) task 09 adds a separate `renderCoverage(coverage)` rather than widening renderMarkdown. Why: smaller change, no caller churn. Cost if wrong: none material, caught by task 09's review.
Ruling: (12) `pickLine(name, label: 'archify architecture' | 'archify sequence' | 'static SVG' | 'animated SVG', detail)`; the line reaches the user as BuildResult.diagrams[].reason since stdout is one JSON object (tasks 11 and 12). Cost if wrong: lost diagnostics, caught by task 12's review.
Ruling: (13) the schema-subset validator skips `$defs`, `$id`, `$schema`, `title` and `description` (it only serves `$ref`), tasks 01 and 11. Why: task 01's schema and archify 3.2.0's schemas use them. Cost if wrong: schema load errors, caught by task 11's fixture tests.
Ruling: (14) task 11's archify viewBox is `[max(320, width), max(240, height)]`. Why: archify's schema minimum. Cost if wrong: finalize rejects specs, caught by task 18.
Ruling: (15) task 11 drops the "35 and 80" label limits; archify's schema gives label only minLength 1. Cost if wrong: long labels overflow, caught by task 18's visual check.
Ruling: (16) task 12's applyThemeBlock maps theme slots onto archify's own variable names (--text, --text-muted, --arrow, --lane-stroke and the rest) through a fixed table ported from system-flow's apply-theme.mjs (read only from /mnt); its test asserts archify's --text equals the theme's --ink in both themes. Why: the block otherwise changes nothing on archify pages. Cost if wrong: unthemed diagrams, caught by task 18's visual check.
Ruling: (17) the CLI passes `--receipt <site>/diagrams/<name>.receipt.json` to every archify finalize call and task 12's Calls test asserts it (tasks 12 and 18). Cost if wrong: receipts beside specs, caught by task 18.
Ruling: (18) task 12's build merges its flags in memory, uses them, and writes system_flow.diagrams with the stamps, last and only on success. Cost if wrong: a failed build persists choices, caught by task 12's review.
Ruling: (19) task 12's fake archify fails a spec whose name equals a listed name or starts with it followed by `-p`. Cost if wrong: retry test misses paged specs, caught by task 12's review.
Ruling: (20) task 13 builds its own model: no b1, node db with `unconfirmed: true` and `evidence: []`. Why: the good set makes 13's expected outputs wrong. Cost if wrong: test churn, caught by task 13's review.
Ruling: (21) task 13's unbased case creates `<base>/third` with `git init -q -b main` and one commit, mapped in .fx.json and meta.roots, cited by no item. Cost if wrong: one test, caught by task 13's review.
Ruling: (22) task 13's staleItems returns `{ handle, reason }` (task 19 reads the CLI output). Cost if wrong: fx-docs text mismatch, caught by task 19's review.
Ruling: (23) task 13 adds one assertion that `query app/y.rb` on a model with two link-to-db edges lists edge:system:link>db and edge:system:link>db#2 (task 01's count stays). Cost if wrong: none material.
Ruling: (24) task 14's signature is `depth(model, items, plan, origin)` using task 02's origin map, which must include diagram: and seq: handles (tasks 02 and 14). Cost if wrong: depth per fragment wrong, caught by task 14's review.
Ruling: (25) task 15's sidecar text test also requires `Every question carries a recommended answer` in interview.md. Cost if wrong: none material.
Ruling: (26) task 17's node api edit carries a corrections entry naming node:api, as the b1 case does. Why: task 16's corrections check fires otherwise. Cost if wrong: test fails, caught by task 17's implementer.
Ruling: (27) task 18 uses `<SCRATCH>/smoke-<date>-1/claude-config` with SCRATCH=/tmp/claude-1000/sf-build. Cost if wrong: none material.
Ruling: (28) task 19 keeps `Docs: <n> updated, <n> written, <n> listed stale, <n> HTML pages out of date` for the Markdown path. Why: docs-lanes.test pins it and HTML pages stay for repos without a model. Cost if wrong: gate failure, caught by test_scope.
Ruling: (29) task 19's commit drops skills/fx-docs/full-run.md from the git add list; git rm already staged it. Cost if wrong: aborted git add, caught by the implementer.
Ruling: (30) fx-adr is not installed in the running fx 0.2.9, so task 19's implementer cannot invoke it; it writes ADR 0066 following the worktree's docs/adr format and the existing index, and reads skills/fx-adr (the skill under construction in this repo, not an installed lane) as the format reference. Why: no other path writes the ADR inside this build. Cost if wrong: ADR format drift, caught by task 19's review and the docs-index gate.
Ruling: (31, 32, 33) recorded here as deviations, no file edit: task 19's report may use the term `inventory added`; ids are unique per kind (plan Global Constraints, reversing design "Fragments and merge"); "`<` inside inline JSON is written `<`" in plan.md and design.md means the JSON escape `<` (task 10). Cost if wrong: a reader of design.md sees the old text, caught by the final branch review.
Ruling: (34) tasks 20 and 21 prep create `<scratch>/home/.claude`, copy `.credentials.json` mode 0600 and archify into it; the controller deletes the credential copy with `find <path> -delete` after the results step. Why: owner rule. Cost if wrong: a credential copy left in /tmp, caught by the controller's run step.
Ruling: (36) small text fixes: task 02 may touch src/lib/sf-model.ts; task 04's BuildResult filler list includes tasks 07 and 09; task 16 reads "drawn by task 10"; task 09's "five entries" means the good fixture set's merged model. Cost if wrong: none material.
Ruling: (37) every archify spec from task 11 carries `meta.quality_profile: "showcase"` to match `--quality showcase` (tasks 11 and 18). Cost if wrong: finalize rejects, caught by task 18.
Ruling: (38) the two renderers (fx-flow-1.js in page, SVG fallback in task 11) stay separate (tasks 08 and 11). Why: smaller change. Cost if wrong: two drawers to maintain, caught by the final branch review.
Ruling: briefs compile with the worktree's skills/fx-implement/scripts/compile-brief, since the installed 0.2.9 copy matches only ## headings and every task's Design line names ### sections. Why: the installed script exits 2 on every task. Cost if wrong: none material, caught by brief size checks.
Task 01: dispatched 0749988 2026-10-28T03:25:46+03:00
Task 01: implementer agent a5c8da9a092eaa0b7 (opus, Capable because: foundational schema and fixture). Waiting on it; frontier empty (every task blocks on 01).
Task 01: DONE_WITH_CONCERNS, commits 0749988..8b4284f. Completion notice reached the main session, not this controller; resumed by the coordinator.
Ruling: task 01 concern 1: task 07's file line 40 held a `url` call with an open parenthesis inside a code span, which check-prose counts as an open parenthesis; the controller reworded it to "`url` function" (plan text, no meaning change). Cost if wrong: none, caught by check-prose.
Ruling: task 01 concern 2: evidence optional in the schema stands only because task 02 enforces "evidence unless unconfirmed" per evidenced kind (red-team finding 2); task 02's review must check every evidenced kind. Other concern-2 choices (rule.decision string, layout and verified as untyped objects, first scalar wins) stand. Cost if wrong: an unevidenced item passes, caught by task 02's review.
Ruling: task 01 concern 3: the schema-subset validator throws on unsupported keywords; task 11 adds every keyword archify 3.2.0's schemas use (pre-flight item 13 lists them) or extends the skip list. Cost if wrong: task 11 fixture tests throw, caught by task 11's implementer.
Ruling: fx main moved to 6e2d88b (0.8.0, codex-catalog merged with ADR 0065); this branch keeps ADR 0066 and the controller merges main into system-flow before the final review, resolving the version so the release gate passes (tasks 01 and 19). Cost if wrong: release-version gate fails, caught by the exit gate.
Task 01: lens silent-failure not dispatched: the reported catches turn invalid JSON into exit-1 problems and print thrown errors, neither swallows, so the tripwire cell (a handler that swallows) does not match; the task reviewer may flag otherwise. Cost: unavailable (no transcript recorded). Review package .fx/01/review/0749988..8b4284f.diff.
Task 02: dispatched eec4737 2026-10-28T10:36:43+03:00
Task 02: implementer agent adb5dd8bab4584e35 (sonnet). Waiting: task 01 review (ad04607a79fd36205) and task 02 implementer outstanding; return channels docs/plans/2026-10-28-system-flow/findings/01-review.md and .fx/2026-10-28-system-flow/reports/02-structure-rules-and-caps-report.md.
Task 01: minor (deferred): newer schemaVersion check runs only after schema errors are empty, so a v2 fragment with new keys reports property errors instead of the version message
Task 01: minor (deferred): ID_PATTERN in sf-model.ts duplicates the schema pattern with no test tying them together
Task 01: minor (deferred): misindented lines in system-model.schema.json (rule.adr, bullet.evidence, question.recommended) and the `isObject` arrow in sf-schema.ts
Task 01: minor (deferred): isObject helper defined twice in sf-model.ts and sf-schema.ts
Task 01: review 0/1/4, findings docs/plans/2026-10-28-system-flow/findings/01-review.md. Open: Important 1 (inherited keys such as constructor and __proto__ bypass additionalProperties and required; mergeInto can write onto Object.prototype). The ⚠️ (check-all not green) is resolved by the controller's task 07 text fix at eec4737; check-prose now passes.
Ruling: task 01's fix round 1 waits for task 02's implementer to finish, then resumes task 01's implementer (a5c8da9a092eaa0b7) on the same files. Why: two writers on sf-model.ts at once would collide. Cost if wrong: task 02 builds briefly on the unfixed validator, caught by task 01's re-review.
Task 01: fix round 1 dispatched to a5c8da9a092eaa0b7 at HEAD f55634a (fix base for re-review is f55634a).
Task 02: DONE_WITH_CONCERNS eec4737..f55634a. Concern 1 (check-prose on controller files) fixed by the controller: lone parentheses in code spans in state.md and findings/01-review.md reworded. Concern 2 (task 01's engine() helper moved to a node inside its diagram, count 6 to 7) accepted under ruling 3.
Task 02: reviewer a6a20b2c16eac1455 dispatched (sonnet), findings docs/plans/2026-10-28-system-flow/findings/02-review.md; lens none (Tripwires: none). Waiting: task 01 fix round 1 and task 02 review; no next implementer until task 01's fix lands (shared files).
Task 02: minor (deferred): dash ban skips object keys and reports merged array index for primitive arrays from two fragments.
Task 02: minor (deferred): Arabic warning covers only the label field, not role, title or name.
Task 02: review 0/0/2 spec ✅. ⚠️ (test-scope and check-prose not re-run green) resolved: check-prose passes after the controller's ledger fix; test_scope runs at the exit gate. Store rows tested via the sql table, the other four share the same loop: accepted.
Task 02: cost unavailable (no transcript recorded)
Task 02: complete (commits eec4737..f55634a, review clean)
Waiting: task 01 fix round 1 (a5c8da9a092eaa0b7); task 03 waits for it because both edit sf-model.ts.
Task 01: fix round 1 DONE_WITH_CONCERNS f55634a..4ebe3b3: Important 1 fixed per the implementer; install-opencode gate fails "skill fx-system-flow linked" because skills/fx-system-flow/ has no SKILL.md until task 15.
Ruling: tests/install/run.sh skips a skills folder that holds no SKILL.md, matching the installer, which already skips such folders; task 01's implementer makes the one-line change in the same fix series (tasks 01 and 15). Why: leaving check-all red until task 15 blinds 14 tasks' gates, and the plan's LOW risk says to add the exception the gate allows. Cost if wrong: a skill folder that loses its SKILL.md goes unnoticed by the install test, caught by the skill-size and user-invoked gates, which also iterate SKILL.md files.
Task 01: fix round 2 dispatched (option b, run.sh) to a5c8da9a092eaa0b7 at 4ebe3b3; re-review covers f55634a..<round 2 head> as one scoped re-review of rounds 1 and 2. Waiting on it.
Task 01: fix round 2 BLOCKED 4ebe3b3..27de8fa: run.sh skip landed, but conformance row 09 pins EXPECTED=22 and requires a SKILL.md in every skills folder, so check-all still fails on the bare skills/fx-system-flow/.
Ruling: the model schema lives at references/system-flow/system-model.schema.json for good, not under skills/fx-system-flow/; every task that names the schema path uses the new one, and task 15's lane links it as ../../references/system-flow/system-model.schema.json. Task 01's implementer moves it, updates SCHEMA_FILE and every reference, and reverts its run.sh skip, which the move makes unnecessary; skills/fx-system-flow/ first appears with task 15's SKILL.md (tasks 01 and 15, every task naming the schema). Why: row 09 deliberately requires a SKILL.md per skills folder, and weakening it in six places is worse than a path change. Cost if wrong: the design's "schema beside the lane" wording is off by one folder, caught by task 15's review.
Ruling: superseded: the run.sh skip ruling above; reverted by the schema move.
Task 01: fix round 3 dispatched (schema move to references/system-flow/, revert run.sh) at 27de8fa. Waiting on it; a watcher tracks the commit.
Task 01: fix rounds 1 to 3 DONE f55634a..abf752f; check-all ALL GREEN per the implementer. Scoped re-review dispatched over f55634a..abf752f.
Task 03: dispatched abf752f 2026-10-28T10:52:37+03:00
Task 03: implementer aad0776005eb22346 (sonnet). Waiting: task 01 re-review (aaabd878890ee5d4e) and task 03 implementer.
Task 01: fix round 3/5 (1 addressed, 0 open: none; commits f55634a..abf752f)
Task 01: minor (deferred): mergeInto drops a `__proto__` key silently; unreachable via the CLI because the validator rejects it first
Task 01: minor (deferred): brief 02 (.fx/2026-10-28-system-flow/briefs/02.md:113) still names the old skills/fx-system-flow/ schema path, now references/system-flow/
Task 01: cost unavailable (no transcript recorded)
Task 01: complete (commits 0749988..abf752f, review clean after 3 fix rounds)
Task 01: guarantee: check-all ALL GREEN at abf752f per the implementer's round 3 report (748 lines read).
Task 03: DONE_WITH_CONCERNS abf752f..5f8487e (check-all ALL GREEN per implementer). Concerns are observations: optional Root.missing, task 01 fixture line gains output.markdown, fx-json test RED not captured separately; passed to the reviewer.
Task 03: reviewer dispatched (sonnet), findings findings/03-review.md, security named-risk check added since the verifier reads agent-supplied paths.
Task 04: dispatched 5f8487e 2026-10-28T11:06:12+03:00
Task 04: implementer a5c1b53dda83043cc (sonnet). Waiting: task 03 review (af6e26aa08b71243d) and task 04 implementer.
Task 03: minor (deferred): fx-json test written without its own captured RED run.
Task 03: review 0/1/1, Important: non-git root evidence paths with .. escape the root in sf-evidence.ts readCited and folderExists (missed security tripwire). Fix round 1 to the original implementer; security lens dispatched on the task diff per the missed-tripwire rule.
Task 03: security lens not dispatched after all: its tripwire cell (auth, secrets, routes, request-param records, user-supplied URL, string-built SQL or shell) does not match a file path from a fragment; the branch pass can run it. Fix round 1 dispatched to aad0776005eb22346 at 5f8487e.
Task 03: fix round 1/5: controller re-review (15 lines): 1 addressed, 0 open
Task 03: test_scope after the fix did not finish because task 04's uncommitted files were in the tree; the evidence and rules tests pass per the fix report. The exit gate's check-all covers it.
Task 03: cost unavailable (no transcript recorded)
Task 03: complete (commits abf752f..3e85a0a, review clean after 1 fix round)
Waiting: task 04 implementer (a5c1b53dda83043cc); task 06 is on the frontier but implementers run serially.
Task 04: DONE_WITH_CONCERNS 3e85a0a..e289dab, test_scope ALL GREEN per implementer. Concerns: build test written after the code (RED shown only as exit 2 against the old CLI), only and archify flags accepted and ignored (tasks 12 and 17 own them), partial writes survive a mid-build failure. Passed to the reviewer.
Task 04: reviewer dispatched (sonnet), findings findings/04-review.md.
Task 06: dispatched 460bdd0 2026-10-28T11:15:17+03:00
Task 06: implementer ab92dc322a3ba5f94 (sonnet). Waiting: task 04 review (ab755dcd26ab79e1e) and task 06 implementer.
Task 04: minor (deferred): stampVerified writes fragments one by one, not atomically.
Task 04: minor (deferred): prose escapes only ampersand, angle brackets; backticks and leading list or heading markers pass through.
Task 04: minor (deferred): Mermaid participant ids and from/to are unescaped, an id like end would break the diagram.
Task 04: minor (deferred): docs-index skips any host path starting with at-sign as other-root.
Task 04: minor (deferred): rules-in-force.md and coverage.md are not generated yet.
Task 04: review 0/1/5 spec ✅ (reviewer wrote "## Ledger", not "## Ledger lines"; 5 minors copied by line range, count matches). Open: Important 1, the build test was written after the code; escape, collision, marker and stamp-last assertions never seen failing. ⚠️ (second build changes no byte rests on reading) folds into the same fix: the mutation check runs the test.
Ruling: task 04's fix round 1 is a mutation check, not new code: the implementer breaks the escape, stamp-last, collision and marker behaviours one at a time, shows the named assertion fail, restores, and records it in the report. It waits for task 06's implementer to finish because both rebuild the same tree. Cost if wrong: weak tests stay, caught by the controller re-review of the fix report.
Task 04: fix round 1 (mutation check) dispatched to a5c1b53dda83043cc at 64a6c4e.
Task 06: DONE 460bdd0..64a6c4e, test_scope ALL GREEN per implementer; untested: VitePress at host root, missing .fx.json root.
Task 06: reviewer a69919b230580624a dispatched (sonnet), findings findings/06-review.md. Waiting: task 04 fix round 1 and task 06 review; next implementer waits for task 04's mutation round to leave the tree clean.
Task 06: minor (deferred): an absolute mkdocs docs_dir would be written into .fx.json as an absolute output path.
Task 06: minor (deferred): the detect tests do not pin that --write keeps system_flow.theme, diagrams and existing root paths.
Task 06: review 0/0/2 spec ✅; ⚠️ (tests not re-run) accepted on the implementer's evidence, exit gate reruns them.
Task 06: cost unavailable (no transcript recorded)
Task 06: complete (commits 460bdd0..64a6c4e, review clean)
Waiting: task 04 fix round 1 (mutation check); task 07 next once the tree is clean.
Task 04: fix round 1/5: controller re-review (0 lines): 1 addressed, 0 open
Task 04: cost unavailable (no transcript recorded)
Task 04: complete (commits 3e85a0a..e289dab, review clean after 1 fix round; TDD order slip on record)
Task 05: dispatched 1c60d86 2026-10-28T11:23:33+03:00 (opus, Capable because: the plan's HIGH layout risk, porting variant search and crossing reduction)
Task 05: implementer a47425ca0110e8261. Waiting on it; return channel .fx/2026-10-28-system-flow/reports/05-figure-layout-and-report-report.md.
Task 05: DONE_WITH_CONCERNS 1c60d86..9005697; parity with system-flow on parser-stages and K(3,3), K33_CAP 2. Concerns: one task 04 test assertion changed (layout no longer empty), figure-spec checks call layoutAll directly, fallback label placer not ported. Passed to the reviewer.
Task 07: dispatched 9005697 2026-10-28T11:39:59+03:00
Task 05: reviewer a1725e0f21cf99ada. Task 07: implementer af06218e104dca006 (sonnet). Waiting on both.
Task 05: minor (deferred): figure-spec tests call layoutAll directly, not through the CLI seam, until a later task emits specs.
Task 05: minor (deferred): label fallback placer not ported, so unlabelled may exceed system-flow on crowded figures.
Task 05: minor (deferred): task 04 build test assertion edited to the three figure keys, outside this task's file list.
Task 05: review 0/0/3 spec ✅; ⚠️ (system-flow numbers measured by the implementer on a scratch copy, not re-measured) accepted; task 20 measures layout on a real repo.
Task 05: cost unavailable (no transcript recorded)
Task 05: complete (commits 1c60d86..9005697, review clean)
Waiting: task 07 implementer.
Task 07: DONE_WITH_CONCERNS 9005697..849d93f, check-all ALL GREEN per implementer. Concerns: BuildResult.theme nullable, task 06 detect test now expects the fx theme, build() takes docsDir to avoid an import cycle. Passed to the reviewer.
Task 08: dispatched 849d93f 2026-10-28T11:49:27+03:00
Task 07: reviewer aea5d123f26465ea5. Task 08: implementer a186251f623472e51 (sonnet). Waiting on both.
Task 07: minor (deferred): Material colour lookup uses a plain object, so names like constructor give NaN; use Object.hasOwn.
Task 07: minor (deferred): Tailwind hex regex accepts 4 and 5 digit values that reach theme.css for slots outside the checked pairs.
Task 07: minor (deferred): contrast is rounded before the threshold test, so 4.496 passes as 4.5.
Task 07: minor (deferred): no test proves a Tailwind config is never executed, and no direct contrast edge tests.
Task 07: review 0/0/4 spec ✅.
Task 07: cost unavailable (no transcript recorded)
Task 07: complete (commits 9005697..849d93f, review clean)
Waiting: task 08 implementer.
Task 08: DONE_WITH_CONCERNS 849d93f..a795cc4; kit rendering unverified in a browser until task 18's visual check; Show all arrows off narrows to the selection (implementer's choice). Passed to the reviewer.
Task 09: dispatched a795cc4 2026-10-28T11:59:31+03:00
Task 08: reviewer aece3cab8f9533e79. Task 09: implementer a548774819f9fda86 (sonnet). Waiting on both.
Task 08: minor (deferred): Show all arrows toggle is a no-op with no selection and still reports aria-pressed false.
Task 08: minor (deferred): fx-flow-1 SVG has a fixed width attribute; confirm it shrinks at 390 px in the visual check.
Task 08: review 0/0/2 spec ✅; browser rendering deferred to task 18's visual check.
Task 08: cost unavailable (no transcript recorded)
Task 08: complete (commits 849d93f..a795cc4, review clean)
Waiting: task 09 implementer.
Task 09: DONE a795cc4..ffeb246, test_scope ALL GREEN per implementer.
Task 10: dispatched ffeb246 2026-10-28T12:05:59+03:00
Task 09: reviewer af371519ac030ba73. Task 10: implementer ae13f7a1b0dfed47c (sonnet). Waiting on both.
Task 09: minor (deferred): coverage uses meta.roots[0] as the host id while checkRuleAdrs uses the root flagged host; align them.
Task 09: minor (deferred): rules-in-force.md ADR link target is not percent-encoded.
Task 09: minor (deferred): no test for a rule whose ADR root is missing (skipped by checkRuleAdrs).
Task 09: review 0/0/3 spec ✅; ⚠️ (tests not re-run) accepted, exit gate reruns.
Task 09: cost unavailable (no transcript recorded)
Task 09: complete (commits a795cc4..ffeb246, review clean)
Waiting: task 10 implementer.
Task 10: DONE_WITH_CONCERNS 642d177..e651fa4, test_scope with check-all ALL GREEN per implementer. Concerns: the copy step leaves existing assets alone without reporting a checksum mismatch; the test asserts 9 asset names where the brief says seven table files. Passed to the reviewer.
Task 11: dispatched e651fa4 2026-10-28T12:13:42+03:00
Task 10: reviewer a3ecfdc051c248280. Task 11: implementer aa2647d35ea75146f (sonnet). Waiting on both.
Task 10: minor (deferred): checksum mismatch on an existing asset is left alone but not reported, as visual-assets.md's Mismatch rule describes.
Task 10: minor (deferred): a missing fx asset throws a bare Error instead of a file:pointer: message problem.
Task 10: minor (deferred): corrections reason is escaped but Arabic runs in it are not wrapped.
Task 10: minor (deferred): the details.ev CSS patch matches an exact template string and fails silently if the template changes.
Task 10: review 0/1/4 spec ❌ (LEGEND slot empty). Checksum-mismatch concern is a Minor (only visual-assets.md asks for it); asset count concern withdrawn (nine names correct).
Task 10: fix round 1 dispatched to ae13f7a1b0dfed47c at e651fa4, commit by path only since task 11 shares the tree.
Task 10: fix round 1/5: controller re-review (7 lines): 1 addressed, 0 open
Task 10: test_scope after the fix stopped at check-types on task 11's uncommitted test file; the page and build tests pass per the fix report. Exit gate covers it.
Task 10: cost unavailable (no transcript recorded)
Task 10: complete (commits 642d177..66dad6d, review clean after 1 fix round)
Waiting: task 11 implementer.
Task 11: DONE_WITH_CONCERNS 66dad6d..35810ff, scope exit 0 per implementer. Concerns: task 01 and task 04 test assertions changed (unknown keyword now a returned error, diagrams no longer empty); pickLine follows ruling 12; self-message-only sequence pages borrow a second participant. Passed to the reviewer.
Task 13: dispatched 35810ff 2026-10-28T12:23:23+03:00 (ahead of 12 so task 11's fixes cannot collide with 12's work in sf-diagrams)
Task 11: reviewer ac713d2d62900dcd0. Task 13: implementer a595336a550605597 (sonnet). Waiting on both.
Task 11: minor (deferred): unsupported keyword inside anyOf, oneOf or not branch is swallowed as a failed branch.
Task 11: minor (deferred): all-self-message page borrows a participant with no note in the spec.
Task 11: minor (deferred): the other-root evidence card appears on page 1 only.
Task 11: review 0/1/3 spec ❌ (store participant ids collide with actor ids in flow specs). Borrowed participant accepted.
Task 11: fix round 1 dispatched to aa2647d35ea75146f at 35810ff.
Task 11: fix round 1/5: controller re-review (5 lines): 1 addressed, 0 open
Task 11: minor (deferred): a digit-leading id gets an n prefix in archify specs, so ids 2fa and n2fa in one diagram would collide.
Task 11: cost unavailable (no transcript recorded)
Task 11: complete (commits 66dad6d..229a4a3, review clean after 1 fix round)
Waiting: task 13 implementer; task 12 next (serial implementers).
Task 13: DONE 229a4a3..371f5ce, check-all ALL GREEN per implementer.
Task 12: dispatched 371f5ce 2026-10-28T12:31:04+03:00
Task 13: reviewer a954d9fa1f288363c. Task 12: implementer a65c08d06f5efff91 (sonnet). Waiting on both.
Task 13: minor (deferred): verifyItems repeats stampVerified's fragment read and write loop instead of reusing it.
Task 13: review 1/1/1 spec ✅ (⚠️ fixtures read, not run). Critical: git option injection through refs from --diff, --base and fragment verified values; missed security tripwire.
Task 13: fix round 1 dispatched to a595336a550605597 at 371f5ce; security lens a64082ca90544a502 dispatched on the task 13 diff (mode task, tripwire: string-built shell, here git arguments).
Task 13: security lens 0/1/3, findings docs/plans/2026-10-28-system-flow/findings/13-lens-security.md. Its Important is the same option injection the fix round already targets.
Task 13: minor (deferred): fragment verified values are not schema-checked as 40-hex; safety rests on the cat-file gate running before checkPath.
Task 13: minor (deferred): evidence paths reach git as pathspecs, so magic prefixes such as :(top) or :! can skew stale results; use --literal-pathspecs or reject a leading colon.
Task 13: minor (deferred): verify writes are confined only by the trusted --site path and follow a symlinked fragment file.
Task 13: fix round 1 DONE_WITH_CONCERNS 371f5ce..c66b2e9 (resolveCommit with --end-of-options, -- before paths, verified must be 40 hex, oldestVerified guarded); test_scope stopped at ts-toolchain on task 12's uncommitted test. Dispatched re-review (lens finding in the loop).
Task 13: fix round 1/5 (3 addressed, 0 open: none; commits 371f5ce..c66b2e9)
Task 13: minor (deferred): non-40-hex `verified` in a fragment now aborts stale, query and verify instead of reading as unverified.
Task 13: minor (deferred): a bad `--diff` or `--base` ref exits 1 from a thrown error, not the usage exit 2.
Task 13: cost unavailable (no transcript recorded)
Task 13: complete (commits 229a4a3..c66b2e9, review clean after 1 fix round)
Waiting: task 12 implementer; then 14, 16 (frontier), 15 after 12, 13, 14.
Task 12: DONE_WITH_CONCERNS ad4dd8a (single commit on top of task 13's fix; review range c66b2e9..ad4dd8a). Concerns: theme block body is the ruling 16 mapping, not themeCss; stale retry pages may remain after an SVG fallback; prefer cheap overrides --archify; a sequence already at 5 or fewer per page is not retried.
Task 14: dispatched ad4dd8a 2026-10-28T12:46:43+03:00
Task 12: reviewer a415c43d9cbf93b4f. Task 14: implementer aeb92eb471072c34f (sonnet). Waiting on both.
Task 12: minor (deferred): stale -pN archify pages remain on disk after a failed retry or a later fallback.
Task 12: minor (deferred): no retry when the page limit is already 5 or less; behavior is undocumented outside the report.
Task 12: minor (deferred): runArchify never reads the receipt and has no timeout.
Task 12: minor (deferred): fallback line names an expected receipt path even when archify wrote none.
Task 12: review 0/1/4 spec ❌ (prefer cheap overrode an explicit --archify, against the Global Constraints lookup). Ruling 16 binds over the Tests line's themeCss wording, as the reviewer found.
Task 12: fix round 1 dispatched to a65c08d06f5efff91 at ad4dd8a.
Task 14: DONE_WITH_CONCERNS ad4dd8a..f6c1d59, test_scope ALL GREEN per implementer.
Ruling: task 14's calibrated note has no date because ESTIMATE has no date field; task 20 adds the field and the on <date> text when it writes measured constants (tasks 14 and 20). Cost if wrong: a calibrated estimate without provenance, caught by task 20's review.
Task 14: reviewer dispatched. Task 16: brief compiled; dispatch waits for task 12's fix round to land (one writer at a time). Waiting on task 12 fix and task 14 review.
Task 14: minor (deferred): plan validation accepts duplicate area ids.
Task 14: minor (deferred): STORE kind list duplicates STORE_KINDS in sf-model.
Task 14: minor (deferred): no test for non-zero storeRows, flows, per-area chapters or the calibrated note.
Task 14: review 0/1/3 spec ❌: f6c1d59 also carries the --archify over prefer cheap precedence change in src/lib/sf-build.ts.
Ruling: that hunk is task 12's fix round 1, swept into task 14's commit because both implementers edited sf-build.ts in one tree (the tree still holds task 12's uncommitted archify test). It stays where it is; task 12's re-review judges it together with task 12's test commit, over ad4dd8a..<task 12 fix head> (tasks 12 and 14). Why: reverting and recommitting the same lines costs a round and changes nothing. Cost if wrong: mixed attribution in history, caught by the final branch review. Lesson: concurrent writers in one tree mix commits; from here on, one writer at a time.
Task 14: cost unavailable (no transcript recorded)
Task 14: complete (commits ad4dd8a..f6c1d59, review clean after the attribution ruling; no code change needed)
Task 12: fix round 1/5: controller re-review (3 lines): 1 addressed, 0 open
Task 12: cost unavailable (no transcript recorded)
Task 12: complete (commits c66b2e9..ad4dd8a and ea595fb, with the precedence hunk in f6c1d59; review clean after 1 fix round)
Task 16: dispatched b1ab861 2026-10-28T12:58:44+03:00
Task 16: implementer a3974e24f83045394 (sonnet). Waiting on it. Frontier after it: 15 (06, 09, 10, 12, 13, 14 complete), then 17 (10, 12, 13).
Task 16: DONE b1ab861..815ac07 per implementer.
Task 15: dispatched 815ac07 2026-10-28T13:13:13+03:00 (opus, Capable because: authoring the lane an agent follows, under the size cap and lane gates)
Task 16: reviewer af138b2bf9d2be4ab. Task 15: implementer a7f9f8f0356dcbfee (opus). Waiting on both.
Task 16: minor (deferred): an unparseable HEAD fragment is skipped silently in headModel, hiding its changed facts.
Task 16: minor (deferred): corrections check is skipped without a message when no root is the host.
Task 16: minor (deferred): parallel-edge handles are positional, so reordering same-pair edges falsely demands corrections.
Task 16: minor (deferred): no test for a first build with no HEAD or no fragments at HEAD.
Task 16: minor (deferred): a duplicate handle at HEAD collapses in the comparison map, last one wins.
Task 16: review 0/0/5 spec ✅; ⚠️ (CLI not run by the reviewer) accepted, exit gate reruns.
Task 16: cost unavailable (no transcript recorded)
Task 16: complete (commits b1ab861..815ac07, review clean)
Waiting: task 15 implementer; task 17 next.
Task 15: DONE_WITH_CONCERNS 815ac07..dc03b54, check-all ALL GREEN per implementer. Concerns: fx-authoring pressure tests not run (only the gate text tests check the wording); conformance rows 09, 13, 14 updated for the lane count.
Task 17: dispatched dc03b54 2026-10-28T13:28:38+03:00
Task 15: reviewer a4cb040380cc54a8b (opus, Capable because: lane wording becomes agent behaviour). Task 17: implementer a0fb500870a94f6ac (sonnet). Waiting on both.
Task 15: minor (deferred): area-brief.md gives no rule for a check problem that names another fragment file.
Task 15: minor (deferred): conformance row 13 comment still says skill.list holds all 20 skills.
Task 15: review 0/1/2 spec ❌ (areas dispatched before chapters.json and level0.json exist; shared ids unset). ⚠️ confirmed: the report shows no fx-authoring invocation, only skipped pressure tests; carried into the fix round.
Task 15: confirmed ⚠️: no record that fx-authoring was invoked
Task 15: fix round 1 dispatched to a7f9f8f0356dcbfee at dc03b54.
Task 15: fix round 1 DONE_WITH_CONCERNS dc03b54..6132e9b (fx-authoring invoked at task start per implementer; pressure tests not run; archify test red from task 17's uncommitted sf-build.ts). Dispatched re-review (over 20 lines).
Task 15: fix round 1/5 (2 addressed, 0 open: none; commits dc03b54..6132e9b)
Task 15: minor (deferred): planning.md Shared ids names no id for a level-0 context node, so a single-area plan has the writer invent one.
Task 15: minor (deferred): fragment-guide.md Ids says every node id starts with its area id, but level-0 nodes are `l0-<area id>`.
Task 15: the l0-<area id> against fragment-guide id rule minor is a lane self-contradiction an area agent will meet in task 20; the final review must triage it as fix-before-proof.
Task 15: cost unavailable (no transcript recorded)
Task 15: complete (commits 815ac07..6132e9b, review clean after 1 fix round)
Task 17: DONE_WITH_CONCERNS 6132e9b..c8cd60a, test_scope ALL GREEN per implementer. Concern: --only does not rewrite coverage.md and rules-in-force.md (rules only for a rule: handle).
Task 17: reviewer dispatched (sonnet). Waiting on it; tasks 18 and 19 both wait for 17.
Task 17: minor (deferred): coverage.md stays stale after build --only while coverage.json is still rewritten; document in fx-docs.
Task 17: minor (deferred): no test passes an edge handle with colons and > to build --only.
Task 17: review 0/1/2 spec ❌ (--only stamps every unverified item, not only rebuilt ones); stale coverage.md after --only is a Minor.
Task 17: fix round 1 dispatched to a0fb500870a94f6ac at c8cd60a.
Ruling: tasks 18 and 19 run at the same time once task 17's fix lands: task 18 writes only proof/, results.md and a scratch folder and changes no source, task 19 writes skills, docs/adr and one gate test; both commit by path. Why: they share no file, and task 18 is mostly long CLI runs. Cost if wrong: a mixed commit, caught by each task's review package.
Task 17: fix round 1/5: controller re-review (7 lines): 1 addressed, 0 open
Task 17: minor (deferred): items inside a container named by --only (section:, diagram:, seq:, flow:) are rebuilt but not stamped verified.
Task 17: cost unavailable (no transcript recorded)
Task 17: complete (commits 6132e9b..49141e1, review clean after 1 fix round)
Task 18: dispatched 4f6918f 2026-10-28T13:42:00+03:00
Task 19: dispatched 4f6918f 2026-10-28T13:42:00+03:00
Task 18: implementer ad35e54a0d7e53a1b. Task 19: implementer ac2a2030205e6f7f0. Waiting on both.
Task 19: DONE 4f6918f..ae1f0a9, check-all ALL GREEN per implementer; ADR 0066 written by hand per ruling 30, no 0065 row.
Task 19: reviewer a33f7ef38a0dd1e78 (opus). Coverage audit dispatched (opus, read-only), findings findings/coverage-audit.md. Waiting on task 18, task 19 review and the audit.
Task 18: DONE_WITH_CONCERNS ae1f0a9..2e8be2a. detect, check (0 warnings), build --archify and the flagless rebuild exit 0; flagless diagrams deep-equal; layout crossings 0, width at most 860; archify copy unchanged. archify rendered 0 of 5 deep diagrams, all fell back to SVG; visual check not run (no browser in the subagent), 6 pages named in results.md.
Ruling: task 18's five outside-task findings are load-bearing for tasks 20 and 21 (a proof run that renders no archify diagram measures nothing), so one fix task, "18a", runs before task 18 completes: (1) runArchify runs finalize calls one at a time (archify's delivery lock rejects concurrent calls in one folder); (2) a root with no remote omits meta.repository or uses archify's local-only link mode, whichever archify 3.2.0's schema allows, never the root id as a URL; (3) the CLI keeps component sublabels and participant labels inside archify's measured limits by wrapping or truncating with an ellipsis and records the change in diagrams[].reason, which supersedes ruling 15 in part; (4) task 20 and 21 prep copy archify with cp -rL; (5) fragment-guide.md says a flow step actor must be a node id. Then task 18's smoke run is repeated in a new scratch folder (smoke-<date>-2). Why: the smoke run exists to catch exactly this before the expensive runs. Cost if wrong: a fix round of churn, caught by 18a's review and the rerun.
Task 18a: dispatched 2e8be2a 2026-10-28T13:48:43+03:00 (task file .fx/2026-10-28-system-flow/18a-task.md, controller-written from the ruling)
Task 18a: task file copied to docs/plans/2026-10-28-system-flow/tasks/18a-smoke-fixes.md so it is committed with the plan.
Task 18a: implementer ab04704bc762fc5d3 (opus). Waiting on 18a, task 19 review and the coverage audit.
Task 19: minor (deferred): fx-docs build --only does not say that handles are comma-separated or passed as repeated --only.
Task 19: minor (deferred): fx-docs model path says "every root" but ignores query's unbased roots and --base.
Task 19: minor (deferred): fx-docs never verifies the inventory entries it adds, so stale lists them as unverified.
Task 19: minor (deferred): docs-lanes asserts the bare word "added", which pins nothing.
Task 19: review 0/1/4 spec ✅, plan-mandated 1: in a model repo the Markdown path step 4 still writes a hand-written doc for an engine the model path just inventoried.
Ruling: task 19's plan-mandated finding is fixed, not kept: step 4 of fx-docs' Markdown path runs only in a repo without a system model. Why: design, the model is the record and generated Markdown replaces hand-written system docs; two records of one fact drift. Cost if wrong: a model repo loses hand-written engine pages it wanted, caught by task 20's proof run.
Task 19: fix round 1 dispatched to ac2a2030205e6f7f0 at 2e8be2a.
Task 19: fix round 1/5: controller re-review (2 lines): 1 addressed, 0 open
Task 19: cost unavailable (no transcript recorded)
Task 19: complete (commits 4f6918f..ae1f0a9 and 2c8e3bf, review clean after 1 fix round)
Coverage audit: 14 gaps (G1 to G14) and 10 unstated rules (R1 to R10), findings docs/plans/2026-10-28-system-flow/findings/coverage-audit.md.
Ruling: coverage audit routing. A fix task 18b, after 18a, carries: G1 (test and if missing fill the page NAV with the chapter list and the deep diagram list, and each Markdown doc's link to its figure in the site), G3 (dropped arrows named under the figure and in step captions), G4 (content assertions for Open questions, Corrections, Coverage and the store tables), G11 (archify output pages load nothing outside the site, asserted), G13 (a section with a folder gets its own index.md), R2 (one id rule in fragment-guide.md and planning.md that admits l0-<area id> level-0 nodes), R3 (fragment-guide.md: an edge links nodes of its own diagram), and design.md text amendments for G7 (an unfit figure fails the build; the owner decides through layout hints), G10 (the receipt path is reported, not parsed), R1, R4 to R10, and the schema location. Tasks 20 and 21 carry G2, G5, G6, G8, G9 and G14 as results.md checklist rows (nav write, kit interactivity in the visual check, inventory and rules.json, rerun choices, tokens against the estimate, fx-docs branch mode after a code change); G12 is cleared by task 19's review. Why: everything a test can carry gets a test before the expensive runs; what needs a real session is checked in the run it already has. Cost if wrong: a screen-side gap reaches the proof runs, caught by their visual check and results review.
Task 18a: DONE_WITH_CONCERNS 2c8e3bf..67bde3c; archify validate --quality showcase accepts all five fitted specs from a no-remote fixture. Concerns: component labels fitted too; evidence card title now Evidence; a no-remote root loses sources links.
Task 18b: dispatched 67bde3c 2026-10-28T14:05:39+03:00
Task 18a: reviewer a3e64a54d11999eb0. Task 18b: implementer a1c8eee99a34add72 (sonnet). Waiting on both; task 18's smoke rerun follows 18a and 18b.
Task 18a: minor (deferred): missing-remote loss of sources links is not recorded in diagrams[].reason.
Task 18a: minor (deferred): fit() can split grapheme clusters (combining marks, ZWJ) since it cuts by code point.
Task 18a: minor (deferred): label-fit tests use only Latin text, so wide-character and Arabic counting is unasserted.
Task 18a: review 0/0/3 spec ✅; ⚠️ (check-all not run) goes to the exit gate. Label fitting and the Evidence title judged necessary.
Task 18a: cost unavailable (no transcript recorded)
Task 18a: complete (commits 2c8e3bf..67bde3c, review clean)
Waiting: task 18b implementer; then the task 18 smoke rerun.
Task 18b: DONE_WITH_CONCERNS 67bde3c..acb9eb4, check-all ALL GREEN per implementer. G1, G13 and G3 captions were already true (tests pass first run); code or text changed for G3 list, G4, G11, R2, R3; dropped arrows listed by the page, not the kit.
Task 18: smoke rerun dispatched to the task 18 implementer (ad35e54a0d7e53a1b) at acb9eb4, new scratch folder smoke-<date>-2.
Task 18b: minor (deferred): outsideRefs misses CSS url()/@import, srcset and ../ escapes.
Task 18b: minor (deferred): G11 test covers only the unpaged page, not a -pN leak.
Task 18b: minor (deferred): R3 sentence not added to the design's caps paragraph.
Task 18b: minor (deferred): planning.md level-0 bullet has one over-long line.
Task 18b: review 0/0/4 spec ✅ (first-run tests judged to depend on named lines).
Task 18b: cost unavailable (no transcript recorded)
Task 18b: complete (commits 67bde3c..acb9eb4, review clean)
Waiting: task 18 smoke rerun.
Task 18: smoke rerun (smoke-20261028-4) DONE_WITH_CONCERNS acb9eb4..506fdcf: detect, check, build --archify and flagless rebuild exit 0, flagless diagrams deep-equal, layout fine, no outside writes; archify passed both architecture diagrams but the CLI kept 0 of 5 archify pages. Visual check not run (no browser).
Ruling: a second fix task 18c, resumed on task 18a's implementer (it holds archify's source context): (1) outsideRefs flags only loads (src, srcset, link href, CSS url and @import, and ../ escapes, which also closes task 18b's minors), never an anchor href such as archify's credit link; (2) every sequence and flow page meets archify's delivery viewport-height rule, read from archify's source, so short last pages and 3-step flows pass; (3) one failed page no longer leaves stray pages or overwrites earlier receipts: retry pages and receipts get distinct names and the CLI removes its own stale page files for that diagram before writing the fallback. The level-0 id rule stays lane-only (minor). Then the smoke run repeats once more. Why: the proof runs need archify pages that render. Cost if wrong: another smoke round, caught by the rerun.
Task 18: minor (deferred): check does not enforce the level-0 id rule from fragment-guide.md; it is lane-only.
Task 18c: dispatched 506fdcf 2026-10-28T14:19:31+03:00 (resumed on ab04704bc762fc5d3)
Task 20: prep dispatched 506fdcf 2026-10-28T14:19:48+03:00 (steps 1 and 2 only, parallel with 18c: prep writes only proof/ files and a scratch folder)
Task 20: prep implementer a1a879fb4ddbcf59b (sonnet). Waiting on task 18c (ab04704bc762fc5d3) and task 20 prep.
Task 20: prep DONE 506fdcf..cb724c4: compare-evidence.py with a self-check (RED then pass; 105 reference items, 141 entries), run-a.md, run folder /tmp/claude-1000/sf-build/proof-a-20261028-1 (scratch copy bd0fac1, home/.claude with 0600 credentials and archify via cp -rL, tmp). Prep not reviewed yet; its review runs with the results step.
Task 20: parked: run step needs the session controller. Commands: docs/plans/2026-10-28-system-flow/proof/run-a.md steps 1 to 3 (claude -p --plugin-dir /development/fx/.worktrees/system-flow on /tmp/claude-1000/sf-build/proof-a-20261028-1/Shamel.Backend, then --resume <session_id> twice), then copy the transcript to the run folder as transcript.jsonl and hand it to the results step; delete the credential copy with find /tmp/claude-1000/sf-build/proof-a-20261028-1/home/.claude/.credentials.json -delete after the results step. Run only after task 18c and its smoke rerun are complete, so the plugin dir holds the archify fixes.
Task 18c: DONE_WITH_CONCERNS cb724c4..1e26404; real archify finalize passes the 2-message page and 3-step flow (744x480); outside-load scan clean on real archify pages. Concern: diagram names such as seq-a and seq-a-p2 collide with paging and the stale-file cleanup could remove the other diagram's pages.
Task 18: second smoke rerun dispatched to ad35e54a0d7e53a1b at 1e26404.
Task 18c: reviewer a4fd24e71f8c3181c. Waiting on the 18c review and the second smoke rerun.
Task 18: second smoke rerun DONE ed0ed72: archify rendered and kept 5 of 5 deep diagrams, receipts pass in four stages, one fx-theme block each, flagless rebuild deep-equal, layout fine, no outside writes; visual check not run (no browser in subagents), 6 pages named in results.md. Task 18 review dispatched over its own files only (proof/prepare-scratch, smoke-fragments, results.md).
Task 18: minor (deferred): results.md summarizes detect, build and git status output instead of pasting the raw command output.
Task 18: minor (deferred): the smoke run folder is scratch only, so the recorded layout and receipt lines cannot be reproduced from the repo.
Task 18: review 0/0/2 spec ✅; prepare-scratch run twice by the reviewer (exit 0 then 1, one commit).
Task 18: visual check not run: no browser in any subagent; the controller runs it per references/visual/visual-check.md on the 6 pages results.md names (smoke-20261028-5) before task 20's run step.
Task 18: cost unavailable (no transcript recorded)
Task 18: complete (commits 2e8be2a, 506fdcf, ed0ed72 for its own files; fixes in 18a, 18b, 18c; review clean; visual check owed by the controller)
Task 18c: minor (deferred): retry pages keep the final names; only receipts got distinct retry names, against the ruling wording.
Task 18c: minor (deferred): archify delivery fail with exit code 0 is still judged ok by exit code and file presence.
Task 18c: minor (deferred): scripts/check-all was not run by the implementer.
Task 18c: review 0/1/3: cleanup prefix match deletes another diagram's pages (ids a and a-p2); ⚠️ viewport numbers not checked against archify's source, carried into the fix round.
Task 18c: confirmed ⚠️: viewport numbers 1.55, 1346, 126, 900 not checked against archify's source
Task 18c: fix round 1 dispatched to ab04704bc762fc5d3 at ed0ed72 (check rejects sequence and flow ids ending -p<digits>; cleanup matches exact names).
Exit gate trial 1: check-all at ed0ed72 exit 1, 417 lines read: every gate passed up to no-rm-in-shell-c.test.js, which failed because check-generated saw lib/sf-build.js drift from src/ while task 18c's fix round was editing src/lib/sf-build.ts in the same tree. Not a branch failure; check-all reruns after the fix commits.
Task 18c: fix round 1/5: controller re-review (4 lines): 2 addressed, 0 open
Task 18c: minor (deferred): fragment-guide.md does not state that sequence and flow ids may not end in -p and digits; agents learn it from the check error.
Task 18c: cost unavailable (no transcript recorded)
Task 18c: complete (commits cb724c4..1e26404 and 1297459, review clean after 1 fix round)
Exit gate trial 2: check-all at fd2df9c exit 0, ALL GREEN, 772 lines read (141 gates; one SKIP: opencode 1.x row, its own rule with opencode 2.1.4 on PATH). Every skills/*/SKILL.md under 20,000 bytes. Not yet the exit gate: main is not merged in and tasks 20 and 21 are open.
Task 21: parked: blocked by task 20 (its prep, run and results follow task 20's measured constants); its run step needs the session controller like task 20's.
Stopped: every task not depending on the task 20 run step is complete (01 to 19, 18a, 18b, 18c; coverage audit done and routed). Remaining, in order: controller visual check of the 6 smoke pages; controller runs proof/run-a.md steps 1 to 3 and copies the transcript to /tmp/claude-1000/sf-build/proof-a-20261028-1/transcript.jsonl; then task 20 results (steps 4 to 7) and review; task 21 prep, run, results; merge fx main (6e2d88b, ADR 0065, version 0.8.0) into system-flow; final branch review and its fix wave; exit gate check-all.
Visual check (controller, 2026-10-28): smoke-20261028-5 index.html failed (horizontal scroll at 1440 and 390, 39 clipped table cells: no table CSS in the page template). Fixed in references/visual/page-template.html (table scroll box, cells wrap); rebuilt page passes 4 of 4 views, 5 archify diagrams pass 4 of 4. Task 18c late review: 1 Important (stale cleanup deletes pages of id a-p2 when id a exists), findings/18c-review.md; fix dispatched before task 20's run step.
Fix 18c Important (stale cleanup vs ids a and a-p2): no change needed. Commit 1297459 already made check reject sequence and flow ids ending in -p and digits (sf-rules.ts PAGED), so a and a-p2 cannot coexist; a test with both fails at the check, so no red could be watched. The cleanup is pinned to its own names there (hand-file case in system-flow-archify.test.ts). The Minor (retry pages keep final names) stays deferred.
Fix page-template tables: gate in src/tests/gates/visual-kit.test.ts asserts the table rule keeps display:block and overflow-x:auto and th,td keeps overflow-wrap:anywhere; red with the template rules removed ("table rule keeps display:block"), green with them; check-all ALL GREEN.
Proof (a) fix 1 (static SVG pages at 390 px): commit 43c4c90. The svg keeps min-inline-size of 12/13 of its width (13 px text stays at 12 px or more) inside a .scroll box with overflow-x:auto. RED: "arch-engine: svg min-inline-size NaN keeps text at 12 px for width 438"; GREEN: system-flow-diagrams.test.js OK.
Proof (a) fix 2 (sequence step numbers doubled): commit be753eb. A sequence page's list item carries value="n" and the caption without its "n. " prefix; page 2 starts at 9. RED: "seq-turn: no item text starts with its own number: 1. API to DB: Step 1 app/y.rb:1"; GREEN OK.
Proof (a) fix 3 (diagram pages ignore the stored theme): commit 6ee2b0e. Static pages run page-template.html's head script (localStorage fx-theme, else the system setting); the test reads the key from the template and runs the script in vm. RED: "arch-engine: stored dark applies"; GREEN OK. Not changed: archify pages keep their own key archify-theme and toggle.
Proof (a) fix 4 (archify rejected 20 of 28 specs): commits b41c4cd (frames shifted 16 px inside, no architecture viewBox, figure short labels on connections, note rows by wrapped lines, legend reserve of content bottom + 98 px, message labels cut to the canvas, self-messages folded into a note; RED "architecture spec leaves the canvas to archify") and a3d5fc5 (a rebuild clears <name>.browser-check.json before each archify run, else archify refuses the evidence of a rethemed page; RED "static SVG, archify failed" on the second build). Proof copy rebuilt twice with archify 3.2.0: 28 of 28 diagrams (32 pages) archify, 0 fallbacks.
Proof (a) fix 5 (task 20 results): commits 0befdf1 (ESTIMATE calibrated 2026-10-28: tokensPerFile 66000, tokensPerFigure 166000, controllerTokens 3320000, minutesPerFile 0.2, minutesPerFigure 0.7, controllerMinutes 9.4; run (a)'s plan gives 12,782,000 tokens and 20.5 min against 12,813,063 and 20.3 measured; RED on the old area values, GREEN OK) and 178489a (proof/results-a.md, proof/reasons-a.json). check, stale, compare-evidence (105 items, 24 matched, 0.23), mkdocs --strict exit 0 after committing the output in the copy, original folder 0 files newer than the stamp. Credential copy deleted with find -delete.
Proof (a) visual check: not run with Playwright here (no Playwright; google-chrome headless screenshots only). Seen: archify sequence page seq-twk-framework-seq-boot-config at 390 px clips its title and toolbar on the right (archify's own page, Open Question 1); the controller runs the full check.
Exit gate trial 3: check-all at 178489a exit 0, ALL GREEN, 771 lines read.
Controller visual check of proof (a), 2026-10-28: 33 pages, 0 console errors, no page-wide horizontal scroll. Map: every one of 17 levels opens (rendered counts include group boxes); 4 levels at 1440 started with nodes outside the pane because React Flow's default minZoom 0.5 cannot fit them. Ruling: fx-map-2.js changed in place (never shipped; bump rule protects released copies) with minZoom 0.2 and fitView padding; 1440 now 17 of 17 levels fully in view, 390 has 3 levels needing a pan. Commit befc7f6.
Proof (b) fix 1 (planning.md never named meta.json's schemaVersion): commit 076c8ac. Skill text only; the baseline is the lane's own planning report ("check requires a top-level schemaVersion 1 in meta.json, and planning.md doesn't mention it"). Not micro-tested with a no-guidance control.
Proof (b) fix 2 (build crashed in coverage on an unconfirmed item with no evidence key): commit 0267540. mergeFragments gives every evidenced item an empty evidence array. RED: "AssertionError [ERR_ASSERTION]: build exits 0 / system-flow: build: Cannot use 'in' operator to search for 'path' in undefined"; GREEN: system-flow-coverage.test.js: ok.
Proof (b) fix 3 (grid layout drew self-loops as NaN paths): commit 29c627a. A hinted self-loop goes out of the box's right side and back. RED: "AssertionError [ERR_ASSERTION]: {"id":"system:a>a","d":"MNaN,NaN LNaN,NaN",...}"; GREEN: system-flow-layout.test.js: OK.
Proof (b) fix 4 (local-path remotes): commit 4b26727. resolveRoots keeps a remote only when it is a URL (not file:) or scp-style git@host:path, so archify gets no repository for a local path and detect prints remote null. RED: diagrams "AssertionError [ERR_ASSERTION]: arch-engine.json" (repository present); detect "+ '/tmp/.../host' - null". GREEN: both OK. Proof (b) rebuild with archify 3.2.0: 91 of 107 pages archify (0 in the lane run); the 16 left fail archify geometry rules (boundary-encloses-non-member, desktop-readability, note-overlap, edge-through-node), not repository evidence.
Proof (b) fix 5 (390 px overflow): commit 825f9bb. Cause measured in headless Chrome: unbroken paths and ids in list text (index.html 449 px, sequence and flow step lists 619 px); the SVGs already sat in the scroll box. body gets overflow-wrap:anywhere in page-template.html and the static page CSS. RED: "page-template.html body wraps long words" and "arch-engine: long words in the steps wrap"; GREEN: visual-kit OK, system-flow-diagrams.test.js OK. Playwright on the rebuilt proof (b) site at 390 by 844: 0 of 216 views wider than the viewport. The controller's 179-view result was taken while the rebuild was rewriting pages, on the lane's all-SVG build.
Proof (b) fix 6 (area agents returned unfit figures): commit 87df8bd. check --fragment lays out the fragment's own figures and reports "figure <key> cannot meet 1 crossing and 860 px: <line>; split it one level down"; area-brief.md tells the agent to split before returning. RED (right reason, after a fixture id clash): "AssertionError [ERR_ASSERTION]: {"ok":true,"fragments":4,"items":23,"warnings":[]} 0 !== 1"; GREEN: system-flow-layout.test.js: OK. Brief text not micro-tested.
Proof (b) fix 7 (cost left out the controller): commit 94b4ba8. build-cost with no file reads the recorded transcript (git common dir fx/transcript-path); check-and-report.md's Cost line uses it, and says "controller tokens not included" when none is recorded. On the proof transcript: controller 25,209,303 plus subagents 24,206,220 = 49,415,523. RED: "AssertionError [ERR_ASSERTION]: usage: build-cost <controller.jsonl> [--json] 2 !== 0"; GREEN: build-cost: ok.
Task 21: results committed 767f982 (proof/results-b.md, proof/run-b.md, results.md part b). Tokens 49,415,523 vs estimate 56,824,000 (13.0%), wall clock 52.7 vs 53.7 min (2.0%); check exit 0, stale empty, coverage engines 9/9; real repos unchanged (controller). Credential copy deleted with find -delete.
Exit gate trial 4: check-all after 767f982 exit 0, ALL GREEN, 771 lines read.
Exit gate trial after merge of main and 0.9.0 bump (controller): check-all at 85ab7b7 ALL GREEN, exit 0.
