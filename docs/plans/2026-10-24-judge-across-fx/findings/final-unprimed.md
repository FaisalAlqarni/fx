# Final review: unprimed adversarial pass

Adversarial review (code mode), `/development/fx/.worktrees/judge-across-fx/.fx/2026-10-24-judge-across-fx/review/branch-authored.diff`

I was not told what the primed review found, so I can't mark which of these it already covered. None of them re-opens one of the five accepted decisions.

1. **Critical: `no-secrets` refuses ordinary code in every repository, with or without a judge.** `src/lib/edit-rules.ts:33` (rule declared at :22) refuses whenever `redact(added, …)` adds a `[REDACTED]` marker. That redactor is built to over-redact text before it leaves the machine (`src/lib/redact.ts:94-131`), so it is the wrong test for a refusal. These all get refused:
   - JSX `key={item.id}`, because the `KEY=value` rule at redact.ts:110 matches the name `key`.
   - Spec and locale YAML lines such as `password: 'password123'` or `password: "Password"`, and names ending in `_key` like `cache_key: x`, through colonRule at :105-106.
   - Any run of 40 or more characters from the base64 or hex alphabets: a full git SHA in markdown, a long snake_case test name, a path made only of letters and slashes like `app/controllers/admin/organizations/subscriptions`, or a lockfile `integrity` hash (:129-130).

   The only tests are `sk-proj…` (should refuse) and `const x = 1` (should not), at `src/lib/edit-rules.test.ts:60-61`. Nothing could fail on a false positive, which makes this untestable by construction.
   Fix: give `no-secrets` its own narrow detector built only from the PEM block rule (:86) and the vendor-prefix rule (:123). Add tests that must not refuse: the JSX key, the locale YAML, a SHA, a spec password fixture and a long path.

2. **Important: added lines are counted as a multiset, not as a diff, so a measured rule can refuse a correct Write.** `addedLines` at `edit-rules.ts:40`, used by `written` at :122, drops any new line that equals any existing line anywhere in the file. Example: a new `<img` block whose `alt=""` and `/>` lines already appear elsewhere in the file. The judge sees only `<img` and `src={logo}`, answers a confident breach, and `web-img-alt` refuses (it is in `REFUSING_RULES`). The same happens with `Edit` when `old_string` already holds those lines.
   Fix: use a real line diff (LCS or Myers), or send the changed hunks with a few lines of context.

3. **Important: in sequential mode a refusing rule can silently go unchecked.** `edit-rules.ts:336-345` sends the next pair only while 2,500 ms minus elapsed time is at least 1,500 ms. Once the first request takes more than about 1 s, every later pair is logged `unchecked` and allowed. The agent is not told. Pairs go in rule order, and fx-setup appends the catalogue in stack order. In a react+web repository, a `.tsx` file sends `[react-no-raw-html, react-key-not-index]` first, so `web-img-alt` comes second and usually never runs. That is the one measured refusing rule for that file.
   Fix: ask refusing rules first, and turn any unchecked rule into an `advise` line.

4. **Important: `judge-review` has no cap on how many requests it sends.** Tripwires (`src/lib/judge-review.ts:209`) and search (:273) send every chunk of every file, lockfiles and generated files included, times every pair of lenses. They run one at a time (`JUDGE_CONCURRENCY = 'sequential'`) with up to 1.5 s each. The breaker opens only on timeouts. A `package-lock.json` bump is hundreds of 1,800-character chunks times about 5 jobs each, which is tens of minutes inside fx-implement's per-task loop.
   Fix: skip `LOCK_NAMES` files and marker-generated files in tripwires and search, cap the total number of jobs (for example 60), and report the rest as `unchecked`.

5. **Important: on Codex and opencode 1.x the `.fx.json` change notice never reaches the user, and it is still used up.** The accepted gap depends on this notice, and on two harnesses it doesn't show.
   - Codex writes it to stderr on an exit-0 Stop (`src/hooks/fx-codex.ts:482`).
   - opencode 1.x queues it into the model's context (`src/plugins/fx-opencode-v1.ts:497`). That means the agent that made the edit is the one who reads it.
   - In both cases `fxJsonNotice` has already advanced the baseline, so the notice never shows again.

   Fix: read Codex's Stop output schema from the binary, as was done for `UserPromptSubmit`. If it allows `systemMessage`, use that. If not, show the notice as `systemMessage` on the next `UserPromptSubmit` or SessionStart. On opencode 1.x use `console.error`.

6. **Important: `no-dashes` blocks edits to lines that already contain a dash.** A changed line counts as added (`edit-rules.ts:30`, and `edited` at :126). Fixing a typo in an existing markdown line that already has an em dash is refused, and so is any edit to dash-heavy docs in third-party repositories. The agent's only way through is to strip prose it was not asked to touch. This goes against the plan's own risk line, "old breaches never block an edit".
   Fix: refuse only when the added text holds more U+2013/U+2014 characters than the lines it replaces.

7. **Minor: the turn journal now depends on `stop-check` loading.** `UserPromptSubmit` loads `lib/stop-check` before it journals the prompt (`src/hooks/fx-turn.ts:112`, `fx-codex.ts:411`). `stop-check` now pulls in `fx-json-watch`, the judge, `evidence` and the journal. If anything in that chain fails to load, the prompt is never journaled. The `# fx-ok` override and the Stop check's turn boundary both depend on that entry. Before this change the regex was inline.
   Fix: move `STOP_SENTENCE` into a module with no imports.

8. **Minor: on Claude Code a shell write skips every edit rule.** The `Bash` branch (`src/hooks/fx-pretooluse.ts:221`) never calls `checkEdit`, so `cat > x.md <<EOF` or `sed -i` bypasses all three built-ins. Codex checks only `apply_patch` inside a shell call. The refusal text names the rule, which tells the agent exactly what to route around. If the design accepts this, it belongs in ADR 0048. If not, run `builtinStep` on heredoc bodies the hard rules can already parse.

9. **Minor: the Codex lane-hint fact is marked MEASURED but was read, not run.** `references/harnesses/codex.md:50` calls it MEASURED, but the evidence is `strings` of the binary's schema, not a real Codex run accepting the output. The test (`src/tests/gates/codex-hook-output.test.ts:80-86`) checks only fx's own output keys.
   Fix: label it READ, or record one real `UserPromptSubmit` run on 0.164.0.
