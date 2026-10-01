# Installing fx

fx runs on four harnesses: Claude Code, Codex, opencode 1.x and opencode 2.x.
The two opencode majors share one binary name and one config directory but
have different plugin APIs, so fx ships a plugin for each and treats them as
separate harnesses (`docs/adr/0036`). Each install is independent, and none of
them needs another runtime present. fx is measured against Claude Code 2.1.278,
Codex CLI 0.155.1, opencode 1.18.25 and opencode 2.0.18. Later versions are
checked only by the nightly free rows at `@latest` (see
[Nightly checks](#nightly-checks)), which make no model call, so a live
session on a newer CLI has not been proven. Live results per harness are under
[What is verified](#what-is-verified).

Each runtime has one route through its own plugin system. opencode also has a
script route, for machines where its plugin loader is unavailable. Claude Code
and Codex have no script route and do not need one, because a script would
place nothing their plugin systems do not. Claude Code's plugin delivers
every part of fx: skills, agents, commands and hooks. Codex's plugin delivers
the skills and hooks. Codex has no command surface, so fx's commands ship
there as skills. A Codex plugin also cannot place the review roles, which
live in your Codex home; fx's own hook and `fx-setup` place them, as the Codex
section shows.

What each runtime has been proven to do in live sessions is at the end, under
[What is verified](#what-is-verified). Read it before relying on a guarantee:
Every row on every runtime passes there.

---

## Claude Code

### Plugin route

```
/plugin marketplace add FaisalAlqarni/fx
/plugin install fx@fx
```

Or from a local clone, with no GitHub:

```
/plugin marketplace add /path/to/fx
/plugin install fx@fx
```

Restart the session. `hooks/hooks.json` registers `SessionStart`,
`SubagentStart` and `PreToolUse`, and nothing needs further setup. Claude Code
has no hook-trust step.

### Refreshing

```
/plugin marketplace update fx
/plugin update fx@fx
```

Then restart the session. An update lands only when fx's version number has
changed: `/plugin update` compares versions and keeps the installed copy when
they match. A `git pull` in a clone is not enough either: Claude Code runs its
own installed copy of the plugin, not your checkout.

---

## Codex

### Plugin route

```bash
codex plugin marketplace add FaisalAlqarni/fx
codex plugin add fx@fx
```

Codex copies the plugin tree into its own cache. The manifest's `hooks` key
names `./hooks.json`, which wires `hooks/fx-codex.js` to `SessionStart`,
`SubagentStart` and `PreToolUse`.

### Trust the hooks, then restart once

Codex runs a plugin's hooks only after you trust them. Do these steps in
order:

1. Run `codex`, open `/hooks`, and review and trust fx's hooks.
2. Start a session. fx's `SessionStart` hook plants six read-only review roles
   into `$CODEX_HOME/agents` (`~/.codex/agents` by default), as `fx-*.toml`
   files, and shows a notice asking you to restart Codex once.
3. Restart Codex. Codex reads roles only when a session starts, so a role
   planted during a session can be dispatched only from the next one.
4. From now on a lane can dispatch a review agent.

If you have not trusted the hooks yet, run `$fx:fx-setup` in a repository instead.
It plants the same roles without any hook, reports what it planted, and tells
you to restart Codex once and to trust the hooks in `/hooks`.

Until the hooks are trusted, none of them runs. There is no bootstrap
preamble, no git guard, no lane check and no read-only enforcement. The skills
come from the plugin itself, not from a hook, so they are still listed; task 22
measures what an untrusted install does.

### Refreshing

```bash
codex plugin marketplace upgrade fx
codex plugin add fx@fx
```

A `git pull` is never enough on Codex, because Codex runs its cached copy, not
your checkout.

**After every fx update, open `/hooks` again and trust the changed hooks.**
Codex's trust covers the exact hook definition. When an update changes a
handler, Codex marks that hook modified and stops running it until you trust
it again. Until you do, the preamble, the git guard and read-only enforcement
do not run, and nothing tells you so: `fx-setup` cannot read Codex's trust
state today, so it always tells you to check `/hooks`.

### Limits on Codex

- **Live verification** is in [What is verified](#what-is-verified).
- **The bundled validator reports five failures, and they are expected.**
  Codex's plugin lint rejects `disable-model-invocation: true`, and fx sets it
  on each of its five user-invoked lanes (`fx-audit`, `fx-critique`,
  `fx-grill`, `fx-handoff`, `fx-setup`), one failure per lane. The lint is not
  what Codex runs when it installs a plugin: the marketplace install accepts
  fx as shipped. Setting the field to `false` would let Claude Code choose
  those lanes on its own, which is what the flag exists to prevent.
- **Hiding those five lanes rests on undocumented Codex behaviour.** Each lane
  is hidden by its `agents/openai.yaml`. But Codex also turns plugin commands
  into skills by itself, and a skill made that way is not hidden. fx's
  commands escape this only because Codex's command migrator parses command
  frontmatter as strict YAML and skips a command whose frontmatter fails, and
  each of fx's command descriptions holds an unquoted colon. A unit test pins
  the colon. It cannot pin Codex's parser: if a Codex release relaxes it, the
  five lanes become visible to the model without warning.
- **Read-only agents keep a shell on Codex**, behind a classifier. See
  [Read-only agents](#read-only-agents).
- **Nesting depth depends on the model.** Read from the 0.155.1 source: on a
  model that uses MultiAgentV2, a subagent can dispatch its own subagent. On a
  model that uses V1 the default depth is 1, and only the user-level key
  `[agents] max_depth` in `$CODEX_HOME/config.toml` raises it. No plugin can
  set that key.

---

## opencode 1.x

On opencode 2.x, use [opencode 2.x](#opencode-2x) below: the 1.x plugin does not
load there.

### Plugin route

```bash
git clone https://github.com/FaisalAlqarni/fx.git ~/src/fx
```

Then add the plugin to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["file:///home/you/src/fx/plugins/fx-opencode-v1.js"]
}
```

The plugin registers fx's skills, its six read-only agents and its commands
during opencode's config hook. The commands come from `lib/opencode-commands.js`,
the same generator the script route uses, so both routes register identical
text. The plugin also:

- hides the five user-invoked lanes from the model, while you can still type
  each as a command;
- raises `subagent_depth` to 2;
- grants the built-in `general` agent `task: allow`, so a subagent can
  dispatch a subagent.

Task 23 measured this route live: rows 01, 12 and 15 passed, and `/fx-audit`
loads as a command. Task 21 re-ran it on the final tree, 2026-09-22: rows 01,
12 and 15 (plugin route) passed again, 3 pass, 0 fail, 0 GAP
(`/tmp/tmp.wiU1YAo8Ky/logs/final-oc-plug.out`).

### Script route

Use this when opencode's plugin loader is unavailable. opencode has forks, two
environment switches turn plugins off entirely, and part of the registration
surface the plugin relies on is experimental.

**This route places files. It does not replace the plugin.** With plugins off,
none of `plugins/fx-opencode-v1.js` runs, so the session has:

- no bootstrap: nothing injects `PREAMBLE.md`;
- no git guard and no lane check: no `tool.execute.before` hook refuses
  anything;
- no `task: allow` grant for `general`, and `subagent_depth` stays at
  opencode's default, so a subagent cannot dispatch a reviewer.

The skills, agents and commands still load, and each agent file still carries
its own read-only permissions. The only bootstrap fallback is
`~/.config/opencode/AGENTS.md`: paste the rendered `PREAMBLE.md` there. Nothing
stands in for the guard.

```bash
git clone https://github.com/FaisalAlqarni/fx.git ~/src/fx
cd ~/src/fx
./scripts/fx-opencode-install
```

Add `--dry-run` first to see what it would do, or `--dest <path>` to install
somewhere other than `~/.config/opencode`.

#### What it does, and why copying the files is not enough

**Symlinked**: `references/` and the plugin (`plugins/fx.js` in the config directory). Skills are linked one at a
time, `skills/<name>`, sitting beside `references/`: `skills/` itself is a
real directory the installer owns, never a whole-folder symlink.

**Generated**: `agents/` and `commands/`, because the two runtimes disagree on
frontmatter and a straight copy would be silently wrong for agents:

| | Claude Code | opencode |
|---|---|---|
| tool restriction | `tools: Read, Grep, Glob` | `permission:` with `"*": deny` first, then `read`, `grep`, `glob` and `list` allowed, `edit` and `bash` denied |
| subagent marker | implied by directory | `mode: subagent` |
| command prompt | the file body | the file body |

Copying the Claude Code agent files across would produce agents opencode does
not treat as subagents, and **review agents whose read-only restriction is not
enforced**: it lives in `tools:`, which opencode does not read. The conversion
has one implementation, `lib/agent-dialects.js`, which the plugin calls too.

Commands are generated too, but not because the prompt format differs: both
runtimes read the file body as the prompt. Generation exists to normalize the
description field, stamp the generated-file header, and name commands and
agents as opencode registers them, `fx-<name>` with no `fx:` prefix. A skill
marked `disable-model-invocation: true`, such as `fx-audit`, is generated as a
command and never linked into `skills/`, which is how the installer keeps it
away from the model.

Generated files carry a header saying so. Edit the source in the repo and
re-run; do not edit the generated copy.

#### The one thing that breaks silently

`skills/` and `references/` **must be siblings** under the destination.

Every lane cites its references as `../../references/vocab/x.md`, relative to
the skill file. Each skill is linked individually, `skills/<name>`, and the
`references` link sits at the destination root beside it. Both routes land in
the same place because both links point into one fx checkout, where `skills/`
and `references/` are siblings there too: the operating system follows the
skill's link first, so `..` climbs from fx's own `skills/<name>`, straight
into fx's own `references/`. A tool that instead joins the path as text,
without following the link, computes `skills/<name>/../..` as the destination
root, where the destination's own `references` link points into that same fx
checkout. Either way, `skills/` and `references/` still have to be siblings in
the destination, or the second route breaks. The installer links both and then
probes the path, failing loudly if it does not resolve:

```
reference resolution through the symlinked tree: OK
skills: 12  agents: 6  commands: 5
```

It also sets `subagent_depth` to 2 in the destination's `opencode.json`,
keeping a higher value if you set one, so a subagent can dispatch a
subagent. The plugin raises it the same way on the plugin route.

### Refreshing

- **Plugin route:** `git pull` in the clone, then restart opencode. The plugin
  reads skills, agents and commands from the checkout each time opencode
  starts.
- **Script route:** `git pull` refreshes the symlinked skills, references and
  plugin. It does not refresh the generated agents and commands. Run
  `./scripts/fx-opencode-install` again after every pull that changes
  `agents/` or `commands/`. Running it after every pull is simplest.

**An install made before this release keeps its old read-only agents until you
run the installer again.** The installer wrote agent files, and the plugin
never overwrites an agent that is already defined. The old files allowed
`bash`, and they lack the deny-all rule, so an old read-only agent still has a
shell, `webfetch` and any MCP tool you configured. Run
`./scripts/fx-opencode-install` once to regenerate them. This applies even if
you have since moved to the plugin route.

### Two-level dispatch and your own `general` permissions

The plugin adds `task: allow` to the `general` agent only when your
`general.permission` has neither a `task` key nor a `*` key. If you set it to
a wildcard, as in `"permission": "ask"` (which opencode reads as
`{"*": "ask"}`), the plugin leaves your choice alone, and a subagent cannot
dispatch another subagent until you allow `task` yourself:

```json
{
  "agent": {
    "general": { "permission": { "*": "ask", "task": "allow" } }
  }
}
```

### Verify

```bash
ls ~/.config/opencode/skills     # script route: 12 links into fx
```

Then in a session, confirm the guard is live: `git branch -D fx-guard-probe`
must be refused, worktree or not. It is one of the absolutes, so being in a
worktree does not change the answer, and the probe is harmless either way:
with no guard, git simply reports that the branch does not exist.

### Subagents

opencode runs a subagent as a child session, and the same
`experimental.chat.system.transform` hook that injects the bootstrap into a
session covers the child. Row 02 measured it live in task 25: a subagent
received the bootstrap.

### If the hook is renamed

`experimental.chat.system.transform` carries an `experimental.` prefix. If it
changes, the fallback is `~/.config/opencode/AGENTS.md`, which every session
including child sessions reads: paste the rendered `PREAMBLE.md` there. The
git guard in `tool.execute.before` is unaffected either way.

---

## opencode 2.x

fx ships a separate plugin for 2.x, `plugins/fx-opencode-v2.js`, and the
installer takes a `--major` flag. The version in `opencode --version` picks the
major when you give no flag. Measured on 2.0.18.

### Install

```bash
git clone https://github.com/FaisalAlqarni/fx.git ~/src/fx
cd ~/src/fx
./scripts/fx-opencode-install --major 2
```

Add `--dry-run` first to see what it would do, or `--dest <path>` to install
somewhere other than `~/.config/opencode`. Without `--major`, the installer
reads `opencode --version` (10 second timeout). It accepts only 1 or 2, and
any other answer stops it with an error naming `--major`: it never guesses.

On 2.x the installer:

- links the plugin (`plugins/fx-opencode-v2.js`, installed as `plugins/fx.js`), `references/` and each skill
  into the config directory;
- generates the six read-only agents with rule-list permissions;
- writes fx's guard policies and `experimental.subagent_depth` 2 into
  `opencode.json`;
- never writes a top-level `permissions` key, which opencode 1.x refuses, so
  the same directory still loads under 1.x;
- records what it wrote in `.fx-opencode-owned.json` in the config directory.
  A later run, in either major, removes only entries listed there and still
  holding the recorded value. A policy or depth you wrote yourself is never
  removed, even when it is identical to fx's. An install made before that
  record existed has none, so fx treats its entries as yours.

**Nested dispatch on 2.x is yours to allow.** The built-in `general` and
`explore` agents deny the `subagent` tool and `build` cannot run as a subagent,
so by default a subagent cannot dispatch another (a reviewer inside an
implementer, for example). fx does not grant that on 2.x: it cannot see every
place 2.0.18 reads your rules from, so it cannot tell whether you already
answered. To let `general` dispatch subagents, add this to your `opencode.json`
(fx's `subagent_depth` 2 then lets it nest one level):

```json
{ "agents": { "general": { "permissions": [{ "action": "subagent", "resource": "*", "effect": "allow" }] } } }
```

On 1.x fx grants the equivalent `task` permission to `general` unless you set
your own (ADR-0026).

The plugin registers fx's commands itself, so the installer writes no command
files on 2.x and removes the generated ones a 1.x install left.

A `file://` entry in `plugin` does not work on 2.0.18 (it answers "configured
plugin path must be a directory"). To use the plugin without the installer,
link `plugins/fx-opencode-v2.js` into `~/.config/opencode/plugins/fx.js` and add
`~/src/fx/skills` to `skills`. That route gives the plugin's hooks, agents and
commands, but not the guard policies or `subagent_depth`.

### Verify

In a session, ask the model to run `git push --force origin main`. fx refuses
it with its own reason, "force push rewrites history that has already left the
machine." Measured on 2.0.18 through a model, with the plugin linked into a
scratch config. If the guard failed to register, the session preamble carries a
line naming the failed step.

### What the guard catches, per layer

Full detail and the limits are in `docs/adr/0037`.

1. **The full command, in `permission.evaluate`.** The plugin records the whole
   command in `tool.execute.before`, keyed by session, message and call id, and
   `permission.evaluate` looks it up by that key. It runs fx's guard on the full
   text and on each parsed piece. Every error path denies: a missing or
   malformed key, a lookup that misses, a guard that fails to load or throws. If
   `permission.evaluate` cannot be registered, `tool.execute.before` throws for
   every shell call instead. If both fail, the guard is off and the preamble
   says so.
2. **Policies the installer writes.** `experimental.policies` holds deny rules
   for the absolutes a wildcard can express: force push, push to `main`,
   `master` or `trunk`, remote branch deletion, `--no-verify`, `reset --hard`,
   `clean -f`, `branch -D`, `stash drop`, `checkout .` and `restore .`, tag
   deletion. The patterns are tight and cover plain spellings only (no `-C` or
   `-c`, no `HEAD:refs/heads/main`). Each has allowed samples in its test, such
   as `git commit -m "explain --no-verify flag"`. A policy cannot be overridden
   and its message is generic: "Blocked by configuration policy". So a plain
   `git branch -D` (and every other form a pattern can express) is refused by
   the installed policy with that generic text, never fx's reason. Other
   spellings, such as `git -C . branch -D`, `sh -c '...'` or a command after a
   heredoc, skip the policies, reach fx's guard and get fx's reason, which
   starts with `[fx] `.
3. **A throwing `tool.execute.before`.** The fallback when layer 1 could not
   register.

### What the guard does not catch

- `echo "git reset --hard" | sh`. The shared `lib/git-guard.js` does not scan
  the quoted body of an `echo` that feeds a shell. This gap was there before
  the 2.x plugin and is the same on every runtime.
- A shell call that opencode parses into zero commands never reaches
  `permission.evaluate` (read from the 2.0.18 source, not probed).
- Free text in a push option can make a policy block a command the guard would
  allow, because a policy cannot be overridden.

### The five user-invoked lanes

fx hides `fx-audit`, `fx-setup`, `fx-critique`, `fx-grill` and `fx-handoff`
from the model by adding a `skill` deny rule for each to the built-in agents
and to fx's own, and the evaluate hook refuses a call to one at run time. You
reach them as commands: the plugin registers `/fx-<name>`. On 2.0.18,
`opencode run` has no command flag and treats `/fx-audit` as plain text, so
type the command in the TUI, or call `opencode api session.command`.

Limits:

- An agent you define in `opencode.json` is applied after fx's transforms, so
  fx's deny rules do not reach it. It lists the five lanes; a call to one is
  still refused at run time.
- Hiding steers the model. A direct read of a `SKILL.md` file is not blocked.
- `opencode api skill.list` lists every skill whatever the rules say. Read
  `opencode debug agents` for what an agent is denied.
- If your host sets session-level permissions, they cannot widen fx's six
  read-only agents: the evaluate hook allows them read, grep, glob and list,
  and `external_directory` only under fx's own `references` directory, and
  denies everything else. This is read from the 2.0.18 source, not probed.

### What fx cannot observe on 2.x

- The free rows show the agents' deny rules, not a model's own skill list. No
  file or event records the skills a session can see.
- `opencode debug agents` and `skill.list` return an empty or partial answer on
  the first call after a start, while plugins load. Call again before
  concluding anything.
- `opencode debug agents` waits two minutes when another OpenCode service
  already holds port 49374. Run `opencode service set port <port>` first.
- Every scripted `opencode run` needs `</dev/null`, or it blocks on stdin.
- Whether a command file of yours with the same name as an fx command wins over
  fx's was not probed.

### Refreshing

`git pull` in the clone refreshes the linked files. Run the installer again
after a pull that changes `agents/`, and restart opencode.

---

## Per repository: every runtime

```
/fx:fx-setup     # Claude Code
/fx-setup        # opencode
$fx:fx-setup     # Codex
```

Writes `.fx.json` (test commands, `stacks`) and generates `repo.md` (this
project's structure and patterns) **for your review before it lands**.

On Codex it also plants the review roles and reports them in three states:
present, missing and stale. It reports hook trust as unknown, because Codex's
trust store has not been measured yet, and tells you to check `/hooks`.

**fx-setup checks role and hook state on Codex only.** On Claude Code and
opencode it does not detect:

- whether the plugin is trusted and enabled;
- a `CLAUDE.md` pointer that has drifted;
- a second skills pool, such as `~/.agents/skills`, holding an older copy of
  fx or of the plugins it replaces (the opencode installer warns about this at
  install time only);
- opencode's `subagent_depth`.

Those checks are a follow-up plan, not part of this release.

---

## The always-on bootstrap

`PREAMBLE.md` is a small bootstrap, about 2.9K characters, rendered for each
runtime by `lib/preamble.js`. It makes the model invoke a lane before it acts,
and holds the few rules that must apply when no lane is loaded. Routing lives
in each skill's own description, which every runtime already shows the model,
and each lane carries its own rules (`docs/adr/0021`).

It reaches the model whole, as one part, on every runtime. Claude Code keeps
any hook output over 10,000 characters as a file and shows the model a 2K
preview, so the always-on text has to stay under that. Even with the
`repo.md` note and several plans appended, the bootstrap does, with no split
and so no question of part order. (The 12K router it replaced had to be split,
and Claude Code delivered the parts in an unstable order.) Codex's handlers
set `additionalContextLimit: 0`, and opencode's system transform has no
limit.

---

## Read-only agents

fx ships six read-only agents: five review lenses and `fx-devils-advocate`.
None of them can write, by a different mechanism on each runtime:

- **Claude Code:** `tools: Read, Grep, Glob`. No write tool and no shell.
- **opencode:** a permission allowlist. Everything is denied first, then the
  read tools are allowed back, so there is no write tool, no shell, no
  `webfetch` and no MCP tool.
- **Codex:** Codex has no read tool, so the agent keeps the shell. fx's
  `PreToolUse` hook refuses every shell command its classifier does not clear,
  and every other tool, and read-only agents cannot run git at all. **This is
  a heuristic that stops accidents, not an adversary.** It is weaker than
  the other two, which the runtime itself enforces, and three named limits
  apply.

[`docs/adr/0019`](docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md)
has the per-runtime table, the Codex limits and the measurements.

---

## What is verified

The conformance matrix in `tests/conformance/` runs each guarantee against the
real CLI, through OpenRouter (`FX_LIVE_PROVIDER=openrouter`). The runs below
were made on 2026-10-01 on the branch that adds OpenCode 2.x. Logs are in
`/tmp/fxlogs-opencode-v2-final/`, outside the repo.

| Runtime | Version | Pass | Fail | GAP | Inconclusive attempts | Passes on the fallback model |
|---|---|---|---|---|---|---|
| Claude Code (rows 01, 02, 06, 07, 08, 16) | 2.1.286 | 6 | 0 | 0 | 0 | 0 |
| Codex | 0.155.1 | 18 | 0 | 0 | 16 | 12 (rows 12 and 17 passed on the paid primary) |
| OpenCode | 1.18.25 | 18 | 0 | 0 | 14 | 12 |
| OpenCode | 2.0.18 | 18 | 0 | 0 | 12 | 12 |

- **Models.** Claude Code ran `anthropic/claude-haiku-4.5`. Every other model
  call ran on the fallback `deepseek/deepseek-v4-flash`: the free primary
  `qwen/qwen3.8-27b:free` returned 429 on every first attempt, because the day's
  free-model quota was spent. Rows 03, 09, 10, 11 (and 13, 14 on OpenCode) are
  free rows that make no model call.
- **Inconclusive attempts.** A run that saw a provider error anywhere is
  inconclusive and does not count. Each one was re-run on the fallback, and
  only that clean run is in the Pass, Fail and GAP columns.
- **OpenCode 1.18.25.** Needs the 1.18.25 binary first on `PATH`. Rows 07 and
  18 failed once on the fallback (07: `nothing refused git branch -D`; 18: the
  control agent did not dispatch) and passed on a second run; both runs are in
  the logs.
- **Codex rows 12 and 17** failed on the fallback in the Final run, because
  DeepSeek calls an `apply_patch` function that Codex does not provide for a
  chat-completions model (`unsupported call: apply_patch`). That is a limit of
  the fallback model, not a result for fx. The primary `qwen/qwen3.8-27b:free`
  was rate limited for the whole run, so both rows were decided on the paid
  listing of the same primary model, `qwen/qwen3.8-27b`, which has no free-tier
  limit: two runs, both rows PASS each time, `model=qwen/qwen3.8-27b`, no
  inconclusive attempt (logs in `/tmp/fxlogs-opencode-v2-final/logs15c/`). The
  caveat: the paid listing is a different OpenRouter listing from the free one,
  and nothing here checks that it serves the same weights.
- **Codex nesting.** Rows 15 and 18 on Codex run with `[agents] max_depth = 2`
  in the runner's `config.toml`. That is test configuration. fx cannot ship
  user config, so on default Codex config a model that uses the V1 subagent
  tools cannot nest subagents: a subagent cannot dispatch another.
- **OpenCode 2.x nesting.** Rows 15 and 18 run with the user's own rule
  `agents.general.permissions` `subagent: allow` in the scratch config. fx does
  not grant it (`docs/adr/0036`).
- **Guard refusals on OpenCode 2.x.** A plain `git branch -D` is answered by
  the policy layer with its generic text, not fx's reason, so rows 06 to 08 use
  `git -C . branch -D` there. The guard still refuses; the reason text differs.

### Running the live rows on OpenRouter

`FX_LIVE_PROVIDER=openrouter` runs the live rows of all four harnesses on
OpenRouter (`docs/adr/0038`). It needs `OPENROUTER_API_KEY` in the environment
and an account with purchased credits. Claude Code runs on Haiku, because
non-Anthropic models fail there. A provider error, read from the CLI's own
error events and stderr (and from child and grandchild sessions), makes that
run inconclusive and re-runs the row once on a fallback model; Claude Code has
no fallback. See `tests/conformance/README.md`.

### Stated limitations

- **Rows that passed on the fallback only.** Every model row on Codex
  (except 12 and 17), OpenCode 1.18.25 and OpenCode 2.0.18 passed on `deepseek/deepseek-v4-flash`
  in this run. The same rows passed on the primary in earlier runs of this
  branch (`docs/plans/2026-10-01-opencode-v2/baseline.md`), which was not
  available for the final run.
- **Nothing can assert the names are absent** from the model's context for the
  hidden lanes (13): the session-start event lists tools, MCP servers and
  plugins, never the skills a session can see. Row 13 asserts the `Skill` tool
  is never called with any of the five user-invoked lanes.

### Nightly checks

`.github/workflows/conformance-nightly.yml` runs every night, and on demand.
It installs each CLI twice, at the version floor above and at `@latest`, and
runs the free rows against the real binary: six jobs. A red floor job means fx
no longer works on the oldest version it claims. A red `@latest` job means a
new CLI release changed how plugins load, caught the day it ships.

The free rows check that:

- the bootstrap renders with no placeholder left (03);
- every skill is discovered through the runtime's own install path (09):
  `claude plugin details`; a Codex marketplace install into a scratch home;
  the opencode installer, then `opencode debug skill` and `debug agent`;
- every reference citation resolves (10);
- the six read-only agents are registered (11);
- the user-invoked lanes are hidden and still typeable, at the file and
  config level (13 and 14; on Claude Code these two are live rows, so the
  nightly free run skips them, and on Codex they are live rows too).

The nightly run makes no model call and uses no secrets, so it does not check
anything a live session shows: the bootstrap reaching a session or a
subagent, the git guard refusing inside a session, read-only agents under a
model, nested dispatch, or Codex hook trust. Those rows run locally. A CLI
that is missing after install reports GAP, not failure.

---

## Removing the plugins fx replaces

Only relevant if you were running them. **Order matters.**

`~/.agents/skills/` is a second pool. opencode reads it; Claude Code cannot see
it. Uninstalling Claude Code plugins removes nothing from there, so the
selection contest fx exists to end survives until it is cleared deliberately.

```bash
# Claude Code, one plugin at a time
/plugin uninstall superpowers
/plugin uninstall mattpocock-skills
/plugin uninstall ecc
/plugin uninstall humanizer

# opencode's pools: inspect before deleting anything
ls ~/.agents/skills ~/.claude/skills
```

If you use **both** runtimes, clear `~/.agents/skills` **last**, after
confirming fx works in opencode. Doing it first leaves opencode with neither fx
nor its predecessors.
