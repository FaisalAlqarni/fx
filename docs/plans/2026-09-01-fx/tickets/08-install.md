# 08 — Install on both runtimes

**Status:** ready-for-agent
**Blocked by:** 01, 02, 03, 04, 05, 06, 07
**Phase:** MVP

**What to build:** fx installed and working on Claude Code and opencode, with
the plugins it replaces removed. This is the ticket that makes everything else
real: until it passes, fx is a directory of markdown.

**Files:**
- Modify: `.claude-plugin/marketplace.json`, `README.md`
- Create: `~/.config/opencode/` plugin wiring (opencode side)
- Remove: the superseded Claude Code plugins, then the `~/.agents/skills` copies

**Interfaces:**
- Consumes: everything tickets 01–07 produced
- Produces: a working install on both runtimes

**Seam:** a live session on each runtime. Nothing here is verifiable by reading
files — the whole ticket is behavioural.

**Risks:**
- **Ordering.** Remove mattpocock, humanizer and `ui-ux-pro-max` from
  `~/.agents/skills` **only after** fx is installed for opencode. Doing it first
  leaves opencode with neither. This sequencing has been recorded since Section 1.
- **The second pool.** `~/.agents/skills/` is a separate tree Claude Code cannot
  see. Uninstalling the Claude Code plugins removes nothing from it, so the
  selection contest survives there unless it is cleared deliberately.
- **The subagent probe.** opencode's system-transform firing on child sessions
  follows from subagents being child sessions, but is not documented outright.
  **Verify with a throwaway subagent before trusting it.**

**Idempotency:** installs are re-runnable; removals are guarded by existence
checks; every removal is listed before it is executed.

**Testing:** end to end on both runtimes — the only ticket where that is possible.

## Acceptance criteria
- [ ] Claude Code: fx installs; all 9 lanes + 2 procedures appear; `/fx:*` commands resolve
- [ ] Claude Code: `SessionStart` injects the preamble; **`SubagentStart` injects it into a dispatched subagent** — verified by probe, not assumed
- [ ] Claude Code: the guard blocks a commit on the main checkout and allows one in a worktree, live
- [ ] opencode: preamble injected; **verified by throwaway subagent probe that it reaches a child session**
- [ ] opencode: `tool.execute.before` blocks the same commit
- [ ] Superseded plugins removed from Claude Code
- [ ] `~/.agents/skills/` copies removed — **after** the opencode install is confirmed working
- [ ] No skill name appears twice across either pool
- [ ] `references/` loads from an installed location, not from the development directory

## Steps

- [ ] **1. Write the failing check**

```bash
# no intent may have two claimants across either pool
dupes=$(cat <(ls ~/.claude/skills 2>/dev/null) <(ls ~/.agents/skills 2>/dev/null) \
        | sort | uniq -d | wc -l)
[ "$dupes" -eq 0 ] || { echo "FAIL: $dupes duplicated skill names across pools"; exit 1; }
```

- [ ] **2. Run it — verify RED**

Expected: FAIL while both pools still hold the old plugins.

- [ ] **3. Install fx on Claude Code and verify the three behaviours live**

- [ ] **4. Install fx on opencode and run the subagent probe**

- [ ] **5. Remove the superseded plugins — Claude Code first, then `~/.agents/skills`**

- [ ] **6. Run the check — verify GREEN, and re-run the guard suite from the installed location**
