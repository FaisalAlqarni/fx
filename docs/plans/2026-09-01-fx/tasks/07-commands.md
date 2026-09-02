# 07: Three commands

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** the three commands the design names and does not ship.
`/fx:setup` already exists; these complete the set of four.

**Files:**
- Create: `commands/fx-critique.md`, `commands/fx-grill.md`, `commands/fx-level.md`
- Modify: `.claude-plugin/plugin.json`

**Interfaces:**
- `/fx:critique`: consumes a design or plan path, dispatches `agents/fx-devils-advocate.md`
- `/fx:grill`: consumes a topic, runs the interview technique from `references/vocab/grilling.md`. **No classification, no gate**: it is for decisions not heading for code
- `/fx:level`: writes `lite|full|ultra` to `~/.claude/fx.json`

**Seam:** command invocation. Each is verifiable by running it.

**Risks:** `/fx:grill` and `fx-brainstorm` both use the grilling technique: the
command must not become a second entry point into the design pipeline, or it
recreates the two-claimants-per-intent problem fx exists to end. It runs the
interview and stops.

`/fx:level` writes outside the repo. That is the only fx write to `~`, and it
must touch `~/.claude/fx.json` alone: **never `~/.claude/CLAUDE.md`**, which is
the user's file.

**Idempotency:** `/fx:level` is a single-key overwrite. The other two are read-only.

**Testing:** each command file parses and declares a `description`; `/fx:level`
round-trips a value.

## Acceptance criteria
- [ ] Three command files exist and are declared in `plugin.json`
- [ ] `/fx:critique` dispatches the devil's advocate and nothing else
- [ ] `/fx:grill` runs the interview and **stops**: no design doc, no gate, no handoff
- [ ] `/fx:level` writes only `~/.claude/fx.json`; `~/.claude/CLAUDE.md` is untouched
- [ ] No command duplicates a lane's trigger

## Steps

- [ ] **1. Write the failing check**

```bash
for c in critique grill level; do
  [ -e "commands/fx-$c.md" ] || { echo "FAIL: missing commands/fx-$c.md"; exit 1; }
  head -5 "commands/fx-$c.md" | grep -q '^description:' || { echo "FAIL: fx-$c has no description"; exit 1; }
done
```

- [ ] **2. Run it: verify RED**

- [ ] **3. Write the three commands**

- [ ] **4. Declare them in `plugin.json`**

- [ ] **5. Run the check: verify GREEN**

- [ ] **6. Confirm `~/.claude/CLAUDE.md` is byte-identical** before and after `/fx:level`.
