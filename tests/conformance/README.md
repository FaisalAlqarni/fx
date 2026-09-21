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

## Isolation, not restoration

Every row runs against a scratch home. The runner creates one `mktemp -d`,
points `HOME`, `CODEX_HOME`, `XDG_CONFIG_HOME` and `CLAUDE_CONFIG_DIR` inside
it, and removes only that directory on exit, including on failure and
interrupt. The home you started it from is exported as `FX_REAL_HOME`, for a
live row that has to copy credentials **in**. Nothing is ever copied back out.

An earlier runner snapshotted `~/.codex`, `~/.config/opencode` and `~/.claude`
and restored them from a trap with `rm -rf <home> && cp -a <snapshot> <home>`.
The snapshot copy silenced its errors, so a failed copy still armed the
restore, and it deleted a real `~/.claude`. A row that cannot reach the real
home has nothing to put back.

`runner-isolation.test.sh` proves this against a fake home holding sentinel
files: a probe row writes `$HOME/.claude/probe`, once normally and once under
`SIGINT`, and the fake home must come out byte-identical with the scratch
directory gone. It points the runner at its own probe row through
`FX_CONFORMANCE_ROWS`. **Never develop against the runner with your real
`HOME`**; set `HOME` to a `mktemp -d` on the command line.
