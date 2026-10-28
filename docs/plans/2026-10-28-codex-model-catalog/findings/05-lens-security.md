Lens: security, 3 findings

The diff keeps the main constraint. The key reaches the generator only through `with-key.sh` (live.sh:125-132, 258-262). It is never put in argv, `--setenv` or a variable. The key file stays 0600 inside a `mktemp -d` directory and is bound read-only. The catalog and profile files are written 0600 (`lib/codex-catalog.js:136-141`). The post-session scrub of `$LIVE_SCRATCH` (live.sh:361) covers those files. The test key is a fake `fxkey-...` value. No shell string is built from untrusted input: `SJ`, `KW` and `profile` are arrays, and the stub heredoc only expands an integer from the test.

1. [Important] `tests/conformance/lib/live.sh:261-262`: the catalog setup output is not scanned for the key. The generator's stdout and stderr (`2>&1`) are captured and put straight into `fail "codex catalog setup failed: $cat_out"`. `fail` echoes that to the runner's stderr.
   - The key is in that process's environment, and the generator runs `codex debug models` as a child (`lib/codex-catalog.js:92`).
   - On a failure, `execFileSync` produces an error message with the child's stderr, which the generator prints (`:158`). Codex or the provider can echo auth headers or a bearer string in a 401 or other error.
   - This text bypasses both the `scrub` and the `leaks` scan, because it exits before `live_run` ever runs. The key could reach the terminal or CI logs. I did not confirm that Codex actually echoes the key.
   - This breaks "every live run ends with a key scan" on the failure path.
   - Impact: possible key disclosure in CI or console output.

2. [Minor] `tests/conformance/lib/live.sh:258-263`: nothing scans the scratch home after a failed setup. The scrub sits only in `live_run` (:359-367), and `fail` exits first. The generator wrote 0600 files into `CODEX_HOME` and may have written other files. This is bounded, since the scratch home lives in the 0700 `$LIVE_SCRATCH` (:33). It still leaves the "every live run ends with a key scan" rule unmet on that path.

3. [Minor] `tests/conformance/lib/live.sh:270`: `live_workdir` replaces the EXIT trap set at :72. The new trap still removes `${KEYDIR:-}`, so there is no leak. Any failure between :72 and :270 relies on the earlier trap. This is fragile, not a vulnerability.

The generator also runs `codex debug models` inside the jail with the key in its environment. That is expected, since it needs the key to list models. The profile name is hardcoded as `fx-openrouter` (live.sh:339), while the generator derives `fx-<provider>` from the scratch `config.toml` (`lib/codex-catalog.js:121-123`). A mismatch only makes Codex fail, so it is not a security issue.

Files reviewed:
- /development/fx/.worktrees/codex-catalog/tests/conformance/lib/live.sh
- /development/fx/.worktrees/codex-catalog/tests/conformance/lib/with-key.sh
- /development/fx/.worktrees/codex-catalog/lib/codex-catalog.js

I did not check what `codex debug models` prints on error. I also did not read the full diff, because the review file elides context lines.
