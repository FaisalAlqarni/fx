# 04 — Procedures: copy and wire

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** MVP

**What to build:** design decision D-B. The Procedures tier stops being
described-but-absent. `research` and `prototype` are copied verbatim, and
`prototype` is actually called by `fx-brainstorm` — which the documentation has
claimed all along while no such call existed.

**Files:**
- Create: `skills/research/SKILL.md` (12 upstream lines + one added paragraph)
- Create: `skills/prototype/SKILL.md` (26 ln), `skills/prototype/LOGIC.md`, `skills/prototype/UI.md`
- Modify: `skills/fx-brainstorm/SKILL.md` — §4 invokes `prototype`
- Modify: `.claude-plugin/plugin.json` — declare both
- Modify: `SURFACE.md`, design doc §1/§2 — tier count 0 → 2

**Source:** `~/.claude/plugins/cache/claude-plugins-official/mattpocock-skills/1.2.3/skills/engineering/{research,prototype}/`

**Interfaces:**
- Produces: `research`, `prototype` as selectable procedures
- Consumes: `fx-brainstorm` §4 (the call site)

**Seam:** skill selection. A procedure must not contest a lane.

**Risks:** the upstream `prototype/` ships an `agents/` subdirectory —
**inspect it before copying**, do not assume it belongs. The added `research`
paragraph is the one deliberate modification: query terms may not carry module
names, file paths or internal service names. Anything more makes it a rewrite,
not a copy.

**Idempotency:** copies are skipped when the destination exists with identical
content; the `fx-brainstorm` edit is guarded by checking whether the call is
already present.

**Testing:** descriptions checked for name collision against all 9 lanes.

## Acceptance criteria
- [ ] Both procedures exist and are declared in `plugin.json`
- [ ] `research` differs from upstream by **exactly one added paragraph**
- [ ] `prototype` is byte-identical to upstream except frontmatter
- [ ] The `agents/` subdirectory question is decided and the reasoning recorded
- [ ] `fx-brainstorm` §4 invokes `prototype`, and grep proves it
- [ ] Neither description collides with any lane trigger

## Steps

- [ ] **1. Write the failing check**

```bash
grep -q 'prototype' skills/fx-brainstorm/SKILL.md || { echo "FAIL: fx-brainstorm does not call prototype"; exit 1; }
```

- [ ] **2. Run it — verify RED**

Expected: FAIL. This is the assertion whose absence let the false claim survive.

- [ ] **3. Copy both, decide the `agents/` question**

- [ ] **4. Add the one `research` paragraph**

- [ ] **5. Wire `prototype` into `fx-brainstorm` §4**

- [ ] **6. Run the check — verify GREEN, and diff both against upstream**
