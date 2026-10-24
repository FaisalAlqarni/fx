# Final branch review: TypeScript migration (sub-project 1)

Range: 6221b9c..92536d3, read in passes from the diff file and at HEAD.

- Pass 1: plan, design, rulings, carried list, state.md tail.
- Pass 2: toolchain and gates (scripts/build, check-generated, check-types, check-ts-escapes, check-handwritten-js, check-all, .fx.json, test-scope, tsconfig.json, package.json).
- Pass 3: shared types and trust-boundary parsers (src/lib/types.ts, json.ts, fx-json.ts, env.ts, hook-input.ts, opencode-input.ts) and their consumers.
- Pass 4: the three hooks, both opencode plugins, the package entry, preamble, plant-roles export shape.
- Pass 5: tests and gates in src/tests and src/lib/*.test.ts (spot reads), generated file spot checks (header, shebang, format, mode), docs.

Run at HEAD, read-only: check-types, check-ts-escapes (87 files), check-generated, check-handwritten-js (115 files) and check-prose all OK; hook-output-golden (40 cases), hook-input, opencode-malformed, opencode-plugin, opencode-v2-plugin, test-scope and brainstorm-server tests all pass. Not run: the full check-all (conformance rows need the harness CLIs, and ts-toolchain.test.sh rebuilds into the checkout), and a clean clone with npm ci. Probes of the escape gate ran on scratch files outside the checkout.

### Strengths

- The output mapping is consistent in all four places. scripts/build (extensionless trio, .cts to .cjs, browser IIFE helper, ESM for plugins/ and index.ts), the EXTENSIONLESS set and builtPath in src/scripts/test-scope.ts, .fx.json test_one through `--built-path`, and the second block of check-generated all agree. Modes match: only the trio is 755, and check-generated compares the executable bit, which diff -rq would miss.
- Generated files are well formed: the header is on line 1, or on line 2 under a kept shebang; lib/ is CJS, plugins and index.js are ESM, the helper is an IIFE, and server.cjs is CJS.
- check-all wiring is clean. Every one of the 46 src test files is run exactly once, by its built path, with no duplicates. The only non-generated entry is the allowlisted traps.self-test.js fixture.
- Guarded loads are mostly done right. Every fx module in the hooks and plugins is a typed `require` inside its `try`, and the fail-closed ones (git guard, both hook parsers, lib/json, v2 parser, v2 plant-roles list, user-invoked lanes in v2) check their exports. The golden gate records the failed-load cases before the port.
- The export shape is right. plant-roles.ts uses `export =` because codex-hook-output.test.ts replaces isWritingToolCall on the cached module, and it is the only module any test mutates.
- Parsers return a typed failure instead of casting, keep the old reads (`tool_input || {}` semantics, a non-string tool never matching), and parseJson is the single JSON.parse site in runtime code.
- The golden gate pins stdout, stderr and the exit code at the process seam with normalised paths, scratch HOME and CODEX_HOME, a 10 s timeout, and a documented `--record` mode.
- check-handwritten-js closes the stale-output gap the ruling named, and its test covers .cjs, .mjs, shebang scripts, fixtures and the stale header.

### Issues

#### Critical

None.

#### Important

1. scripts/check-ts-escapes:45 and :32 · The any detector still misses `any` as a later generic argument (`Map<string, any>`, `Record<string, any>`), in a union (`string | any`), as a type parameter default (`<T = any>`), in a tuple (`[any, string]`) and as a return type (`() => any`); all six probes passed the gate. It also never looks for `// @ts-nocheck`, which turns off type checking for a whole file and passed a probe with a real type error in it. · The design's story 7 and the Global Constraint promise that strictness cannot erode quietly, and @ts-nocheck is a stronger escape than the four the gate names. This is the fix wave's ruled item, and @ts-nocheck is a new gap in it. · Fix: after the existing string and comment stripping, flag any `any` token not preceded by `.` or an identifier character (`(^|[^A-Za-z0-9_$.])any([^A-Za-z0-9_$]|$)`), which subsumes the three current alternatives; add `@ts-nocheck` next to @ts-ignore; add one esc case per shape to tests/gates/ts-toolchain.test.sh.
2. src/lib/plant-roles.ts:6,8,11,16,33 (23 lines) and src/lib/plan-state.test.ts:50 · 24 lines of src/ carry em or en dashes, and no gate scans sources for them: check-prose reads only .md. · Global Constraint: no em or en dashes in any file or comment. This is the fix wave's ruled item. · Fix: rewrite the plant-roles comments. Change the character class at plan-state.test.ts:50 to the two Unicode escapes (U+2014 and U+2013), so the test still checks for dashes without containing one. Then add a dash rule over src/ to check-ts-escapes, or point check-prose at src/, with one test case.

#### Minor

1. src/hooks/fx-codex.ts:45 · `roles = require('../lib/plant-roles')` is the one fail-closed load in the hooks that checks no export, and the require is untyped (its `any` is accepted by the declared variable type). An export-less file still fails closed, because each use is inside a try or under the uncaughtException deny, but the error text is less clear and it breaks the pattern the ruling sets. · Fix: `const r: PlantRoles = require(...)`, then check `typeof r.lookupAgentIdentity === 'function'` and the other functions PreToolUse calls, and set rolesLoadError when one is missing.
2. src/plugins/fx-opencode-v1.ts:73 and :107 · v1 checks neither parseOpencodeV1Call nor USER_INVOKED_LANES, while v2 checks both (fx-opencode-v2.ts:55 and :76). An export-less parser gives the refusal message "(undefined)" (carried from task 07). An export-less lane list fails later, in applyConfig, with "HIDDEN_SKILLS is not iterable" instead of a clear load error. · Fix: add the same `typeof` and `Array.isArray` checks as v2.
3. scripts/check-handwritten-js:35 to 38 · A header is accepted when it names any src/ file that exists. It is never checked to be the source that builds to this path, so a copied generated file passes this gate, and check-generated never compares it because no build produces that path. · Fix: map the header's source through the build rule (the same case table as scripts/build) and require the result to equal `$f`.
4. src/lib/preamble.test.ts:86,174,197 and src/lib/plant-roles.test.ts:19,580,593,630 · Bare `require(...)` returns `any`, so these tests call the module API untyped, and the escape gate cannot see it. · Fix: `typeof import('./plant-roles')` annotations, as the hooks do, or plain imports where no load failure is being tested.
5. src/tests and src/lib/*.test.ts (about 40 lines, for example codex-hook-output.test.ts:35) · `JSON.parse(...) // ts-gate-ok` is used as a blanket pass, so each parsed result is `any` and is walked by field name. · The marker was meant for exceptions. A test reading `.hookSpecificOutput.additionalContext` off `any` repeats the untyped field reads the migration set out to remove. · Fix: one test helper that wraps parseJson and narrows to the expected output type, or `parseJson(...)` plus the existing typed output interfaces.
6. src/lib/env.ts:1 · The comment says this is "the one place fx reads the process environment". src/index.ts:28 reads FX_OPENCODE_MAJOR, server.cts reads BRAINSTORM_*, and fill-template.ts reads process.env[k]. The ruling on gap 2 accepted the narrow parser; the comment is still false. · Fix: "The one place fx's runtime libraries read CODEX_HOME", or name the exceptions.
7. src/lib/hook-input.ts:8, src/lib/opencode-input.ts:6, src/lib/dispatch-route.ts:19 · isRecord and str are copied three and two times. There are three result shapes (FxJsonResult, HookInputResult<T>, OpencodeEventResult) where one generic would do, and the hook parsers reject arrays while the opencode parser accepts them. · Each matches the old behaviour, but the seam is not one shape. · Fix: export isRecord and str from json.ts, and define OpencodeEventResult as HookInputResult<OpencodeToolEvent>. Leave the array handling as is, with a comment saying why it differs.
8. README.md:163 to 170 and :190 to 194 · The layout block has no `src/` and does not say the .js files are generated. "Development" says `scripts/check-all` runs every gate, but check-all now stops at check-generated without `npm ci`. INSTALL.md has the contributor note; README does not point to it. · Fix: one layout line for src/ and package.json, and one sentence under Development: `npm ci` once, edit src/, `scripts/build`, see INSTALL.md.
9. docs/adr/0046-fx-sources-are-typescript.md:15 · The ADR names only Mermaid as vendored, but the ruling added the two Tailwind play files to the allowlist (a design amendment). · Fix: name both vendored libraries.

### Spec compliance

Compliant, except for the two Important items, which the controller already ruled into this fix wave.

- Users need Node only; no `dependencies`: met (devDependencies at exact versions, lockfile committed).
- Target node20, file by file, never bundled: met (scripts/build, one esbuild call per file).
- Every referenced path is byte-identical and the module format per file is unchanged: met by spot checks of hooks.json targets, plugins, index.js, lib/ and the brainstorm pair. The three mode changes from 755 to 644 are ruled.
- strict and noUncheckedIndexedAccess: met. No any or suppressions without ts-gate-ok: met as far as the gate sees, but the gate has gaps (Important 1).
- External input enters as unknown, with no `as` at the boundaries: met for the hook, opencode, .fx.json and plan-state inputs. The environment parser is narrower than the design (ruled, gap 2). The v1 config, v2 ctx and permission events are typed by annotation (carried from task 07).
- Eval fixtures and vendored files stay JavaScript: met, allowlist as ruled.
- No dashes in any file: not met (Important 2).
- "Each harness's output format is its own type, so an adapter cannot return another harness's shape": not met. ClaudeContextOutput and CodexHookOutput are structurally interchangeable (carried from task 06). Accepted as deferred, because the golden gate pins both outputs.
- A clean clone reproduces the generated files: there is no committed check. The task 13 reviewer took it from the report without running it. check-generated rebuilds from tracked sources with the locked toolchain and passes at HEAD with a clean status, which covers most of it; an npm ci from scratch was not repeated here.
- Plan correctness: the plan and design hold up. Only the 29 versus 26 gate count was wrong, and it is ruled.

### Carried findings triage

Each carried line is listed in the order of carried.txt. "Resolved" means the item is fixed at HEAD and can come off the deferred list.

1. Task 01, check-ts-escapes misses generic and union any: must-fix-before-merge, ruled into this wave; probes confirm it, plus @ts-nocheck (Important 1).
2. Task 01, boundary `as` rule false-flags import and export aliases: confirmed deferred; the boundary files have no aliases, and a false finding fails loudly.
3. Task 01, check-generated ignores orphaned output: confirmed deferred, resolved by the stale-source rule in check-handwritten-js; the path-mapping hole is new Minor 3.
4. Task 01, bare `&&` list in scripts/build under set -e: confirmed deferred; safe because it is not the loop's last command.
5. Task 01, ts-toolchain.test.sh builds into the repo root: confirmed deferred; the build is deterministic and check-generated runs before it in check-all.
6. Task 02, laneCheck throws on a truthy non-string: confirmed deferred, resolved; the hook and v2 pass only strings (fx-pretooluse.ts:119).
7. Task 02, DispatchInput accepts arrays: confirmed deferred; matches the old runtime.
8. Task 02, opencode-commands prints String(e): confirmed deferred; message text only.
9. Task 02, toOpencodeAgent return types are inferred: confirmed deferred; type hygiene only.
10. Task 03, RED used throwing stubs: confirmed deferred; process history, and the git guard tests are green.
11. Task 03, GuardVerdict comment path: confirmed deferred, resolved (types.ts:12 names src/lib/git-guard.ts).
12. Task 04, replace callback implicit any: confirmed deferred, resolved (preamble.ts:124 is annotated).
13. Task 04, doubled blank line: confirmed deferred, resolved.
14. Task 05, 23 em dashes in plant-roles.ts: must-fix-before-merge; Global Constraint (Important 2).
15. Task 05, plant-roles.ts header says Task 06: must-fix-before-merge; it is on the same header lines the dash rewrite touches, so it costs nothing extra.
16. Task 05, CodexRole is unused: confirmed deferred; it is still unused at HEAD, so delete it or use it in sub-project 2.
17. Task 05, recordAgentIdentity agentType is unnarrowed: confirmed deferred, resolved; the hook passes the parsed `string | undefined`.
18. Task 06, fx-context loads parsers outside a try: confirmed deferred, resolved (fx-context.ts:28 to 40).
19. Task 06, Codex refuses SessionStart when the parser fails to load: confirmed deferred; it fails closed by design, and the comment at fx-codex.ts:104 to 107 now says so.
20. Task 06, the hook decision type is missing: confirmed deferred, resolved (types.ts:97).
21. Task 06, the two context output types are interchangeable: confirmed deferred; it is a design deviation, but the golden gate pins both outputs.
22. Task 06, non-string cwd has no golden case: confirmed deferred; it is a test gap on an advice path.
23. Task 06, golden spawnSync has no timeout: confirmed deferred, resolved (10 s timeout in hook-output-golden.test.ts).
24. Task 06, golden meta `stub` is unused: confirmed deferred; it is still unused, and harmless.
25. Task 06, hook-input.test.ts spawns without a timeout: confirmed deferred; a hang would show in check-all rather than pass.
26. Task 06, broken parser reports SessionStart on SubagentStart: confirmed deferred; it needs a broken install, and the session still gets the warning.
27. Task 07, no test pins the v1 and v2 refusal on a broken opencode-input: confirmed deferred; it is a test gap, and the code path is a direct throw.
28. Task 07, v2 lost two failure notices: confirmed deferred; the notices are advice.
29. Task 07, v2 comment at lines 47 to 48 was wrong: confirmed deferred, resolved (fx-opencode-v2.ts:49 to 50 now says every tool call is refused).
30. Task 07, export-less lib gives "undefined" in messages: confirmed deferred; it is message text, and v1's parser is covered by item 36.
31. Task 07, v2 attempt() caught only native Promises: confirmed deferred, resolved (isThenable at fx-opencode-v2.ts:93).
32. Task 07, v1 config and v2 ctx are typed by annotation: confirmed deferred; these are harness-owned objects, not wire input.
33. Task 07, check-all ran in the foreground: confirmed deferred; process only.
34. Task 07, v1 parseOpencodeV1Call has no export check, and the fix report claims it has: must-fix-before-merge; a one-line fix, the ruling requires it, and the ledger records a false claim (Minor 2).
35. Task 07, export-less plant-roles leaves v2 READ_ONLY empty: confirmed deferred; the export check now exists at line 104, and the empty list on a throw is reported through the agent step.
36. Task 08, non-object JSONL now exits 2 with no test: confirmed deferred; it is stricter in a safe direction.
37. Task 08, no RED was captured for the port: confirmed deferred; process.
38. Task 08, unused catch bindings in build-cost.ts: confirmed deferred, resolved; every remaining binding is used.
39. Task 09, get() is copied into five scripts: confirmed deferred; test tooling only.
40. Task 09, TypeError messages differ: confirmed deferred; the exit codes are equal.
41. Task 09, silent catch and silent return without a shortcut comment: confirmed deferred; test tooling only.
42. Task 09, mcp-probe-server writes to any path: confirmed deferred; it is a conformance helper driven by fx's own runs.
43. Task 11, GATE_EXEMPT string kept for the marker: confirmed deferred; harmless.
44. Task 11, hooksTrusted() is called with no argument: confirmed deferred; the old argument was ignored.
45. Task 11, `as [string, string][]` casts on literal tables: confirmed deferred; test-only and not a trust boundary.
46. Task 10, 127.0.0.1 default bind is unpinned: confirmed deferred; it is a test gap with the default unchanged.
47. Task 10, raw JSON.parse with ts-gate-ok in server.cts and helper.ts: confirmed deferred; both results are typed unknown and narrowed.
48. Task 10, COVERAGE.md row 122 is stale: confirmed deferred, resolved (row 122 now says generated from TypeScript).
49. Task 13, dangling ADR path in the check-handwritten-js header: confirmed deferred; cosmetic.
50. Task 13, the ADR 0046 status line is at the end: confirmed deferred; cosmetic.
51. Task 13, the gate test greps the loose substring 'tool': confirmed deferred; a weak assertion with no false pass in practice.
52. Task 13, no test case for the vendored allowlist globs: confirmed deferred; the gate passes on the real tree, which holds them.
53. Task 13, build-case.test.ts has an up-front throw: confirmed deferred; it changes only the failure message.
54. Coverage audit gap 1, 24 dashes in src/ with no gate: must-fix-before-merge; ruled (Important 2).
55. Coverage audit duplicate, escape gate misses generic and union any: must-fix-before-merge; ruled (Important 1).

Must-fix total: 6 lines (1, 14, 15, 34, 54, 55), which collapse into three edits: the escape gate, the plant-roles header and dash rewrite with a source dash gate, and the v1 export checks.

### Recommendations

- Do the fix wave as three commits: the escape gate with @ts-nocheck and test cases, the dash rewrite with a gate over src/, and the v1 export checks (fold in Minor 1 for fx-codex plant-roles, which is the same pattern).
- Minor 3 (the header-to-path mapping in check-handwritten-js) is cheap and closes the last way a generated file can escape both gates. Worth doing in the same wave if time allows.
- Keep Minors 4 and 5 (any in tests through require and JSON.parse) for sub-project 4, or for the next pass that touches the tests.
- Run check-all once in full after the wave, in the background, as the ruling requires. If the owner wants the design's clean-clone check on record, run one npm ci clone.

### Assessment

Ready to merge: With fixes.

The migration does what the design asks. The output mapping, module formats, modes and headers are consistent. The hooks and plugins keep fail-closed loading, the golden gate proves the hook output did not change, and every new test is wired once. The two open items are both Global Constraint gaps the controller already ruled into this wave: the escape gate misses several `any` shapes and the whole-file @ts-nocheck, and 24 source lines carry dashes with no gate to catch them. Neither changes runtime behaviour, but each leaves a constraint the build claims to enforce unenforced. Merge after those two items and the v1 export check land and check-all is green.

## Ledger lines

Task 06: minor (deferred): fx-codex.ts:45 requires lib/plant-roles untyped with no export check, unlike every other fail-closed load.
Task 07: minor (deferred): v1 plugin checks neither USER_INVOKED_LANES nor parseOpencodeV1Call exports, while v2 checks both.
Task 13: minor (deferred): check-handwritten-js accepts a header naming any existing src/ file without checking it builds to that path.
Task 11: minor (deferred): seven test-file require calls are untyped, so those tests call module APIs through any.
Task 12: minor (deferred): about 40 test lines use JSON.parse with ts-gate-ok as a blanket pass, walking any by field name.
Task 01: minor (deferred): env.ts header claims it is the only environment read; index.ts, server.cts and fill-template.ts read process.env directly.
Task 07: minor (deferred): isRecord and str are copied across three parsers, with three result shapes where one generic would do.
Task 13: minor (deferred): README layout and Development section omit src/, npm ci and scripts/build.
Task 13: minor (deferred): ADR 0046 names only Mermaid as vendored, not the allowlisted Tailwind play files.
