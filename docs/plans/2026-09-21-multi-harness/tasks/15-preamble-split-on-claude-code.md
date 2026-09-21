# 15: The preamble reaches Claude Code whole

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** Amendment

**What to build:** A Claude Code session and every Claude Code subagent see
the whole fx preamble inline, including the routing table, the
non-negotiables, the repo.md note and the plan-state block. Design amendment
A3.

Today the assembled text is about 12.3KB. Claude Code keeps any hook's context
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
- Produces: `node hooks/fx-context.js --part <i>` prints part `i`, or an
  empty `additionalContext` when `i` exceeds the part count.

**Seam:** `lib/preamble.test.js` for the splitting. The hook's process seam
for the per-part output.

**Risks:**
- MEDIUM: the number of handlers in `hooks/hooks.json` is fixed, and the part
  count depends on the preamble's length. Ship **three** handlers per event.
  A part index past the count prints an empty `additionalContext`. The test
  fails if the part count ever exceeds the handler count.
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
- [ ] A test fails if the part count exceeds the number of handlers
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
    assert.ok(parts.length <= 3, 'hooks/hooks.json ships three handlers per event');
    parts.forEach((p, i) => {
      assert.ok(p.length < 9000, `${harness} part ${i + 1} is ${p.length} chars`);
      assert.ok(p.endsWith(`[fx preamble: part ${i + 1} of ${parts.length}]`) ||
                p.endsWith(`[fx preamble: part ${i + 1} of ${parts.length}]\n`), 'labelled at the end');
      assert.ok(!p.startsWith('[fx preamble'), 'nothing above the opening imperative');
    });
    assert.strictEqual(parts.map((p) => p.replace(LABEL, '')).join(''), full, 'parts reassemble the render');
    assert.ok(parts[0].startsWith(full.split('\n')[0]), 'part 1 opens with the opening imperative');
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
