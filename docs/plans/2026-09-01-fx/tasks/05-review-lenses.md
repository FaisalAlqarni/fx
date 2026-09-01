# 05 — Four review lenses

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** `fx-review`'s trigger table names five lens agents and none
exist. This delivers four of them; the fifth is task 06 because it needs a
judgment call the others do not.

Batched deliberately: four files of the same shape, adapted from the same
source family, against one rubric. Splitting them into four tasks would pay
four dispatch and review cycles for work a single reviewer can assess in one
pass.

**Files:**
- Create: `agents/fx-lens-database.md`, `fx-lens-security.md`, `fx-lens-a11y.md`, `fx-lens-silent-failure.md`
- Modify: `.claude-plugin/plugin.json` — declare them
- Verify: `skills/fx-review/SKILL.md` trigger table matches the names shipped

**Source (line counts as found):** `~/.claude/plugins/marketplaces/ecc/agents/` —
`database-reviewer` 100 · `security-reviewer` 117 · `a11y-architect` 149 ·
`silent-failure-hunter` 59.

**Interfaces:**
- Consumes: `fx-review` dispatches by agent name and file-pattern trigger
- Produces: four agents, each `tools: Read, Grep, Glob, Bash`, each with `model:` pinned

**Seam:** agent frontmatter and the `fx-review` trigger table. Assert the names
match on both sides.

**Risks:** an omitted `model:` silently inherits the session's — usually the
most expensive — which quietly reverses the cost argument these lenses were
justified by. Pin `security` and `database` at top tier, `a11y` and
`silent-failure` mid. Sources are stack-flavoured for other ecosystems; adapt
triggers to real file patterns rather than copying upstream's.

**Idempotency:** file creation with existence guards; manifest edit is a full rewrite.

**Testing:** every agent parses; every name in the trigger table resolves to a
file; no agent declares a write tool.

## Acceptance criteria
- [ ] Four agents exist, each **read-only** — no `Write`, `Edit` or `NotebookEdit`
- [ ] Each pins `model:` explicitly at the agreed tier
- [ ] Every name in `fx-review`'s trigger table resolves to a shipped file
- [ ] Triggers name file patterns that occur in this user's repos
- [ ] Each stays under 200 lines

## Steps

- [ ] **1. Write the failing check**

```bash
for a in database security a11y silent-failure; do
  f="agents/fx-lens-$a.md"
  [ -e "$f" ] || { echo "FAIL: missing $f"; exit 1; }
  grep -q '^model:' "$f" || { echo "FAIL: $f does not pin a model"; exit 1; }
  grep -qE '^tools:.*(Write|Edit)' "$f" && { echo "FAIL: $f can write"; exit 1; }
done
```

- [ ] **2. Run it — verify RED**

Expected: FAIL on the first missing file.

- [ ] **3. Read all four sources before writing any of them**

- [ ] **4. Adapt each: triggers, model, read-only tools**

- [ ] **5. Run the check — verify GREEN**

- [ ] **6. Cross-check the trigger table** in `fx-review` against the four names.
