# Coverage audit: design commitments against task acceptance criteria

Scope: design.md (13 stories, Implementation Decisions, Testing Decisions, Global Constraints), plan.md rulings, tasks 01 to 13, state.md, the worktree at HEAD 68b77c1 plus task 13's uncommitted files, and `scripts/check-all` as it stands. Read only. Task 13 is in progress; its acceptance criteria are treated as its owner.

Result: 8 gaps (3 Important, 5 Minor). Most stories are carried and proven: 1, 3, 5, 6, 9, 11, 12 and 13 have an owner and a wired check. The gaps are constraints that no task states, or checks that exist but prove less than the story.

## Gaps

### 1. Important: the no-dash constraint on sources has no owner and no gate
- Design: Global Constraints, "No em or en dashes in any file, comment or commit message".
- plan.md carries it as a ruling ("ported comments are rewritten where they carry dashes"). No task acceptance criterion repeats it. `scripts/check-prose` scans only `*.md` (`base.rglob('*.md')`), so `src/` is never checked.
- Landed state: `src/lib/plant-roles.ts` has 23 dash characters in comments (lines 6 to 16 among them); ledger task 05 records this as a deferred minor, and it was never fixed. `src/lib/plan-state.test.ts:50` holds the characters in a regex on purpose.
- Fix: widen `check-prose` to `src/**/*.ts` (exempting the one regex line with a marker), or add a line to the escape gate; assign to task 13 (it owns the last gates) and fix plant-roles.ts.
- Tasks: 05, 13.

### 2. Important: the environment parser covers one variable, the design promises the environment
- Design story 2 and Trust boundaries: "the environment" is a planned parser; `src/lib/env.ts` comment says "The one place fx reads the process environment".
- Task 05 scopes `parseFxEnv` to `CODEX_HOME` only. Red-team 5 removed task 07's extension. Direct reads remain: `src/index.ts:28` (`FX_OPENCODE_MAJOR`), `src/tests/conformance/lib/openrouter.ts` (`OPENROUTER_API_KEY`, `E`, `S`), `src/tests/conformance/lib/events.ts` (`KIND`, `HARNESS`), `src/tests/review-bench/fill-template.ts`, and the `BRAINSTORM_*` set in `server.cts` (task 10 lists thirteen variables as a contract but gives them no parser).
- No acceptance criterion says which variables are in scope; the comment in env.ts is now false.
- Fix: either amend the design (environment parser means `CODEX_HOME` only; the rest are read at process entry points and left as is) and correct the env.ts comment, or give `FX_OPENCODE_MAJOR` and `BRAINSTORM_*` a parser. Owner decision.
- Tasks: 05, 07, 10.

### 3. Important: task 13's wiring and stale-output rule are not in its acceptance criteria
- Task 13 Files says `scripts/check-all` runs the gate and its test, but the four acceptance criteria say only "gate passes on the repo and fails each bad case", "clean clone", "ALL GREEN", "ADR marks complete". `check-all` prints ALL GREEN without the gate wired. Verified now: `scripts/check-all` contains neither `check-handwritten-js` nor `check-handwritten-js.test.sh` (the three files are untracked).
- The stale-generated-output rule (a header naming a `src/` file that no longer exists) comes from a ledger ruling after task 01; `scripts/check-generated` cannot see orphans because it compares only files the build produced. The untracked `scripts/check-handwritten-js` and its test do implement and test it, but neither the task's Interfaces nor its criteria state it. If the in-progress version is rewritten, nothing requires the rule to survive.
- Fix: add two criteria to task 13: "`check-all` runs `scripts/check-handwritten-js` and its test (grep shows both lines)" and "a header naming a missing source fails with `FAIL: <path> is stale generated output`".
- Tasks: 13 (and 01 for the origin of the rule).

### 4. Minor: the no-escape gate is narrower than story 7 says
- Story 7: fails on `any`, `as any`, `@ts-ignore`, `@ts-expect-error`. Task 01's regex is tested for five spellings. Verified by running `scripts/check-ts-escapes` on scratch files: `Record<string, any>`, `Map<string, any>` and `string | any` all pass with exit 0. `Array<any>`, `Promise<any>`, `<any>x`, `b: any` are caught.
- The ` as ` ban at trust boundaries (Global Constraint "no `as` casts at trust boundaries") applies only to `lib/*-input.ts`, `lib/fx-json.ts`, `lib/env.ts`. Boundary code in `plan-state.ts`, the three hooks, the plugins, `compile-brief.ts`, `build-cost.ts` is unchecked. No such cast exists today (grep found none), so this is latent, not live.
- The gate test (`ts-toolchain.test.sh`) has no case for the generic-argument forms, so the misses are invisible. Ledger task 01 lists the first miss as a deferred minor.
- Fix: add `,\s*any\s*>` and `\|\s*any\b` to the awk, add test cases, widen the boundary list to every file that calls a parser.
- Tasks: 01.

### 5. Minor: fx's own loop (story 10) is proven for the mapping, not for the `.fx.json` strings
- Task 01 tests `scripts/test-scope --built-path` and `--dry-run src/...`. The `.fx.json` `test_one`, `test_scope` and `setup` strings (build first, map `{file}` through `--built-path`) are not run by any test; nothing would fail if the string were wrong.
- The extensionless-script list is duplicated in `scripts/build` and `src/scripts/test-scope.ts` ("keeps the same list" in comments). `test-scope.test.ts` asserts only `build-cost`. A fourth extensionless script added to one list passes `check-all`.
- `server.cts` to `server.cjs` and `helper.ts` mapping is not in the test-scope tests (I ran `--built-path` by hand and it is correct).
- Fix: one case in `test-scope.test.ts` per mapping shape (`.cts`, each extensionless script) and a gate that the two lists agree.
- Tasks: 01, 08.

### 6. Minor: three constraints are checked once, by hand, and never again
- Story 4 and Global Constraints: "no runtime `dependencies`", exact versions, committed lockfile. Task 01's criterion is a one-time read of `package.json`. Nothing in `check-all` (including `release-version.test.js`) fails if someone adds `dependencies` or a caret range. This is the constraint that protects "users need Node only".
- Testing Decisions: clean-clone `npm ci && scripts/build` reproduces the output byte for byte. Tasks 01 and 13 run it as a manual step; no gate or CI job repeats it. `check-generated` approximates it in a warm tree.
- Fix: a five-line check in `check-generated` or `ts-toolchain.test.sh` (`dependencies` absent, versions match `^\d`); keep the clean-clone step as a release checklist item and say so.
- Tasks: 01, 13.

### 7. Minor: fail-closed on a broken parser load is proven for hooks, not plugins
- Plan risk HIGH ("a guard that fails to load stops guarding") is carried for hooks by the golden failed-load cases and `hook-input.test.ts`. Task 07 requires the failed-load proof only for v1 and `lib/git-guard.js`.
- Task 07 introduced a new load (`lib/opencode-input.js`) that refuses when it throws or exports nothing. Ledger task 07 defers "no test pins the fail-closed refusal when `lib/opencode-input.js` throws or loads without exports" and "v1 loads `parseOpencodeV1Call` with no type check". Neither is fixed. `opencode-v2-plugin.test.ts` pins a guard-load failure (`withGuard`), not a parser-load failure.
- Fix: two scratch-copy cases (parser throws; parser exports nothing) for each plugin, in `opencode-malformed.test.ts`.
- Tasks: 07.

### 8. Minor: the migration-state ADR and the design do not record rules introduced mid-build
Load-bearing rules that tasks or the ledger assume and the design never states, so a later reader of ADR 0046 or design.md will not find them:
- `export =` for a module whose properties are overwritten by a test (plant-roles; esbuild named exports are getter-only). Proof exists (`codex-hook-output` overwrites `isWritingToolCall`), but nothing says the next such module must follow it.
- Guarded loads stay a typed runtime `require` (plan.md ruling; the design says only "a guarded load stays a require" in ADR 0046). Present in the ADR; no gate keeps a hoisted `import` out (only the failed-load runs catch it, for the cases they cover).
- `--record` modes on the golden gate and `preamble-equivalence`, and "never used to make a migration pass". Documented only in test headers.
- The version bump to 0.3.0, including `.agents/plugins/marketplace.json` (not in task 01's file list, added by the implementer). design.md Out of Scope still reads "Version bump, release and merge: the owner's decisions"; the authorization lives only in plan.md.
- The vendored Tailwind allowlist entries (plan.md ruling on red-team 11): design Global Constraints name only Mermaid. The allowlist file and gate test now carry it.
- Accepted loss of the executable bit on `mcp-probe-server.js`, `merge-opencode-provider.js`, `verdict.js` (755 to 644; ledger ruling, grep-based). No task criterion owns file modes beyond the extensionless trio.
- Two `.fx.json` readers (`parseFxJson` and compile-brief's own read), a deliberate departure from "one small function each" (task 08, red-team 7).
- Fix: one paragraph in ADR 0046 (or a design amendment line) listing these; no code.
- Tasks: 01 (ADR owner), 13 (final ADR edit).

### Checked, not a gap: file-to-task ownership
I ran the header scan over every tracked JavaScript file at HEAD. The unheaded files are the six tests task 13 owns, the fixture set and the four vendored files; none lacks an owner. Task 13's gate is the only standing proof of this.

## Stories checked

| Story | Owner | Landed and proven |
|---|---|---|
| 1 strict TS everywhere | 01 to 13 | Yes, gate pending (3) |
| 2 parsers from unknown | 04, 05, 06, 07 | Hooks, opencode events, `.fx.json`, plan state yes; environment partial (2) |
| 3 behaves as before | 02 to 10 | Yes: install runs and free conformance in check-all |
| 4 no runtime dependency, no user build | 01 | Output committed and drift-checked; dependency rule one-time (6) |
| 5 one build command | 01 | `scripts/build`, yes |
| 6 drift fails check-all | 01 | `check-generated` with mode block, yes; orphans (3) |
| 7 no-escape gate | 01 | Wired; narrower than stated (4) |
| 8 hand-written JS gate | 13 | Written, tested, not wired (3) |
| 9 byte-identical hook output | 06 | Golden gate, 40 cases, wired, recorded before the port (772df2d) |
| 10 test_one/test_scope accept src | 01 | Mapping yes, `.fx.json` strings untested (5) |
| 11 brainstorm server check | 10 | Gate wired, cookie attributes pinned |
| 12 fixtures stay JavaScript | 09, 13 | Allowlist and 09 "not touched" list agree |
| 13 contributor note | 01 | INSTALL.md lines 304 to 308 |

Implementation Decisions not listed above are carried: file-by-file build, header and shebang order, target node20, tsconfig flags, devDependencies, `check-generated` second block, ADR 0046 and the 0028 amendment, the entry comment move (landed in `src/index.ts`), migration order.

## Success path versus refusals
No task has an all-refusal criterion set. Guard tasks (03, 06) have the allow path in the golden cases (`claude-bash-allow`, `codex-bash-allow`) and in the unchanged git-guard tests. The Task 13 gate test covers the pass case (headed file, allowlisted fixture).

## Satisfied-in-a-way-that-does-not-prove-it
- Task 13 criterion "ALL GREEN" cannot show the new gate is wired (3).
- Task 01 criterion "`package.json` has exact versions" is a point-in-time read (6).
- Task 12 and 11 case-count proofs live in the ledger, not in the repo; acceptable, noted only.
