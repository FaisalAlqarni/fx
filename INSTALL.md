# Installing fx

fx runs on four harnesses: Claude Code, Codex, opencode 1.x and opencode 2.x.
Each install is independent: none needs another harness present.

Tested on Claude Code 2.1, Codex CLI 0.155, opencode 1.18 and opencode 2.0.

- [Claude Code](#claude-code)
- [Codex](#codex)
- [opencode 1.x](#opencode-1x)
- [opencode 2.x](#opencode-2x)
- [Then, in each repository](#then-in-each-repository)

---

## Claude Code

### Install

```
/plugin marketplace add FaisalAlqarni/fx
/plugin install fx@fx
```

From a local clone instead: `/plugin marketplace add /path/to/fx`, then
`/plugin install fx@fx`.

Restart the session. Nothing else is needed.

### Update

```
/plugin marketplace update fx
/plugin update fx@fx
```

Then restart the session. Claude Code runs its own installed copy, so a
`git pull` in a clone changes nothing.

### Remove

```
/plugin uninstall fx@fx
```

---

## Codex

### Install

```bash
codex plugin marketplace add FaisalAlqarni/fx
codex plugin add fx@fx
```

Codex runs a plugin's hooks only after you trust them, so:

1. Run `codex`, open `/hooks`, and trust fx's hooks.
2. Start a session. fx places six read-only review roles in
   `$CODEX_HOME/agents` (`~/.codex/agents` by default) and asks you to restart.
3. Restart Codex once. Roles placed during a session load from the next one.

Until the hooks are trusted, the skills are listed but the bootstrap, the git
guard and read-only enforcement do not run. If you would rather not trust the
hooks yet, `$fx:fx-setup` in a repository places the same roles without them.

### Update

```bash
codex plugin marketplace upgrade fx
codex plugin add fx@fx
```

**Then open `/hooks` and trust fx's hooks again.** Codex stops running a hook
whose definition changed until you re-trust it, and it does not tell you.

### Remove

```bash
codex plugin remove fx@fx
```

Then delete `~/.codex/agents/fx-*.toml`.

### Limits on Codex

- Read-only review agents keep a shell, because Codex has no read tool. fx's
  hook refuses every command its classifier does not clear. It stops
  accidents; it is not a security boundary.
- Codex's plugin linter reports five failures for `disable-model-invocation`
  on the five user-invoked skills. They are expected; the install accepts fx
  as shipped.
- A subagent dispatching its own subagent needs `[agents] max_depth = 2` in
  `$CODEX_HOME/config.toml` on models that use Codex's V1 subagent tools. A
  plugin cannot set that key.

---

## opencode 1.x

### Install

```bash
git clone https://github.com/FaisalAlqarni/fx.git ~/src/fx
cd ~/src/fx
./scripts/fx-opencode-install --major 1
```

Add `--dry-run` to see what it would do, or `--dest <path>` to install
somewhere other than `~/.config/opencode`.

The installer links the plugin, `references/` and each skill into the config
directory, generates the six read-only agents and fx's commands, and sets
`subagent_depth` to 2 in `opencode.json` (keeping a higher value of yours).

**Plugin only, without the installer:** add the plugin to
`~/.config/opencode/opencode.json`:

```json
{ "plugin": ["file:///home/you/src/fx/plugins/fx-opencode-v1.js"] }
```

The plugin registers the skills, agents and commands itself.

### Nested dispatch

fx lets the built-in `general` agent dispatch subagents, unless your
`general.permission` already has a `task` or `*` key. If yours is a wildcard
such as `"permission": "ask"`, add `task` yourself:

```json
{ "agent": { "general": { "permission": { "*": "ask", "task": "allow" } } } }
```

### Check it works

In a session, ask the model to run `git branch -D fx-guard-probe`. fx refuses
it. With no guard, git only reports that the branch does not exist.

### Update

`git pull` in the clone, then run `./scripts/fx-opencode-install --major 1`
again and restart opencode. The installer regenerates the agents and commands
a pull does not refresh.

### Remove

See [Removing fx from opencode](#removing-fx-from-opencode).

### If plugins are off

Some opencode setups disable plugins. The installer's files still load
(skills, agents, commands), but there is no bootstrap, no git guard and no
lane check. Paste the rendered `PREAMBLE.md` into
`~/.config/opencode/AGENTS.md` to get the bootstrap back. Nothing replaces the
guard.

---

## opencode 2.x

opencode 2.x has a different plugin API, so fx ships a separate plugin for it.
One opencode config directory serves one major: switching majors means running
the installer with the new `--major`.

### Install

```bash
git clone https://github.com/FaisalAlqarni/fx.git ~/src/fx
cd ~/src/fx
./scripts/fx-opencode-install --major 2
```

Add `--dry-run` to see what it would do, or `--dest <path>` for another config
directory. Without `--major` the installer reads `opencode --version` and
stops with an error if it cannot tell.

The installer:

- links the plugin, `references/` and each skill into the config directory;
- generates the six read-only agents;
- writes fx's guard policies and `experimental.subagent_depth` 2 into
  `opencode.json`;
- records what it wrote in `.fx-opencode-owned.json`, so a later run removes
  only fx's entries and never yours.

The plugin registers fx's commands itself.

### Nested dispatch is yours to allow

By default on 2.x a subagent cannot dispatch another (a reviewer inside an
implementer, for example). fx does not grant it. To allow it, add:

```json
{ "agents": { "general": { "permissions": [{ "action": "subagent", "resource": "*", "effect": "allow" }] } } }
```

### The guard

The git guard runs in the plugin, on the full command text, and refuses with a
reason starting `[fx] `. The installed policies are a second layer: they
refuse the plain spellings of the same commands with opencode's generic
"Blocked by configuration policy". Either message means fx stopped the
command.

### The user-invoked skills

`fx-audit`, `fx-setup`, `fx-critique`, `fx-grill` and `fx-handoff` are hidden
from the model and run as commands: type `/fx-<name>` in the TUI. `opencode
run` treats `/fx-audit` as plain text; use the TUI, or
`opencode api session.command`.

To let the model load one of them on its own, allow it on that agent:

```json
{ "agents": { "build": { "permissions": [{ "action": "skill", "resource": "fx-handoff", "effect": "allow" }] } } }
```

This works on the built-in agents and fx's own. An agent you define yourself
in `opencode.json` stays blocked from the five.

### Check it works

In a session, ask the model to run `git push --force origin main`. fx refuses
it. If the guard failed to load, the session's opening context names the step
that failed.

### Update

`git pull` in the clone, then run `./scripts/fx-opencode-install --major 2`
again and restart opencode.

---

## Removing fx from opencode

The installer has no uninstall flag. In the config directory
(`~/.config/opencode`, or the `--dest` you used):

1. Read `.fx-opencode-owned.json`. It lists what the installer wrote into
   `opencode.json`.
2. In `opencode.json`, delete those entries from `experimental.policies`, and
   the depth key the record lists (`subagent_depth` on 1.x,
   `experimental.subagent_depth` on 2.x). Leave anything you wrote yourself.
   Until this step is done the guard policies apply to every project.
3. Delete the symlinks: `plugins/fx.js`, `references`, and each `skills/<name>`
   that points into the clone.
4. Delete the generated `agents/fx-*.md`, and on 1.x `commands/fx-*.md`.
5. Delete `.fx-opencode-owned.json`.

---

## Then, in each repository

```
/fx:fx-setup     # Claude Code
/fx-setup        # opencode
$fx:fx-setup     # Codex
```

It reads what it can from the repository, asks two short rounds about what the
code cannot tell it (domain terms, what "done" means here), and writes
`.fx.json` (test commands, stacks), `repo.md` and `CONTEXT.md` for your review
before any of it lands. On Codex it also places the review roles and reminds
you to check `/hooks`.

## Known limits on every harness

- `echo "git reset --hard" | sh` gets past the git guard: it does not read
  text piped into a shell.
- If you also run plugins with overlapping skills, such as superpowers, the
  model may pick theirs. Uninstall them, and check `~/.agents/skills` and
  `~/.claude/skills` for old copies.
