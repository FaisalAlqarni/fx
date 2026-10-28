### Spec Compliance

- ✅ Spec compliant. Read-only review of the diff; I ran nothing and read live.sh lines 255-262 plus the row callers for named risks.
- ⚠️ Cannot verify from diff: that the scratch-env scope run (build, openrouter.test.js, live-openrouter, live-exit-code, runner-isolation, run.sh codex --free) is green; the report claims it, I did not re-run.

Deviations judged:
- Stub output read from the kept log (tmpfs /tmp inside the jail): accepted. The brief itself allows a fallback and the test still proves all three expectations (ARGS starts `--profile fx-openrouter exec`, profile line 2 `model_catalog_json = `, config.toml lacks it). live-openrouter.test.sh:213-240.
- Generator at the top of live_workdir, once per row: accepted. live_workdir is the single entry every live row calls, once per row process (rows 13 and 14 call it once, inside a harness case), after the install block has run at source time of live.sh. Same per-row effect, and a fallback re-run is a new process. live.sh:255-262.
- openrouter.test.ts assertion with no RED: accepted. It guards an unchanged contract (providerSetup never wrote a catalog), the brief lists it as a required test, and a RED would need a deliberately broken providerSetup. Not an Important under the fx-tdd 0/i rule since the behavior RED exists for the runner cases.

Generator failure: not swallowed. `cat_out="$(...)" || fail "codex catalog setup failed: $cat_out"` (live.sh:259-261); `fail` prints and `exit 1` (live.sh:21). Failure test asserts `^FAIL  95` and the named reason (live-openrouter.test.sh:238-240). Any non-zero exit, including 3, fails the row, as the brief says.

### Strengths

- `key_jail` factors the key-bound jail once, used by `live_run` (live.sh:314) and setup (live.sh:258); the key reaches the CLI only via with-key.sh, no export. No new rm, trap, bash -c, sh -c text in live.sh or the test.
- `--profile` is added only in the codex case and only under OpenRouter, so claude-code, opencode and the non-OpenRouter command line are unchanged (live.sh:~330).
- Test covers both outcomes (working generator, failing generator) and the config.toml-stays-clean requirement.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)
None.

#### Minor (Nice to Have)
- live.sh:261 · the failure message embeds the generator's combined stdout and stderr verbatim; if the CLI ever echoed the key it would reach the log before the end-of-run scan. The security lens owns this; the row scrub runs on the scratch dir, not on this stderr.
- openrouter.test.ts:34 · `!cfg.includes('profile')` is a substring check that would trip on any future comment or key containing "profile"; match a `profile =` line instead.

### Assessment

**Task quality:** Approved
**Reasoning:** The runner generates the profile per row, starts `codex --profile fx-openrouter exec`, and fails the row with a named reason when the generator fails. Both deviations are sound.

## Ledger lines
Task 05: minor (deferred): generator output is embedded verbatim in the fail message (live.sh:261); confirm with the security lens that it cannot carry the key.
Task 05: minor (deferred): openrouter.test.ts:34 substring check for "profile" is brittle; match a `profile =` line.
