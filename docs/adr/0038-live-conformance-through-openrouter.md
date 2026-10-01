# Live conformance runs go through OpenRouter, one switch for all four harnesses

## Context

The live rows ran on a local model server and on the owner's subscriptions. The local model was often down, the Codex quota ran out mid-matrix, and a row that copied a credential into its scratch home could run on the owner's account. Four harnesses now need live rows.

## Decision

`FX_LIVE_PROVIDER=openrouter` runs every live row on OpenRouter. Without it nothing changes.

- **Account.** It needs an OpenRouter account with purchased credits. A key without credits gets a free-model allowance that the matrix exceeds.
- **Models** (`tests/conformance/lib/openrouter.js`): Codex, OpenCode 1.x and OpenCode 2.x use `qwen/qwen3.8-27b:free`. Claude Code uses `anthropic/claude-haiku-4.5`, because a non-Anthropic model fails there. `FX_LIVE_MODEL=openrouter/<id>` picks another model for the three non-Claude harnesses.
- **Key handling.** The key comes only from `OPENROUTER_API_KEY` in the environment. No file or config value holds it: each config reads it by reference. The scratch home never gets `.credentials.json` or Codex's `auth.json`, so a session cannot run on the owner's subscription. The task 08 smoke runs checked that none exists under the scratch home.
- **Jail.** The `--clearenv` allowlist in `tests/conformance/lib/jail.sh` adds `OPENROUTER_API_KEY` and the names in `FX_JAIL_PROVIDER_ENV` under this switch, and nothing else. Without the switch the allowlist is unchanged.
- **Logs.** A log that contains `sk-or-` fails its row inside `keep_log` and is not copied.
- **Fallback on provider errors only.** A row that stops on a provider error exits 75. Provider errors are HTTP 401, 429, 5xx, `Insufficient credits` or `Too Many Requests`. A timeout is not one by itself: a run that times out with no output and no upstream error is a FAIL, "no output before timeout", because a hang with no provider error is the product's. They are matched only in the CLI's own error events and in stderr, never in model output, so a model that writes the words "rate limit" cannot trigger a re-run. `run.sh` re-runs the row once on `deepseek/deepseek-v4-flash`, prints `attempt=2 (fallback)`, and keeps the first log as `<row>-<harness>.attempt1.log`. A second 75 is a GAP. A capability failure is not a provider error and never falls back.
- **Claude Code has no fallback.** Its 75 is a GAP.
- **Model check.** Each live row's line ends in `model=<id>`, read from the session's own record. A session that reports another model than requested fails the row.

## Not built

The runner does not check the OpenRouter credit balance, does not re-run a capability failure, and has no request budget or pacing. Before a run, the controller checks the balance on OpenRouter by hand. A row that fails for capability, not for a provider error, is re-run once by hand on the same model, and both results are recorded. Why: the controller did both by hand in task 15, and automating them adds runner code for a step run a few times a release.

## Consequences

The free primary model returns 429 often, so the fallback runs in practice: on the first Codex smoke, attempt 1 got a 429 and attempt 2 passed on the fallback. A row result names its model and its attempt, so a pass on the fallback is never read as a pass on the primary.
