# 06: Performance lens: read, then adapt or drop

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** a performance review lens that applies to this user's
stacks: **or a recorded decision not to ship one.** Both are acceptable
outcomes. This is separated from task 05 precisely because it is the one
that might end in a deletion.

Upstream `performance-optimizer` is **455 lines**, nearly as long as the other
four lenses combined, and is suspected to be mostly JS bundle-size and
React-render advice. The user's stacks are Rails and .NET.

**Files:**
- Create: `agents/fx-lens-performance.md`: **or** none, plus a recorded decision
- Modify: `.claude-plugin/plugin.json`, `skills/fx-review/SKILL.md` trigger table
- Modify: `OPEN-DECISIONS.md` if the outcome is "do not ship"

**Source:** `~/.claude/plugins/marketplaces/ecc/agents/performance-optimizer.md` (455 ln)

**Interfaces:**
- Consumes: `fx-review` trigger table
- Produces: either `fx-lens-performance`, or a documented absence: **the trigger table must not name an agent that does not exist**

**Seam:** same as task 05.

**Risks:** the tempting failure is adapting all 455 lines because they are
there. Advice about webpack chunks and `useMemo` is not wrong, it is just not
about this codebase, and shipping it means a lens that fires on Rails diffs and
returns irrelevant findings: worse than no lens, because it costs a dispatch
and trains the user to ignore the output.

**Idempotency:** either outcome is a single file write or a single doc edit.

**Testing:** if shipped, same assertions as task 05. If dropped, assert the
trigger table no longer names it.

## Acceptance criteria
- [ ] All 455 lines read before anything is written
- [ ] A written verdict: how much applies to Rails/.NET, with a proportion
- [ ] **If shipped:** under 200 lines, read-only, `model:` pinned mid-tier, triggers on real patterns
- [ ] **If dropped:** `fx-review`'s trigger table no longer names it, and the reasoning is in `OPEN-DECISIONS.md`
- [ ] Either way, no dangling reference to a non-existent agent

## Steps

- [ ] **1. Write the failing check**

```bash
# the table and the filesystem must agree, whichever way this goes
named=$(grep -c 'fx-lens-performance' skills/fx-review/SKILL.md)
exists=$([ -e agents/fx-lens-performance.md ] && echo 1 || echo 0)
[ "$named" -gt 0 ] && [ "$exists" -eq 0 ] && { echo "FAIL: table names an agent that does not exist"; exit 1; }
```

- [ ] **2. Run it: verify RED**

Expected: FAIL, the table names it today and the file does not exist.

- [ ] **3. Read the source in full and write the verdict**

- [ ] **4. Adapt or drop, per the verdict**

- [ ] **5. Run the check: verify GREEN**
