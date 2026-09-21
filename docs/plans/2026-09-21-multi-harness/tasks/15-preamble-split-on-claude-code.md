# 15: The preamble reaches Claude Code whole

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** A Claude Code session and every Claude Code subagent see
the whole fx preamble inline, including the routing table, the
non-negotiables, the repo.md note and the plan-state block. Design amendment
A3.

Today the assembled text is about 12.3KB in a repo with no plan. In this
worktree, with its plan state, `render` returns 13,895 characters for Claude
Code and 14,814 for Codex, so the split has less headroom than the design
assumed. Claude Code keeps any hook's context
over 10,000 characters as a file and shows the model a 2,000 character
preview, so everything after the opening section is effectively missing. This
is why conformance rows 01, 02 and 16 FAIL on Claude Code. The limit is per
hook, not per event, and two hooks each under the limit were measured to both
land inline (`research/claude-code-context-limit.md`).

**Files:**
- Modify: `lib/preamble.js`
- Modify: `lib/preamble.test.js`
- Modify: `hooks/fx-context.js`
- Modify: `hooks/hooks.json`  (Claude Code only)

**Interfaces:**
- Consumes: `render({ harness, cwd }) -> string` (unchanged, still used by
  Codex and opencode)
- Produces: `renderParts({ harness, cwd, max = 9000 }) -> string[]`
  - Each element is under `max` characters.
  - `parts.join('')` equals `render(...)` with the part labels removed.
  - Cuts fall only at a line that starts with `## ` or `### `. The one
    exception: a single section longer than `max` is cut at a paragraph
    boundary, meaning a blank line.
  - Part 1 starts with exactly the first line of `render(...)`.
  - Each part ends with the line `[fx preamble: part <i> of <n>]`.
- Produces: `partForHandler(parts, n, handlers = 3) -> string`, a pure
  function in `lib/preamble.js`:
  - for `n < handlers`, part `n`, or `''` when `n` exceeds the part count;
  - for `n === handlers`, parts `n` to the last, joined with `''`, so when
    there are more parts than handlers, handler 3 emits every remaining part.
    That output may pass the 10,000-character limit and arrive as a file
    preview. That is the degraded case, and it is better than the tail
    vanishing.
- Produces: `node hooks/fx-context.js --part <i>` prints
  `partForHandler(renderParts(...), i)` as `additionalContext`.

**Seam:** `lib/preamble.test.js` for the splitting. The hook's process seam
for the per-part output.

**Risks:**
- MEDIUM: the number of handlers in `hooks/hooks.json` is fixed, and the part
  count depends on the preamble's length. Ship **three** handlers per event.
  A part index past the count prints an empty `additionalContext`. When the
  count exceeds three, handler 3 carries every remaining part.
- A "large plan-state fixture that forces 4+ parts" cannot be built:
  `describePlans` in `lib/plan-state.js` names at most three plans, a few
  hundred characters in all, while three parts hold up to 27,000. The test
  forces 4+ parts by passing a small `max` to `renderParts`, and checks
  handler 3 through `partForHandler`, the same function the hook calls.
- MEDIUM: Claude Code may run handlers in parallel. Each part carries its
  label, so nothing relies on order.
- The global constraint "Nothing is added above the opening imperative of
  `PREAMBLE.md`" holds: labels go at the end of each part, never at the top.

**Idempotency:** pure functions and file edits. Nothing is written at runtime.

**Testing:** unit tests on `renderParts`, a process test on the hook, and the
live rows 01, 02 and 16 in task 21.

## Acceptance criteria
- [ ] `renderParts` returns parts that are each under 9000 characters, for all three harnesses, with and without a `repo.md` and a plan directory in `cwd`
- [ ] Removing the labels and joining the parts reproduces `render` exactly
- [ ] Part 1 begins with the first line of `render`, and no part begins with a label
- [ ] `hooks/hooks.json` has three `fx-context.js --part N` handlers on SessionStart and three on SubagentStart, for N from 1 to 3
- [ ] With `max` small enough to force 4 or more parts, `partForHandler(parts, 3)` returns every part from 3 on, in order, each still carrying its label, and `partForHandler(parts, 4)` is `''`
- [ ] With the default `max`, the render in every fixture, this worktree included, needs at most three parts
- [ ] `node hooks/fx-context.js --part 4` prints valid hook JSON with an empty `additionalContext`
- [ ] The failure text for an unreadable preamble is still printed, and only by part 1
- [ ] Codex and opencode delivery is unchanged: both still call `render`

## Steps

- [ ] **1. Write the failing tests**

Append to `lib/preamble.test.js`:

```js
// ---- Amendment A3: parts under Claude Code's 10,000-char per-hook limit ----
{
  const { render, renderParts, HARNESSES } = require('./preamble');
  const fsx = require('fs'), osx = require('os'), px = require('path');
  const LABEL = /\n?\[fx preamble: part \d+ of \d+\]\n?$/;
  const dirs = [process.cwd()];
  const rich = fsx.mkdtempSync(px.join(osx.tmpdir(), 'fx-parts-'));
  fsx.writeFileSync(px.join(rich, 'repo.md'), '# repo\n');
  fsx.mkdirSync(px.join(rich, 'docs', 'plans', '2026-01-01-demo', 'tasks'), { recursive: true });
  fsx.writeFileSync(px.join(rich, 'docs', 'plans', '2026-01-01-demo', 'plan.md'), '# demo\n');
  dirs.push(rich);
  for (const harness of HARNESSES) for (const cwd of dirs) {
    const full = render({ harness, cwd });
    const parts = renderParts({ harness, cwd });
    assert.ok(parts.length >= 1, 'at least one part');
    assert.ok(parts.length <= 3, `${harness} in ${cwd} needs ${parts.length} parts; three handlers ship per event`);
    parts.forEach((p, i) => {
      assert.ok(p.length < 9000, `${harness} part ${i + 1} is ${p.length} chars`);
      assert.ok(p.endsWith(`[fx preamble: part ${i + 1} of ${parts.length}]`) ||
                p.endsWith(`[fx preamble: part ${i + 1} of ${parts.length}]\n`), 'labelled at the end');
      assert.ok(!p.startsWith('[fx preamble'), 'nothing above the opening imperative');
    });
    assert.strictEqual(parts.map((p) => p.replace(LABEL, '')).join(''), full, 'parts reassemble the render');
    assert.ok(parts[0].startsWith(full.split('\n')[0]), 'part 1 opens with the opening imperative');
  }
  // Handler 3 carries every remaining part when there are more than three.
  // A plan-state fixture cannot force this (describePlans names at most three
  // plans), so a small max does.
  {
    const { partForHandler } = require('./preamble');
    const full = render({ harness: 'claude-code', cwd: rich });
    const many = renderParts({ harness: 'claude-code', cwd: rich, max: 3000 });
    assert.ok(many.length >= 4, `max 3000 forces 4+ parts, got ${many.length}`);
    assert.strictEqual(partForHandler(many, 1), many[0], 'handler 1 is part 1');
    assert.strictEqual(partForHandler(many, 2), many[1], 'handler 2 is part 2');
    assert.strictEqual(partForHandler(many, 3), many.slice(2).join(''), 'handler 3 carries every remaining part');
    assert.strictEqual(partForHandler(many, 4), '', 'no fourth handler output');
    assert.strictEqual([1, 2, 3].map((n) => partForHandler(many, n)).join('').replace(/\n?\[fx preamble: part \d+ of \d+\]\n?/g, ''),
      full, 'the three handlers together still carry the whole render');
    const few = renderParts({ harness: 'claude-code', cwd: rich });
    assert.strictEqual(partForHandler(few, few.length + 1), '', 'past the count is empty');
  }
  fsx.rmSync(rich, { recursive: true, force: true });
  const hooks = JSON.parse(fsx.readFileSync(px.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const ev of ['SessionStart', 'SubagentStart']) {
    const cmds = hooks[ev].flatMap((g) => g.hooks.map((h) => h.command));
    for (const n of [1, 2, 3]) assert.ok(cmds.some((c) => c.includes(`fx-context.js`) && c.includes(`--part ${n}`)), `${ev} part ${n}`);
  }
  console.log('renderParts: passed');
}
```

If the test file uses a different assertion style, match it and keep these
assertions.

- [ ] **2. Run it: verify RED**

Run: `node lib/preamble.test.js`
Expected: FAIL with `renderParts is not a function`.

- [ ] **3. Implement the minimum that passes**

No code here: `fx-tdd` drives it. Then write a process test in the same file.
Spawn `hooks/fx-context.js --part 1` and `--part 4` with a SessionStart
payload, and assert: part 1's `additionalContext` starts with the opening
line, and part 4's is `''`. Watch it fail before wiring the argument.

- [ ] **4. Run it: verify GREEN**

Run: `node lib/preamble.test.js`. Expected: PASS, output pristine.

- [ ] **5. Run the full gate**

Run: `HOME="$(mktemp -d)" scripts/check-all`. Expected: `ALL GREEN`.

- [ ] **6. Commit**

```
git add lib/preamble.js lib/preamble.test.js hooks/fx-context.js hooks/hooks.json
git commit -m "fix(claude-code): split the preamble across hooks so none passes the 10,000-char limit"
```

No attribution trailers. Then continue to the next task: never stop and wait.
