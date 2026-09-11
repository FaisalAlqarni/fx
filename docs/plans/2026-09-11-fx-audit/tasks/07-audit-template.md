# 07: `references/audit-template.md`

**Status:** ready-for-agent
**Blocked by:** 01
**Phase:** Core

**What to build:** the shape of every document the audit writes, in one place,
so the command stays process and the artifact shape does not live inside it.
This is the same split `fx-brainstorm` uses when it points at the design
template instead of inlining one.

**Files:**
- Create: `references/audit-template.md`

**Interfaces:**
- Produces: four skeletons, addressed by the command in task 08 as
  `../references/audit-template.md`:
  - `01-current.md`: domain model and glossary, end-to-end flow, feature and
    business-rule inventory, patterns and file structure, what the system does
    well, what it does badly, and an explicit **Areas not covered** section.
  - `02-reference.md`: the same headings, plus what the reference resolves from
    and which revision it was read at.
  - `03-gaps.md`: a verdict table, one row per feature and per stated target,
    each row carrying `correct | wrong | missing | over-engineered` and a file
    and line.
  - The audit-specific sections that Phase 4 adds to `design.md`: proposed
    folder tree, core interface signatures, a Mermaid lifecycle diagram, a
    per-module `keep | refactor | rewrite | delete` verdict table, an
    add-a-new-provider walkthrough, and the recommendation with its defeater.

**Seam:** `scripts/check-reference-leaves` and `scripts/check-paths`.

**Risks:** **the template must not name `design-template.md`.** The obvious
arrangement, a template pointing at another template, is refused by the leaf
gate, and correctly: a lane following one link to another pulls two files where
the architecture promises one. The command composes the two; the templates do
not know about each other.

A reference over 100 lines needs a table of contents, because an agent that
partially reads it must still see the full scope.

**Idempotency:** creates one file with fixed content. Re-running rewrites the
same bytes.

**Testing:** the leaf gate, the citation gate and the prose gate.

## Acceptance criteria

- [ ] All four skeletons are present with the headings listed above.
- [ ] `01-current.md`'s skeleton carries an **Areas not covered** section, so a
      hole in the map is a stated section rather than an absence.
- [ ] `03-gaps.md`'s skeleton requires a file and line on every row, and orders
      rows by impact.
- [ ] The Phase 4 skeleton carries the recommendation **and** the statement of
      what would have to be true for the opposite recommendation to win.
- [ ] The per-module verdict table has a row for every module, so nothing in
      the current system is silently unaccounted for.
- [ ] **The file contains no occurrence of `design-template`**, proven by grep.
- [ ] The file carries a table of contents if it exceeds 100 lines.
- [ ] `bash scripts/check-reference-leaves` passes.
- [ ] `python3 scripts/check-paths` passes.
- [ ] `scripts/check-all` exits 0.

## Steps

- [ ] **1. Write the failing test**

The leaf gate and the citation gate are the tests. Before the file exists, the
proof that matters is the grep that will guard it:

```bash
test -f references/audit-template.md && ! grep -q design-template references/audit-template.md
```

- [ ] **2. Run it: verify RED**

Run the command above, then `echo $?`.
Expected: exit 1, because the file does not exist.

- [ ] **3. Implement the minimum that passes**

Write `references/audit-template.md`. No content here: `fx-tdd` drives it.

- [ ] **4. Run it: verify GREEN**

Run the same command, then `echo $?`.
Expected: exit 0.

- [ ] **5. Verify the leaf invariant**

Run: `bash scripts/check-reference-leaves`
Expected: PASS, `no reference links to another reference`.

- [ ] **6. Verify the prose gate**

Run: `python3 scripts/check-prose references/audit-template.md`
Expected: PASS.

- [ ] **7. Check the table-of-contents rule**

Run: `wc -l references/audit-template.md`
If it is over 100 lines and has no table of contents, add one.

- [ ] **8. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0.

- [ ] **9. Commit**

```
git add references/audit-template.md
git commit -m "feat: add the audit document template"
```

No attribution trailers. Then continue to the next task: never stop and wait.
