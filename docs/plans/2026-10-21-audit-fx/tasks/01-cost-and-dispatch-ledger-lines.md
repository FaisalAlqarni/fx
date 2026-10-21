# 01: Cost, dispatch and cap lines in the ledger

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** When fx-implement runs a plan on Claude Code, the ledger shows for every task when it was dispatched and from which commit, and what it cost once complete: tokens, minutes, dispatches, and how many of its implementers invoked fx-tdd. Subagents are attributed to a task by the task number in their dispatch text, so a review running beside the next implementer is never counted twice. The session's transcript path is recorded by the SessionStart hook, so the cost step never guesses which file to read; when it cannot find one it prints the reason. A controller resuming after compaction checks the dispatch line and the task's commits before dispatching again. At most one task review is outstanding while the next implementer runs, and a task that returns NEEDS_CONTEXT or BLOCKED is re-dispatched at most twice, then parked.

**Files:**
- Modify: `hooks/fx-context.js`
- Create: `tests/gates/transcript-path.test.js`
- Modify: `scripts/build-cost`
- Modify: `scripts/build-cost.test.js`
- Modify: `skills/fx-implement/SKILL.md`
- Create: `tests/gates/ledger-lines.test.js`
- Modify: `scripts/check-all` (add both new gate tests to its list)
- Create: `docs/adr/0040-every-task-ledgers-its-dispatch-and-cost.md`
- Modify: `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json` (version: one patch above the base branch's, all four equal)

**Interfaces:**
- Consumes: `readRecords`, `dedupCalls`, `timestamps`, `classify`, `readMeta`, `textOf` inside `scripts/build-cost`.
- Produces: `hooks/fx-context.js` on `SessionStart` (never on `SubagentStart`) writes the event's `transcript_path` to `<cwd>/.fx/transcript-path` (one line, no other content), creating `.fx/` if needed; any write failure is ignored and the preamble is still emitted.
- Produces: `build-cost --task <NN> --since <ISO-8601> [<controller.jsonl>]` prints exactly one line and exits 0:
  - `Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>`
  - tokens: controller calls with a timestamp at or after `--since`, plus every call in every subagent file whose first user message matches `/\btask <NN>\b/i`; dispatches: the number of those subagent files; minutes: from `--since` to the last controller record, rounded to the nearest minute; `k/i`: of those subagents classified `implementer`, how many made a `Skill` tool call whose `input.skill` ends in `fx-tdd`.
  - Without a transcript argument it reads the path in `.fx/transcript-path` under the current directory. When that file is absent: `Task <NN>: cost unavailable (no transcript recorded)`. When the named file is missing: `Task <NN>: cost unavailable (transcript not found: <path>)`.
- Produces (ledger lines):
  - `Task <NN>: dispatched <BASE7> <ISO-8601>`
  - `Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>` (or the unavailable form)
  - `Task <NN>: parked: <one-line reason>`

**Seam:** the hook's file output on a stdin event; the `build-cost` CLI on fixture transcripts; the fx-implement lane text, asserted by a gate test.

**Risks:** keep the whole-build report (`build-cost <file>`, `--json`) unchanged; every current assertion in `scripts/build-cost.test.js` must still pass. The hook runs on every session start: the write must never delay or block the preamble.

**Idempotency:** the hook overwrites one file per session start; the script writes nothing; ledger lines are appended and the resume rule reads them. The version edit sets a fixed value.

**Testing:** gate test on the hook; unit tests in `scripts/build-cost.test.js`; gate test on the lane text; all three listed in `scripts/check-all`.

## Acceptance criteria
- [ ] A SessionStart event with `transcript_path` writes that path to `.fx/transcript-path`; a SubagentStart event writes nothing; the hook still prints its `additionalContext` in both cases.
- [ ] `build-cost --task` prints the cost line with the exact values the step 1 test states, and the two unavailable forms with their reasons.
- [ ] The whole-build report is unchanged.
- [ ] fx-implement §1 appends the dispatch line right after recording `BASE`, with the ISO time it uses as `--since`.
- [ ] fx-implement §5 runs `build-cost --task <NN> --since <time from the dispatch line>` from the plugin's `scripts/` directory (resolved from the skill's base directory as `../../scripts/build-cost`), from the controller's own directory, and appends its line before `Task <NN>: complete`.
- [ ] fx-implement §3 says a cost line with `fx-tdd 0/<i>` for `i` above 0 is passed to the task reviewer, and a report with no captured RED run is then an Important finding.
- [ ] The resume rules: a task with a dispatch line and no complete line has `git log <BASE>..HEAD` checked before any re-dispatch, and committed work goes to review, not to a new implementer.
- [ ] The concurrency section: at most one task review is outstanding while the next implementer runs; the next dispatch waits for it.
- [ ] §2 caps NEEDS_CONTEXT and BLOCKED re-dispatches at two per task, then appends the parked line and tells the owner.
- [ ] ADR 0040 records the decision, its reasons (no per-task cost today; the three pipeline-lens findings), and that the cost line extends the design's `cost <tokens> <minutes> <dispatches>` form with units and the fx-tdd count.
- [ ] `scripts/check-all` runs both new gate tests.
- [ ] All four version fields are equal and one patch above the base branch.

## Steps

- [ ] **1. Write the failing test for `--task`**

Append to `scripts/build-cost.test.js` before its final summary line, reusing its `write`, `BIN` and `spawnSync`:

```js
// --task: subagents attributed by their dispatch text, controller by time.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bc-task-'));
  const ctlT = path.join(dir, 't1.jsonl');
  const at = (s) => `2026-10-21T10:${s}:00.000Z`;
  const rec = (id, ts, n, content = []) => ({ type: 'assistant', timestamp: ts, message: { id, usage: { input_tokens: n, output_tokens: 0 }, content } });
  const user = (ts, text) => ({ type: 'user', timestamp: ts, message: { content: text } });
  write(ctlT, [rec('m0', at('00'), 1000), rec('m1', at('10'), 150), rec('m2', at('20'), 50)]);
  write(path.join(dir, 't1', 'subagents', 'impl.jsonl'), [
    user(at('11'), 'You are implementing task 03: brief'),
    rec('s1', at('12'), 300, [{ type: 'tool_use', name: 'Skill', input: { skill: 'fx:fx-tdd' } }]),
  ]);
  write(path.join(dir, 't1', 'subagents', 'rev.jsonl'), [user(at('13'), 'You are reviewing one task: 03'), rec('s2', at('14'), 200)]);
  write(path.join(dir, 't1', 'subagents', 'next.jsonl'), [user(at('15'), 'You are implementing task 04: next'), rec('s3', at('16'), 9999)]);

  const r = spawnSync(process.execPath, [BIN, '--task', '03', '--since', at('10'), ctlT], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(r.stdout, 'Task 03: cost 700 tokens, 10 min, 2 dispatches, fx-tdd 1/1\n');

  const none = spawnSync(process.execPath, [BIN, '--task', '04', '--since', at('10')], { encoding: 'utf8', cwd: dir });
  assert.strictEqual(none.status, 0, none.stderr);
  assert.strictEqual(none.stdout, 'Task 04: cost unavailable (no transcript recorded)\n');

  fs.mkdirSync(path.join(dir, '.fx'));
  fs.writeFileSync(path.join(dir, '.fx', 'transcript-path'), path.join(dir, 'gone.jsonl') + '\n');
  const gone = spawnSync(process.execPath, [BIN, '--task', '04', '--since', at('10')], { encoding: 'utf8', cwd: dir });
  assert.strictEqual(gone.stdout, `Task 04: cost unavailable (transcript not found: ${path.join(dir, 'gone.jsonl')})\n`);
}
```

The values are the contract: 150 + 50 from the controller after `--since`, 300 + 200 from the two task 03 subagents, task 04's subagent excluded, 10 minutes from 10:10 to 10:20, one implementer that invoked fx-tdd.

- [ ] **2. Run it: verify RED**

Run `test_one` from `.fx.json` with `{file}` = `scripts/build-cost.test.js`. Expected: FAIL at the first `--task` assertion.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

- [ ] **4. Run it: verify GREEN**

Same command. Expected: PASS, every earlier assertion still passing.

- [ ] **5. Write the failing hook test**

Create `tests/gates/transcript-path.test.js`:

```js
'use strict';
// Run: node tests/gates/transcript-path.test.js
// ADR 0040: the SessionStart hook records the session's transcript path for
// build-cost; a subagent start records nothing.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const hook = path.join(__dirname, '..', '..', 'hooks', 'fx-context.js');
const run = (cwd, event) => spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd, ...event }), encoding: 'utf8' });
const file = (cwd) => path.join(cwd, '.fx', 'transcript-path');

const a = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
const r = run(a, { hook_event_name: 'SessionStart', transcript_path: '/x/s1.jsonl' });
assert.strictEqual(r.status, 0, r.stderr);
assert.ok(JSON.parse(r.stdout).hookSpecificOutput.additionalContext.length > 0, 'the preamble is still emitted');
assert.strictEqual(fs.readFileSync(file(a), 'utf8'), '/x/s1.jsonl\n');

const b = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-tp-'));
const s = run(b, { hook_event_name: 'SubagentStart', transcript_path: '/x/sub.jsonl' });
assert.strictEqual(s.status, 0, s.stderr);
assert.ok(!fs.existsSync(file(b)), 'a subagent start records nothing');

console.log('transcript-path: OK');
```

- [ ] **6. Run it: verify RED**

Run `test_one` with `{file}` = `tests/gates/transcript-path.test.js`. Expected: FAIL, `.fx/transcript-path` does not exist.

- [ ] **7. Implement the minimum that passes**

No code here: `fx-tdd` drives it.

- [ ] **8. Run it: verify GREEN**

Same command. Expected: PASS.

- [ ] **9. Write the failing lane gate**

Create `tests/gates/ledger-lines.test.js`:

```js
'use strict';
// Run: node tests/gates/ledger-lines.test.js
// ADR 0040: every task ledgers its dispatch and its cost; the controller caps
// outstanding reviews and re-dispatches.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const impl = fs.readFileSync(path.join(root, 'skills', 'fx-implement', 'SKILL.md'), 'utf8').replace(/\s+/g, ' ');

assert.ok(impl.includes('`Task <NN>: dispatched <BASE7> <ISO-8601>`'), 'the dispatch line is defined');
assert.ok(impl.includes('`Task <NN>: cost <tokens> tokens, <minutes> min, <dispatches> dispatches, fx-tdd <k>/<i>`'), 'the cost line is defined');
assert.ok(impl.includes('`Task <NN>: parked: <one-line reason>`'), 'the parked line is defined');
assert.ok(impl.includes('../../scripts/build-cost'), 'the cost step names the script by its path from the skill');
assert.ok(impl.includes('fx-tdd 0/'), 'a task whose implementer skipped fx-tdd is flagged to the reviewer');
assert.ok(impl.includes('git log <BASE>..HEAD'), 'resume checks the task commits before re-dispatching');
assert.ok(impl.includes('At most one task review is outstanding'), 'outstanding reviews are capped');
assert.ok(impl.includes('at most twice'), 'NEEDS_CONTEXT and BLOCKED re-dispatch is capped');
assert.ok(fs.existsSync(path.join(root, 'docs', 'adr', '0040-every-task-ledgers-its-dispatch-and-cost.md')), 'ADR 0040 exists');

console.log('ledger-lines: OK');
```

- [ ] **10. Run it: verify RED**

Run `test_one` with `{file}` = `tests/gates/ledger-lines.test.js`. Expected: FAIL on the first assertion.

- [ ] **11. Edit fx-implement, write ADR 0040, list both gates in `scripts/check-all`**

Each rule is a plain sentence with its reason. ADR shape: `docs/adr/0039-codex-addressing-and-shell-run-apply-patch.md`. Add `run ledger-lines.test.js node tests/gates/ledger-lines.test.js` and `run transcript-path.test.js node tests/gates/transcript-path.test.js` beside the other gate tests in `scripts/check-all`.

- [ ] **12. Run it: verify GREEN**

Same command. Expected: PASS.

- [ ] **13. Set the version**

`git show <base-branch>:.claude-plugin/plugin.json` gives the base version; set all four fields one patch above it.

- [ ] **14. Run the scope**

Run `test_scope` from `.fx.json` with `{paths}` = every path in Files. Expected: PASS, including `release-version.test.js`.

- [ ] **15. Commit**

```
git add hooks/fx-context.js tests/gates/transcript-path.test.js scripts/build-cost scripts/build-cost.test.js skills/fx-implement/SKILL.md tests/gates/ledger-lines.test.js scripts/check-all docs/adr/0040-every-task-ledgers-its-dispatch-and-cost.md package.json .claude-plugin/plugin.json .codex-plugin/plugin.json .agents/plugins/marketplace.json
git commit -m "feat(fx-implement): ledger each task's dispatch and cost, cap reviews and re-dispatches"
```

No attribution trailers. Then continue to the next task: never stop and wait.
