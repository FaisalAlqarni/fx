# fx conformance

Every guarantee fx makes, asserted on every runtime it ships to.

fx claimed opencode support for months on the strength of a document. Its
plugin destructured a one-argument hook signature where opencode passes two, so
it pushed nothing into the session, silently. Reading files could never have
caught that. This is what would have.

## Running it

```
bash tests/conformance/run.sh <claude-code|opencode|opencode-v2|codex> [--free]
```

`--free` runs only the rows that read files and spend nothing. Those are in
`scripts/check-all`. The behavioural rows spend real quota on three providers
and never are. Any second argument other than `--free` is refused, so a typo
such as `--fre` cannot fall through to a live run.

Run the live rows one runtime at a time, under a fresh fake `HOME`, naming the
home that holds the credentials:

```
HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_WITH_CREDENTIALS" \
  bash tests/conformance/run.sh claude-code
```

`FX_CONFORMANCE_LOGS=<dir>` keeps a copy of each live session's transcript
there, for reading a FAIL afterwards. It is opt-in, and nothing redacts it: a
kept transcript may contain anything the session read, including the scratch
credential copy. Keep that directory private and delete it when done.

`opencode` is OpenCode 1.x and `opencode-v2` is 2.x. Both use the binary named
`opencode`, so a run checks `opencode --version` first and fails when the
major does not match the harness: a 2.x machine never measures 1.x while
claiming it. The free `opencode-v2` rows call the real 2.x binary against a
scratch config and their own managed service (`opencode service set port
<free port>`, stopped on exit, never the developer's service), with stdin
closed and no model call. `lib/opencode-v2.sh` holds that setup.

Two knobs change only how opencode is set up, before its first session:

- `FX_OPENCODE_ROUTE=plugin` runs no installer. On `opencode` it adds one
  `plugin` entry, `file://$FX/plugins/fx-opencode-v1.js`, to the scratch
  `opencode.json`. On `opencode-v2` it links `plugins/fx-opencode-v2.js` into the
  scratch config's `plugins/` directory and adds `"$FX/skills"` to its `skills`,
  and nothing else: no `permissions` key, no command or agent files (a 2.0.18
  `plugins` config entry must be a package directory, so a bare `.js` file
  cannot be named there). Unset or `installer` runs `scripts/fx-opencode-install`
  (`--major 1` or `--major 2`). Rows 13 and 14 run on both routes.
- `FX_OPENCODE_MCP=1` adds one local MCP server, `fxprobe`, to the scratch
  `opencode.json`. It runs `lib/mcp-probe-server.js`, whose one tool,
  `write_marker`, writes a file.

## Three states, and GAP is not a pass

- **PASS**: the guarantee holds on this runtime.
- **FAIL**: it does not. The runner exits non-zero.
- **GAP**: this runtime cannot support it, with a reason. Exit `77`. The
  reason goes to stderr, and a row that exits `77` with nothing on stderr is
  counted as a FAIL: a GAP nobody can explain is a row that gave up.

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

## Live rows

Rows 01, 02, 04 to 08, 12 and 15 to 17 drive the real CLI headlessly. Each
sources `lib/live.sh` after its `--describe` guard, so describing a row never
spends anything. That file does four things, in one place:

1. **Copies credentials in, never out.** From `$FX_REAL_HOME` it reads exactly
   one source per runtime and writes it into the scratch home at `0600`, under
   directories at `0700`:
   - Claude Code: `.claude/.credentials.json` into `$CLAUDE_CONFIG_DIR`.
   - Codex: `.codex/auth.json` into `$CODEX_HOME`.
   - opencode and opencode-v2: only the `provider.llamacpp` entry of
     `.config/opencode/opencode.json`, with the model set to
     `llamacpp/qwen3.8-27b`. The user's own plugins, agents and MCP servers
     stay behind, so the session measures fx alone.

   A missing source is a GAP with its reason. There is no fallback to the real
   home, and nothing under it is ever written.
2. **Installs fx into the scratch home** from the tree under test: Codex
   through its own marketplace commands, opencode through
   `scripts/fx-opencode-install --dest`. Claude Code needs no install, because
   every session gets `--plugin-dir`.
3. **Runs every CLI call inside `bwrap`**, the installs included. The whole
   filesystem is read-only and only the runner's scratch dir is writable;
   `/tmp` is a private tmpfs. Every top-level directory that is not system
   software (`/home`, `/root`, `/srv`, a user data root such as `/development`)
   is hidden under an empty tmpfs, so a session cannot read the real
   credential files or another project's `.env`; `/mnt` and any second mount
   of the home's filesystem are hidden as well, so no other path reaches them
   or a host socket. Only the scratch dir (writable), the tree under test and
   the directories the CLIs run from (each binary's directory, node's install
   root) are bound back, the last two read-only. The network stays open for the providers and the local
   llama-server. That is what makes it safe to hand each CLI its own
   skip-permissions flag. The runtimes'
   own sandboxes are off on purpose: Claude Code's needs `socat`, and Codex's
   `workspace-write` keeps `.git` read-only, so an unguarded `git branch -D`
   fails anyway and a guard row would pass with the guard deleted. Without
   `bwrap` every live row is a GAP.
4. **Reads the transcript through `lib/events.js`**, the one place that knows
   each runtime's event format, so a row asserts what a user would observe.
   Codex's rollout files and opencode's exported child sessions are appended
   to the log, because a subagent's own tool calls are not in the top-level
   stream.

If quota or credit runs out mid-run, the remaining rows report
`GAP: not run: quota or credit exhausted`. A row that did not run is never a
pass.

**A killed run leaks a credential copy.** The scratch dir is removed by an EXIT
trap, and SIGKILL skips every trap. A `kill -9`, an OOM kill or a lost WSL
session leaves the copied credential file in `/tmp/tmp.*/home` until the
machine reboots or someone removes that exact directory.

**opencode runs on a local model.** The credential copied in points at a
llama-server on `127.0.0.1:8899`, serving Qwen 3.8 27B, which answers 401
without the key held in that provider entry. The key is never printed or
logged. The server has one slot, so opencode rows run strictly one at a time;
never start two opencode runs together. A 27B model may fail row 04 or row 12
for want of capability rather than because fx is broken, so a suspected flake
is re-run once and both results are recorded, never the better one alone.

**Row 12 covers both ways a read-only agent could write:** its editing tool
and the shell. Each probe has a general agent as its control, so a refusal
that also stops the control is a failure, not a pass.

## Live rows on OpenRouter

`FX_LIVE_PROVIDER=openrouter` runs the live rows on OpenRouter for all four
harnesses. Without it nothing changes. It needs `OPENROUTER_API_KEY` in the
environment (a GAP without it) and an account with purchased credits: a key
without them gets a free-model allowance the matrix exceeds.

```
OPENROUTER_API_KEY=... FX_LIVE_PROVIDER=openrouter bash tests/conformance/run.sh codex
```

- Models (`lib/openrouter.js`): Codex and both OpenCode majors on
  `qwen/qwen3.8-27b:free`, Claude Code on `anthropic/claude-haiku-4.5` (other
  models fail there). `FX_LIVE_MODEL=openrouter/<id>` picks another for the
  three non-Claude harnesses. OpenCode v1 needs its own 1.18.x binary first on
  `PATH`.
- No credential copy: the scratch home holds the provider's config and never
  `.credentials.json` or Codex's `auth.json`, so a session cannot run on the
  owner's subscription. Only `live.sh` turns the provider path on: the jail
  passes the provider's non-secret variables (`jail_provider_env`) and ignores an
  inherited `FX_LIVE_PROVIDER` or `FX_JAIL_PROVIDER_ENV`.
- The key is never a variable or an argument. `live.sh` writes it to a 0600
  file in its own temp dir, bound read-only into session calls only, and
  `lib/with-key.sh` exports it inside the jail for the CLI (Claude Code gets
  `ANTHROPIC_AUTH_TOKEN` only, the others `OPENROUTER_API_KEY`). Install and
  export calls never see it. A `kill -9` leaves that file in `/tmp/tmp.*` until
  reboot, like the credential copy below.
- A row that stops on a provider error (HTTP 401, 429, 5xx, `Insufficient
  credits`) exits 75. It is read only from the CLI's own error events and
  stderr, never model output, and only an upstream HTTP shape counts (a status
  line, a JSON status, `API Error: 503`). A timeout with no output is a
  provider error only beside one of those; alone it is a FAIL, "no output
  before timeout".
  `run.sh` then re-runs the row once on `deepseek/deepseek-v4-flash`, prints
  `attempt=2 (fallback)`, and keeps the first log as `<row>-<harness>.attempt1.log`
  in `FX_CONFORMANCE_LOGS` (a row's second `live_run` keeps its own
  `<row>-<harness>.2.log`). A second 75 is a GAP, and the summary counts the
  passes that needed the fallback: `N pass (F on fallback)`. Claude Code has no
  fallback: its 75 is a GAP, and `FX_LIVE_MODEL` other than Haiku fails the row
  there. A capability failure is not a provider error; it is re-run
  once by hand on the same model, as above.
- The runner does not check the credit balance, re-run a capability failure
  or limit and pace requests. Check the balance on OpenRouter before a run
  (`docs/adr/0038`).
- Each live row's line ends in `model=<id>`, the model the session itself
  reported (Claude Code's init event, Codex's `turn_context`, the OpenCode
  session export), or `model=<id> (config)` when the log names none. A session
  that reports another model than requested fails the row.
- A log containing `sk-or-` or the key's own value fails the row inside
  `keep_log` and is not copied; a scan that cannot run fails it too. The same
  scan covers the stderr `run.sh` prints for each row.

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
