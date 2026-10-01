# Final branch review: opencode-v2 (2c0e8d2..0208fad)

Read-only review, one reviewer, in passes by file: `plugins/fx-opencode-v2.js`, `lib/opencode-v2-policies.js`, `lib/agent-dialects.js`, `lib/preamble.js`, `hooks/fx-codex.js`, `scripts/fx-opencode-install`, `tests/conformance/lib/{live.sh,openrouter.js,with-key.sh}`, `tests/conformance/run.sh`, ADR-0037, the INSTALL.md table and README addressing lines, the ledger and the coverage audit.

Gates run at HEAD, all green: `tests/gates/opencode-v2-plugin.test.js`, `opencode-v2-policies.test.js`, `opencode-v2-agent.test.js`, `opencode-plugin.test.js`, `codex-manifest.test.js`, `codex-hook-output.test.js`, `no-runtime-addressing.test.js`, `ci-pins.test.js`, `lib/preamble.test.js`, `tests/conformance/openrouter.test.js`, `events.test.js`, `live-openrouter.test.sh`, `tests/install/run.sh opencode-v2`. `check-all` was not re-run (task 15 ran it).

## Strengths

- The v2 guard fails closed on every path that matters: a missed call-id lookup, a key with a missing part, a non-string command, an unloadable or throwing guard all deny (`plugins/fx-opencode-v2.js:103-123`), and a failed `evaluate` registration turns `execute.before` into a refusal (`:159`). Each path has a gate case.
- Lookup keys are scoped by session, message and call id with a NUL join (`:47-50`), which closes the repeated-call-id hole across sessions.
- The policy layer is tested in both directions against `lib/git-guard.js` (`sample` and `allowed`), and the patterns avoid the over-block traps the comment names (`lib/opencode-v2-policies.js:17-23`).
- The installer's ownership record (`.fx-opencode-owned.json`) removes only what fx wrote, never writes a `permissions` key, and replaces the other major's link. Its plan step runs before any write.
- Key handling is careful: the key reaches the CLI through a read-only bound file and `with-key.sh`, never a bwrap `--setenv`; Codex reads it through an auth command whose args hold the literal `$OPENROUTER_API_KEY`; every kept log and every row stderr is scanned for the prefix and the key's own value, and a scan that cannot run fails the row.
- Dropping the v2 `general` subagent grant instead of re-implementing OpenCode's config merge was the right call under ADR-0026 and the zero-risk rule.

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

1. `tests/conformance/lib/openrouter.js:114-141` (called from `tests/conformance/lib/live.sh:455-463`) · The subagent provider-error detector reads only Codex's `collab_tool_call` / `CollabAgentToolCall` states. An OpenCode child session's error, which `live.sh` appends as an `fx_export` line holding `{"name":"APIError","data":{"statusCode":429,...}}`, is never matched, and neither is a Claude Code subagent's API error in the `transcript:` lines. Evidence: the baseline log `/tmp/fxlogs-opencode-v2/18-read-only-agent-cannot-delegate-a-write-opencode.log` line 21 (a counted run, not an `attempt1` log) is an `fx_export` of a child session carrying `statusCode: 429`, and the run was not marked inconclusive. Separately, the top-level check only fires when the CLI exits 1, or 124 with empty output (`live.sh:372`), so a top-level error event in a run that exits 0 is not inconclusive either. Why it matters: the ledger ruling after task 11 (line 175) says a provider error anywhere makes a run inconclusive, and the branch description claims the runner does this; for OpenCode and Claude Code a row whose subagent died on a 429 can still count as a PASS toward 2 of 2, which is the false-pass case the ruling was written for. The shipped result is not affected: I scanned every counted (non-`attempt1`) log under `/tmp/fxlogs-opencode-v2-final/` and none carries an `APIError` or a 429/5xx `statusCode`. Fix: in `childCheck`, for `opencode` and `opencode-v2` walk each `fx_export.messages[].info.error` and match `data.statusCode` against `STATUS` (and `data.message` against `PROVIDER_ERROR`); for `claude-code` match the transcript's API-error entries; add one fixture per harness to `openrouter.test.js`. Or, if not fixed now, narrow the ruling and INSTALL.md wording to Codex and record the limit.

### Minor (Nice to Have)

1. `plugins/fx-opencode-v2.js:95-98` · The read-only `external_directory` exception compares raw resource strings with `startsWith(`${d}/`)`, so a resource such as `<refs>/../../home/x` passes if OpenCode ever hands one over unnormalised, and an empty `resources` list passes because `[].every` is true. Fix: `path.resolve` each resource before the prefix test and require a non-empty list.

## Spec compliance

- ✅ Plan aligned for the harness tasks (01 to 09): plugin module shape, tool names, `{action, resource, effect}` rules, per-agent skill denies, `command.transform`, version-aware installer with `--major`, no `permissions` key, ADRs 0036 to 0038, v0.2.5 in all three manifests, Codex addressing `$fx:fx-<name>` (`lib/preamble.js:54-60`, gate at `lib/preamble.test.js:43-44`).
- ❌ Coverage audit gap 2 is still open at HEAD: `INSTALL.md`, `references/harnesses/opencode-v2.md` and ADR-0037 never describe the v2 lane check (`grep -i "lane check"` finds only the 1.x and Codex lines, INSTALL.md:95, 189). Design section 2 requires INSTALL to state per layer what v2 catches.
- ❌ Coverage audit gap 4 is still open: the INSTALL.md table row `Claude Code (rows 01, 02, 06, 07, 08, 16)` (INSTALL.md:550) has no sentence saying the other twelve rows were proven 18 of 18 in `78ff5b3`.
- ⚠️ Cannot verify from the diff: that `write` and `patch` on 2.0.18 evaluate under the `edit` action (only row 17's write exercises it); the controller should either probe one `patch` call or word the doc as observed for `write` only.

## Carried findings triage

Must fix before merge:
- Coverage audit gap 2 (v2 lane check undocumented): docs only, design section 2 commits to it. Add the paragraph to INSTALL.md, the v2 reference and ADR-0037: runs in `permission.evaluate` on `edit`, advice-class, fails open, resolved against the project directory, `write` coverage observed through row 17, `patch` unprobed.
- Coverage audit gap 4 (Claude Code 18 of 18 context): one sentence under the INSTALL.md table. Cheap and it stops the six-row line reading as the whole result.

Closed at HEAD (no action):
- Task 02 README tree (README.md:183 now names both files); Task 09 verified-table staleness (INSTALL.md:550-553); Task 09 README hiding sentence (README.md:239 has the 2.x mechanism); Task 08 FX_LIVE_MODEL ignored for Claude Code (live.sh:53-54 now fails loudly); Task 11 `bash -c` not matched (SHELL_APPLY_PATCH now covers `sh -c`); Task 13 llamacpp question deny (dd83b38); Task 13 plain-spelling text in INSTALL (9ffccff); Task 13 FIFO `readFileSync` and the ponytail config-source comment (the grant code they described was removed in b06a3ef).

Confirmed deferred (each is a stated limit, a test-only nit, or docs polish with no behaviour risk):
- Task 01 Q3/Q8/Q11 wording minors: probe-doc phrasing.
- Task 02 ASCII table alignment: cosmetic.
- Task 03 `list` action for Glob, vocabulary omissions, untested allow branches, comment wrap, dropped `read *.env` ask rules: read-only agents are deny-first with evaluate re-imposing reads only; no widening.
- Task 04 load-failure tests, backstop precedence vs ADR-0026, stderr-only hook failures, SKILL.md direct read, read-only fail-open when plant-roles fails to load (the agents are then not registered either), context-hook failure reporting, command name precedence, never-resolving registration: all edge cases with a failure notice or a stated limit.
- Task 05 Map leak on a denied call (bounded by session lifetime), withGuard dir list, `x` samples, push-option over-block (stated in ADR-0037), indentation, zero-command calls (stated in ADR-0037), test wildcard copy, no-sessionID test re-point, nosrc assertion placement.
- Task 06 shape refusals after writes begin (the plan phase now runs before writes; only the write order remains), `load_opencode_commands` on 2.x, live.sh mismatch test, missing-binary test, record rewritten each run, pre-record installs.
- Task 07 duplicated plugin-route setup, synthetic v2 fixture (task 10 ran against real logs), `FX_OPENCODE_PLUGIN_ENTRY` on v2, design/probe `file://` wording (INSTALL.md:378 is correct).
- Task 08 dead guard, jail-probe unset, untested 124/401 paths, indentation, `sessionModel` first match, KEYDIR under a kept TMPDIR (default `/tmp` is a private tmpfs inside the jail), loose JSON `code` match, key in the environment of free rows (they make no model call).
- Task 10 `(config)` label, stale 13/14 reason text, exact credit balance in baseline.md: docs polish.
- Task 11 row 12 comment, Codex `max_depth` (stated in INSTALL), log paths, row 17 on the fallback (re-run on the primary decided it), `env grep apply_patch` false positive (advice-only stderr line), rows 12/17 fallback FAIL (superseded by the paid-primary ruling).
- Task 13 row 06 mixed models (recorded), events.js `message` and export shape not in probe-findings: docs.
- Task 15 Passes-on-fallback column wording (INSTALL.md:551 now says it in the cell).
- Rulings 10 to 15, 38, 57, 63, 66, 102, 121, 157, 160, 163, 164, 166, 176, 179, 181, 187, 199, 207, 212: all consistent with the code at HEAD. Ruling 175 ("anywhere") is the one the code does not fully meet; see Important 1.

## Recommendations

- Fix Important 1 or narrow ruling 175 to Codex in writing; either way the claim and the code should match before merge.
- The `echo "git reset --hard" | sh` gap (ruling at ledger line 66) is shared by every runtime; worth its own follow-up plan, since the guard is the product's main safety promise.
- `plugins/fx-opencode-v2.js` evaluate hook (`:90-150`) is hard to read after the try wrap; a reindent is free and the next fix there will be cheaper for it.

## Assessment

**Ready to merge?** With fixes

**Reasoning:** The product code is sound and fails closed where it must; the remaining work is two docs gaps the design commits to (audit gaps 2 and 4) and a runner detector that does not yet meet its own "anywhere" ruling for OpenCode and Claude Code, though the shipped verified results were checked clean.

## Ledger lines

Task 05: minor (deferred): read-only external_directory exception in plugins/fx-opencode-v2.js:95-98 uses raw startsWith without path.resolve and passes an empty resources list.
