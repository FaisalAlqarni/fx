# 07: One design checkpoint

**Status:** ready-for-agent
**Blocked by:** 06
**Phase:** MVP

**What to build:** On the architectural path, the owner answers the interview rounds, then one message carrying the confidence statement and the 2 to 3 approaches, then reviews design.md once as a file, seams included, and approves it. Brainstorm writes design.md section by section in the file instead of presenting sections in chat, keeps its self-review and its show-rather-than-tell step, and on approval writes an `**Approved:**` line into design.md. fx-plan skips its restate step when that line is present, which survives compaction. The user-story list asks for completeness, not "extremely extensive". Brainstorm stops creating one task-tool item per checklist step. Spike and bounded paths are unchanged.

**Files:**
- Modify: `skills/fx-brainstorm/SKILL.md`
- Modify: `references/design-template.md`
- Modify: `skills/fx-plan/SKILL.md` (§1 only)
- Modify: `tests/gates/brainstorm-confidence.test.js`
- Create: `docs/adr/0045-one-design-checkpoint.md`
- Modify: `docs/adr/0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md` (status line: superseded by 0045)

**Interfaces:**
- Consumes: the fx-plan text tasks 04 and 06 left.
- Produces: the architectural checklist, exactly:
  1. Explore project context: files, docs, recent commits
  2. Show rather than tell when a question warrants it: visual companion, or `prototype` (§4)
  3. Interview in clustered rounds, maintaining the open-questions ledger (§3)
  4. **Confidence check and approaches, then stop until the user says go** (§3, §5)
  5. Write design.md section by section (§6, §7)
  6. Self-review it (§8)
  7. One review of the file, seams included; on approval write `**Approved:** YYYY-MM-DD` under the Status line (§8)
  8. Hand off to `fx-plan` (§9)
- Produces: the design template line `**Approved:** YYYY-MM-DD`, written only by brainstorm on the owner's approval. fx-plan §1: when design.md carries an `**Approved:**` line, skip the restate and say so in one line; otherwise restate and wait as today.

**Seam:** the brainstorm, template and fx-plan lane text, asserted by `tests/gates/brainstorm-confidence.test.js`.

**Risks:** the current gate pins the old order (approaches as step 5, hand-off as step 10, a red-flag row forbidding approaches in the confidence message). Rewrite those assertions to the new list and keep the rest: the 95% bar, the evidence part, the two-line plan, the explicit stop, and the bounded block.

**Idempotency:** text edits.

**Testing:** the updated gate plus the full gate sweep; lane-triggering runs in task 08.

## Acceptance criteria
- [ ] The architectural checklist is exactly the eight steps above.
- [ ] The confidence check section says the approaches ride in the same message; the stop for an explicit go stays.
- [ ] "Present it in sections, ask after each" is replaced by writing each section into design.md and one review of the file, seams included.
- [ ] "create a task for each item on your path" is gone.
- [ ] The design template has the `**Approved:**` line and asks for a user-story list that is complete for the feature's behaviour, without "extremely extensive".
- [ ] fx-plan §1 skips the restate when the `**Approved:**` line is present.
- [ ] The red-flag row that forbade approaches in the confidence message is removed.
- [ ] ADR 0045 records the decision; ADR 0033's status line names 0045; every gate passes.

## Steps

- [ ] **1. Rewrite the gate assertions first**

In `tests/gates/brainstorm-confidence.test.js`, keep the assertions on the subsection heading, `95% confident`, `**What made you confident**`, the two-line plan, the explicit stop, and the bounded block. Replace the architectural and red-flag assertions with:

```js
assert.ok(/\n4\. \*\*Confidence check and approaches, then stop/.test(arch), 'architectural step 4 carries the approaches');
assert.ok(/\n6\. Self-review it/.test(arch), 'self-review stays');
assert.ok(/\n2\. Show rather than tell/.test(arch), 'show rather than tell stays');
assert.ok(/\n8\. Hand off to `fx-plan`/.test(arch), 'the architectural path hands off at step 8');
assert.ok(!arch.includes('Propose 2 to 3 approaches'), 'approaches are not a separate step');
assert.ok(!/\| "I'm confident, I'll show approaches in the same message" \|/.test(skill), 'the red-flag row against one message is gone');
assert.ok(!skill.includes('create a task for each item on your path'), 'no task item per checklist step');
assert.ok(skill.includes('seams included'), 'design.md is reviewed once, seams included');
const tpl = fs.readFileSync(path.join(__dirname, '..', '..', 'references', 'design-template.md'), 'utf8');
assert.ok(tpl.includes('**Approved:**') && !tpl.includes('extremely extensive'), 'template: approval line, complete stories');
const fxPlan = fs.readFileSync(path.join(__dirname, '..', '..', 'skills', 'fx-plan', 'SKILL.md'), 'utf8');
assert.ok(fxPlan.slice(fxPlan.indexOf('## 1.'), fxPlan.indexOf('## 2.')).includes('**Approved:**'), 'fx-plan skips the restate on an approved design');
assert.ok(fs.existsSync(path.join(__dirname, '..', '..', 'docs', 'adr', '0045-one-design-checkpoint.md')), 'ADR 0045 exists');
```

Keep the file's `arch` and `bounded` slicing; adjust its markers only if a heading they rely on changes.

- [ ] **2. Run it: verify RED**

Run `test_one` from `.fx.json` with `{file}` = `tests/gates/brainstorm-confidence.test.js`. Expected: FAIL on the step 4 assertion.

- [ ] **3. Edit fx-brainstorm, the template and fx-plan §1; write ADR 0045**

Make every assertion and acceptance criterion hold.

- [ ] **4. Run it: verify GREEN**

Same command. Expected: PASS.

- [ ] **5. Run the scope**

Run `test_scope` with `{paths}` = every path in Files. Expected: PASS.

- [ ] **6. Commit**

```
git add skills/fx-brainstorm/SKILL.md references/design-template.md skills/fx-plan/SKILL.md tests/gates/brainstorm-confidence.test.js docs/adr/0045-one-design-checkpoint.md docs/adr/0033-fx-brainstorm-ends-its-interview-with-a-confidence-check.md
git commit -m "feat(fx-brainstorm): one design checkpoint, approaches with the confidence check"
```

No attribution trailers. Then continue to the next task: never stop and wait.
