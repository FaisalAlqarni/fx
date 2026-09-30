### Spec Compliance

- ✅ Spec compliant on every acceptance line checkable from the diff. Red-team 1 and 8 both addressed: jail allowlist (jail.sh:149-154), credential copies skipped (live.sh:227-251), init-event model check (live.sh:392-396), re-run in run.sh (run.sh:745-760), 401 listed, matching only on CLI error events plus stderr (live.sh:364-370), scan inside keep_log before cp (live.sh:334-340).
- ⚠️ Cannot verify from diff: the four live smoke lines and "no credential file in scratch home" are report claims only (no live run here, key not touched). Controller leak check already covers the sk-or- scan in the ledger ruling (state.md:14).
- ⚠️ v2 `providers.openrouter.apiKey` block (openrouter.js:470) is not proven read: the env key alone enables the provider, so the smoke passes either way. Report admits this.
- ⚠️ `keep_log` scans only when `FX_CONFORMANCE_LOGS` is set (live.sh:335 returns early). Task 10's teed output is scanned by task 10, not here; nothing else in this diff prints `$LOG`. Controller: confirm no row prints the log on failure.

### Strengths

- Jail allowlist change is gated on the switch and probed both ways with a sentinel (jail-probe.test.sh:120-130).
- Claude Code subscription path closed at the source: no credential copy, and the init-model check fails a mismatch (live.sh:395).
- Forgery test is real: assistant text with 429/credits and exit 1 must be FAIL, not 75 (live-openrouter.test.sh:600-601). Report shows a mutation check.
- Codex TOML re-run handling is keyed on keys and tables, not fences, with a test (openrouter.test.js:684-694).
- Key never in `files` or env values; unit test asserts it with the key exported.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
- tests/conformance/lib/openrouter.js:489-492 · `isProviderError` is too loose and turns real CLI failures into GAPs. The numeric branch `\b(status|http|error|code)\b[^0-9\n]{0,20}\b(401|429|5\d\d)\b` matches any stderr line like `error: could not write 512 bytes`, `fatal: error at line 500 of config`, `error: exceeded 512 tokens` (ran all three through `isProviderError`: all true). Bare `Unauthorized` also matches `Unauthorized tool: rm`. With rc 1 this sends exit 75, run.sh re-runs on the fallback, and a second hit becomes `rc=77` GAP (run.sh:759), which does not fail the run. A genuine crash is reported as a provider GAP: silent-failure. Fix: anchor the numeric branch to HTTP shapes (`\b(?:HTTP|status(?: code)?)[: ]+\s*(401|429|5\d\d)\b`, `\b(401|429|5\d\d) (?:Unauthorized|Too Many|Internal|Bad Gateway|Service Unavailable|Gateway)`), drop bare `Unauthorized` (or require it after a 401), and add the three strings above as negatives in openrouter.test.js.

#### Minor (Nice to Have)
- tests/conformance/run.sh:758 · `[ -z "$suffix" ] || ...` is dead: `suffix` always holds `model=...` by then. Leading space can be put in line 757.
- tests/conformance/run.sh:749 · Claude Code 75 is a GAP with no re-run and README says so; spec text says any 75 re-runs. Defensible (live.sh ignores FX_LIVE_MODEL for claude, live.sh:293, so a re-run would repeat Haiku), but the same line silently ignores a user `FX_LIVE_MODEL` pin for claude-code under the switch, which task 10's bench sets. Say so in README or fail loudly when it is set.
- tests/conformance/jail-probe.test.sh:128 · the "without the switch" case does not unset `FX_LIVE_PROVIDER`; a developer with it exported gets a false FAIL. Use `env -u FX_LIVE_PROVIDER` or `unset` in the subshell.
- tests/conformance/lib/live.sh:364-370 · rc 124 with empty stdout is read as a provider timeout; a CLI that hangs at start for a local reason (bad config, jail) becomes 75 then GAP. Spec-mandated marker, but no test covers the 124 path or the 401/`result is_error` path through live.sh.
- tests/conformance/lib/live.sh:230-251 · the old `case` body is not re-indented inside the new `else ... fi`; the diff is small but the block reads as top-level. Cosmetic.
- tests/conformance/lib/openrouter.js:509-510 · `sessionModel` returns the first matching top-level line in `$LOG`; Codex's `turn_context` comes from rollout files appended after the stdout stream, so a line a tool process wrote to stdout would win. Claude Code's real init event comes first, so it is safe there. Low risk; note only.
- Scope notes (not defects): `live-openrouter.test.sh` and its check-all line are extra to the task file but test the fallback, forgery and leak paths; the v2 `--dir` removal (live.sh:307-309) changes the default path and is disclosed in the report.

### Assessment

**Task quality:** Needs fixes
**Reasoning:** Design and wiring match the task and both red-team findings, with real tests. One Important: the provider-error matcher over-matches stderr, so real CLI failures can be downgraded to GAP via the 75 path.

## Ledger lines

Task 08: minor (deferred): run.sh:758 dead `[ -z "$suffix" ]` guard.
Task 08: minor (deferred): Claude Code 75 gets no re-run and FX_LIVE_MODEL is silently ignored for it under the switch; document or fail loudly.
Task 08: minor (deferred): jail-probe "without the switch" case does not unset FX_LIVE_PROVIDER.
Task 08: minor (deferred): rc 124 with empty stdout becomes 75 then GAP; no test for the 124, 401 or result-is_error paths through live.sh.
Task 08: minor (deferred): live.sh else-block not re-indented around the credential case.
Task 08: minor (deferred): sessionModel takes the first matching line; a forged stdout line could win for Codex turn_context.
