# 05: v2 guard and lane check

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Harness

**What to build:** on OpenCode 2.x, the git guard refuses the same commands it refuses on 1.x as far as each proven layer allows, fails closed when it cannot load, and the lane check nudges the first write. A pattern list for the always-on policy layer is defined once, next to the guard, and checked against it.

**Files:**
- Modify: `plugins/fx-opencode-v2.js`
- Create: `lib/opencode-v2-policies.js`
- Modify: `tests/gates/opencode-v2-plugin.test.js`
- Create: `tests/gates/opencode-v2-policies.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `inspect(command, cwd) -> { allow, reason }` (`lib/git-guard.js`), `laneCheck(file, cwd) -> string | null` (`lib/lane-check.js`), `probe-findings.md` questions 3, 4, 5.
- Produces:
  - `GUARD_POLICIES` from `lib/opencode-v2-policies.js`: an array of `{ action: 'permission', resource: 'shell:<pattern>', effect: 'deny' }`, each with a `sample` command, used by task 06's installer.
  - In the plugin's `evaluate` hook: `action === 'shell'` runs `inspect` on the command text; `action === 'edit'` runs `laneCheck` on each resource path.

**Seam:** the `evaluate` hook driven with recorded events; `inspect` over each policy's sample.

**Risks:**
- Layer 1 depends on probe question 3. If its verdict is `disproven` (the resources do not carry the full command), do not wire `inspect` into `evaluate`; wire it into `tool.hook('execute.before')` only if question 4 is `proven`; if both are disproven, the plugin carries no command guard, the policy layer is v2's only guard, and the report says so for task 09. Record the path taken in the report.
- Fail closed: if `lib/git-guard.js` fails to load, every `shell` evaluation is denied with the load error, as v1 does.
- The lane check is advice: its load failure or throw leaves the event unchanged.
- ADR-0023: set only `effect` and `message` on the event.

**Idempotency:** file edits and new tests written whole; the `check-all` line added only if absent.

**Testing:** gate cases in the plugin test; the policy consistency test.

## Acceptance criteria
- [ ] With layer 1 proven: `git push --force origin main`, `bash -c "git reset --hard"` and `git commit --no-verify -m x` are denied with the guard's reason; `git status` and `ls` are untouched.
- [ ] A broken `lib/git-guard.js` (a copy of the plugin and `lib/` with a throwing module) denies every shell evaluation.
- [ ] The first `edit` into a directory the lane check nudges is denied with its reason; a broken lane check leaves edits untouched.
- [ ] Every entry of `GUARD_POLICIES` has a `sample` that `inspect` refuses, and the list covers force push, pushing the base branch, deleting a remote branch, `--no-verify`, `reset --hard`, `clean -f`, `branch -D`, `stash drop`, `checkout .` and `tag -d`.

## Steps

- [ ] **1. RED, policy list:** create `tests/gates/opencode-v2-policies.test.js`:

```js
'use strict';
// The v2 policy layer and the guard agree: every pattern the installer writes
// is one the guard itself refuses.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const { GUARD_POLICIES } = require(path.join(root, 'lib', 'opencode-v2-policies'));
const { inspect } = require(path.join(root, 'lib', 'git-guard'));

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-pol-'));
execFileSync('git', ['init', '-q', '-b', 'main', repo]);

assert.ok(Array.isArray(GUARD_POLICIES) && GUARD_POLICIES.length >= 10, 'a policy list exists');
for (const p of GUARD_POLICIES) {
  assert.strictEqual(p.action, 'permission');
  assert.strictEqual(p.effect, 'deny');
  assert.ok(p.resource.startsWith('shell:'), `${p.resource} is a shell pattern`);
  assert.ok(typeof p.sample === 'string' && p.sample.length, `${p.resource} has a sample`);
  assert.strictEqual(inspect(p.sample, repo).allow, false, `the guard refuses ${p.resource}'s sample: ${p.sample}`);
}
for (const needle of ['--force', '--no-verify', 'reset --hard', 'clean -f', 'branch -D', 'stash drop', 'checkout .', 'tag -d', '--delete']) {
  assert.ok(GUARD_POLICIES.some((p) => p.resource.includes(needle)), `a policy covers ${needle}`);
}
fs.rmSync(repo, { recursive: true, force: true });
console.log('opencode-v2-policies.test.js: OK');
```

Run it: FAIL, module not found.

- [ ] **2. RED, plugin cases:** append to `tests/gates/opencode-v2-plugin.test.js`, before its final `console.log`, cases that call `evaluate` with `{ action: 'shell', resources: [<command>], effect: 'allow' }` for the acceptance commands, with `{ action: 'edit', resources: [<file>], effect: 'allow' }` for the lane check, and a fail-closed case that copies `plugins/` and `lib/` into a temp dir, replaces `lib/git-guard.js` with `throw new Error('load');`, imports the copy's `plugins/fx-opencode-v2.js`, and asserts a shell evaluation of `ls` is denied. Adjust the shell cases to the path the probe allows (see Risks), and assert exactly that path. Run: FAIL.
- [ ] **3. Implement** with `fx-tdd`: `lib/opencode-v2-policies.js`, then the plugin's guard and lane-check branches.
- [ ] **4. GREEN:** `node tests/gates/opencode-v2-policies.test.js && node tests/gates/opencode-v2-plugin.test.js`.
- [ ] **5. check-all:** add `run opencode-v2-policies.test.js node tests/gates/opencode-v2-policies.test.js` after the `opencode-v2-plugin.test.js` line.
- [ ] **6. Commit**

```
git add plugins/fx-opencode-v2.js lib/opencode-v2-policies.js tests/gates/opencode-v2-plugin.test.js tests/gates/opencode-v2-policies.test.js scripts/check-all
git commit -m "feat(opencode-v2): git guard layers and lane check"
```
