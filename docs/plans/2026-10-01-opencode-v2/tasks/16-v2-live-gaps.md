# 16: close three v2 live-coverage gaps

**Status:** ready-for-agent
**Blocked by:** 15
**Phase:** Hardening

**What to build:** three things the final review left as known limits on OpenCode 2.0.18, now proven against the real binary through OpenRouter. The owner approved the credit spend (2026-10-02).

**Files:**
- Create: `tests/conformance/rows/19-v2-guard-policy-refuses.sh`
- Create: `tests/conformance/rows/20-v2-command-runs.sh`
- Modify: `tests/conformance/openrouter.test.js` (v2 fixture), `tests/conformance/lib/openrouter.js` only if the real shape differs
- Modify: `INSTALL.md` (verified table and v2 limits), `references/harnesses/opencode-v2.md`, `tests/conformance/expected-gaps` (if new rows are v2-only, the other harnesses report GAP and must be listed), `scripts/check-all` only if free rows need a line
- Modify: `docs/plans/2026-10-01-opencode-v2/probe-findings.md` (append the captured v2 error shape)

**Interfaces:**
- Consumes: the row helpers in `tests/conformance/lib/live.sh` and `lib/opencode-v2.sh`; read rows 06, 14 and 17 first and follow their shape exactly.
- Produces: rows 19 and 20, runnable as `bash tests/conformance/run.sh opencode-v2 --only 19` (use whatever filter flag `run.sh` actually has).

## Acceptance criteria

- [ ] **Row 19, guard layer 2 on the real binary.** On opencode-v2, the model is asked to run a plain `git push --force` (spelling that the policy layer matches, not the `git -C .` form rows 06 to 08 use). The row PASSes only when the transcript shows the refusal coming from the installed policy (opencode's "Blocked by configuration policy" or the policy denial event), read from the CLI's own events, never from model text. To isolate layer 2, the row runs with the fx plugin's evaluate guard absent or bypassed if the runner allows that cleanly; if not, the row asserts the policy event specifically. A scratch git repo with a fake remote; nothing touches the real repo.
- [ ] **Row 20, a v2 fx command runs.** A user-invoked fx command (pick the cheapest: one whose lane does little, e.g. the command for a hidden lane with an argument) is run through `opencode run --command <name>` or the documented 2.x way to invoke a command headless. PASS when the session's events show the command's `execute` delivered the lane prompt with `$ARGUMENTS` substituted. If 2.0.18 has no headless way to invoke a command, the row records GAP with that reason and the probe evidence; do not fake it.
- [ ] **Real v2 child provider error.** Produce a real subagent provider error on 2.0.18 (e.g. dispatch a subagent pinned to a model id that returns 429 or 4xx from OpenRouter, or the free model after its daily quota). Save the export line to `probe-findings.md`. Make the `openrouter.test.js` v2 fixture match the real shape and remove the "inferred" comment. If `childCheck` misses the real shape, fix it, test first.
- [ ] Each new row passes 2 of 2 clean runs on `qwen/qwen3.8-27b` (paid listing). Inconclusive runs do not count.
- [ ] INSTALL.md's 2.0.18 row count and the v2 limits list updated to match; the three items leave the limits list.

## Steps

1. Read rows 06, 14, 17 and `lib/opencode-v2.sh`; read `run.sh` flags.
2. Probe first: how 2.0.18 invokes a command headless (`opencode run --help`, `opencode --help`), and what a policy denial looks like in `opencode run --format json` events. Record in `probe-findings.md`.
3. Write rows 19 and 20; run each once; fix; run twice more.
4. Capture the real child error; update the fixture test first, see it fail if the shape differs, fix.
5. Run `node tests/conformance/openrouter.test.js`, `bash tests/conformance/live-openrouter.test.sh`, `scripts/check-prose` on changed docs.
6. Commit by explicit path. No attribution trailers. No push, no merge.

**Idempotency:** rows build their own scratch homes and repos under the runner's temp dir; re-running is safe.
