### Spec Compliance (✅ | ❌ with file:line; ⚠️ cannot verify)

- ✅ `render({ harness, cwd, subagent: true })` contains no `Unfinished plans` heading, for every harness in `HARNESSES`. lib/preamble.js:81-87 gates the `describePlans` call behind `if (!subagent)`; lib/preamble.test.js:172-181 loops `HARNESSES` and asserts `doesNotMatch`.
- ✅ The same call without `subagent` still contains the plans block. lib/preamble.test.js:173,175 (`session` render, `assert.match`).
- ✅ The existing `SubagentStart` hook assertion now compares against `render({ ..., subagent: true })`, and a matching `SessionStart` assertion was added. lib/preamble.test.js:138-144.
- ✅ The subagent render still starts with the fixed intro and carries the 111-subagents marker; the 35-patterns marker is not touched by the code change (the gate only wraps `describePlans`, PREAMBLE.md's own text is unconditional), so it is still present, but the test only asserts the 111 marker (lib/preamble.test.js:177-178), not 35-patterns. Structurally satisfied, not directly asserted; see Issues.
- ✅ Piping `{"hook_event_name":"SubagentStart", ...}` into `hooks/fx-context.js` yields no plans block, `SessionStart` yields it with. Confirmed by the report's manual grep -c run and by hooks/fx-context.js:57 (`subagent: input.hook_event_name === 'SubagentStart'`).
- ✅ Codex changed only where its handler already knows the event: `hooks/fx-codex.js:230` is the same `if (input.hook_event_name === 'SubagentStart' ...)` block already used for `recordAgentIdentity`, and the `render` call at line 239 sits in the single code path both `SessionStart` and `SubagentStart` fall through to (verified by reading the full routing in `hooks/fx-codex.js`, not guessed).
- ✅ opencode (`plugins/fx.js`) left unchanged, correctly: `render({ harness: 'opencode', cwd })` runs once at plugin construction (plugins/fx.js:204) and the `experimental.chat.system.transform` call site the report cites (plugins/fx.js:225) carries no per-call subagent signal; verified by reading the file, matching the report's claim.
- ✅ Render without `subagent` is byte-identical for every existing caller: default parameter `subagent = false` (lib/preamble.js:59) and the gate only removes text on an explicit `true`; `plugins/fx.js` is untouched, `hooks/fx-context.js`/`hooks/fx-codex.js` pass `false` for every non-`SubagentStart` event, same as before.
- ✅ TDD evidence: report shows a real RED (`claude-code: a subagent does not`, failing on `doesNotMatch`) before `lib/preamble.js` was touched, then a second RED on the updated hook assertion before `hooks/fx-context.js` was wired, then GREEN.
- ✅ Stage by path: commit ef5206f touches exactly `hooks/fx-codex.js`, `hooks/fx-context.js`, `lib/preamble.js`, `lib/preamble.test.js` — matches the task's `git add` list plus the conditional `fx-codex.js` addition (changed, so correctly included); `plugins/fx.js` and version files correctly absent (unchanged, no bump needed).
- ✅ No em or en dashes, no attribution trailers, introduced in the diff itself (checked line by line; the one em dash in the diff, hooks/fx-codex.js "fall through — emit anyway", is a pre-existing unchanged context line).

### Strengths

- Smallest possible diff for the requirement: one boolean parameter, one `if` around the one call that needed gating; bootstrap and `repo.md` note paths are untouched (lib/preamble.js:59-87).
- Codex and opencode were each traced end to end before deciding whether to touch them, not assumed from the task's phrasing (report's "Self-review" section, confirmed by reading both files independently in this review).
- Test loops every harness for both the positive and negative case and additionally asserts the subagent render equals the render of a repo with no plan at all (lib/preamble.test.js:179-180), a stronger check than the acceptance criteria required.

### Issues (Critical / Important / Minor)

**Minor** — lib/preamble.test.js:179: `fs.mkdtempSync(path.join(os.tmpdir(), 'fx-empty-'))` is created fresh inside the harness loop (once per entry in `HARNESSES`) and never removed; only the outer `dir` is cleaned up in the `finally` block. Three temp directories leak per test run.

**Minor** — lib/preamble.test.js:178: the acceptance criteria ask the subagent render to carry both the 111-subagents and the 35-patterns markers; only the 111 marker is asserted with a regex. The 35-patterns marker is preserved in practice because the gate never touches PREAMBLE.md's own text, but that guarantee rests on reading the code, not on an assertion in this test.

**Minor** — tests/gates/codex-hook-output.test.js:45-50: pins only the output's key shape (`keysOk`) for Codex's `SessionStart` and `SubagentStart` cases; it never asserts the plans-block content difference for Codex the way lib/preamble.test.js does for `hooks/fx-context.js` (lines 136-144). The Codex wiring's content-level correctness is proven only by code inspection plus the harness-generic unit test in lib/preamble.js, not by an end-to-end pipe check on fx-codex.js itself.

**Minor** — no test in this diff exercises `hooks/fx-context.js` or `hooks/fx-codex.js` with a missing or unknown `hook_event_name`. Both hooks default to `subagent: false` in that case (ternary compares against the literal string `'SubagentStart'`), which is the safe default (full render, no missing rules), but the review's own quality lens calls this edge case out and it is untested before and after this change.

**Minor (observational, not a gate finding)** — the task's own report, `.fx/2026-09-23-lean-build/reports/06-subagents-skip-plans-block-report.md`, lines 23, 25, 26, 27, uses em dashes, against the standing house rule against em or en dashes in agent output. `.fx/` is gitignored so this does not trip `check-prose` or affect the shipped diff.

### Assessment (Approved | Needs fixes)

Approved.
