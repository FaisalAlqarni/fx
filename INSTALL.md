# Installing fx


## opencode


```bash
git clone https://github.com/FaisalAlqarni/fx.git ~/src/fx
cd ~/src/fx
./scripts/fx-opencode-install
```

That is the whole install. Add `--dry-run` first to see what it would do, or
`--dest <path>` to install somewhere other than `~/.config/opencode`.

### What it does, and why copying the files is not enough

**Symlinked**: `skills/`, `references/`, `plugins/fx.js`. The repo stays the
single source, so `git pull` updates the install with nothing to re-run.

**Generated**: `agents/` and `commands/`, because the two runtimes disagree on
frontmatter and a straight copy would be silently wrong:

| | Claude Code | opencode |
|---|---|---|
| tool restriction | `tools: Read, Grep, Glob, Bash` | `permission: {edit: deny, write: deny, bash: allow}` |
| model id | `model: opus` | `model: anthropic/claude-opus-5` |
| subagent marker | implied by directory | `mode: subagent` |
| command prompt | the file body | `template:` field, **required** |

Copying the Claude Code files across would produce agents opencode does not
treat as subagents, unpinned models that silently inherit the session's most
expensive one, and **review lenses whose read-only restriction is not enforced**: it lives in `tools:`, which opencode does not read.

Generated files carry a header saying so. Edit the source in the repo and
re-run; do not edit the generated copy.

### The one thing that breaks silently

`skills/` and `references/` **must be siblings** under the destination.

Every lane cites its references as `../../references/vocab/x.md`, relative to
the skill file. If you symlink skills individually, the skill still loads and
every reference silently resolves to nothing. The installer links both and then
probes the path, failing loudly if it does not resolve:

```
reference resolution through the symlinked tree: OK
skills: 11  agents: 5  commands: 3
```

### Verify

```bash
ls ~/.config/opencode/skills          # 11 entries
```

Then in a session, confirm the guard is live: `git branch -D fx-guard-probe`
must be refused, worktree or not. It is one of the absolutes, so being in a
worktree does not change the answer, and the probe is harmless either way:
with no guard, git simply reports that the branch does not exist.

### Subagents

opencode implements subagents as **child sessions**, so the same
`experimental.chat.system.transform` hook that injects the preamble covers them.

That follows from the architecture but is not documented outright. **Probe it
once** with a throwaway subagent and confirm the preamble is present before
relying on it.

### If the hook is renamed

`experimental.chat.system.transform` carries an `experimental.` prefix. If it
changes, the fallback is `~/.config/opencode/AGENTS.md`, which every session
including child sessions reads: paste `PREAMBLE.md` there. The git guard in
`tool.execute.before` is unaffected either way.

---

## Claude Code: standalone

**opencode is not required.**

```
/plugin marketplace add FaisalAlqarni/fx
/plugin install fx@fx
```

Or from a local clone, with no GitHub:

```
/plugin marketplace add /path/to/fx
/plugin install fx@fx
```

Restart the session. `SessionStart`, `SubagentStart` and the Bash `PreToolUse`
guard are registered by `hooks/hooks.json` and need no further setup.

---

## Per repository: either runtime

```
/fx:setup
```

Writes `.fx.json` (test commands, `stacks`) and generates `repo.md` (this
project's structure and patterns) **for your review before it lands**.

---

## Removing the plugins fx replaces

Only relevant if you were running them. **Order matters.**

`~/.agents/skills/` is a second pool. opencode reads it; Claude Code cannot see
it. Uninstalling Claude Code plugins removes nothing from there, so the
selection contest fx exists to end survives until it is cleared deliberately.

```bash
# Claude Code
/plugin uninstall superpowers mattpocock-skills ecc humanizer

# opencode's pools — inspect before deleting anything
ls ~/.agents/skills ~/.claude/skills
```

If you use **both** runtimes, clear `~/.agents/skills` **last**, after
confirming fx works in opencode. Doing it first leaves opencode with neither fx
nor its predecessors.
