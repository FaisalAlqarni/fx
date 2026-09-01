# 01 — Plugin layout and anchored reference paths

**Status:** ready-for-agent
**Blocked by:** None — can start immediately
**Phase:** MVP

**What to build:** fx becomes a directory Claude Code can install, and every
lane can actually load the reference files it names. Today both are broken: the
lanes sit at the repo root instead of `skills/`, and 69 `references/…` paths are
relative to nothing, so once installed they resolve against the *user's* repo
and silently find nothing.

This is a prefactor. It runs first so no later ticket writes a file into a
layout that is about to move.

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `hooks/hooks.json`, `README.md`
- Move:   `fx-*/` → `skills/fx-*/`
- Modify: every `skills/fx-*/SKILL.md` and lane sidecar carrying a `references/…` path
- Keep:   `agents/`, `commands/`, `hooks/`, `lib/`, `references/` at the plugin root

**Interfaces:**
- Produces: `${CLAUDE_PLUGIN_ROOT}` as the anchor every reference path uses
- Produces: plugin root layout — `skills/` `agents/` `commands/` `hooks/` `lib/` `references/`
- Consumes: nothing

**Seam:** the installed plugin directory — assert on file layout and on the
absence of bare `references/` paths, not on prose.

**Risks:** a moved skill that keeps a stale relative path fails **silently** —
the lane still runs, it just never loads the reference. The grep assertion in
the acceptance criteria is the only thing that catches it, so it must be exact.

**Idempotency:** re-running is safe — moves are `git mv` guarded by a
destination-exists check; the manifest write is a full overwrite; the path
rewrite is a no-op once no bare paths remain.

**Testing:** a script asserting zero bare `references/` paths and every
referenced file existing on disk. Runs in CI-less form: one command, exits
non-zero on failure.

## Acceptance criteria
- [ ] `.claude-plugin/plugin.json` declares `skills`, `commands`, `agents` and `hooks` explicitly — never by convention
- [ ] All 9 lanes live under `skills/`
- [ ] **Zero** bare `references/…` paths remain in any skill, sidecar or agent file
- [ ] Every referenced reference file exists — no dangling pointer
- [ ] `hooks/hooks.json` registers `SessionStart` (matcher `startup|resume|clear|compact`), `SubagentStart`, and `PreToolUse` on Bash, all via `${CLAUDE_PLUGIN_ROOT}`
- [ ] `lib/git-guard.test.js` still passes 69/69 from the new location

## Steps

- [ ] **1. Write the failing check**

```bash
# scripts/check-paths — fails while any bare reference path exists
bare=$(grep -rlE '`references/[a-z/-]+\.(md|dot|ts)`' skills agents commands 2>/dev/null | wc -l)
[ "$bare" -eq 0 ] || { echo "FAIL: $bare files carry unanchored reference paths"; exit 1; }
```

- [ ] **2. Run it — verify RED**

Expected: FAIL, naming 7 lanes. That count is the proof the check works; a
check that passes before the fix is testing nothing.

- [ ] **3. Move the lanes into `skills/`**

- [ ] **4. Anchor every reference path**

- [ ] **5. Write the three manifests**

- [ ] **6. Run the check — verify GREEN, and run the guard suite**

Expected: check exits 0; `node lib/git-guard.test.js <main> <worktree>` → 69 passed.
