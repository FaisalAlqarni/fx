# 26: Fixes from the plugin-dev validator

**Status:** ready-for-agent
**Blocked by:** 25 (both edit skill and agent frontmatter)
**Phase:** Amendment 2

**What to build:** four small fixes from the plugin-dev `plugin-validator`
review of fx's Claude Code plugin. The review is recorded in the ledger under
"plugin-dev:plugin-validator". They are batched because each is a one-line or
one-file change.

1. `agents/fx-devils-advocate.md` has no `model:`. That breaks fx's own rule in
   `SURFACE.md`, that every agent file pins one, so this agent silently inherits
   the session's model. Add `model: opus` to match the other high-stakes
   reviewers, then regenerate the Codex role.
2. `.claude-plugin/plugin.json` lists 11 of the 17 skills. Auto-discovery still
   finds all 17, but the list reads as a deliberate allowlist and it is stale.
   Remove the `skills` array and rely on auto-discovery. Then prove all 17
   still load, using the `claude plugin details` count that row 09 already
   checks.
3. The commands that take an argument (`fx-critique`, `fx-grill`,
   `fx-handoff`) set no `argument-hint`. Add one to each, and regenerate
   whatever is generated from commands.
4. `plugin.json` says `"license": "MIT"` but there is no `LICENSE` file. Add the
   standard MIT text with the author named in `plugin.json`.

**Files:**
- Modify: `agents/fx-devils-advocate.md`
- Modify: `codex/agents/fx-devils-advocate.toml` (regenerated)
- Modify: `.claude-plugin/plugin.json`
- Modify: `commands/fx-critique.md`, `commands/fx-grill.md`,
  `commands/fx-handoff.md`
- Modify: the generated skill files for those three commands
- Create: `LICENSE`

**Seam:** the existing gates: `check-manifest`, `check-generated` and row 09.

**Idempotency:** file edits and generators.

## Acceptance criteria
- [ ] Every `agents/*.md` pins a `model:`, and a gate test asserts it
- [ ] `plugin.json` has no `skills` array, and row 09 still counts 17 skills on Claude Code
- [ ] The three commands carry `argument-hint`, and the generated files match
- [ ] `LICENSE` exists with the MIT text
- [ ] `HOME="$(mktemp -d)" scripts/check-all` is ALL GREEN

## Steps

- [ ] **1. Write the failing gate test** for `model:` on every agent file. Watch it fail.
- [ ] **2. Apply the four fixes, then regenerate.**
- [ ] **3. Run the full gate.** Then commit by path, with no attribution trailers.
