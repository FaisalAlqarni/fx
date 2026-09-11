# 06: ADR 0013 and ADR 0014, and the line on ADR 0008

**Status:** ready-for-agent
**Blocked by:** 05
**Phase:** Core

**What to build:** two records. One says agent and skill descriptions name
categories rather than stacks, so fx stays usable on any project, and names the
four lenses that are deliberately not being migrated. The other says why the
app-layer gap got its own lens instead of a section inside the database lens,
which is what a recorded decision had recommended.

**Files:**
- Create: `docs/adr/0013-descriptions-name-categories-not-stacks.md`
- Create: `docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md`
- Modify: `docs/adr/0008-no-performance-lens.md`

**Interfaces:**
- Consumes: `agents/fx-lens-pipeline.md` (from task 05). The ADRs describe what
  shipped, so they are written after it exists rather than before.
- Produces: nothing any other task consumes.

**Seam:** `scripts/check-prose`, and a read of ADR 0008 confirming its
recommendation now carries its supersession.

**Risks:** an ADR stating a rule that four shipped files break reads as dead
letter to the next author, who then copies the nearest example. Naming the four
exempt lenses and the reason they are exempt is what stops that, and it is the
shape ADR 0012 already uses for deliberate exclusions.

Editing ADR 0008's body beyond the supersession line would rewrite a record of
a decision that was correctly made at the time. One line, added, nothing
removed.

**Idempotency:** creates two files and appends one line. Re-running finds the
line already present and adds nothing.

**Testing:** the prose gate and a read-back of ADR 0008.

## Acceptance criteria

- [ ] ADR 0013 states the rule for descriptions and bodies of agents and
      skills, and cites ADR 0003 and ADR 0011 rather than restating them.
- [ ] ADR 0013 names `fx-lens-database`, `fx-lens-security`, `fx-lens-a11y` and
      `fx-lens-silent-failure` as deliberate exceptions, and gives the reason:
      generalising a trigger set is a behaviour change that has to be measured
      per lens, and bundling four of them into an unrelated change would make a
      lens that stopped firing indistinguishable from something else breaking.
- [ ] ADR 0013 states what a future author should do: write the new one general,
      and measure any migration of an old one on its own.
- [ ] ADR 0013 records that stack knowledge itself is unaffected, because it
      lives in the stack profiles and loads only when the machine facts name it.
- [ ] ADR 0014 quotes ADR 0008's actual recommendation, which is to fold the
      app-layer material into the database lens's brief rather than pay a second
      dispatch.
- [ ] ADR 0014 gives the reason for overriding it: the database lens's triggers
      are schema-shaped and would not fire on a worker or a queue configuration,
      which is the diff the new lens exists for.
- [ ] ADR 0014 records the cost honestly: a second dispatch on diffs that touch
      both, which is why the lens runs in branch mode only.
- [ ] ADR 0008 gains one line marking its recommendation superseded in part by
      0014, with nothing removed from its body.
- [ ] `python3 scripts/check-prose docs/adr` passes.
- [ ] `scripts/check-all` exits 0.

## Steps

- [ ] **1. Write the failing test**

The test is the prose gate over a file that does not exist yet:

```bash
python3 scripts/check-prose docs/adr/0013-descriptions-name-categories-not-stacks.md
```

- [ ] **2. Run it: verify RED**

Run the command above.
Expected: FAIL, the file cannot be read.

- [ ] **3. Read what the ADRs must be consistent with**

Read `docs/adr/0003-three-layers-of-knowledge.md`,
`docs/adr/0011-describe-the-category-not-its-members.md` and
`docs/adr/0008-no-performance-lens.md` in full before writing. An ADR that
restates an existing one instead of citing it is the duplication fx's own
pruning rule forbids.

- [ ] **4. Implement the minimum that passes**

Write both ADRs. No text here: `fx-tdd` drives it.

- [ ] **5. Run it: verify GREEN**

Run: `python3 scripts/check-prose docs/adr`
Expected: PASS.

- [ ] **6. Add the supersession line to ADR 0008**

- [ ] **7. Verify nothing was removed from ADR 0008**

Run: `git diff docs/adr/0008-no-performance-lens.md`
Expected: additions only, no deleted lines.

- [ ] **8. Run the combined gate**

Run: `scripts/check-all`
Expected: PASS, exit 0.

- [ ] **9. Commit**

```
git add docs/adr/0013-descriptions-name-categories-not-stacks.md docs/adr/0014-the-app-layer-gap-gets-its-own-lens.md docs/adr/0008-no-performance-lens.md
git commit -m "docs(adr): record the category rule and why the lens is separate"
```

No attribution trailers. Then continue to the next task: never stop and wait.
