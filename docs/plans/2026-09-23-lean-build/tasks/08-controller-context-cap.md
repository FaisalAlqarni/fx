# 08: Controller context cap

**Status:** ready-for-agent
**Blocked by:** 07
**Phase:** Core

**What to build:** the `fx-implement` controller's context grows by a few lines
per dispatch instead of by whole reports, without losing anything the fix loop
needs. Measured on the multi-harness build: 709 controller calls at a median
context of 503K tokens, so every call re-read half a million tokens.

Most of the return contract already exists: implementers reply "under 15
lines" with detail in a report file, reviewers reply with a verdict, counts and
a path. What changes:

1. **Re-review returns its report as its final message**
   (`re-review-prompt.md`: "Your final message **is** the report"). It must
   write to `[FINDINGS_FILE]`, which the template already receives, and reply
   briefly.
2. **One contract, one sentence, everywhere a subagent reports to the
   controller:** implementer and fixer, task reviewer, re-review, branch
   reviewer, lens briefs, coverage audit. Each ends with
   `Reply with at most five lines:` and its fields.
3. **The reply carries what the fix loop branches on.** The fix loop enters on
   spec ❌, any Critical or Important, or a ⚠️ the controller confirms
   (`fix-loop.md`). So a reviewer's reply separates spec from quality and
   counts ⚠️.
4. **Text the ledger needs is written ready to copy.** The fix loop ledgers
   finding one-liners and deferred minors (`fix-loop.md`, "Ledger each round"
   and "Minor findings never enter the loop"). Reviewers write those lines into
   their findings file under `## Ledger lines`, already formatted; the
   controller appends them with `grep`, never by reading the findings.
5. **Fixers and re-reviewers get paths, not pasted text.** The fix loop sends
   "the open findings verbatim" and the re-review template takes
   `[FINDINGS]` "copied verbatim". Both become the findings file path plus
   the heading of the open findings section; the subagent reads the file.
6. **The controller's reading rules are written down** in `fx-implement`.

**Files:**
- Modify: `skills/fx-implement/implementer-prompt.md` (the `## Report` section)
- Modify: `skills/fx-implement/task-reviewer-prompt.md` (final-message instruction; `## Ledger lines` section in the findings file)
- Modify: `skills/fx-implement/re-review-prompt.md` (write to `[FINDINGS_FILE]`; `[FINDINGS]` becomes a path)
- Modify: `skills/fx-implement/fix-loop.md` (paths instead of verbatim findings; ledger lines by `grep`)
- Modify: `skills/fx-review/reviewer-prompt.md` (final-message instruction; `## Ledger lines`)
- Modify: `skills/fx-review/SKILL.md` (the "Lens briefs" paragraph: lenses write findings to a file and reply in five lines)
- Modify: `skills/fx-implement/SKILL.md` (new `### Controller reading rules` before `### 1. Dispatch the implementer`; the coverage-audit dispatch gets the five-line reply)
- Create: `tests/gates/return-contract.test.js`
- Modify: `scripts/check-all` (add the gate)

**Interfaces:**
- Five-line fields, exact:
  - implementer and fixer: `Status`, `Commits` (`<base7>..<head7>`), `Tests` (one line), `Report` (path), `Concerns` (count; detail in the report).
  - task reviewer and branch reviewer: `Spec` (✅, ❌, or ⚠️ with a count), `Quality` (approved or changes requested), `C/I/M` (counts), `Findings` (path), `Ready` (yes, no, with fixes).
  - re-review: `Verdict`, `Open` (count), `Fixed` (count), `Findings` (path), `New breakage` (yes or no).
  - lens: no five-line reply (amended, Ruling R): lens agents are read-only and cannot write a file, so a lens returns its full findings as its reply, and the controller records that reply to a findings file with a heredoc without reasoning over it.
  - coverage audit: `Gaps` (count), `Findings` (path), `Tasks affected` (numbers), `Verdict`, `Next` (one line).
- `## Ledger lines` in every findings file: one line per finding in the exact
  ledger forms the fix loop already uses, for example
  `Task <NN>: minor (deferred): <one-liner>` and the open one-liners for
  `Task <NN>: fix round <R>/5 (...)`. The controller runs
  `sed -n '/^## Ledger lines/,/^## /p' <findings> | grep '^Task ' >> state.md`.
- Controller reading rules, content (wording through `fx-authoring`):
  - Append to `state.md` (`>>`). Never read it whole; read with `tail -n 40` or `grep`.
  - Git output in one-line forms: `git log --oneline -n N`, `git diff --stat`.
  - Never read a diff; `review-package` writes it for the reviewer.
  - The reply fields decide the next move. Read a findings or report file only
    to rule on a ⚠️ item or a plan-mandated finding, and then only that
    finding (`grep -n`, `sed -n`).
  - A reply longer than five lines: do not act on the extra text. A reply
    with no report or findings file at the named path: re-dispatch once with
    the contract restated; on a second breach, record
    `Task <NN>: report contract breached (<which>)` and read only what the
    next move needs.

**Seam:** gate over template text (the repo's pattern: `fs.readFileSync` in `tests/gates/*.test.js`); the live effect is measured in task 09.

**Idempotency:** text edits only.

**Testing:** `node tests/gates/return-contract.test.js`, `scripts/check-all`.

**Skill edit:** use the `fx-authoring` lane for every skill and template edit.

## Acceptance criteria
- [ ] Every one of the six places above contains `Reply with at most five lines:` followed by its five field names.
- [ ] `re-review-prompt.md` writes to `[FINDINGS_FILE]`, no longer says its final message is the report, and receives the findings as a path.
- [ ] `fix-loop.md` sends findings as a path plus section heading in every round, and ledgers one-liners through the `## Ledger lines` copy.
- [ ] Both reviewer templates and the re-review template tell the reviewer to write `## Ledger lines`.
- [ ] `implementer-prompt.md` no longer says `under 15 lines`.
- [ ] `fx-implement/SKILL.md` has `### Controller reading rules` with the rules above, including both breach cases.
- [ ] `scripts/check-generated` passes.

## Steps

- [ ] **1. Write the failing gate**

```js
'use strict';
// Run: node tests/gates/return-contract.test.js
// Every subagent that reports to the fx-implement controller ends with the
// same short reply, carrying what the fix loop branches on, so the controller
// grows by a few lines per dispatch and not by a report.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const MARK = 'Reply with at most five lines:';

function contract(file, fields, from = 0) {
  const text = read(file);
  const at = text.indexOf(MARK, from);
  assert.ok(at >= 0, `${file}: states the five-line reply`);
  const tail = text.slice(at, at + 1200);
  for (const f of fields) assert.ok(tail.includes(f), `${file}: five-line reply names ${f}`);
  return text;
}
const REVIEWER = ['Spec', 'Quality', 'C/I/M', 'Findings', 'Ready'];
contract('skills/fx-implement/implementer-prompt.md', ['Status', 'Commits', 'Tests', 'Report', 'Concerns']);
contract('skills/fx-implement/task-reviewer-prompt.md', REVIEWER);
contract('skills/fx-review/reviewer-prompt.md', REVIEWER);
const rr = contract('skills/fx-implement/re-review-prompt.md', ['Verdict', 'Open', 'Fixed', 'Findings', 'New breakage']);
const review = read('skills/fx-review/SKILL.md');
contract('skills/fx-review/SKILL.md', ['Lens', 'C/I/M', 'Findings', 'Scope', 'Blocked'], review.indexOf('Lens briefs'));
const skill = read('skills/fx-implement/SKILL.md');
contract('skills/fx-implement/SKILL.md', ['Gaps', 'Findings', 'Tasks affected', 'Verdict', 'Next'], skill.indexOf('one coverage audit'));

assert.ok(!/under 15 lines/.test(read('skills/fx-implement/implementer-prompt.md')), 'implementer: the old 15-line contract is gone');
assert.ok(!/final message \*\*is\*\* the report/i.test(rr), 're-review: the final message is no longer the report');
assert.ok(/\[FINDINGS_FILE\]/.test(rr), 're-review: writes to its findings file');
for (const f of ['skills/fx-implement/task-reviewer-prompt.md', 'skills/fx-review/reviewer-prompt.md', 'skills/fx-implement/re-review-prompt.md']) {
  assert.ok(read(f).includes('## Ledger lines'), `${f}: writes ready-to-copy ledger lines`);
}
const loop = read('skills/fx-implement/fix-loop.md');
assert.ok(!/open findings\s+verbatim/i.test(loop), 'fix loop: findings go as a path, not pasted verbatim');
assert.ok(loop.includes('## Ledger lines'), 'fix loop: ledgers one-liners from the findings file');

const i = skill.indexOf('### Controller reading rules');
assert.ok(i >= 0, 'fx-implement has a Controller reading rules section');
assert.ok(i < skill.indexOf('### 1. Dispatch the implementer'), 'the rules come before the first dispatch step');
const rules = skill.slice(i, i + 3000);
for (const needle of ['>>', 'tail', 'git log --oneline', 'review-package', 'five lines', 'report contract breached']) {
  assert.ok(rules.includes(needle), `reading rules mention ${needle}`);
}
console.log('return-contract: ok');
```

- [ ] **2. Run it: verify RED**

Run: `node tests/gates/return-contract.test.js`
Expected: FAIL, `implementer-prompt.md: states the five-line reply`.

- [ ] **3. Edit the templates, `fix-loop.md` and both skills** through `fx-authoring`, to the Interfaces above. Keep every existing report-file and findings-file instruction; only the reply shrinks and the verbatim hand-offs become paths.

- [ ] **4. Run it: verify GREEN.** Run: `node tests/gates/return-contract.test.js`.

- [ ] **5. Run the suite**

Add `run return-contract.test.js node tests/gates/return-contract.test.js` to `scripts/check-all`, run `scripts/check-all`. Bump the version if `release-version.test.js` asks.

- [ ] **6. Commit**

```
git add skills/fx-implement/implementer-prompt.md skills/fx-implement/task-reviewer-prompt.md skills/fx-implement/re-review-prompt.md skills/fx-implement/fix-loop.md skills/fx-review/reviewer-prompt.md skills/fx-review/SKILL.md skills/fx-implement/SKILL.md tests/gates/return-contract.test.js scripts/check-all
git commit -m "feat(fx-implement): five-line replies, ledger lines by copy, controller reading rules"
```

Add generated files and version files to `git add` only if step 5 changed them.
