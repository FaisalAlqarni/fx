# 05: v2 guard and lane check

**Status:** ready-for-agent
**Blocked by:** 04
**Phase:** Harness

**What to build:** on OpenCode 2.x, the git guard refuses the same commands it refuses on 1.x as far as each proven layer allows, runs on the full command text rather than the sub-command pieces v2 hands the permission hook, fails closed when it cannot load, cannot find the command, or throws, and the lane check nudges the first write. A pattern list for the always-on policy layer is defined once, next to the guard, and checked against it in both directions: every pattern matches commands the guard refuses and does not match commands the guard allows.

**Files:**
- Modify: `plugins/fx-opencode-v2.js`
- Create: `lib/opencode-v2-policies.js`
- Modify: `tests/gates/opencode-v2-plugin.test.js`
- Create: `tests/gates/opencode-v2-policies.test.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `inspect(command, cwd) -> { allow, reason }` (`lib/git-guard.js`), `laneCheck(file, cwd) -> string | null` (`lib/lane-check.js`), `probe-findings.md` questions 3, 4, 5.
- Produces:
  - `GUARD_POLICIES` from `lib/opencode-v2-policies.js`: an array of `{ action: 'permission', resource: 'shell:<pattern>', effect: 'deny', sample: string, allowed: string[] }`. `sample` is a command `inspect` refuses and the pattern matches; each `allowed` entry is a command `inspect` allows and the pattern does not match. Task 06's installer writes each entry without `sample` and `allowed`.
  - In the plugin: `ctx.tool.hook('execute.before', ev)` records `String(ev.input.command)` in a module-level `Map` keyed by `ev.id` when `ev.tool === 'shell'`; `ctx.tool.hook('execute.after', ev)` deletes `ev.id`. In the `evaluate` hook, `action === 'shell'` looks the command up with `ev.source && ev.source.id` and runs `inspect(command, ctx.location.directory)` on it; `action === 'edit'` runs `laneCheck(path.resolve(ctx.location.directory, r), ctx.location.directory)` on each resource `r`.

**Seam:** the `tool` and `evaluate` hooks driven with recorded events, a tool call's `execute.before` first and then its `evaluate` with the same id, as the source orders them (`core/src/tool.ts:103-110`, `core/src/tool/plugin/shell.ts:117-142`); `inspect` and v2's `Wildcard.match` over each policy's `sample` and `allowed` commands.

**Risks:**
- v2's `ev.resources` for `shell` is one entry per parsed sub-command (`core/src/tool/plugin/shell.ts:134-142`, `shell/parse.ts:194-197`), never the full command: running `inspect` per resource misses heredoc and pipe-into-shell forms. The guard never reads `ev.resources` for `shell`; it reads the recorded command.
- Layer 1 depends on probe question 3. If its verdict is `disproven` (the ids differ, or `evaluate` runs before `execute.before`), do not wire `inspect` into `evaluate`; wire it into `tool.hook('execute.before')` as a throw only if question 4 is `proven`; if both are disproven, the plugin carries no command guard, the policy layer is v2's only guard, and the report says so for task 09. Record the path taken in the report.
- Fail closed, all three ways: if `lib/git-guard.js` fails to load, every `shell` evaluation is denied with the load error; if the lookup misses (no `ev.source`, or no recorded command for its id), the evaluation is denied with "fx could not see this command's full text"; if `inspect` or the lookup throws, the evaluation is denied with the error, as `plugins/fx-opencode-v1.js` does in its catch around `inspect`. Every hook body is wrapped in `try`/`catch`: a rejected Promise in a v2 hook is a defect, not a denial (`plugin/src/promise/adapter.ts:439`, `:504`).
- v2 edit resources are relative to the project directory (`core/src/file-access.ts:108`); `laneCheck` computes `path.relative(cwd, file)`, which resolves a relative `file` against `process.cwd()`. Resolve each resource against `ctx.location.directory` first.
- v2 `Wildcard.match` turns `*` into `.*` and lets a trailing ` *` also match the bare command (`core/src/util/wildcard.ts:8-12`). A policy cannot be overridden and says only "Blocked by configuration policy", so a loose pattern blocks legitimate work with no way out. Write tight patterns: `git push origin main` and `git push origin main *`, never `main*`; `git checkout .` and `git checkout . *`, never `.*`; `git commit --no-verify *`, `git commit * --no-verify *` and the same for `git push`, never `* --no-verify*`. No pattern contains `?`, which v2 turns into `.`.
- The lane check is advice: its load failure or throw leaves the event unchanged.
- ADR-0023: set only `effect` and `message` on the event.

**Idempotency:** file edits and new tests written whole; the `check-all` line added only if absent.

**Testing:** gate cases in the plugin test; the policy consistency test.

## Acceptance criteria
- [ ] With layer 1 proven: `git push --force origin main`, `bash -c "git reset --hard"`, `git commit --no-verify -m x`, and a heredoc `bash <<'EOF'` whose body is `git reset --hard` are denied with the guard's reason, each recorded through `execute.before` and evaluated with `ev.resources` holding only the pieces; `git status` and `ls` are untouched.
- [ ] A `shell` evaluation whose `ev.source.id` has no recorded command, or that has no `ev.source`, is denied.
- [ ] A broken `lib/git-guard.js` (a copy of the plugin and `lib/` with a throwing module) denies every shell evaluation; a `lib/git-guard.js` whose `inspect` throws denies the evaluation with the error, and the hook does not reject.
- [ ] The first `edit` into a directory the lane check nudges is denied with its reason, both for an absolute resource and for a project-relative one (`app.js`) while `process.cwd()` is elsewhere; a broken lane check leaves edits untouched.
- [ ] Every entry of `GUARD_POLICIES` has a `sample` that `inspect` refuses and the pattern matches, and at least one `allowed` command that `inspect` allows and the pattern does not match; the list covers force push, pushing the base branch, deleting a remote branch, `--no-verify`, `reset --hard`, `clean -f`, `branch -D`, `stash drop`, `checkout .` and `tag -d`; `git push origin main-fix`, `git checkout .github/x` and `git log --grep no-verify` match no pattern.

## Steps

- [ ] **1. RED, policy list:** create `tests/gates/opencode-v2-policies.test.js`:

```js
'use strict';
// The v2 policy layer and the guard agree in both directions: every pattern
// the installer writes matches commands the guard refuses, and matches none
// of the commands the guard allows. `match` copies OpenCode 2.0.18's
// Wildcard.match (packages/core/src/util/wildcard.ts), since a policy can
// never be overridden by the user.
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const { GUARD_POLICIES } = require(path.join(root, 'lib', 'opencode-v2-policies'));
const { inspect } = require(path.join(root, 'lib', 'git-guard'));

function match(input, pattern) {
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  if (escaped.endsWith(' .*')) escaped = escaped.slice(0, -3) + '( .*)?';
  return new RegExp('^' + escaped + '$', 's').test(input);
}
const matchesAny = (cmd) => GUARD_POLICIES.some((p) => match(`shell:${cmd}`, p.resource));

const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-pol-'));
execFileSync('git', ['init', '-q', '-b', 'main', repo]);

assert.ok(Array.isArray(GUARD_POLICIES) && GUARD_POLICIES.length >= 10, 'a policy list exists');
for (const p of GUARD_POLICIES) {
  assert.strictEqual(p.action, 'permission');
  assert.strictEqual(p.effect, 'deny');
  assert.ok(p.resource.startsWith('shell:'), `${p.resource} is a shell pattern`);
  assert.ok(!p.resource.includes('?'), `${p.resource} has no ? (v2 reads it as any character)`);
  assert.ok(typeof p.sample === 'string' && p.sample.length, `${p.resource} has a sample`);
  assert.strictEqual(inspect(p.sample, repo).allow, false, `the guard refuses ${p.resource}'s sample: ${p.sample}`);
  assert.ok(match(`shell:${p.sample}`, p.resource), `${p.resource} matches its own sample: ${p.sample}`);
  assert.ok(Array.isArray(p.allowed) && p.allowed.length, `${p.resource} has allowed samples`);
  for (const ok of p.allowed) {
    assert.strictEqual(inspect(ok, repo).allow, true, `the guard allows ${p.resource}'s allowed sample: ${ok}`);
    assert.ok(!match(`shell:${ok}`, p.resource), `${p.resource} does not block ${ok}`);
  }
}
for (const needle of ['--force', '--no-verify', 'reset --hard', 'clean -f', 'branch -D', 'stash drop', 'checkout .', 'tag -d', '--delete']) {
  assert.ok(GUARD_POLICIES.some((p) => p.resource.includes(needle)), `a policy covers ${needle}`);
}
for (const ok of ['git push origin main-fix', 'git checkout .github/x', 'git log --grep no-verify', 'git status', 'git push origin feature']) {
  assert.ok(!matchesAny(ok), `no policy blocks ${ok}`);
}
fs.rmSync(repo, { recursive: true, force: true });
console.log('opencode-v2-policies.test.js: OK');
```

Run it: FAIL, module not found.

- [ ] **2. RED, plugin cases:** append to `tests/gates/opencode-v2-plugin.test.js`, before its final `fs.rmSync`, these cases (they reuse `stub`, `evaluate`, `dir` and `mod` from task 04's file):

```js
  // --- guard: the full command, looked up by call id ------------------------
  const g = stub(dir);
  await mod.default.setup(g.ctx);
  let n = 0;
  async function shell(command, pieces) {
    const id = `call_${++n}`;
    for (const cb of g.rec.hooks['tool.execute.before'] || []) await cb({ tool: 'shell', sessionID: 's', agent: 'build', messageID: 'm', id, input: { command } });
    const e = await evaluate(g.rec, { action: 'shell', resources: pieces || [command], source: { type: 'tool', messageID: 'm', id }, effect: 'allow' });
    for (const cb of g.rec.hooks['tool.execute.after'] || []) await cb({ tool: 'shell', id, status: 'completed' });
    return e;
  }
  for (const [cmd, pieces] of [
    ['git push --force origin main'],
    ['bash -c "git reset --hard"'],
    ['git commit --no-verify -m x'],
    ["bash <<'EOF'\ngit reset --hard\nEOF", ["bash <<'EOF'"]],
    ['echo "git reset --hard" | sh', ['echo "git reset --hard"', 'sh']],
  ]) {
    const e = await shell(cmd, pieces);
    assert.strictEqual(e.effect, 'deny', `the guard refuses the full command: ${cmd}`);
    assert.ok(e.message, `the refusal carries the guard's reason: ${cmd}`);
  }
  for (const cmd of ['git status', 'ls']) assert.strictEqual((await shell(cmd)).effect, 'allow', `${cmd} is untouched`);

  const miss = await evaluate(g.rec, { action: 'shell', resources: ['ls'], source: { type: 'tool', messageID: 'm', id: 'never_recorded' }, effect: 'allow' });
  assert.strictEqual(miss.effect, 'deny', 'a call id with no recorded command is denied');
  const nosrc = await evaluate(g.rec, { action: 'shell', resources: ['ls'], effect: 'allow' });
  assert.strictEqual(nosrc.effect, 'deny', 'a shell evaluation with no source is denied');

  // --- fail closed: a guard that cannot load, and a guard that throws -------
  async function withGuard(guardSource) {
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-broken-'));
    for (const d of ['plugins', 'lib', 'agents', 'commands', 'skills', 'references']) fs.cpSync(path.join(root, d), path.join(copy, d), { recursive: true });
    for (const f of ['PREAMBLE.md', 'package.json']) if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(copy, f));
    fs.writeFileSync(path.join(copy, 'lib', 'git-guard.js'), guardSource);
    const m = await import(pathToFileURL(path.join(copy, 'plugins', 'fx-opencode-v2.js')).href);
    const b = stub(dir);
    await m.default.setup(b.ctx);
    for (const cb of b.rec.hooks['tool.execute.before'] || []) await cb({ tool: 'shell', id: 'c1', input: { command: 'ls' } });
    const e = await evaluate(b.rec, { action: 'shell', resources: ['ls'], source: { type: 'tool', messageID: 'm', id: 'c1' }, effect: 'allow' });
    fs.rmSync(copy, { recursive: true, force: true });
    return e;
  }
  assert.strictEqual((await withGuard("throw new Error('load');\n")).effect, 'deny', 'a guard that cannot load denies every shell call');
  const threw = await withGuard("module.exports = { inspect() { throw new Error('inspect broke'); } };\n");
  assert.strictEqual(threw.effect, 'deny', 'a throwing inspect denies, and the hook does not reject');
  assert.ok(/inspect broke/.test(threw.message), 'the denial names the error');

  // --- lane check: absolute and project-relative resources ------------------
  const lc = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-lane-'));
  const l = stub(lc);
  await mod.default.setup(l.ctx);
  const edit = (r) => evaluate(l.rec, { action: 'edit', resources: [r], effect: 'allow' });
  assert.strictEqual((await edit(path.join(lc, 'app.js'))).effect, 'deny', 'the lane check refuses a first write (absolute)');
  const lc2 = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-v2-lane-'));
  const l2 = stub(lc2);
  await mod.default.setup(l2.ctx);
  const here = process.cwd();
  process.chdir(os.tmpdir());
  const rel = await evaluate(l2.rec, { action: 'edit', resources: ['app.js'], effect: 'allow' });
  process.chdir(here);
  assert.strictEqual(rel.effect, 'deny', 'a project-relative resource is resolved against the project, not process.cwd()');
  assert.strictEqual((await edit(path.join(lc, 'README.md'))).effect, 'allow', 'prose is not nudged');
  assert.strictEqual((await evaluate(l.rec, { action: 'edit', resources: [42], effect: 'allow' })).effect, 'allow', 'a lane-check crash leaves the edit alone');
  fs.rmSync(lc, { recursive: true, force: true });
  fs.rmSync(lc2, { recursive: true, force: true });
```

Before relying on a refused case, confirm `inspect` refuses its full command with `node -e`; a form `inspect` allows is a guard gap to name in the report for task 09, never a case deleted quietly. Adjust the shell cases to the path the probe allows (see Risks) and assert exactly that path; if the copy needs further top-level files for `render` to load, copy them too. Run: FAIL.

- [ ] **3. Implement** with `fx-tdd`: `lib/opencode-v2-policies.js` (patterns derived from `lib/git-guard.js`'s refusals, tight per Risks), then the plugin's recording hooks, guard and lane-check branches.
- [ ] **4. GREEN:** `node tests/gates/opencode-v2-policies.test.js && node tests/gates/opencode-v2-plugin.test.js`.
- [ ] **5. check-all:** add `run opencode-v2-policies.test.js node tests/gates/opencode-v2-policies.test.js` after the `opencode-v2-plugin.test.js` line.
- [ ] **6. Commit**

```
git add plugins/fx-opencode-v2.js lib/opencode-v2-policies.js tests/gates/opencode-v2-plugin.test.js tests/gates/opencode-v2-policies.test.js scripts/check-all
git commit -m "feat(opencode-v2): git guard layers and lane check"
```
