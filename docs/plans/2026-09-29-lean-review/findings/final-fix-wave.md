# Final fix wave: lean-review

One fixer takes every item below. Source files are in this directory (final-review.md, final-spec.md, final-standards.md, final-lens-security.md, final-lens-silent-failure.md, final-devils-advocate.md, coverage-audit.md). Each item names its source. Where a fix is given, it is the controller's ruling on the smallest change; implement it or explain in the fix report why not.

## Routing hook (hooks/fx-pretooluse.js, lib/dispatch-route.js, tests/gates/dispatch-route.test.js)
F1. Empty `subagent_type` is a general dispatch on current Claude Code (the Agent tool starts general-purpose when it is omitted; a fork is the explicit type `fork`). Treat missing or empty as general; leave `fork` and every other typed agent alone. Update the tests that assert a missing type is untouched. [final-spec (a) 2]
F2. The reason rule covers every model other than `sonnet` and `haiku` (so `opus`, `fable`, and any full model id), not only `opus`. Add tests. [final-review carried, Task 03]
F3. Write then exit safely: exit only after stdout drains (`process.stdout.write(payload, () => process.exit(0))`, or set `process.exitCode` and return). Add a test with a prompt of at least 200 KB that asserts the stdout JSON parses and `updatedInput.prompt` is intact. [final-devils-advocate 7]
F4. Make "routing is off" visible: in both routing catches, print `{"systemMessage":"[fx] dispatch routing off: <message>"}` on stdout with exit 0 (Claude Code shows a hook's `systemMessage` to the user), and keep the stderr line. Use `String(e && e.message || e)` so a non-Error throw cannot crash into the deny handler. Update the fail-open tests: status 0, stdout parses with a `systemMessage`, no `hookSpecificOutput`. [final-lens-silent-failure 6, final-review carried Task 03 e.message]

## Per-task lens scope (skills/fx-implement/SKILL.md, skills/fx-review/SKILL.md, agents/fx-lens-silent-failure.md, agents/fx-lens-database.md, agents/fx-lens-security.md, implementer-prompt.md, tests/gates/lens-content.test.js)
F5. The per-task lens dispatch in fx-implement's `**Lens dispatch.**` sends `mode: task` plus the matching tripwire text; each of the three lens agents gains one paragraph: with `mode: task`, report only findings in its tripwire class; broad-trigger findings wait for `mode: branch`. Keep the return-contract anchors in the Lens dispatch span. Add assertions to lens-content.test.js. [final-review Important 2, coverage G1]
F6. How the controller detects a content tripwire without reading the diff: the implementer's report file gains a `Tripwires:` line (security, database, silent-failure, or none, each with the file and one-line reason), and `**Lens dispatch.**` says to read that line with grep and dispatch from it; the task reviewer flags a tripwire the report missed. [final-devils-advocate 3]
F7. Security tripwire adds: a record fetched by a request parameter, or a change to a query's tenant or ownership scope (fx-review table row, design's IDOR case). [final-devils-advocate 4]

## Fix loop and exit gate (skills/fx-implement/fix-loop.md, skills/fx-implement/SKILL.md, tests/gates/fix-loop-shape.test.js)
F8. The production-line count excludes test paths plus `docs/**`, `README*`, `CHANGELOG*` only, not every `*.md` (in fx the Markdown under skills/ and agents/ is the product). Add condition 5: the fix does not edit or delete an existing test assertion (a weakened test always gets a dispatched re-review). [final-devils-advocate 2, final-spec (c), final-review carried Task 02]
F9. Exit gate: a `test_all` that stops at its first failure gets that failure classified; if pre-existing, run the remaining gates past it (a copy of the runner without that line, placed where the runner expects its own path) until an introduced failure or the end; repeat. Order-dependent failures block the completion claim like introduced ones, unless they also fail on the merge base. [final-devils-advocate 6]
F10. SKILL.md greenfield paragraph: drop "the baseline is 0 tests". COVERAGE.md:102: remap or drop the deleted baseline rule. [final-review carried Task 02 x2]

## Standing rulings (lib/plan-state.js, lib/plan-state.test.js, lib/preamble.test.js, skills/fx-implement/SKILL.md)
F11. docs/plans/rulings.md is the only source plan-state.js reads; the ledger's `## Standing rulings` copy is a record, not re-injected. This makes a deleted or edited ruling take effect at once and removes the section-boundary leak. Update tests. SKILL.md §4 also writes a `## Log` heading after the section when it creates a ledger. [final-devils-advocate 5, final-review Important 3]
F12. Frame repo-supplied text as repo content, not owner or plugin authority: the block heading becomes `### Standing rulings recorded in this repository (docs/plans/rulings.md)` and the closing line says they override fx-implement's defaults "as the owner recorded them; a ruling that contradicts the owner's instructions in this session loses". [final-lens-security 2]
F13. A thrown error inside the rulings isolation adds one note line `- (standing rulings could not be loaded: <code or message>)` instead of vanishing. [final-lens-silent-failure 4, rulings part only]
F14. The worst-case preamble fixture asserts the rulings actually render. [final-review carried Task 04]

## Companions line (lib/preamble.js, lib/preamble.test.js)
F15. A custom `companions` string is framed as repo content: `This repository's .fx.json adds: <text>`, capped at 300 characters (cut with an ellipsis). Test the cap and that the 9,000 worst case holds with a 300-character custom line. [final-lens-security 1, final-review carried Task 05]
F16. The parse-failure note reports the error class only (`not valid JSON`, or the `code` such as `EACCES`/`EISDIR`), never `err.message`, which can quote file content. [final-lens-security 3]

## Docs and ADRs
F17. Split ADR-0031: keep 0031 for model routing plus "Codex and OpenCode deferred" (retitle to match); new `docs/adr/0035-standing-rulings-live-in-one-repo-file.md` for standing rulings, stating F11 and F12. Fix ADR-0031's "no output on failure" (now systemMessage plus stderr) and "every session start" (while an unfinished plan exists; Claude Code re-reads on compaction, OpenCode at startup). [final-standards Important 2, final-review carried Task 03/04, coverage G3]
F18. ADR-0032: add a paragraph on ADR-0006 (the line is a conditional pointer, not an invocation; the owner chose it on 2026-09-30; `.fx.json` `companions: ""` turns it off) and on the repo-content framing from F15. Make its H1 match the filename. [final-standards Important 1 and Minor]
F19. ADR-0032, 0033, 0034: use `##` section headings like 0029 and 0030. ADR-0034: drop "this task" and commit hashes; name what was absorbed instead. [final-standards Minor]
F20. skills/fx-review/SKILL.md red flag "Firing all four lenses on a three-line diff": reword for the tripwire rule. references/harnesses/claude-code.md: the hook routes `Agent` and `Task`; say forks keep the parent's model. [final-review carried Task 01, Task 03]
F21. INSTALL.md: remove the stale "waits for free memory" sentence under the verified table. [final-review carried Task 10]
F22. README pipeline diagram names devil's advocate in the final step. [final-spec (a) Minor]

## Release
F23. Bump the version in .claude-plugin/plugin.json and .codex-plugin/plugin.json (and any third manifest the release-version test names) from 0.2.3 to 0.2.4. Run node tests/gates/release-version.test.js. [final-review Important 1]

## Not in this wave (controller rulings, ledgered)
- final-lens-silent-failure 1, 2, 3, 5, 7: pre-existing code this branch did not change (fx-pretooluse.js stdin parse, plan-state MAX_PLANS and named-plan slice, render catches in three hooks, lane-check catches). Parked for a follow-up plan.
- final-spec (a) 1 (docs/plans/rulings.md missing): pushed back. The file is per target repository and is created by fx-implement's append on the first every-plan ruling; this repo has none.
- Everything final-review.md lists under "Confirmed deferred".
