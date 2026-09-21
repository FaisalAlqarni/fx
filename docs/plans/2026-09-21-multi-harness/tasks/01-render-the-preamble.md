# 01: Render the preamble per harness

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** Every session on every runtime receives a preamble whose
opening imperative names the lanes the way that runtime addresses them. Today
`PREAMBLE.md` hardcodes Claude Code's addressing and ships it verbatim to
opencode, where it is wrong. After this task one file is the source, one
function renders it, and no session can receive an unrendered placeholder.

This is a prefactor. It makes tasks 04 and 08 small.

**Files:**
- Create: `lib/preamble.js`
- Create: `lib/preamble.test.js`
- Modify: `PREAMBLE.md`
- Modify: `hooks/fx-context.js`
- Modify: `scripts/check-all`

**Interfaces:**
- Consumes: `describePlans(cwd) -> string|null` (existing, `lib/plan-state.js`)
- Produces: `render({ harness, cwd }) -> string`
  - `harness` is one of `'claude-code'`, `'opencode'`, `'codex'`
  - throws `Error` on an unknown harness
  - never returns a string containing `{{`
- Produces: `HARNESSES -> string[]` (the three names, for tests and gates)

**Seam:** `lib/*.test.js`, plain node, no framework. Matches
`lib/plan-state.test.js`.

**Placeholder vocabulary.** Exactly two forms, both replaced by `render`:

| Placeholder | claude-code | opencode | codex |
|---|---|---|---|
| `{{SKILL_TOOL}}` | `` the `Skill` tool `` | `` the `Skill` tool `` | `` the `$name` form `` |
| `{{LANE:fx-tdd}}` | `fx:fx-tdd` | `fx-tdd` | `$fx-tdd` |
| `{{RESOLUTION}}` | a plugin skill resolves as `plugin:skill`, so a bare `fx-tdd` may not resolve at all | the name carries no plugin prefix here, so `fx:fx-tdd` is what will not resolve | lanes are addressed with a leading `$`, and a bare `fx-tdd` is not a lane reference |

**`{{RESOLUTION}}` is the whole reason this task exists.** `PREAMBLE.md:25-26`
currently reads *"A plugin skill resolves as `plugin:skill`, so a bare `fx-tdd`
may not resolve at all."* On opencode that is backwards, and on Codex both
forms are wrong. The sentence contains no `fx:fx-tdd`, so a test asserting only
on that string goes green while the advice stays wrong. Replace the sentence
with the placeholder.

**Risks:** `PREAMBLE.md`'s opening imperative is the most load-bearing text fx
has, and ADR 0002 measured that its position and self-sufficiency decide
whether lanes fire. Substitute names only. Do not reorder, do not add a
sentence, do not introduce a pointer to another file.

**Idempotency:** Pure function, no writes. Safe to re-run.

**Testing:** Unit. Assert each harness renders its own addressing, that no
placeholder survives, and that an unknown harness throws rather than silently
emitting a broken preamble.

## Acceptance criteria
- [ ] `render({ harness: 'claude-code' })` contains `fx:fx-tdd` and not `fx-tdd` standing alone
- [ ] `render({ harness: 'opencode' })` contains `fx-tdd` and does not contain `fx:fx-tdd`
- [ ] No harness receives the sentence "a plugin skill resolves as `plugin:skill`" except claude-code
- [ ] Each harness receives a resolution clause naming the form that fails **on that runtime**
- [ ] `render({ harness: 'codex' })` contains `$fx-tdd` and does not contain `fx:fx-tdd`
- [ ] For every harness in `HARNESSES`, the rendered text contains no `{{`
- [ ] `render({ harness: 'nope' })` throws
- [ ] Rendered text still opens with the lane imperative: the first `##` heading is unchanged from `PREAMBLE.md`
- [ ] When `cwd` contains a `repo.md`, the rendered text mentions it
- [ ] `hooks/fx-context.js` emits text produced by `render`, and a Claude Code session still receives the preamble
- [ ] `scripts/check-all` runs `lib/preamble.test.js`

## Steps

- [ ] **1. Write the failing test**

```js
// lib/preamble.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { render, HARNESSES } = require('./preamble');

assert.deepStrictEqual(HARNESSES, ['claude-code', 'opencode', 'codex']);

const cc = render({ harness: 'claude-code' });
assert.ok(cc.includes('fx:fx-tdd'), 'claude-code must address lanes as fx:fx-tdd');

const oc = render({ harness: 'opencode' });
assert.ok(oc.includes('fx-tdd'), 'opencode must name the lane');
assert.ok(!oc.includes('fx:fx-tdd'), 'opencode must NOT carry the plugin prefix');

// The resolution clause is the sentence that has been backwards all along.
// Assert on the clause, not on a substring it never contained.
assert.ok(!/a plugin skill resolves as/i.test(oc),
  'opencode must not be told that a plugin prefix is required');
assert.ok(/will not resolve|no plugin prefix/i.test(oc),
  'opencode must be told which form fails');
assert.ok(/leading .\$|addressed with a leading/i.test(cx),
  'codex must be told lanes carry a leading $');

const cx = render({ harness: 'codex' });
assert.ok(cx.includes('$fx-tdd'), 'codex must address lanes as $fx-tdd');
assert.ok(!cx.includes('fx:fx-tdd'), 'codex must NOT carry the plugin prefix');

for (const harness of HARNESSES) {
  const text = render({ harness });
  assert.ok(!text.includes('{{'), `${harness}: unrendered placeholder survived`);
  assert.ok(text.length > 500, `${harness}: preamble looks truncated`);
}

// The imperative must still lead. ADR 0002.
const source = fs.readFileSync(path.join(__dirname, '..', 'PREAMBLE.md'), 'utf8');
const firstHeading = (s) => (s.match(/^## .*$/m) || [''])[0];
assert.strictEqual(
  firstHeading(render({ harness: 'claude-code' })),
  firstHeading(source),
  'the first section must not move'
);

assert.throws(() => render({ harness: 'nope' }), /unknown harness/i);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-preamble-'));
fs.writeFileSync(path.join(dir, 'repo.md'), '# repo\n');
assert.ok(
  render({ harness: 'codex', cwd: dir }).includes('repo.md'),
  'a repo.md in cwd must be announced'
);
fs.rmSync(dir, { recursive: true, force: true });

console.log('preamble.test.js: OK');
```

- [ ] **2. Run it: verify RED**

Run: `node lib/preamble.test.js`
Expected: FAIL, `Cannot find module './preamble'`

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it from the failing test.

Add the three placeholder forms to `PREAMBLE.md` in the same step, replacing
the hardcoded `fx:fx-tdd`, `fx:fx-implement` and `fx:fx-review`, the sentence
naming the `Skill` tool, and the resolution clause at lines 25-26. Also correct
`PREAMBLE.md:4`, which says "on both runtimes" and will be wrong the moment
task 04 lands. Change nothing else in that file, and move nothing.

- [ ] **4. Run it: verify GREEN**

Run: `node lib/preamble.test.js`
Expected: PASS, `preamble.test.js: OK`, output otherwise pristine.

- [ ] **5. Rewire the Claude Code injector**

Replace the `readFileSync` of `PREAMBLE.md`, the `repo.md` note and the
`describePlans` block in `hooks/fx-context.js` with one call to
`render({ harness: 'claude-code', cwd })`. Keep the existing failure text for
the case where rendering throws, and keep the existing
`hookSpecificOutput` envelope untouched.

- [ ] **6. Verify the injector still emits**

Run:
```
echo '{"hook_event_name":"SessionStart","cwd":"'"$PWD"'"}' | node hooks/fx-context.js
```
Expected: JSON on stdout whose `hookSpecificOutput.additionalContext` contains
`fx:fx-tdd` and does not contain `{{`.

- [ ] **7. Register the test in the free gate**

Add to `scripts/check-all`, beside the other `lib` tests:
```
run preamble.test.js    node lib/preamble.test.js
```

- [ ] **8. Run the full gate**

Run: `scripts/check-all`
Expected: `ALL GREEN`.

- [ ] **9. Commit**

```
git add lib/preamble.js lib/preamble.test.js PREAMBLE.md hooks/fx-context.js scripts/check-all
git commit -m "feat(preamble): render lane addressing per harness"
```

No attribution trailers. Then continue to the next task: never stop and wait.
