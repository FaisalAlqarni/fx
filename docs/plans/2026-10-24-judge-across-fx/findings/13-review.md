### Spec Compliance

- ❌ Issues found: one coverage-gap fix is incomplete (gap 10, plan.md:104, see Important 1). Everything else in the brief and gaps 1 to 12 is covered.
- ⚠️ Cannot verify from diff: the live benches and the jail letting loopback through (owner's pilot step); `scripts/check-all` ALL GREEN (not re-run, per instructions); whether the stale `.fx.json` notice behaviour (next Stop or resume, no notice on 2.x, 1.x baseline resets on reload) matches task 07 and 08 code, which is outside this diff.

Checks I ran (all through scripts/scratch-env, no network):
- `bash tests/conformance/bench-judge.test.sh`: 15 ok lines, `bench-judge: ok`.
- `node tests/gates/judge-adr.test.js`: `judge-adr: ok`.
- `node tests/gates/release-version.test.js`: OK. It checks only `.claude-plugin/plugin.json`; all five files carry 0.4.0 in the diff and no 0.3.1 remains in package.json, package-lock.json, .claude-plugin, .codex-plugin, .agents.
- `scripts/check-prose` on ADR 0048, benchmark.md, README.md, INSTALL.md, tests/review-bench/README.md: OK.
- Read the ADR and benchmark.md commands; ran none of the live ones (they need the claude CLI, a key and a judge). `benchmark.md` command order is self-contained: pilot, before, after; the base commit 402e983 is an ancestor of HEAD.

Coverage-audit gaps against the diff:
- Gap 1 (sizing Claude Code only): design.md decision 4 note, plan.md row 06, ADR bullet, README, INSTALL. Covered.
- Gap 2 (no hint on 2.x): ADR harness-facts bullet, INSTALL 2.x paragraph (INSTALL.md hunk after "### The guard"), README. Covered; gate pins only the substrings `no lane hint` and `opencode 2.x` (Minor 4).
- Gap 3: judge-adr.test.ts:771-776 compares the edit-rules row to the per-rule rows and pins the aggregate as log-only. Covered; ADR paragraph explains it.
- Gap 4: design.md decision 1 note; ADR "What acts now". Covered.
- Gap 5: ADR line "Refusal is keyed on the rule id and its exact measured text and glob", README paragraph under the catalogue. Covered.
- Gap 6: README catalogue table; gate rows 800-806 check each id once, text, glob, refuses or advises against RULE_CATALOGUE and REFUSING_RULES. Covered.
- Gap 7: ADR "Accepted gap" paragraph names no-secrets, notice timing, 2.x no notice, 1.x baseline reset; gate pins `no-secrets` included. Covered.
- Gap 8: ADR decision-log table with six sources, gate rows 798-799. Covered in the ADR; the INSTALL troubleshooting half was not done (Minor 2).
- Gap 9: ADR "How far to trust the scores", gate line 795. Covered.
- Gap 10: ADR and README state 2,000; gate pins EDIT_FILE_CHARS; plan.md:159 fixed. plan.md:104 not fixed (Important 1).
- Gap 11: ADR "Failure handling" sentence, gate pins it. Covered.
- Gap 12: ADR "Smaller facts" has the Codex `--unhandled-rejections=warn` caveat and both secret-file skip lists. Covered.

Statements spot-checked against code and scores.md:
- ADR scores table, per-rule rows and concurrency row equal scores.md character for character; FEATURE_GATE, REFUSING_RULES (`dotnet-no-blocking-async`, `web-img-alt`), JUDGE_CONCURRENCY `sequential`, MEASURED_RULES match (src/lib/judge-features.ts:37-56).
- README catalogue ids, text, globs equal src/lib/rule-catalogue.ts:6-24.
- Built-in rules, no-dashes, no-secrets, no-conflict-markers: src/lib/edit-rules.ts:21-33. File-scope cap 2,000: judge-thresholds.ts:41, judge-questions.ts:139. `p >= 0.85`: EDIT_BREACH_MIN_P 0.85, judge-thresholds.ts:36.
- Secret-file skip lists: edit-rules.ts:212 (`.env*`, `*.pem`, `*.key`, `id_rsa*`, `id_ed25519*`, added lines only, line 310) and judge-review.ts:66-71 (also `.npmrc`, `.git`). ADR and README describe both correctly.
- Sizing judges only general dispatches and not `Plan`: dispatch-sizing.ts:44, dispatch-route.ts:15,23. ADR text is right.
- `judge-cli.js rules` exists (judge-cli.ts:113); `judge-review` takes tripwires, authored, search (judge-review.ts:21).
- Decision-log `judge-off` is written by the opencode 2.x plugin (fx-opencode-v2.ts:349); `no-session`, `judge-config`, `judge-down`, `judge-error`, `judge` exist in src.
- ADR 0031 amendment line is the exact wording the brief asks. design.md diff is notes only; line 5 `**Approved:** 2026-10-24` untouched.
- Haiku 4.5 in benchmark.md matches tests/conformance/lib/openrouter.js:49 (the brief's "5.5" is not what the code uses).
- benchmark.md states that the lane bench ignores FX_LIVE_PROVIDER (ruling on task 13 concern 1): present.

### Strengths

- `place_bench_judge` is small and exact to the contract: unset or empty returns 0 and creates nothing, mode 700 dir and 600 file via `install -m`, message and return 2 on a bad path (bench-judge.sh:5-14). The test checks bytes, both modes, stderr text and that nothing is created on the error path.
- The "called once, after the scratch HOME" check is text-anchored per script, and handles the review row's HOME being set by the runner by anchoring to `live.sh`, which is the check that refuses a real HOME.
- The gate is not tautological: it recomputes nothing from the ADR's own numbers, it reads FEATURE_BARS, FEATURE_GATE, REFUSING_RULES, JUDGE_CONCURRENCY and RULE_CATALOGUE from the code and compares cell by cell. It also catches a README row listed twice.
- ADR 0048 states the uncomfortable facts plainly: sets written by the build agent, two results passing exactly at the bar, the aggregate edit-rules row reading log-only while the feature is enabled, the `no-secrets` hole.
- The version bump covers all five files.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

1. docs/plans/2026-10-24-judge-across-fx/plan.md:104 · the constants row still reads `(0.85, 3, 2000, 4000, 2500, ...)`, so `EDIT_FILE_CHARS` is shown as 4000 while the code has 2000 (judge-thresholds.ts:41). · Coverage gap 10's fix names this row ("plan.md's constants row still lists 4000"), and the controller's ruling folds gap 10 into plan.md. The plan now contradicts the ADR and code. · Change that value to 2000 and add the dated amendment note the other plan.md edits carry.

#### Minor (Nice to Have)

1. tests/lane-triggering/run-test.sh:82-93 · the script sets HOME but not XDG_CONFIG_HOME, and jail.sh:100 passes an exported XDG_CONFIG_HOME through. fx reads its config from `$XDG_CONFIG_HOME/fx` first (fx-paths.ts:14), so on a machine with it exported the placed `$HOME/.config/fx/judge.json` is ignored and the owner's real judge config is read instead, in the "before" run too. The review bench is safe (run.sh:74 sets it to `$HOME/.config`). Fix: set `XDG_CONFIG_HOME="$HOME/.config"` next to HOME; the benchmark.md pilot would otherwise be the only catch.
2. INSTALL.md "## Judge (optional)" · gap 8 asked for decision-log troubleshooting there; only the ADR carries the `source` table. 
3. docs/adr/0048-the-judge-acts-only-where-measured.md per-rule rows and the concurrency row · they follow the scores table with no header or separator row, so Markdown renders them as plain text lines, not tables. They are copied as scores.md has them, and the gate needs the `|` lines, so adding a header row (`| rule | metric | value | confident | unsure-clean | bar | gate |` and a separator) keeps the gate working only if the `rule ` prefix test is kept; check before changing.
4. src/tests/gates/judge-adr.test.ts:796 · the 2.x statements (no lane hint, shell judge not used, edit rules awaited) are pinned by the loose substrings `opencode 2.x` and `no lane hint`; INSTALL's 2.x paragraph is not asserted at all (the audit asked for one fixed sentence). Pin one full sentence in each of the ADR and INSTALL.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** The helper, wiring, ADR, gate, docs and version bump are accurate against the shipped code and scores.md and the offline tests pass; one coverage-gap fix (plan.md:104 still says 4000) was missed, which is a one-line change.

## Ledger lines

Task 13: minor (deferred): run-test.sh does not set XDG_CONFIG_HOME, so an exported value sends the judge config to the wrong place (and the real one into the before run).
Task 13: minor (deferred): INSTALL Judge section lacks the decision-log troubleshooting promised by coverage gap 8; only the ADR has the source table.
Task 13: minor (deferred): ADR 0048 per-rule and concurrency rows have no table header, so they render as plain text.
Task 13: minor (deferred): the judge-adr gate pins the opencode 2.x statements only by loose substrings and does not assert INSTALL's 2.x paragraph.
