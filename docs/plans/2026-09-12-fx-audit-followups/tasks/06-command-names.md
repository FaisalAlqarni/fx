# 06: Command names stated with their prefix everywhere

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Core

**What to build:** every place in the plugin that tells a Claude Code user what to
type shows a name that resolves, `/fx:fx-<name>`. The four commands' own headings
and the skills, references, ADR and coverage records that still say `/fx:setup`,
`/fx:critique`, `/fx:grill` or `/fx:handoff` are corrected.

**Files:**
- Modify: `commands/fx-critique.md`
- Modify: `commands/fx-grill.md`
- Modify: `commands/fx-handoff.md`
- Modify: `commands/fx-setup.md`
- Modify: `skills/fx-plan/SKILL.md`
- Modify: `skills/fx-review/SKILL.md`
- Modify: `skills/fx-plan/COVERAGE.md`
- Modify: `skills/fx-review/COVERAGE.md`
- Modify: `skills/fx-brainstorm/COVERAGE.md`
- Modify: `references/vocab/grilling.md`
- Modify: `docs/adr/0003-three-layers-of-knowledge.md`

**Interfaces:**
- Produces: no short-form fx command name in the plugin outside `docs/plans/` and the repository's own `tasks/todo.md`.

**Seam:** a search over the plugin for short-form names (design seam 7).

**Risks:**
- `SURFACE.md` names `/fx:help`, `/fx:stack` and `/fx:upgrade`, commands that do not exist. They are recorded history, not names to type, and the search deliberately does not match them.
- `docs/plans/` holds the record of earlier builds, which quotes the old names. Never edit it.

**Idempotency:** text replacements. Re-running finds nothing to replace.

**Testing:** the search before and after.

## Acceptance criteria

- [ ] The search in step 1 prints nothing.
- [ ] Each of the four commands' headings reads `/fx:fx-<name>`.
- [ ] `python3 scripts/check-prose` passes on every changed file and `scripts/check-all` is green.

## Steps

- [ ] **1. Write the failing check**

```bash
grep -rnE '/fx:(setup|critique|grill|handoff|audit)\b' \
  --include='*.md' --exclude-dir=plans --exclude-dir=.fx --exclude-dir=.worktrees --exclude-dir=.git . \
  | grep -v '^\./tasks/todo\.md:'
```

- [ ] **2. Run it: verify RED**

Run the command above.
Expected: matches in the eleven files this task lists, and no others. Any other file it prints is added to this task.

- [ ] **3. Implement the minimum that passes**

Replace each short form with its prefixed form: `/fx:setup` becomes `/fx:fx-setup`, `/fx:critique` becomes `/fx:fx-critique`, `/fx:grill` becomes `/fx:fx-grill`, `/fx:handoff` becomes `/fx:fx-handoff`, `/fx:audit` becomes `/fx:fx-audit`. Change nothing else on those lines.

- [ ] **4. Run it: verify GREEN**

Run the command from step 1.
Expected: no output.

- [ ] **5. Run the gates**

Run: `python3 scripts/check-prose commands skills/fx-plan skills/fx-review skills/fx-brainstorm references/vocab/grilling.md docs/adr/0003-three-layers-of-knowledge.md && scripts/check-all`
Expected: all pass, `ALL GREEN`.

- [ ] **6. Commit**

```
git add commands/fx-critique.md commands/fx-grill.md commands/fx-handoff.md commands/fx-setup.md skills/fx-plan/SKILL.md skills/fx-review/SKILL.md skills/fx-plan/COVERAGE.md skills/fx-review/COVERAGE.md skills/fx-brainstorm/COVERAGE.md references/vocab/grilling.md docs/adr/0003-three-layers-of-knowledge.md
git commit -m "docs: state every command name with the prefix that resolves"
```

No attribution trailers. Then continue to the next task: never stop and wait.
