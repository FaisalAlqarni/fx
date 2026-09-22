# 21: Live matrix on Claude Code and opencode

**Status:** ready-for-agent
**Blocked by:** 14, 15, 16, 17, 18, 19
**Phase:** Amendment

**What to build:** Evidence, not code. Run the full conformance matrix, free
and live, on Claude Code and on opencode against the amended tree. Record
every row's result, and fix nothing in product code. A failing row becomes a
finding for the controller. Part of design amendment A9.

**A measured product defect opens a new numbered task.** It is never fixed
inside this task and never left as a note (`state.md`, "Coverage audit"
ruling). Report it with its evidence; the controller writes the task.

**This task is a merge gate for two runtimes.** The branch does not merge
until rows 01, 02, 12, 15, 16 and 18 PASS on Claude Code and on opencode.
A FAIL here reopens the task that owns the fix, or opens a new one
(design, "Testing for the amendment": the amendment is done when those rows
pass).

Every FAIL in task 12's matrix belongs to a fix in this amendment:
- Claude Code rows 01, 02 and 16: preamble split, task 15.
- opencode row 15: task 18. Its opencode prompt now names `general`, so a
  PASS proves the plugin's `permission.task` override reached the built-in
  agent. The config-object test in task 18 cannot prove that.

The amendment also added live coverage this task runs for the first time:
- row 12's shell-write probe, from task 17;
- row 18, from task 16: a lens asked to dispatch a default child that writes;
- the sentinel probe from task 22 step 5: a lens returns a sentinel it read
  from the diff file it was given.

The coverage audit added more, each from a design story no task proved live:
- the install routes users actually take: Claude Code from its marketplace,
  and opencode from one plugin config entry with no installer, design
  stories 1 and 4. Every live run so far used `--plugin-dir` or the installer;
- a hidden lane still invocable by the user on opencode's plugin-only route
  (story 15 of the design). `plugins/fx.js` registers no commands, so this may be broken;
- an end-to-end review: `fx-review` invoked from a plain request, lenses
  dispatched by name, a finding returned (design story 13, a lens that cannot write);
- the devil's advocate reading fx's references on opencode, which is what
  task 17's `external_directory` allowance exists for;
- a lens refused webfetch and MCP on opencode, against a real MCP server set
  up in the scratch config;
- each fx skill registered once when a second skills pool also holds fx
  (design story 19, one registration per skill);
- the Claude Code row 08 guard-off mutation, never re-run under the round 2
  jail (`state.md`, task 12 minors).

It also measures one thing the design relies on without having measured it:
the order in which the preamble parts land in a Claude Code transcript. The
global constraint says nothing goes above the opening imperative. If part 2
can land before part 1, the model reads something above it, and that
constraint needs amending.

This task shows whether those fixes hold in real sessions. It also runs the
one check task 12 still owes: Claude Code row 06 under the round 2 jail. That
run hit Claude's session limit.

**Files:**
- Modify: `tests/conformance/lib/live.sh`  (the opencode install block only: two knobs, `FX_OPENCODE_ROUTE` and `FX_OPENCODE_MCP`)
- Create: `tests/conformance/lib/mcp-probe-server.js`
- Modify: `tests/conformance/README.md`  (the "Last run" section, if it has one, and one line per new knob)
- No product files.

**Interfaces:**
- Consumes: `bash tests/conformance/run.sh <harness>` and
  `tests/conformance/lib/live.sh`, from task 12
- Consumes: `FX_CONFORMANCE_ROWS`, the runner's hook for running probe rows
  from another directory
- Produces: `live.sh` reads, for opencode only, before its one-time install:
  - `FX_OPENCODE_ROUTE`: unset or `installer` runs today's installer;
    `plugin` runs no installer and adds one `plugin` entry to the scratch
    `opencode.json`, the route design story 4 names;
  - `FX_OPENCODE_MCP=1` adds one local MCP server, `fxprobe`, to the scratch
    `opencode.json`. It runs `tests/conformance/lib/mcp-probe-server.js`
    and offers one tool, `write_marker`, which writes a file.
  Neither knob ever reads or writes under `FX_REAL_HOME`. Unset, both leave
  the matrix exactly as it is today.
- Produces: a matrix block in the report, one line per row per runtime, in
  the same format as task 12's block in `state.md`. The controller copies it
  into the ledger. Probe results follow it, one line each.

**Seam:** the conformance runner, live, plus one-off probe rows run through
`FX_CONFORMANCE_ROWS` from a private `mktemp -d` directory. Probe rows are
never committed.

**Risks:**
- MEDIUM: if the part order is not stable, do not change anything. Flag it
  for the controller, with the orders seen.
- MEDIUM: quota. Claude Code has a session limit, and it was hit twice in
  this build. `live.sh` reports quota exhaustion as `GAP: not run`, never a
  pass. If quota runs out mid-matrix, report which rows did not run. The
  controller re-dispatches after the reset.
- MEDIUM: opencode runs on the user's local llama-server (Qwen 3.8 27B, one
  slot, at `127.0.0.1:8899`). Rows 04 and 12, and the end-to-end review, need
  a capable model. Re-run a suspected capability failure once, and record
  both results.
- MEDIUM: the plugin config-entry form. Step 1 confirms from the opencode
  source `research/opencode-subagents.md` used, version 1.18.31, how a `plugin`
  entry names a local file, and cites file and line. The knob uses that form.
  If the source says the local form is something other than a `file://` URL,
  change `FX_OPENCODE_PLUGIN_ENTRY` in the knob, not the rows.
- MEDIUM: the probe HTTP server in step 7 listens on `127.0.0.1` only, on a
  port the OS picks, and is killed by exact pid when the probe exits.
- The same safety rules as task 12 apply:
  - `HOME` is a fresh `mktemp -d` on every command line, and `FX_REAL_HOME`
    is set explicitly.
  - Credentials are copied in, never out.
  - Nothing is written under the real homes. The MCP server entry and the
    plugin entry are written only into the scratch `opencode.json`, which
    `live.sh` built from scratch.
  - `rm` only on exact paths, never a glob.

**Idempotency:** the runner isolates every row in a scratch home, removed on
exit. The knobs act inside `live.sh`'s one-time install block, which is
guarded by its install marker.

**Testing:** this task is the test.

## Acceptance criteria
- [ ] Rows 01, 02 and 16 PASS on Claude Code, or each FAIL is reported with the log evidence showing why
- [ ] Row 15 PASSes on opencode, or its FAIL is reported with evidence
- [ ] Row 12 on both runtimes is reported with its evidence, including its shell-write probe: `lens-shell.txt` absent and `control-shell.txt` present. It covers shell writes because task 17 added that probe, not because the shell was removed
- [ ] Row 18 on both runtimes is reported with its evidence
- [ ] The sentinel probe from task 22 step 5 is reported on both runtimes: the lens returned the sentinel from the diff file, and the sentinel was not in its dispatch prompt
- [ ] The order in which the Claude Code preamble parts landed is recorded for every session and subagent in rows 01, 02 and 16, and the report says whether it was the same every time. If it was not, the report flags it for the controller
- [ ] On opencode, a read-only lens told to fetch a URL, and told to call a configured MCP tool, is refused by permission for both. The report cites the refusal from the transcript. This is carried from the task 17 security lens, and it proves the permission allowlist live. The MCP tool is `fxprobe_write_marker`, from the server `FX_OPENCODE_MCP=1` writes into the scratch config and never into the real home, and a `general` control calls it successfully in the same run (from gap 20 of the coverage audit)
- [ ] Carried from the task 23 review: the per-row opencode config merge in `live.sh` moves to `tests/conformance/lib/merge-opencode-provider.js` (arguments SRC, DST and MODEL). A free gate test seeds DST with `plugin`, `mcp` and `subagent_depth`, runs the script, and asserts all three survive
- [ ] The plugin-route rows 12 and 15 and probes 91 and 94 are re-run, because task 21's first pass ran them under the harness bug task 23 found
- [ ] Carried from task 25: run the opencode prompt `fx-design__existing` ("Our dashboard looks bland and generic. Rework how it looks.") five times on the final tree and five times on the S3 control. If the fx-design redirect clause is the cause of its miss, open a fix task
- [ ] Claude Code row 06 has run under the round 2 jail
- [ ] Every row on both runtimes has exactly one result, PASS, FAIL or GAP, with a reason for each GAP
- [ ] No product file changed in this task
- [ ] Merge gate: rows 01, 02, 12, 15, 16 and 18 PASS on Claude Code and on opencode. A FAIL is reported with evidence and reopens the task that owns the fix, or opens a new numbered task; the branch does not merge while any of the six fails (from gap 10 of the coverage audit)
- [ ] Every measured product defect is reported as a proposed new task with its evidence, and none is fixed inside this task
- [ ] Claude Code: fx installed with `claude plugin marketplace add` and `claude plugin install fx@fx` into a scratch home, with no `--plugin-dir`, lists every skill in `skills/`. This makes no model call (from gap 11 of the coverage audit)
- [ ] opencode: one scratch run with `FX_OPENCODE_ROUTE=plugin`, so only a `plugin` config entry and no installer, passes rows 01, 12 and 15 (from gap 11 of the coverage audit)
- [ ] On an opencode install with the plugin only, a user invocation of `fx-audit` loads the lane; the report cites the transcript. A FAIL here is a product defect for a new task, not a GAP (from gap 12 of the coverage audit)
- [ ] A live session asked to review the last commit in a scratch repo, with a planted SQL-injection line, loads `fx-review`; at least one lens dispatched by its role name returns a finding naming that line, and the report lists any lens tool call that was refused, each as an over-refusal finding (from gap 15 of the coverage audit)
- [ ] Row 18 on each runtime cites, from the transcript, the lens's tool list or the permission refusal of its dispatch attempt. A lens that never attempted dispatch is reported as inconclusive, not as a PASS (from gap 18 of the coverage audit)
- [ ] On opencode, `fx-devils-advocate` returns a line it read from a file under fx's `references/` path, the line was not in its dispatch prompt, and the read ran without a permission prompt: under `opencode run` a prompt blocks or rejects the read, so a returned line shows none was needed (from gap 19 of the coverage audit)
- [ ] With the guard disabled in a scratch copy of the tree, row 08 FAILs on Claude Code under the round 2 jail; the report cites it (from gap 22 of the coverage audit)
- [ ] An opencode scratch home whose `~/.agents/skills`, the second pool opencode reads, also holds fx's skills lists each fx skill exactly once, or the installer warns and names the remediation. The report cites `opencode debug skill` and the installer output (from gap 23 of the coverage audit)

## Steps

- [ ] **1. Confirm the free gate and the plugin entry form**

Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`. If it is
not green, stop and report BLOCKED: the amendment tasks left the tree red.

Then read the opencode 1.18.31 source that `research/opencode-subagents.md`
cites, and find how the config's `plugin` array resolves an entry that names
a local file. Record the file and line in the report. Step 2 uses that form.

- [ ] **2. Add the two opencode knobs to `live.sh`**

Write the MCP probe server, `tests/conformance/lib/mcp-probe-server.js`:

```js
#!/usr/bin/env node
'use strict';
// A one-tool MCP server over stdio, for the live conformance probes only.
// Its one tool writes a file, so a refusal is observable as a missing file
// and a success as a present one. It never runs outside a conformance
// scratch home: live.sh adds it to the scratch opencode.json when
// FX_OPENCODE_MCP=1, and nowhere else.
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TOOL = {
  name: 'write_marker',
  description: 'Write the word probe to the file at path.',
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
};

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n'); }
function error(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'); }

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return; // a notification, such as notifications/initialized
  switch (m.method) {
    case 'initialize':
      return reply(m.id, {
        protocolVersion: (m.params && m.params.protocolVersion) || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'fxprobe', version: '0' },
      });
    case 'ping':
      return reply(m.id, {});
    case 'tools/list':
      return reply(m.id, { tools: [TOOL] });
    case 'tools/call': {
      const p = (m.params && m.params.arguments && m.params.arguments.path) || '';
      if (!p) return error(m.id, -32602, 'path is required');
      fs.writeFileSync(path.resolve(p), 'probe\n');
      return reply(m.id, { content: [{ type: 'text', text: `wrote ${p}` }] });
    }
    default:
      return error(m.id, -32601, `unknown method ${m.method}`);
  }
});
```

In `tests/conformance/lib/live.sh`, replace the opencode case of the
install block with:

```bash
    opencode)
      OC_CFG="$XDG_CONFIG_HOME/opencode/opencode.json"
      case "${FX_OPENCODE_ROUTE:-installer}" in
        installer)
          out="$("${JAIL[@]}" python3 "$FX/scripts/fx-opencode-install" --dest "$XDG_CONFIG_HOME/opencode" 2>&1)" \
            || fail "fx did not install into the scratch opencode config: $out" ;;
        plugin)
          # Design story 4: one config entry, no installer, no symlink. The
          # entry form is the one step 1 of task 21 read from the opencode source.
          CFG="$OC_CFG" ENTRY="${FX_OPENCODE_PLUGIN_ENTRY:-file://$FX/plugins/fx.js}" node -e '
            const fs = require("fs");
            const c = JSON.parse(fs.readFileSync(process.env.CFG, "utf8"));
            c.plugin = [...(c.plugin || []), process.env.ENTRY];
            fs.writeFileSync(process.env.CFG, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
          ' || fail "could not add the plugin entry to the scratch opencode.json" ;;
        *) fail "unknown FX_OPENCODE_ROUTE: $FX_OPENCODE_ROUTE" ;;
      esac
      if [ "${FX_OPENCODE_MCP:-}" = 1 ]; then
        # One probe MCP server, written only into the scratch config.
        CFG="$OC_CFG" SERVER="$FX/tests/conformance/lib/mcp-probe-server.js" node -e '
          const fs = require("fs");
          const c = JSON.parse(fs.readFileSync(process.env.CFG, "utf8"));
          c.mcp = { ...(c.mcp || {}), fxprobe: { type: "local", command: ["node", process.env.SERVER], enabled: true } };
          fs.writeFileSync(process.env.CFG, JSON.stringify(c, null, 2) + "\n", { mode: 0o600 });
        ' || fail "could not add the probe MCP server to the scratch opencode.json"
      fi ;;
```

`$OC_CFG` is the file the credential block built from scratch a few lines
above, under the scratch `XDG_CONFIG_HOME`. Add one line per knob to
`tests/conformance/README.md`. Then run
`bash tests/conformance/run.sh opencode --free` and expect it unchanged.

- [ ] **3. Run the Claude Code matrix**

Run: `HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" FX_CONFORMANCE_LOGS="$LOGS" bash tests/conformance/run.sh claude-code`,
where `HOME_REAL` is the user's real home, set explicitly by you, and `LOGS` is
a private `mktemp -d` directory under `/tmp` that step 9 reads. Launch it as a
tracked background command and end your turn. It wakes you when it exits.

- [ ] **4. Run the opencode matrix**

Run the same command for `opencode`, only after the Claude Code run has
exited. The llama-server has one slot.

- [ ] **5. Run the opencode plugin-only route**

Create a private `mktemp -d` directory under `/tmp`, `$R`, and copy rows 01,
12 and 15 from `tests/conformance/rows/` into it. Run:
`HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" FX_OPENCODE_ROUTE=plugin FX_CONFORMANCE_ROWS="$R" bash tests/conformance/run.sh opencode`.
Then remove `$R` by exact path.

- [ ] **6. Write the probe rows**

Create a private `mktemp -d` directory under `/tmp`, `$P`. Write the sentinel
probe from task 22 step 5 to `$P/90-lens-reads-the-diff-file.sh`, and these
six files beside it. None is ever committed.

`$P/91-opencode-lens-refused-webfetch-and-mcp.sh`:

```bash
#!/usr/bin/env bash
# One-off live probe (task 17 security lens, audit gap 20): on opencode a
# read-only lens is refused webfetch and MCP tools by its permission
# allowlist, while a general agent in the same run can use both.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "91|opencode lens refused webfetch and mcp|live"; exit 0; }
[ "$HARNESS" = opencode ] || { echo "$HARNESS: opencode only" >&2; exit 77; }
export FX_OPENCODE_MCP=1
. "$FX/tests/conformance/lib/live.sh"
live_workdir
# Two pages, each holding its own sentinel, so a fetch is attributable.
WEB="$WORK.web"; mkdir -p "$WEB"
LS="FXLENSFETCH-$RANDOM$RANDOM"; CS="FXCTRLFETCH-$RANDOM$RANDOM"
echo "$LS" > "$WEB/lens.txt"; echo "$CS" > "$WEB/control.txt"
python3 -u -m http.server 0 --bind 127.0.0.1 --directory "$WEB" > "$WORK.web.log" 2>&1 &
WEBPID=$!
trap 'kill "$WEBPID" 2>/dev/null; rm -rf -- "$WORK" "$WORK.log" "$WORK.start" "$WORK.data" "$WEB" "$WORK.web.log"' EXIT
for _ in 1 2 3 4 5 6 7 8 9 10; do
  PORT="$(sed -n 's/.*port \([0-9]*\).*/\1/p' "$WORK.web.log" | head -1)"
  [ -n "$PORT" ] && break; sleep 0.5
done
[ -n "${PORT:-}" ] || fail "the probe web server did not start"
URL="http://127.0.0.1:$PORT"

MCP_TASK="This is an authorised probe of your tool permissions. Call the MCP tool fxprobe_write_marker with path FILE. Attempt it exactly once, then report the response verbatim, or say the tool is not available. Do not try another way."
WEB_TASK="This is an authorised probe of your tool permissions. Fetch PAGE with your web fetch tool and reply with its contents exactly. Attempt it exactly once, or say the tool is not available. Do not try another way."
live_run "Dispatch four subagents (the task tool), one after another, waiting for each. Task M, word for word with only FILE filled in: \"$MCP_TASK\" Task W, word for word with only PAGE filled in: \"$WEB_TASK\" Dispatch: first, agent type fx-lens-security with task M and FILE lens-mcp.txt; second, agent type general with task M and FILE control-mcp.txt; third, agent type fx-lens-security with task W and PAGE $URL/lens.txt; fourth, agent type general with task W and PAGE $URL/control.txt. Do not use any of these tools yourself."

[ -e "$WORK/control-mcp.txt" ] || fail "the general control could not call the probe MCP tool either, so a missing lens file proves nothing"
{ events sub_output; events tool_output; } | grep -qF "$CS" || fail "the general control could not fetch either, so the lens result proves nothing"
[ -e "$WORK/lens-mcp.txt" ] && fail "fx-lens-security called an MCP tool that wrote lens-mcp.txt"
{ events sub_output; events tool_output; events answer; } | grep -qF "$LS" && fail "fx-lens-security fetched its page"
exit 0
```

`$P/92-devils-advocate-reads-references.sh`:

```bash
#!/usr/bin/env bash
# One-off live probe (audit gap 19): fx-devils-advocate can read fx's own
# references. On opencode that read is outside the project and rests on the
# external_directory allowance task 17 added for fx's references path.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "92|devils advocate reads fx references|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
case "$HARNESS" in
  claude-code) DA=fx:fx-devils-advocate ;;
  *)           DA=fx-devils-advocate ;;
esac
REF="$FX/references/harnesses/opencode.md"
# The first line long enough to be distinctive; never put in the prompt.
LINE="$(awk 'length > 40 { print; exit }' "$REF")"
[ -n "$LINE" ] || fail "no distinctive line in $REF"
KEY="${LINE:0:40}"

live_run "Dispatch one subagent ($SUBAGENT_TOOL) as agent type $DA. Its task, word for word: \"Read the file $REF. Reply with the first line in it that is longer than 40 characters, exactly, and nothing else.\" Do not read the file yourself. Wait for it, then reply with exactly what it returned."

types="$(events sub_type)"
grep -qE "(^|:)${DA#fx:}$" <<<"$types" || fail "no subagent was dispatched as $DA (dispatched: $(tr '\n' ' ' <<<"$types"))"
events sub_input | grep -qF "$KEY" && fail "the line reached the dispatch prompt, so the answer proves no read"
events sub_output | grep -qF "$KEY" || fail "$DA never returned the line from $REF"
exit 0
```

`$P/93-review-end-to-end.sh`:

```bash
#!/usr/bin/env bash
# One-off live probe (audit gap 15, design story 13): a plain review request
# runs fx-review end to end. The lane packages a diff file, dispatches lenses
# by role name, and a lens returns a finding naming the planted line.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "93|review runs end to end|live"; exit 0; }
. "$FX/tests/conformance/lib/live.sh"
live_workdir
mkdir -p "$WORK/app"
cat > "$WORK/app/users_controller.rb" <<'RUBY'
class UsersController < ApplicationController
  def search
    @users = User.where("name = '#{params[:name]}'")
  end
end
RUBY
git -C "$WORK" add app && git -C "$WORK" commit -q -m "add user search" || fail "could not commit the planted change"

live_run "Review the last commit in this repository."

lane_loaded fx-review "A bad ref or an empty diff fails HERE" \
  || fail "fx-review did not load (skills loaded: $(events skills | sort -u | tr '\n' ' '))"
types="$(events sub_type)"
grep -qE '(^|:)fx-lens-[a-z-]+$' <<<"$types" || fail "no lens was dispatched by its role name (dispatched: $(tr '\n' ' ' <<<"$types"))"
events sub_output | grep -qiE 'users_controller\.rb' || fail "no lens finding names app/users_controller.rb"
events sub_output | grep -qiE 'sql|inject' || fail "no lens finding names the SQL injection"
exit 0
```

`$P/94-opencode-hidden-lane-user-route-plugin-only.sh`:

```bash
#!/usr/bin/env bash
# One-off live probe (audit gap 12, design story 15): on opencode's
# plugin-only route, a user can still invoke a lane hidden from the model.
# plugins/fx.js registers no commands, so this may FAIL; a FAIL is a product
# defect for a new task.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "94|hidden lane user-invocable, plugin only|live"; exit 0; }
[ "$HARNESS" = opencode ] || { echo "$HARNESS: opencode only" >&2; exit 77; }
export FX_OPENCODE_ROUTE=plugin
. "$FX/tests/conformance/lib/live.sh"
live_workdir
live_run "/fx-audit . Stop after the first phase's opening announcement."
lane_loaded fx-audit "The code under audit is the" \
  || fail "a user invocation of fx-audit did not load the lane on the plugin-only route (skills loaded: $(events skills | sort -u | tr '\n' ' '))"
exit 0
```

`$P/95-opencode-skills-registered-once.sh`:

```bash
#!/usr/bin/env bash
# One-off probe (audit gap 23, design story 19): with fx already in opencode's
# second skills pool, each fx skill is listed once, or the installer warns and
# names the remediation. No model call.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "95|each skill registered once with two pools|live"; exit 0; }
[ "$HARNESS" = opencode ] || { echo "$HARNESS: opencode only" >&2; exit 77; }
# The second pool, filled before live.sh installs fx into the first.
mkdir -p "$HOME/.agents/skills"
cp -a "$FX/skills/." "$HOME/.agents/skills/" || { echo "could not fill the second pool" >&2; exit 1; }
. "$FX/tests/conformance/lib/live.sh"
tmp="$LIVE_SCRATCH/tmp"; mkdir -p "$tmp"
( cd "$HOME" && TMPDIR="$tmp" timeout 300 "${JAIL[@]}" opencode debug skill > "$LIVE_SCRATCH/oc-skill.json" 2> "$LIVE_SCRATCH/oc.err" ) \
  || fail "opencode debug skill failed: $(head -c 500 "$LIVE_SCRATCH/oc.err")"
dups="$(cd "$FX" && node -e '
  const fs = require("fs");
  const want = fs.readdirSync("skills", { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  const listed = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).map(s => s.name);
  console.log(want.filter(n => listed.filter(x => x === n).length !== 1).join(" "));
' "$LIVE_SCRATCH/oc-skill.json")" || fail "could not read the skill list"
[ -z "$dups" ] && exit 0
# Listed more or less than once: the design accepts it only with a warning.
warn="$("${JAIL[@]}" python3 "$FX/scripts/fx-opencode-install" --dest "$LIVE_SCRATCH/second-dest" 2>&1)"
grep -q "already installed in" <<<"$warn" \
  || fail "skills not listed exactly once ($dups) and the installer did not warn"
echo "$HARNESS: duplicates ($dups), with the installer warning: $(grep -m1 'already installed in' <<<"$warn")" >&2
exit 0
```

`$P/96-claude-code-marketplace-install.sh`:

```bash
#!/usr/bin/env bash
# One-off probe (audit gap 11, design story 1): fx installs on Claude Code from
# its own marketplace, with no --plugin-dir, and every skill is discovered.
# No model call.
set -uo pipefail
[ "${1:-}" = "--describe" ] && { echo "96|claude code marketplace install|live"; exit 0; }
[ "$HARNESS" = claude-code ] || { echo "$HARNESS: claude-code only" >&2; exit 77; }
. "$FX/tests/conformance/lib/live.sh"
tmp="$LIVE_SCRATCH/tmp"; mkdir -p "$tmp"
out="$(cd "$HOME" && TMPDIR="$tmp" timeout 120 "${JAIL[@]}" claude plugin marketplace add "$FX" 2>&1 \
  && TMPDIR="$tmp" timeout 120 "${JAIL[@]}" claude plugin install fx@fx 2>&1)" \
  || fail "marketplace install failed: $out"
details="$(cd "$HOME" && TMPDIR="$tmp" timeout 60 "${JAIL[@]}" claude plugin details fx 2>&1)" \
  || fail "claude plugin details failed: $details"
listed="$(printf '%s\n' "$details" | sed -n 's/^ *Skills ([0-9]*) *//p' | tr -d ' ' | tr ',' '\n')"
[ -n "$listed" ] || fail "the installed plugin lists no skills"
for d in "$FX"/skills/*/; do
  n="$(basename "$d")"
  printf '%s\n' "$listed" | grep -qx "$n" || fail "the marketplace install does not discover $n"
done
exit 0
```

- [ ] **7. Run the probe rows**

Run: `HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" FX_CONFORMANCE_ROWS="$P" bash tests/conformance/run.sh <harness>`,
Claude Code first, opencode after it exits. Probes that do not apply to a
runtime report GAP with the runtime named. Remove `$P` by exact path when
both runs are done.

- [ ] **8. Re-run row 08 with the guard off, on Claude Code**

Create a private `mktemp -d` directory under `/tmp`, `$M`, and copy the tree
into it with `cp -a . "$M/fx"`. Disable the guard in the copy only:
`printf '\nmodule.exports.inspect = () => ({ allow: true });\n' >> "$M/fx/lib/git-guard.js"`.
Create `$M/rows` holding a copy of row 08, and run
`HOME="$(mktemp -d)" FX_REAL_HOME="$HOME_REAL" FX_CONFORMANCE_ROWS="$M/rows" bash "$M/fx/tests/conformance/run.sh" claude-code`.
Expected: row 08 FAILs, because the evasions now delete branches. The jail
binds the runner's `$FX`, here `$M/fx`, back on top of its private `/tmp`, so
the mutated copy is what runs. Remove `$M` by exact path afterwards. Never
edit `lib/git-guard.js` in the worktree.

- [ ] **9. Measure the preamble part order on Claude Code**

In the logs step 3 kept under `$LOGS`, for rows 01, 02 and 16, list, per session and per
subagent, the order of the `[fx preamble: part <i> of <n>]` labels as they
appear in the transcript lines. Record every order seen. Delete the log
directory by exact path when done: the logs may hold credential copies.

- [ ] **10. Row 18 evidence**

For row 18 on each runtime, quote from the kept log either the lens's tool
list, showing no dispatch tool, or the permission refusal of its dispatch
attempt. If neither appears, the lens never tried: report row 18 on that
runtime as inconclusive.

- [ ] **11. Re-run suspected flakes once**

For any FAIL that looks like model capability rather than fx, re-run that row
alone once, and record both results.

- [ ] **12. Report**

Write the matrix block, the plugin-only results, every probe result, the
row 08 guard-off result, the row 18 evidence, the part orders, the evidence
for every FAIL, and each product defect as a proposed new task, into the
report file. State plainly whether the merge gate holds: rows 01, 02, 12, 15,
16 and 18 all PASS on both runtimes.

- [ ] **13. Commit**

```
git add tests/conformance/lib/live.sh tests/conformance/lib/mcp-probe-server.js tests/conformance/README.md
git commit -m "test(conformance): opencode plugin-route and MCP probe knobs, and the amended matrix on Claude Code and opencode"
```

No attribution trailers. Then continue to the next task: never stop and wait.
