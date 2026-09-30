# 04: Standing rulings survive plans and compaction

**Status:** ready-for-agent
**Blocked by:** 03
**Phase:** Core

**What to build:** an owner ruling that should hold for every build is written once, to `docs/plans/rulings.md`, and from then on it is copied into every new ledger and re-injected into the session after every compaction. Today such rulings live in chat or in one plan's ledger, and the owner had to repeat them (design `Problem`, cause 2).

**Files:**
- Modify: `lib/plan-state.js`
- Modify: `lib/plan-state.test.js`
- Modify: `lib/preamble.test.js`
- Modify: `skills/fx-implement/SKILL.md`
- Modify: `docs/adr/0031-defaults-are-held-by-mechanism.md`

**Interfaces:**
- Consumes: `docs/adr/0031-defaults-are-held-by-mechanism.md` with a `## Standing rulings` placeholder section (task 03).
- Produces: `standingRulings(cwd, plans) -> string[]` exported from `lib/plan-state.js`, where `plans` is `scan(cwd)`'s result: the `Ruling:` lines from `docs/plans/rulings.md` plus each unfinished ledger's `## Standing rulings` section, de-duplicated, at most 10, each cut to 160 characters (a cut line ends in `…`). `describePlans(cwd, { lane })` keeps its signature and adds them to its block.

**Seam:** `describePlans()` output, tested through fixture repos in `lib/plan-state.test.js`, and the preamble size budget in `lib/preamble.test.js`.

**Risks:** `describePlans` is appended to every session's preamble; the worst-case render must stay under 9,000 characters with 10 rulings present. It must never throw: a missing or unreadable file yields no rulings. Only lines starting `Ruling:` are carried, so a ledger's task log never leaks into the block.

**Idempotency:** pure read functions; test fixtures live in a temp dir removed at the end. SKILL.md edits are text additions checked for presence first.

**Testing:** unit tests on the block; the preamble budget test with rulings in the worst-case fixture.

## Acceptance criteria
- [ ] A ruling in a ledger's `## Standing rulings` section appears in `describePlans()` output; a task log line from the same ledger does not.
- [ ] A ruling in `docs/plans/rulings.md` appears even when the ledger's section lacks it (a ruling made mid-run after the ledger was created).
- [ ] The same ruling in both places appears once.
- [ ] At most 10 rulings, each output line at most 200 characters.
- [ ] The block tells the reader to invoke fx-implement again after a compaction, before the next dispatch, and that these rulings override its defaults.
- [ ] The preamble worst-case fixture carries 10 long rulings and every runtime still renders under 9,000 characters.
- [ ] `fx-implement` §"The ledger" says: create the ledger with a `## Standing rulings` section copied from `docs/plans/rulings.md`; when the owner rules mid-run, ask "this plan only, or every plan?", and for every plan append the line to `docs/plans/rulings.md` too.
- [ ] The completion report's "Rulings I made" lists `Ruling:` lines from outside the `## Standing rulings` section only.
- [ ] ADR-0031's `## Standing rulings` section is written.

## Steps

- [ ] **1. Invoke the `fx-tdd` lane.** Invoke `fx-authoring` before the SKILL.md edit.

- [ ] **2. Write the failing tests.** Append to `lib/plan-state.test.js`, before its final pass/fail summary, using its existing `repo()` and `check()`:

```js
// ---- standing rulings ----
{
  const ledger = '# fx ledger: plan: docs/plans/p/plan.md\n\n## Standing rulings\n\n'
    + 'Ruling: no per-task lenses. Why: owner.\nRuling: sonnet by default. Why: cost.\n\n'
    + '## Log\n\nTask 01: complete (commits a..b, review clean)\n';
  const cwd = repo({ 'p': { tasks: ['01-a.md', '02-b.md'], state: ledger } });
  const out = describePlans(cwd) || '';
  check(out.includes('Ruling: no per-task lenses.'), 'a ledger ruling reaches the session block', out);
  check(out.includes('Ruling: sonnet by default.'), 'every ledger ruling is carried', out);
  check(!out.includes('Task 01: complete'), 'only the rulings section is carried', out);
  check(/after a compaction/i.test(out), 'the block says to re-invoke after a compaction', out);
}
{
  const ledger = '# fx ledger: plan: docs/plans/p/plan.md\n\n## Standing rulings\n\nRuling: a. Why: x.\n';
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: ledger } });
  fs.writeFileSync(path.join(cwd, 'docs', 'plans', 'rulings.md'),
    '# Standing rulings\n\nRuling: a. Why: x.\nRuling: b made mid-run. Why: y.\n');
  const out = describePlans(cwd) || '';
  check(out.includes('Ruling: b made mid-run.'), 'a repo-level ruling appears without a ledger copy', out);
  check((out.match(/Ruling: a\. Why: x\./g) || []).length === 1, 'a ruling in both places appears once', out);
}
{
  const many = Array.from({ length: 30 }, (_, i) => `Ruling: r${i} ${'x'.repeat(300)}`).join('\n');
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: `# fx ledger\n\n## Standing rulings\n\n${many}\n` } });
  const out = describePlans(cwd) || '';
  check((out.match(/Ruling: r\d+/g) || []).length === 10, 'at most 10 rulings are carried', out.length);
  check(out.split('\n').filter((l) => l.startsWith('- Ruling:')).every((l) => l.length <= 200),
    'each carried ruling line is capped at 200 characters');
}
{
  const cwd = repo({ 'p': { tasks: ['01-a.md'], state: true } });
  const out = describePlans(cwd) || '';
  check(!/Standing rulings/.test(out), 'no rulings, no rulings heading', out);
}
```

- [ ] **3. Run it: verify RED**

Run: `node lib/plan-state.test.js`
Expected: FAIL lines for `a ledger ruling reaches the session block` and the rest of the new checks; non-zero exit.

- [ ] **4. Implement** in `lib/plan-state.js` with `fx-tdd`:
- `standingRulings(cwd, plans)`: read `docs/plans/rulings.md` and, for each plan with `hasState`, its `state.md`; from a ledger take only lines between a `## Standing rulings` heading and the next `## ` heading; from `rulings.md` take every line; keep lines that start with `Ruling:`, trimmed; de-duplicate in first-seen order (rulings.md first); keep the first 10; cut any line over 160 characters to 159 plus `…`. Every read is wrapped so a failure yields no lines.
- In `describePlans`, when `standingRulings` returns lines, append after the `**If you were dispatched with one specific task**` paragraph:

```js
'',
'### Standing rulings',
'',
...rulings.map((r) => `- ${r}`),
'',
`After a compaction, invoke \`${lane('fx-implement')}\` again before the next dispatch. `
  + 'These rulings override its defaults.',
```

- Export it: `module.exports = { describePlans, scan, standingRulings };`

- [ ] **5. Run it: verify GREEN**

Run: `node lib/plan-state.test.js`
Expected: `N passed, 0 failed`, exit 0.

- [ ] **6. Prove the budget.** In `lib/preamble.test.js`, where the worst-case fixture writes each plan's `state.md`, write instead a ledger with a `## Standing rulings` section holding 10 distinct `Ruling:` lines of 200 characters each. Run `node lib/preamble.test.js`. Expected: `preamble.test.js: OK`. If the 9,000 budget fails, lower the carried maximum in `standingRulings` from 10 to 6 and the per-line cut from 160 to 120, update the two numbers in the step 2 tests to match, and re-run both files.

- [ ] **7. Edit `skills/fx-implement/SKILL.md` §"The ledger"**, after the paragraph that gives the first line `# fx ledger: plan: docs/plans/<slug>/plan.md`, add:

```markdown
**Standing rulings.** When you create the ledger, write a `## Standing rulings`
section after the first line and copy into it every `Ruling:` line from
`docs/plans/rulings.md`, if that file exists. When the owner gives a ruling
mid-run, ask one question: this plan only, or every plan? For every plan,
append the `Ruling:` line to `docs/plans/rulings.md` as well and commit it with
the ledger. The session-start notice carries these rulings after a compaction,
so they hold without the owner repeating them.
```

- [ ] **7b. Keep standing rulings out of the controller's own list.** In `SKILL.md` §"Completion report", the bullet starting `- **Rulings I made**: **every** ledger line containing \`Ruling:\`` becomes `- **Rulings I made**: **every** ledger line containing \`Ruling:\` outside the \`## Standing rulings\` section` (keep the rest of the bullet). Standing rulings are the owner's, not this run's.

- [ ] **8. Write ADR-0031's `## Standing rulings` section**, replacing `Added by task 04.`: why rulings were lost (chat and a single plan's ledger; decision 38 survived only because the agent wrote it into each ledger), the repo-level file, the ledger copy, the re-injection through `lib/plan-state.js` at every session start including after compaction, and the 10-line cap with its budget reason.

- [ ] **9. Run the touched gates**

Run: `node lib/plan-state.test.js && node lib/preamble.test.js && node tests/gates/return-contract.test.js && node tests/gates/fix-loop-shape.test.js && scripts/check-prose skills/fx-implement/SKILL.md docs/adr/0031-defaults-are-held-by-mechanism.md`
Expected: all pass.

- [ ] **10. Commit**

```
git add lib/plan-state.js lib/plan-state.test.js lib/preamble.test.js skills/fx-implement/SKILL.md docs/adr/0031-defaults-are-held-by-mechanism.md
git commit -m "feat(plan-state): standing rulings carried across plans and compaction"
```
