# Installing fx

Two runtimes, two mechanisms. Both read the **same files** — one clone, no copies
to keep in sync.

---

## Claude Code

```bash
/plugin marketplace add FaisalAlqarni/fx
/plugin install fx@fx
```

Or from a local clone, without GitHub:

```bash
/plugin marketplace add /development/fx
/plugin install fx@fx
```

Restart the session. `SessionStart`, `SubagentStart` and the Bash `PreToolUse`
guard come from `hooks/hooks.json` and need no further setup.

---

## opencode

opencode does **not** read Claude Code plugin marketplaces. It scans its own
directories, so fx is wired in with symlinks — the repo stays the single source.

```bash
FX=/development/fx          # wherever you cloned it
OC=~/.config/opencode

mkdir -p "$OC/plugins"
ln -sfn "$FX/skills"        "$OC/skills"
ln -sfn "$FX/references"    "$OC/references"
ln -sfn "$FX/plugins/fx.js" "$OC/plugins/fx.js"
```

Three links, and **the second one is not optional.**

### Why `references` is symlinked too

Every lane cites its references as `../../references/vocab/x.md`, relative to
the skill file. Symlinking individual skills breaks that: Node resolves through
to the real path, but an agent resolving from the symlink location lands in
`~/.config/opencode/references`, which would not exist.

Linking `skills` and `references` as **siblings** makes both resolution paths
work. Verified: all four sampled skills resolve their references through the
symlinked tree, and the plugin loads its `lib/` and `PREAMBLE.md` correctly from
a symlinked entry point.

Do **not** symlink skills one by one. It appears to work — the skill loads —
and then every reference silently fails to resolve, which is the failure mode
this plugin exists to avoid.

### Verify the install

```bash
# skills visible
ls ~/.config/opencode/skills

# references resolve from the symlinked tree
node -e "console.log(require('fs').existsSync(
  require('path').join(process.env.HOME,'.config/opencode/skills/fx-tdd/../../references/vocab/good-tests.md')
) ? 'ok' : 'BROKEN')"
```

Then, in a session, confirm the guard is live — `git commit` on a main checkout
must be refused, and the same command inside a worktree must succeed.

### Subagents

opencode implements subagents as **child sessions**, so the same
`experimental.chat.system.transform` hook covers them. Claude Code needs two
separate events for this.

That follows from the architecture but is not documented outright. **Probe it
once** with a throwaway subagent and confirm the preamble is present before
relying on it.

### If the hook name changes

`experimental.chat.system.transform` carries an `experimental.` prefix. If it is
renamed, the stable fallback is `~/.config/opencode/AGENTS.md`, which every
session including child sessions reads. Paste `PREAMBLE.md` there — the guard in
`tool.execute.before` is unaffected either way.

---

## Per repository, both runtimes

```
/fx:setup
```

Writes `.fx.json` (test commands, `stacks`) and generates `repo.md` — this
project's structure and patterns — **for your review before it lands**.

---

## Removing the plugins fx replaces

**Order matters.** Do this only after fx is confirmed working in *both*
runtimes.

`~/.agents/skills/` is a second pool that Claude Code cannot see. Uninstalling
the Claude Code plugins removes nothing from it, so the selection contest fx
exists to end survives there until it is cleared deliberately.

```bash
# 1. Claude Code
/plugin uninstall superpowers mattpocock-skills ecc ponytail humanizer

# 2. only after opencode is confirmed working — inspect before deleting
ls ~/.agents/skills
```

Removing them first leaves opencode with neither fx nor its predecessors.
