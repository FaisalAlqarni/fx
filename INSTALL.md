# Installing fx

fx runs on three runtimes: Claude Code, Codex and opencode. Each install is
independent, and none of them needs another runtime present. fx is measured
against Claude Code 2.1.278, Codex CLI 0.155.1 and opencode 1.18.25. Later
versions are checked only by the nightly free rows at `@latest` (see
[Nightly checks](#nightly-checks)), which make no model call, so a live
session on a newer CLI has not been proven.

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
Codex live verification is still pending.

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

If you have not trusted the hooks yet, run `$fx-setup` in a repository instead.
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

- **Live verification is pending.** See [What is verified](#what-is-verified).
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

## opencode

### Plugin route

```bash
git clone https://github.com/FaisalAlqarni/fx.git ~/src/fx
```

Then add the plugin to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["file:///home/you/src/fx/plugins/fx.js"]
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
loads as a command. Task 21 runs it again on the final tree.
<!-- task21-opencode -->

### Script route

Use this when opencode's plugin loader is unavailable. opencode has forks, two
environment switches turn plugins off entirely, and part of the registration
surface the plugin relies on is experimental.

**This route places files. It does not replace the plugin.** With plugins off,
none of `plugins/fx.js` runs, so the session has:

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

**Symlinked**: `references/` and `plugins/fx.js`. Skills are linked one at a
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

## Per repository: every runtime

```
/fx:fx-setup     # Claude Code
/fx-setup        # opencode
$fx-setup        # Codex
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
real CLI. `docs/plans/2026-09-21-multi-harness/state.md` records every result.

| Runtime | Live result |
|---|---|
| Claude Code | Task 21, final tree: 16 pass, 0 fail, 2 GAP (13, 14). |
| opencode | Task 21, final tree: pending. <!-- task21-opencode --> |
| Codex | **Pending.** See below. |

On Claude Code every merge-gate row passes: 01, 02, 12, 15, 16 and 18. The
opencode final-tree run waits for free memory on the test machine. Before
it, task 21's first pass was 18 pass, 0 fail, 0 GAP on the script route, and
task 25 ran rows 01, 02 and 16 on the bootstrap, all passing.

On Codex, the free rows 03, 09, 10 and 11 pass, and 13 and 14 are GAP. Rows
01 and 02 passed in task 12, but on the hook wiring that has since been
replaced, so they prove nothing about the current tree. Row 18 has never run
on Codex. Part B runs every row.

**Codex live verification is pending.** It happens in two parts. Part A is a
probe on a local model. It proves mechanics only: that the hooks load, that
the bootstrap reaches the model's input, and that the git guard refuses. Part
B runs the full matrix on a real model on 2026-10-21, when the Codex quota
resets, and it is the merge gate for this release. Until part B passes, no
Codex behaviour in a live session counts as proven.

### Stated limitations

Every `GAP` recorded in `state.md`:

- **Rows 13 and 14 on Claude Code and Codex.** No row checks, inside a live
  session on those runtimes, that the five user-invoked lanes are hidden from
  the model (13) and still typeable (14). On Claude Code the check cannot be
  made the way the row needs: `claude plugin details` lists a lane even when
  it is marked `user-invocable: false`. The frontmatter flags that do the
  hiding are pinned by `tests/gates/user-invoked.test.js`, which runs in
  `scripts/check-all`. Task 22 adds a check for Codex through
  `codex debug prompt-input`, which needs no model call.
- **Codex rows 04 to 08, 12 and 15 to 17.** Not run: the Codex quota ran out
  during task 12. None of these is a pass. Row 18 has never run on Codex, and
  rows 01 and 02 last passed on the old hook wiring. Part B runs every row.

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
  config level (13 and 14; GAP on Claude Code and Codex, as above).

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
