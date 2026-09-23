# 02: Lane-triggering suite covers every model-facing lane

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** the lane-triggering suite becomes sharp enough to catch a
routing regression smaller than row 04 can see. Four changes:

1. **Every model-facing lane has a prompt.** Model-facing means the skill's
   frontmatter lacks `disable-model-invocation: true`. That is 12 lanes:
   fx-architecture, fx-authoring, fx-brainstorm, fx-debug, fx-design,
   fx-humanize, fx-implement, fx-plan, fx-review, fx-tdd, prototype, research.
   Five have no prompt today: fx-authoring, fx-implement, fx-plan, prototype,
   research. (`fx-authoring`'s body mentions the flag, but its frontmatter
   does not set it; check the frontmatter only.)
2. **Should-not-fire prompts.** A prompt named `none__<variant>.txt` passes only
   when no fx lane is invoked at all.
3. **Wrong-lane detection.** A positive prompt passes only when the **first** fx
   lane invoked is the expected one. Today it passes if the expected lane
   appears anywhere, so a run that first invokes fx-brainstorm and later
   fx-tdd passes an fx-tdd prompt. The row 04 regression in the multi-harness
   build was exactly this: a lane fired, the wrong one
   (`docs/plans/2026-09-21-multi-harness/state.md`, the task 24 entries).
   `run-reps.sh` gets the same rule.
4. **A scratch home.** `run-test.sh` and `run-reps.sh` call `claude` with the
   real `HOME`, so the owner's other plugins, `CLAUDE.md` and memory leak into
   every run, and a `none__` prompt can fire some other plugin's instructions.
   Both scripts run `claude` with `HOME` and `CLAUDE_CONFIG_DIR` pointed at a
   `mktemp -d`, holding only a copy of the credential, the way
   `tests/conformance/lib/live.sh` does for claude-code: read one credential
   file from the real home, write it into the scratch home at mode 0600 under
   0700 directories, and never write, move or delete anything under the real
   home. Extract that copy into `tests/conformance/lib/scratch-home.sh` (one
   function, `scratch_home_claude <dir>`) and source it from `live.sh`,
   `run-test.sh` and `run-reps.sh`, so there is one copy of the rule. A
   missing credential prints `[SKIP] no credential` and exits 0, as the
   missing-CLI case does today. Remove the scratch home on exit, and only
   after checking the path is the `mktemp -d` result under `${TMPDIR:-/tmp}`:
   never `rm -rf` a variable that could be empty, `$HOME`, or anything under
   the real home. This repo has already lost a real `~/.claude` to a cleanup
   that trusted its variable.

fx-plan and fx-implement need repository state to trigger. Use the existing
per-lane fixture hook: `fixtures/<lane>.sh` runs inside the scratch cwd before
the prompt.

**Files:**
- Create: `tests/lane-triggering/prompts/fx-authoring.txt`
- Create: `tests/lane-triggering/prompts/fx-plan.txt`
- Create: `tests/lane-triggering/prompts/fx-implement.txt`
- Create: `tests/lane-triggering/prompts/prototype.txt`
- Create: `tests/lane-triggering/prompts/research.txt`
- Create: `tests/lane-triggering/prompts/none__git-question.txt`
- Create: `tests/lane-triggering/prompts/none__explain-code.txt`
- Create: `tests/lane-triggering/prompts/none__shell-oneliner.txt`
- Create: `tests/lane-triggering/fixtures/fx-plan.sh`
- Create: `tests/lane-triggering/fixtures/fx-implement.sh`
- Create: `tests/lane-triggering/verdict.js`
- Create: `tests/lane-triggering/verdict.test.js`
- Modify: `tests/lane-triggering/run-test.sh` (use `verdict.js` for the PASS/FAIL decision; scratch home)
- Modify: `tests/lane-triggering/run-reps.sh` (same two changes)
- Create: `tests/conformance/lib/scratch-home.sh`
- Modify: `tests/conformance/lib/live.sh` (source `scratch-home.sh` for the claude-code credential copy; behaviour unchanged)
- Modify: `tests/lane-triggering/run-all.sh` (drop the comment that says fx-plan and fx-implement are absent)
- Modify: `scripts/check-all` (add `verdict.test.js`)

**Interfaces:**
- Produces: `node tests/lane-triggering/verdict.js <expected-lane|none> <stream.json>`
  prints `PASS`, `FAIL <reason>` and exits 0 or 1. Reason is one of
  `no lane invoked`, `first lane was <name>`, `a lane was invoked: <name>`.
  An fx lane is a `Skill` tool_use whose `input.skill`, with any `plugin:`
  prefix removed, is one of the skill directory names under `skills/`.
  Non-fx skills (for example `superpowers:brainstorming`) are ignored.
- Consumes: `stream.json` as written by `claude -p --output-format stream-json
  --verbose`: one JSON object per line; assistant lines have
  `message.content[]` with `{ type: "tool_use", name: "Skill", input: { skill } }`.

**Prompt rules** (from the runner's own comment: a prompt must carry its own
subject, because the cwd is empty):
- `fx-plan.txt`: refers to the approved design the fixture creates, for example
  "The design in docs/plans/2026-01-01-notes/design.md is approved. Break it
  into tasks." Must not say "fx-plan".
- `fx-implement.txt`: "The plan in docs/plans/2026-01-01-notes/ is ready. Go."
  The fixture creates `design.md`, `plan.md` and `tasks/01-add-note.md`.
- `prototype.txt`: a behavioural question talk cannot settle, for example two
  retry strategies whose difference only shows when run.
- `research.txt`: a question only outside documentation answers, naming a real
  library and version.
- `fx-authoring.txt`: a request to reword a subagent dispatch prompt that an
  agent keeps ignoring, with the prompt text pasted in.
- The three `none__` prompts: a general git question, "explain what this
  function does" with the function pasted in, and a request for a shell
  one-liner. None names a lane.

**Seam:** unit for `verdict.js` over hand-written stream files; live for the prompts (owner-run in task 04).

**Idempotency:** new files only; fixtures write only inside the scratch cwd.

**Testing:** `node tests/lane-triggering/verdict.test.js`; the prompts are exercised live in task 04.

## Acceptance criteria
- [ ] `verdict.js fx-tdd` on a stream that invokes `fx:fx-brainstorm` then `fx:fx-tdd` prints `FAIL first lane was fx-brainstorm`.
- [ ] `verdict.js fx-tdd` on a stream that invokes `superpowers:brainstorming` then `fx:fx-tdd` prints `PASS`.
- [ ] `verdict.js none` on a stream with no Skill call prints `PASS`; with `fx:fx-debug` it prints `FAIL a lane was invoked: fx-debug`.
- [ ] `run-test.sh` and `run-reps.sh` decide PASS or FAIL through `verdict.js`; the INCONCLUSIVE path is unchanged.
- [ ] Both scripts run `claude` with `HOME` and `CLAUDE_CONFIG_DIR` in a scratch directory; `grep -n 'HOME' tests/lane-triggering/*.sh` shows no write to the real home.
- [ ] `bash tests/conformance/runner-isolation.test.sh` still passes after `live.sh` sources `scratch-home.sh`.
- [ ] `run-all.sh` maps `none__*.txt` to lane `none` without change (the existing `${lane%%__*}` already does this; confirm it).
- [ ] Every model-facing lane has at least one prompt file; the test below asserts it.

## Steps

- [ ] **1. Write the failing test**

```js
'use strict';
// Run: node tests/lane-triggering/verdict.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const BIN = path.join(DIR, 'verdict.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-verdict-'));
const skill = (s) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Skill', input: { skill: s } }] } });
const stream = (name, skills) => {
  const f = path.join(tmp, `${name}.json`);
  fs.writeFileSync(f, [{ type: 'system' }, ...skills.map(skill)].map((o) => JSON.stringify(o)).join('\n') + '\n');
  return f;
};
const run = (lane, file) => {
  const p = spawnSync('node', [BIN, lane, file], { encoding: 'utf8' });
  return { code: p.status, out: p.stdout.trim() };
};

assert.deepStrictEqual(run('fx-tdd', stream('ok', ['fx:fx-tdd'])), { code: 0, out: 'PASS' });
assert.deepStrictEqual(run('fx-tdd', stream('bare', ['fx-tdd'])), { code: 0, out: 'PASS' });
assert.deepStrictEqual(run('fx-tdd', stream('wrong', ['fx:fx-brainstorm', 'fx:fx-tdd'])), { code: 1, out: 'FAIL first lane was fx-brainstorm' });
assert.deepStrictEqual(run('fx-tdd', stream('foreign', ['superpowers:brainstorming', 'fx:fx-tdd'])), { code: 0, out: 'PASS' });
assert.deepStrictEqual(run('fx-tdd', stream('nothing', [])), { code: 1, out: 'FAIL no lane invoked' });
assert.deepStrictEqual(run('none', stream('quiet', ['superpowers:brainstorming'])), { code: 0, out: 'PASS' });
assert.deepStrictEqual(run('none', stream('noisy', ['fx:fx-debug'])), { code: 1, out: 'FAIL a lane was invoked: fx-debug' });

// Every model-facing lane has a prompt.
const skillsDir = path.join(DIR, '..', '..', 'skills');
const modelFacing = fs.readdirSync(skillsDir).filter((d) => {
  const f = path.join(skillsDir, d, 'SKILL.md');
  return fs.existsSync(f) && !/^disable-model-invocation:\s*true/m.test(fs.readFileSync(f, 'utf8').split(/^---$/m)[1] || '');
});
const prompts = fs.readdirSync(path.join(DIR, 'prompts')).map((f) => f.replace(/\.txt$/, '').split('__')[0]);
for (const lane of modelFacing) assert.ok(prompts.includes(lane), `lane ${lane} has no prompt`);
assert.ok(prompts.includes('none'), 'at least one should-not-fire prompt');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('verdict: ok');
```

- [ ] **2. Run it: verify RED**

Run: `node tests/lane-triggering/verdict.test.js`
Expected: FAIL, the first `run` returns a non-zero code because `verdict.js` does not exist.

- [ ] **3. Implement `verdict.js`** (driven by `fx-tdd`), then write the seven prompt files and two fixtures. Rerun until GREEN: the lane-coverage assertion fails until every prompt file exists.

- [ ] **4. Run it: verify GREEN**

Run: `node tests/lane-triggering/verdict.test.js`. Expected: `verdict: ok`.

- [ ] **5. Switch `run-test.sh` and `run-reps.sh` to `verdict.js`**

Replace each `grep`-based verdict with `node "$SCRIPT_DIR/verdict.js" "$LANE" "$LOG"`, keep printing the invoked lanes and the log path. Run `bash -n` on both.

- [ ] **5b. Scratch home**

Write `tests/conformance/lib/scratch-home.sh` by moving the claude-code credential copy out of `live.sh` unchanged; source it from `live.sh`, `run-test.sh` and `run-reps.sh`. Run `bash tests/conformance/runner-isolation.test.sh` and `bash -n` on all four files.

- [ ] **6. Run the suite**

Add `run verdict.test.js   node tests/lane-triggering/verdict.test.js` to `scripts/check-all`, then run `scripts/check-all`.

- [ ] **7. Commit**

```
git add tests/lane-triggering/verdict.js tests/lane-triggering/verdict.test.js tests/lane-triggering/run-test.sh tests/lane-triggering/run-reps.sh tests/lane-triggering/run-all.sh tests/conformance/lib/scratch-home.sh tests/conformance/lib/live.sh tests/lane-triggering/prompts/fx-authoring.txt tests/lane-triggering/prompts/fx-plan.txt tests/lane-triggering/prompts/fx-implement.txt tests/lane-triggering/prompts/prototype.txt tests/lane-triggering/prompts/research.txt tests/lane-triggering/prompts/none__git-question.txt tests/lane-triggering/prompts/none__explain-code.txt tests/lane-triggering/prompts/none__shell-oneliner.txt tests/lane-triggering/fixtures/fx-plan.sh tests/lane-triggering/fixtures/fx-implement.sh scripts/check-all
git commit -m "test(lane-triggering): cover every model-facing lane, add should-not-fire prompts, fail on the wrong first lane, run in a scratch home"
```
