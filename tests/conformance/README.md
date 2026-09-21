# fx conformance

Every guarantee fx makes, asserted on every runtime it ships to.

fx claimed opencode support for months on the strength of a document. Its
plugin destructured a one-argument hook signature where opencode passes two, so
it pushed nothing into the session, silently. Reading files could never have
caught that. This is what would have.

## Running it

```
bash tests/conformance/run.sh <claude-code|opencode|codex> [--free]
```

`--free` runs only the rows that read files and spend nothing. Those are in
`scripts/check-all`. The behavioural rows spend real quota on three providers
and never are.

## Three states, and GAP is not a pass

- **PASS**: the guarantee holds on this runtime.
- **FAIL**: it does not. The runner exits non-zero.
- **GAP**: this runtime cannot support it, with a reason. Exit `77`.

**A row is never omitted.** A silently absent row is how a runtime comes to
claim parity it does not have, which is the failure this directory exists to
prevent. If a guarantee cannot hold somewhere, it reports GAP and stays
visible.

The summary reports the three counts separately. A GAP is never summed into a
pass.

## Adding a row

One file per row under `rows/`, named `<number>-<slug>.sh`. It must:

1. Answer `--describe` with `<number>|<name>|<free|live>`.
2. Otherwise run, exiting `0` pass, `77` gap, anything else fail.
3. Read `$FX` (repository root) and `$HARNESS` from the environment.
4. Print its reason to stderr when it fails. "FAIL 12" with no reason costs
   whoever reads it an hour.

**Prove your row can fail before you trust it.** Break the thing it covers and
watch it go red. A row that stays green under mutation is worse than no row,
because it will be read as proof. Eleven test defects were found in this
build, and an early version of this runner itself defined a dispatcher and
never called it: it printed `0 pass, 0 fail, 0 gap` and exited 0, which looks
exactly like success.

## Restoring state

Rows may write into a runtime home. The runner snapshots `~/.codex`,
`~/.config/opencode` and `~/.claude` before any row runs and restores them on
any exit, including failure and interrupt.

This is not theoretical. Earlier in this build a test ran without `CODEX_HOME`
set and wrote six role files into a real `~/.codex/agents/`.
