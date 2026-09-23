# Task 01 review: Build-cost report

Base 81d6d93, Head 4bd8448.

### Spec Compliance
- ✅ Spec compliant

Verified by manual trace of the task's own test against the implementation (`scripts/build-cost`), not just by trusting the reported GREEN:
- Dedup: `callKey()` uses `requestId`, falling back to `message.id`, then `uuid` (scripts/build-cost:116-118). Call usage taken from the first record with a given key; content blocks pooled across all records sharing the key (scripts/build-cost:133-149). Traced r1's two records (same requestId) through the test fixture: correctly counted as one call, tokens taken once.
- Ledger-write rule: `isLedgerWrite()` (scripts/build-cost:151-162) requires `>>` and `state.md` for Bash, or a `file_path` ending in `state.md` for Edit/Write, matching the spec exactly. Traced q1 (`grep ... state.md`, no `>>`) and confirmed it is correctly excluded from ledger writes, matching acceptance criterion "a grep of the ledger that quotes a completion line is not counted."
- `tasksCompleted` / `ctxGrowthPerTask` / `fixRounds`: regexes `COMPLETE_RE`/`FIX_ROUND_RE` (scripts/build-cost:169-170) are a correct translation of the spec's literal patterns (`\x28` is a literal open parenthesis). Traced all five controller calls by hand: completions = [1000, 3000, 5000] in completion order, `tasksCompleted=3`, `ctxGrowthPerTask=(5000-1000)/2=2000`, `fixRounds=2` (max of rounds 1 and 2 for task 02). All match the test's expected values.
- Subagent classification: `classify()` (scripts/build-cost:237-246) implements the exact precedence order from the spec (re-review, reviewer, implementer, coverage, lens, other). Verified the four opening-line regexes directly against the live template source (not just the implementer's self-review claim):
  - `skills/fx-implement/implementer-prompt.md:11` → "You are implementing task [NN]" → matches `/You are implementing task/`.
  - `skills/fx-implement/task-reviewer-prompt.md:14` → "You are reviewing one task's implementation" → matches `/You are reviewing/`.
  - `skills/fx-implement/re-review-prompt.md:15` → "You are re-reviewing one task's fix round" → matches `/You are re-reviewing/`, checked first so it is not misfiled as `reviewer`.
  - `skills/fx-review/reviewer-prompt.md:16` → "You are a senior code reviewer" → matches the second reviewer branch. This is **Ruling B** (state.md:39), which names this review as the check; confirmed compliant.
- Exit-2 cases: missing file, empty file, and a record with no `usage` were traced individually through `readRecords`/`main()` (scripts/build-cost:258-262); each exits 2 via `fail()`, writes one line to stderr, and prints nothing to stdout before any of the three checks can be reached.
- JSON shape: `controller`/`subagents`/`wallClockMs`/`controllerActiveMs` keys and nesting match the spec's example object exactly (scripts/build-cost:275-283, 312-319).
- Real-transcript run (acceptance criterion 7): report reproduces 709 controller calls, 347,230,096 tokens, matching the task's own cited figures.
- Ruling D (state.md:42, plugin version bump lands with task 01): correctly done, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json` all bumped 0.2.2 → 0.2.3, and only these three plus the task's own three files are touched: no scope creep beyond the ruling.
- No em or en dashes found anywhere in the diff.
- Test used verbatim from the task file (byte-for-byte compared); no tautological assertions, all assert real computed values against the fixture.

- ⚠️ Cannot verify from diff: whether the commit was staged by explicit path (not `git add -A`/`git add .`) and whether the full commit message body carries an attribution trailer: the diff package's commit list shows only the subject line. The controller should check `git show --format=%B -s 4bd8448` and the staged-file list for this commit.
- ⚠️ Cannot verify from diff: `controllerActiveMs` has no assertion in the task's own given test, so its correctness rests only on code inspection, not a passing test. This gap is inherited from the task's test, not introduced by the implementer.

### Strengths
- Manual trace of the fixture (all five controller calls, both subagent files) confirms every computed value: calls, tokens, tasksCompleted, ctxGrowthPerTask, fixRounds, per-type subagent counts/tokens/medianMs, wallClockMs: matches the spec's definitions exactly, not just the test's pass/fail signal.
- Regex state correctly reset (`lastIndex = 0`) before every reuse of the shared `g`-flagged `COMPLETE_RE`/`FIX_ROUND_RE` (scripts/build-cost:186, 193): a common source of silent bugs when a global regex object is exec'd in a loop across multiple ledger-write blocks, avoided here.
- TDD evidence is a genuine RED (`ENOENT`, binary did not exist) matching the exact failure step 2 of the task predicts, not a manufactured or pre-broken assertion.
- No new library, no config, no unrequested CLI options: single dependency-free file, exactly matching the plan's file list and YAGNI.
- Self-review section proactively flagged the two real ambiguities in the spec (median/p90 method, ctxGrowthPerTask ordering) rather than silently picking a definition and moving on.
- Real-transcript run cross-checked by hand (`grep -o "fix round [0-9]/5"` returning no matches to confirm `fixRounds: 0` was correct rather than a regex miss): real diligence, not just trusting the tool's own output.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None. No violated ruling found: Ruling A (task 08's concern, not this task's), Ruling B (verified compliant above), and Ruling D (verified compliant above) all hold.

#### Minor (Nice to Have)
- scripts/build-cost:110-113: `readRecords` does not catch `JSON.parse` errors; a malformed line in an otherwise-valid transcript throws an uncaught exception (multi-line stack trace, not exit code 2), rather than failing gracefully with a one-line reason. Not one of the three required exit-2 cases, so not a spec violation, but a real transcript with a truncated line would crash ungracefully. Wrap the `.map(JSON.parse)` in a try/catch and route to `fail()`.
- scripts/build-cost:211-222: `median()`/`p90()` use a plain average-of-two-middle and nearest-rank method. Reasonable stdlib-only defaults, but the spec and given test do not pin the algorithm; flagged as a concern in the implementer's own report. If a later task compares `ctxMedian`/`ctxP90` across runs, confirm the method is acceptable then.
- scripts/build-cost:203-205: `ctxGrowthPerTask` treats "first"/"last" task as first/last *completed* (chronological ledger-write order), not lowest/highest task number. This reading is the more literal one and matches the given test, but the spec text itself is not fully unambiguous on this point; worth a one-line note in the script's own comment recording the choice for future readers.
- scripts/build-cost:288-290: the subagent-directory read error is swallowed to an empty list regardless of cause (missing dir vs. permission error vs. not-a-directory); acceptable since subagents are optional per spec, but a permission error would silently look identical to "no subagents."

### Assessment
**Task quality:** Approved
**Reasoning:** Every definition in the task's Interfaces section was traced by hand against the fixture and matches exactly; both rulings assigned to this task (B directly, D via the version bump) are satisfied; no swallowed critical errors or tautological tests. Remaining items are cosmetic or spec-ambiguous, not defects.
