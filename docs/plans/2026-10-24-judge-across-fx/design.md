# The judge across fx: lane hints, subagent sizing, edit rules and review helpers

**Date:** 2026-10-24
**Status:** ready-for-agent
**Approved:** 2026-10-24
**Glossary:** none (fx has no `CONTEXT.md`); terms below are defined in this file and in `docs/plans/2026-10-22-fx-judge-hooks/design.md`

## Problem Statement

The owner's goal for the judge (a typed decision model behind `POST /v1/systemone`, local or hosted) is to use it wherever it makes fx faster or more accurate. Sub-project 2 used it in two places only: grey shell commands and the Stop check's overclaim question. The before/after benchmark (`docs/plans/2026-10-22-fx-judge-hooks/benchmark.md`) showed those parts work but rarely fire with a careful model, and that the owner's research (`/development/promots/jev-research.md`, `jev-adapt-for-fx.md` section 5) lists several uses fx never built:

- Lane choice rests on the model reading skill descriptions. Nothing classifies the user's request, and the only lane hook is a file-path nudge that fires once per repository.
- Subagent model tiers are checked by one plain-code rule (no model or an unjustified costly model becomes sonnet). Nothing judges whether a dispatch is a simple lookup that a cheaper, faster model handles as well; this use was swept out with per-turn routing without its own reason.
- Repository rules ("no em dashes in docs", "every foreign key gets an index") live in prose that an agent can ignore at edit time.
- fx-review chooses lenses from the implementer's own `Tripwires:` line and broad file patterns; a missed tripwire skips a lens, a generated skeleton can trigger one, and a lens reads a whole diff to find the few functions that matter.

## Solution

Use the judge in four more places, each only after its question has been measured and has cleared a bar on the owner's local judge (approach A, measure first):

1. **Lane hint.** On each new user prompt, the judge picks the fx lane the request looks like, in two short questions, and fx adds one line to the model's context. The model still decides.
2. **Subagent sizing.** When a dispatch would run on sonnet with no stated reason, and the judge is confident it is a read-only lookup or a small fully specified edit, fx runs it on haiku.
3. **Edit rules.** Before a write or edit, fx checks the new content against fx's built-in rules and the rules the repository chose in `/fx-setup`; a confident breach refuses the edit with the rule as the reason.
4. **Review helpers.** fx-implement and fx-review get a judge command that adds a lens a diff needs but the implementer's line missed, separates authored files from generated ones, and points each lens at the functions its question flags, in any common language.

Every new decision is logged, fails open (except an edit refusal, which needs a confident judge to happen at all), and costs nothing when no judge is configured.

## User Stories

1. As an fx user with no judge configured, I want none of these features to run or slow anything, so that a fresh install behaves as today.
   **Note, amended 2026-10-24 by plan red-team:** the three built-in edit rules (decision 5) are plain code checks and run with no judge; they send nothing and add no measurable time. Every judged feature still sends nothing with no judge.
2. As an fx user with a judge, I want each feature enabled only if its question passed the measured bar, so that an unproven judge decision never reaches my session.
3. As an fx user, I want my request classified into an fx lane when I send it, and one line in the model's context naming that lane, so that the right lane runs even when the model would have missed it.
4. As an fx user, I want no lane hint for slash commands, fx's own continuation messages, subagent prompts, or when the judge is unsure, so that the hint is never noise or a guess.
5. As an fx user, I want the hint visible to the model only, so that my terminal does not fill with fx lines.
6. As an fx user, I want a dispatch that asks for no particular model, or for sonnet with no stated reason, to run on haiku when the judge is confident it is a read-only lookup or a small fully specified edit, so that simple subagent work is faster and cheaper.
7. As an fx user, I want a dispatch carrying a `Capable because:` line never lowered, only noted, so that a deliberate choice of a capable model stands.
8. As an fx user, I want fx's built-in edit rules applied in every repository, so that common hygiene holds without setup.
9. As a repository owner, I want `/fx-setup` to propose rules suited to my repository's stack and let me pick which apply, so that I never hand-edit rule lists.
10. As an fx user, I want an edit that confidently breaks a chosen rule refused with the rule and file named, so that the agent fixes it before it lands.
11. As an fx user, I want an edit the judge is unsure about allowed with one advisory line, so that a weak judge never blocks real work.
12. As an fx maintainer running fx-implement or fx-review, I want a lens added when the judge says a diff hits its tripwire though the implementer's line did not name it, so that a missed tripwire still gets reviewed.
13. As an fx maintainer, I want the judge never to remove a lens the implementer's line named, so that a judge mistake costs at most one extra review.
14. As an fx maintainer, I want generated files (skeletons, lock files, compiled output) told apart from authored ones, so that lenses do not fire on code nobody wrote.
15. As an fx maintainer, I want each lens handed the functions in the diff that its question flags, so that a lens on a large diff starts where it matters.
16. As an fx user working in Ruby, TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Swift, C#, F#, VB or PHP, I want functions found in my language, and the whole hunk used where none can be found, so that per-function search works in my stack.
17. As an fx user on opencode 2.x, I want these features if the runtime waits for the judge, and a plain statement in the docs if it does not, so that I know what runs there.
18. As a repository owner, I want to switch the lane hint, subagent sizing or edit rules off for one repository, so that a repository with unusual needs can opt out.
19. As the fx author, I want every judge question scored on a labelled set before its feature ships, and fx's lane-triggering and review benches run before and after, so that "faster and more accurate" is measured.

## Implementation Decisions

**1. Measure first.** Each judge question gets a labelled set in this plan's directory (JSON, like `guard-calibration-set.json`) and is scored on the owner's local judge (`nimble:9b` on Ollama at loopback; Kev-4B or Rizzo Flow if installed). A feature ships enabled only if its question clears its bar; one that fails stays in code, logs what it would have done, and does nothing else, until a judge passes. Bars: edit-rule refusals 95% precision on breaches (a wrong refusal blocks work); lane hint, subagent sizing and review helpers 85% accuracy. The scores and the judge that produced them go into a new ADR.

**Note, amended 2026-10-24 by coverage audit:** the bar applies per rule for edit rules (ruling C2): the feature is enabled when at least one rule cleared its own bar, and only those rules may refuse. The built-in code checks act at any gate (ruling C3). `review-authored` scored 83% against 85% and stays log-only.

**Note, amended 2026-10-24 by plan red-team:** subagent sizing is scored as precision on `lower` (a wrong lower costs quality, a wrong keep only money), not accuracy. The edit-rule bar also needs at least 30 confident breaches and at most 10% unsure answers on clean items; tripwire and search sets hold at least 20 items per lens. Only a repository or catalogue rule whose own labelled items cleared the 95% bar may refuse; every other judged rule only advises. Whether the owner's judge serves concurrent requests is measured too, and edit rules and the review command follow the result.

**2. Question shape.** Every request carries at most 2 questions and every choice at most 6 options, the range local judges were measured on (sub-project 3 uses the same limit). An answer with `escalate` set, or below the question's threshold, counts as unsure. All calls use the existing judge client, its 1,500 ms budget, redaction, decision log and the shell guard's circuit breaker pattern.

**Note, amended 2026-10-24 by plan red-team:** the new features use the same breaker rule on a breaker of their own, so their failures never stop the shell guard's judge calls; the review command, which has no session, keeps one in memory per run.

**3. Lane hint.** Runs at the prompt boundary each harness already uses (Claude Code and Codex `UserPromptSubmit`, opencode `chat.message` and the 2.x prompt hook). Two questions in one request: the kind of work (new feature or change in design, code change with known behaviour, a failure, review of existing changes or code, writing for people or agents, outside research, or none), then the lane within that kind, choosing among at most 6 lanes. Skipped for slash commands, text starting `[fx] `, subagent prompts, and prompts of fewer than 3 words. A confident answer adds one line to the model's context (`[fx] lane hint: <lane>`); no user-visible output. Logged with the answer and latency.

**Note, amended 2026-10-24 by coverage audit:** opencode 2.x gets no lane hint, because its 2.1.4 prompt event carries the text and no agent field (ruling, task 05). A harness that omits session ids gets none either (the hint logs `no-session`).

**Note, amended 2026-10-24 by plan red-team:** the lane question depends on the kind answer, so the two cannot share one request. The first request carries `kind` and a yes/no `research` question; `change` and `failure` have one lane each and `other` resolves to research or none from that same answer, so a plain question costs one request. Only `build`, `review` and `writing` send a second request with the lane question, and only while at least one 1,500 ms budget remains of an overall 2,500 ms deadline. The seven kinds above become six options: outside research and none share `other`. On opencode 1.x a slash command arrives as its expanded text and cannot be skipped (a recorded GAP).

**4. Subagent sizing.** Extends the existing dispatch rule (ADR 0031) in the PreToolUse dispatch branch. When the rule would leave or set sonnet and no `Capable because:` line is present, the judge classifies the dispatch's task kind (read-only lookup, small fully specified edit, implementation, design or review, security-critical, side-effecting). A confident lookup or small edit rewrites the model to haiku; anything else leaves it. A justified dispatch is never rewritten; when the judge calls it a lookup, fx adds one context line saying so. Only harnesses whose dispatch tool takes a model field are rewritten; the plan's first task records which do (Claude Code's Agent tool does; Codex and opencode are checked from their sources or installed binaries).

**Note, amended 2026-10-24 by coverage audit:** sizing acts on Claude Code only. Codex and opencode 2.x get none: no cheap-tier model is recorded for either, Codex PreToolUse cannot rewrite input under ADR 0023 and its spawn message reaches hooks encrypted, and whether an opencode 2.x plugin may change a call's input is unmeasured. The drafted task 14 for them was dropped.

**5. Edit rules.** Run in PreToolUse for Claude Code `Write`, `Edit`, `MultiEdit`, `NotebookEdit`, Codex `apply_patch` and opencode `edit` and `write`, after the existing fx-state refusal. A rule is `{ id, glob, rule }`: a stable id, a file glob, and one sentence the judge checks the new content against. fx ships built-in rules (no em or en dashes in Markdown, no secrets or private keys in source, no merge-conflict markers left in a file); a repository adds its own in `.fx.json` under `rules`. One yes/no question per matching rule, at most 2 per request, over the changed text only. A confident breach refuses the edit with `[fx] rule <id>: <rule> (<file>)`; an unsure answer allows it with one advisory line; no judge, or a failed call, allows it silently. There is no stamp: the owner changes the rule list instead.

**Note, amended 2026-10-24 by coverage audit:** refusal is keyed on the rule id plus the exact measured text and glob; a rule reusing a refusing id with other text or glob only advises. A file-scope rule receives at most 2,000 characters of the post-edit file (`EDIT_FILE_CHARS`) until a new measurement supports more.

**Note, amended 2026-10-24 by plan red-team:** the built-in rules are checked in plain code, not by the judge: `no-dashes` and `no-conflict-markers` exactly, and `no-secrets` by whether the fx redactor finds a secret; they refuse with or without a judge. Judged rules see the lines an edit adds (a write is compared with the file on disk), not the whole new text; a rule marked `scope: "file"` also receives the whole post-edit file, capped. A confident breach refuses only for a rule measured on its own labelled set (decision 1); for any other rule it advises. One edit's requests go out together or one at a time as measured, inside one 2,500 ms deadline.

**6. Rule picker in `/fx-setup`.** fx-setup inspects the repository's stacks, proposes a short list of rules for them (from a catalogue shipped with fx, per stack), asks the owner which apply through the host's question tool, and writes the chosen ones to `.fx.json`. Rules are read from the git top level, as `.fx.json` is today, and only the owner's `/fx-setup` run writes them.

**Note, amended 2026-10-24 by plan red-team:** `/fx-setup` runs as the agent, so the agent can write `.fx.json` too; nothing stops it. The health line and the Stop check print a one-line notice when the `rules` or `hooks` of `.fx.json` changed during the session, and the new ADR records this as an accepted gap.

**7. Review helpers.** A judge command fx-implement's controller and fx-review run (lenses have no shell, so the controller passes results in briefs). Three subcommands over a review package or diff:
- `tripwires`: one yes/no per lens tripwire over the diff; returns lenses to add beyond the report's `Tripwires:` line. It never removes one.
- `authored`: per triggering file, generated or authored; generated files are dropped from lens triggers and named in the brief.
- `search`: split the changed files into functions (decision 8), ask each lens's question per function, return the flagged functions with file and line for the lens brief.
Large diffs are chunked so every request stays inside the local judge's context; a chunk the judge cannot answer is reported as unchecked, never as clean.

**Note, amended 2026-10-24 by plan red-team:** `tripwires` adds a lens only when a chunk answers yes at `p >= 0.9`, since a small per-chunk false-positive rate adds up over a large diff; every subcommand stops asking after three timeouts or connection failures in one run and reports the rest unchecked.

**8. Function splitter.** Language-agnostic: definitions found by per-language signature patterns (keywords and visibility modifiers for each listed language family, including C#, F# and VB), with indentation or brace matching to find each body. Where no definition is found, the changed hunk is the unit. A pure function with a test per language family.

**9. opencode 2.x.** The plan's first task measures on the installed 2.1.4 whether a promise returned from `tool.execute.before` is awaited before `permission.evaluate`. If it is, the 2.x plugin gets the judge (the shell guard's judge step and the features above); if not, 2.x stays rules-only and `references/harnesses/opencode-v2.md` says so with the measured evidence.

**Note, amended 2026-10-24 by plan red-team:** the probe runs against the owner's local OpenAI-compatible server on `127.0.0.1`, inside fx's bwrap jail with a scratch home, and the only command it lets run is `true`. If the probe cannot run the fact is UNVERIFIED; then 2.x keeps the built-in edit-rule refusals (a synchronous throw), and its judged edit rules only advise.

**10. Switches and logs.** `.fx.json` `hooks` gains `lane_hint`, `dispatch_sizing` and `edit_rules`, each defaulting to on and off when false, read from the git top level as today. Every new decision appends one decision-log line with its own event name and the judge's answer.

## Testing Decisions

- **Seams:** the existing ones. Unit tests for the question builders, the function splitter, the rule matcher and the review command's parsing; process tests for each hook with the fake `/v1/systemone` server; opencode plugins in-process; `scripts/check-all`.
- **Good test here:** what a harness, the controller or the owner observes: a hook's output and exit code, the context line added, the dispatch model after the hook, the refusal text, the lenses the review command returns, the decision-log line. Never internal helpers.
- **Measurement:** the labelled sets per question (decision 1) are fixtures with a scoring script, kept in the plan directory; fx's `tests/lane-triggering` (17 prompts) and `tests/review-bench` (9 cases) run before and after, live, inside the conformance jail, on Haiku 5.5 through OpenRouter, with the local judge on loopback.
  **Note, amended 2026-10-24 by plan red-team:** the review bench measures fx's task reviewer, which the review helpers do not feed (they feed lenses), so its after-run is a no-regression check; the helpers' accuracy is their labelled-set scores (story 19 is met by those scores, not by the bench).
- **Prior art:** `tests/gates/shell-guard-claude.test.js` (judge decisions at the process seam), `docs/plans/2026-10-22-fx-judge-hooks/guard-calibration-set.json` and `scripts/guard-calibrate` (a labelled set scored on a real judge), the benchmark's offline scripts.

## Global Constraints

- The judge-hooks rules stand: no judge means no network call; nothing leaves the machine unless the user configured a remote judge; redaction before every request and log line; 1,500 ms budget per call; logs and journals 0600.
- At most 2 questions per judge request and at most 6 options per choice question.
- A feature whose question has not cleared its bar logs only and acts on nothing.
- Lane hints and sizing notes are context lines for the model, never user-visible output.
- An edit refusal needs a confident judge answer; any judge failure allows the edit.
  **Note, amended 2026-10-24 by plan red-team:** a built-in edit rule refuses from its code check without a judge; a judged refusal still needs a confident answer, and any judge failure allows the edit.
- The judge never removes a review lens and never lowers a dispatch that carries `Capable because:`.
- Every test that runs a hook or plugin sets HOME, XDG_CONFIG_HOME, XDG_STATE_HOME, APPDATA, LOCALAPPDATA and TMPDIR to scratch directories.
- No command string from a test or a labelled set is ever executed; dangerous strings live only as data.
- TypeScript under `src/`, compiled by `scripts/build`; no runtime dependencies; no em or en dashes; no attribution trailers; nothing is pushed or merged by the agent.

## Out of Scope

- Per-turn model routing for the main session (needs a proxy or an early-access flag; breaks the prompt cache).
- Context compaction and prompt-injection scanning of tool output.
- The browser agent (sub-project 3) and moving the Python and bash tooling to TypeScript (sub-project 4).
- A cascade from a local judge to a hosted one.
- A stamp or other in-session override for edit-rule refusals.
- Calibrating the existing shell guard thresholds.

## Open Questions

None. Facts settled by the plan's first task: which harnesses' dispatch tools take a model field (decision 4) and whether opencode 2.1.4 awaits `tool.execute.before` (decision 9).

## Further Notes

- Builds from `main` at `273cea6` (the checkpoint with the TypeScript migration and the judge hooks). The judge-hooks task 14 fixes merge first.
- `scripts/build` in a worktree reads `../../package.json` from the parent checkout, so a merge in progress there breaks worktree builds; the plan should avoid editing the main checkout while tasks run, or the build should resolve its own package file.
- Research: `/development/promots/jev-research.md` and `/development/promots/jev-adapt-for-fx.md` (section 5, the adoption table).
