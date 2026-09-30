Lens: security. 4 findings, none Critical.

1. [Important] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/jail.sh:113: the key reaches the jail as `--setenv OPENROUTER_API_KEY <value>`, so the literal key is on the command line of `bwrap`, and of the `timeout` that wraps it, for as long as each call runs. That is up to 1500s per session, plus every install and export call (live.sh:170, 174, 182, 277, 282, 289, 293, 390, 407). For claude-code the key is on the command line twice, because live.sh:55 also copies it into `ANTHROPIC_AUTH_TOKEN`. `/proc/<pid>/cmdline` can be read by any local uid unless /proc is mounted with `hidepid`, and anything that logs `ps` output will record it: a watchdog, a monitoring agent, a bench ledger. Before this commit no secret went through `--setenv`: credentials crossed as 0600 files, and proxy passwords are deliberately stripped at jail.sh:110. What an attacker gets: the live OpenRouter key, from any process listing taken during a run.

2. [Minor] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/openrouter.js:522: the leak scan is weaker than the README (line 190) says.
   - **Easy to evade.** It is a literal `includes('sk-or-')`. The key split across lines, base64-encoded, reversed, printed with the dashes replaced, or printed as a `${KEY:0:20}` slice all pass it. The scan does not look for the key's own value.
   - **Fails open.** At openrouter.js:547, an unreadable file or a log too large for one string throws. Node then exits 1, which live.sh:316 reads as "no leak" and copies the log anyway.
   - **Skipped when logs are not kept.** live.sh:315 returns before scanning when `FX_CONFORMANCE_LOGS` is unset. Rows still print tails of the model's answer in their failure messages (for example rows/01-preamble-in-session.sh:17 and rows/15-subagent-dispatches-subagent.sh:35), and run.sh:91 passes that stderr through, so it lands in any file the caller redirects to.
   - **Context.** The Claude Code and OpenCode sessions can read the key from their own environment and the network is open, so the scan is a hygiene layer, not a boundary. Impact: a key a session printed lands in a log or in stderr.

3. [Minor] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/jail.sh:102: the switch is read from the caller's environment, not set by live.sh, so an exported `FX_LIVE_PROVIDER=openrouter` changes every other script that sources jail.sh:
   - **jail-probe prints the real key.** jail-probe.test.sh:27 and :131 build `JAIL` from the real environment. On any bind-test failure it prints the whole array, key included, at jail-probe.test.sh:145, 158, 172, 182 and 193, which puts it in the `check-all` output.
   - **lane-triggering gets the key on top of the subscription.** tests/lane-triggering/run-test.sh:91 and run-reps.sh:90 pass the key into their jails while still copying the owner's `.credentials.json` (run-test.sh:85, run-reps.sh:84). Their logs are never scanned.
   - **The allowlist can be bypassed.** Outside live.sh, nothing resets `FX_JAIL_PROVIDER_ENV`, so an inherited value can name any variable (a GitHub or AWS token, say) and it crosses the jail. The proxy-password stripping does not apply to those names.

   What an attacker gets: the key in `check-all` output, unscanned lane-triggering logs, or other host secrets inside a jail.

4. [Minor] /development/fx/.worktrees/opencode-v2/tests/conformance/lib/jail.sh:102: the allowlist is wider than the CLIs need.
   - For claude-code, `OPENROUTER_API_KEY` crosses on top of `ANTHROPIC_AUTH_TOKEN` (live.sh:55), although Claude Code reads only the latter.
   - Every jailed call gets the key, including the install steps (live.sh:170, 174, 182) and `opencode export` (live.sh:390, 407), none of which calls the provider.

   Impact: more copies of the key, in more processes, than the sessions need.

Checked and clean:
- **No credential copy under openrouter.** live.sh:121-152 skips `scratch_home_claude`, the Codex `auth.json` copy and the llamacpp merge. No row or other runner under tests/conformance copies them, and `FX_LIVE_MODEL` is ignored for claude-code (live.sh:276).
- **No subscription fallback for Claude Code.** A session on the owner's subscription would report another model and fail at live.sh:415. A session that reports no model at all passes with `(config)` only.
- **The key is never written to disk.** Configs read it from the environment (openrouter.js:47, 53, 58), and Codex's `sh -c "echo $OPENROUTER_API_KEY"` carries the variable name on its command line, not the value.
- **Every exit path is covered.** The first `keep_log` (live.sh:321) runs before every exit, including the 75 and GAP paths. `attempt1.log` (run.sh:100-101) copies a log that was already scanned.
- **Error messages carry no key.** The provider-error message (live.sh:348) prints only the regex match. `FX_ROW_MODEL_FILE` holds only a model name.
- **Test keys are fake.** `sk-or-v1-testonly`, `fx-fake-key`, `fx-sentinel-key` and `sk-or-v1-leaked` are fixtures, not secrets.

Not security: at openrouter.js:450, a `FX_LIVE_MODEL` value is put into the TOML unescaped. It comes from the owner's own environment, so it only matters for robustness.
