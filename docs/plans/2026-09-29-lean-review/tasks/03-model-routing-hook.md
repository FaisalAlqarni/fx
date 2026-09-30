# 03: Model routing hook on Claude Code

**Status:** ready-for-agent
**Blocked by:** 02
**Phase:** Core

**What to build:** on Claude Code, every `Agent` dispatch is routed before it runs. A general dispatch with no `model` runs on the standard tier (`sonnet`) instead of inheriting the session's model. A dispatch with `model: opus` runs on `sonnet` unless its prompt has a line starting `Capable because:`. Nothing is ever refused, and any error in the hook lets the call through unchanged. fx's own templates and rules say how to write the reason line.

**Files:**
- Create: `lib/dispatch-route.js`
- Modify: `hooks/fx-pretooluse.js`
- Create: `tests/gates/dispatch-route.test.js`
- Modify: `scripts/check-all`
- Modify: `references/vocab/model-selection.md`
- Modify: `references/harnesses/claude-code.md`
- Modify: `skills/fx-implement/implementer-prompt.md`
- Modify: `skills/fx-implement/task-reviewer-prompt.md`
- Modify: `skills/fx-implement/re-review-prompt.md`
- Modify: `skills/fx-review/reviewer-prompt.md`
- Modify: `skills/fx-implement/SKILL.md`
- Modify: `skills/fx-implement/fix-loop.md`
- Modify: `skills/fx-review/SKILL.md`
- Create: `docs/adr/0031-defaults-are-held-by-mechanism.md`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `route(toolInput) -> object | null` in `lib/dispatch-route.js`: returns a new tool input with `model` set, or `null` to leave the call as it is. Task 04 appends a section to ADR-0031.

**Seam:** `route()` as a pure function, and the hook run as a process with JSON on stdin, the way `tests/gates/codex-hook-output.test.js` runs `hooks/fx-codex.js`.

**Risks:**
- The hook fires on every `Agent` call in every session with fx installed. It must not refuse, and must pass the call unchanged if `lib/dispatch-route` fails to load or throws.
- Only general dispatch types are defaulted: no `subagent_type`, `general-purpose`, `claude`, `Plan`. Any other type (fx's lenses, other plugins' agents, `Explore`, `fork`) keeps whatever its own definition pins; the Opus rule still applies to an explicit `model: opus` on any type.
- The routing branch writes JSON to stdout and exits 0. It does not use `deny()`, which writes to stderr and exits 2.
- Skill bodies and generic references name tiers, never Haiku, Sonnet or Opus (`references/harnesses/claude-code.md` says so): model names go only in the harness file and the code.

**Idempotency:** new files are written whole; edits are text replacements; the `check-all` line is added only if absent.

**Testing:** unit tests on `route()` and process tests on the hook in one gate file.

## Acceptance criteria
- [ ] A general dispatch without `model` is rewritten to `model: "sonnet"`, with every other field unchanged.
- [ ] `model: "opus"` without a line matching `^\s*Capable because:` in the prompt is rewritten to `sonnet`; with the line it passes untouched.
- [ ] A typed agent such as `fx:fx-lens-security` without `model` passes untouched.
- [ ] A dispatch that already names `sonnet` or `haiku` passes with no output.
- [ ] The hook prints `{"hookSpecificOutput":{"hookEventName":"PreToolUse","updatedInput":{...}}}` and exits 0 when it rewrites, prints nothing and exits 0 otherwise, for both tool names `Agent` and `Task`.
- [ ] A load failure or throw in `lib/dispatch-route` leaves the call unchanged (code path present, same pattern as `laneCheck`).
- [ ] The four dispatch templates, `model-selection.md`, fx-implement's rounds 4 and 5 and final review, and fx-review's branch mode all tell the writer to put `Capable because: <reason>` as the prompt's first line for the most capable tier.
- [ ] ADR-0031 records the routing rule, why Codex and OpenCode are deferred, and the research anchors from `design.md` §5a.
- [ ] `tests/gates/dispatch-route.test.js` passes and is in `scripts/check-all`.

## Steps

- [ ] **1. Invoke the `fx-tdd` lane.** Invoke `fx-authoring` before the prose edits in step 8.

- [ ] **2. Write the failing test** at `tests/gates/dispatch-route.test.js`:

```js
'use strict';
// The routing hook: a general dispatch with no model runs on the standard
// tier, and the most capable tier needs a written reason. It never refuses.
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..', '..');
const { route } = require(path.join(root, 'lib', 'dispatch-route'));
const hook = path.join(root, 'hooks', 'fx-pretooluse.js');

// route(): pure
assert.deepStrictEqual(
  route({ subagent_type: 'general-purpose', description: 'd', prompt: 'p' }),
  { subagent_type: 'general-purpose', description: 'd', prompt: 'p', model: 'sonnet' },
  'a general dispatch with no model gets the standard tier');
assert.deepStrictEqual(route({ prompt: 'p' }), { prompt: 'p', model: 'sonnet' }, 'no type counts as general');
assert.strictEqual(route({ subagent_type: 'Plan', prompt: 'p' }).model, 'sonnet', 'Plan is general');
assert.strictEqual(route({ subagent_type: 'general-purpose', model: 'haiku', prompt: 'p' }), null, 'a chosen tier stands');
assert.strictEqual(route({ subagent_type: 'general-purpose', model: 'sonnet', prompt: 'p' }), null, 'sonnet stands');
assert.strictEqual(route({ subagent_type: 'general-purpose', model: 'opus', prompt: 'do it' }).model, 'sonnet',
  'opus without a reason runs on the standard tier');
assert.strictEqual(
  route({ subagent_type: 'general-purpose', model: 'opus', prompt: 'Capable because: fix round 4\ndo it' }),
  null, 'opus with a reason stands');
assert.strictEqual(
  route({ subagent_type: 'general-purpose', model: 'opus', prompt: 'task text\n  Capable because: final branch review\n' }),
  null, 'the reason line may sit on any line');
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-security', prompt: 'p' }), null, 'a typed agent keeps its own pin');
assert.strictEqual(route({ subagent_type: 'Explore', prompt: 'p' }), null, 'Explore keeps its own default');
assert.strictEqual(route({ subagent_type: 'fx:fx-lens-security', model: 'opus', prompt: 'p' }).model, 'sonnet',
  'an explicit opus on any type still needs a reason');
assert.strictEqual(route(null), null, 'no input, no change');
assert.strictEqual(route('nonsense'), null, 'a non-object input is left alone');

// the hook, as a process
function run(payload) {
  const r = spawnSync('node', [hook], { input: JSON.stringify(payload), encoding: 'utf8' });
  return { code: r.status, out: r.stdout.trim(), err: r.stderr };
}
const base = { session_id: 's', cwd: root, hook_event_name: 'PreToolUse' };

let r = run({ ...base, tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', description: 'd', prompt: 'p' } });
assert.strictEqual(r.code, 0, `the hook never refuses: ${r.err}`);
const out = JSON.parse(r.out).hookSpecificOutput;
assert.strictEqual(out.hookEventName, 'PreToolUse');
assert.strictEqual(out.permissionDecision, undefined, 'the normal permission flow still applies');
assert.deepStrictEqual(out.updatedInput,
  { subagent_type: 'general-purpose', description: 'd', prompt: 'p', model: 'sonnet' });

r = run({ ...base, tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', model: 'sonnet', prompt: 'p' } });
assert.strictEqual(r.code, 0);
assert.strictEqual(r.out, '', 'a routed call passes with no output');

r = run({ ...base, tool_name: 'Task', tool_input: { prompt: 'p' } });
assert.strictEqual(JSON.parse(r.out).hookSpecificOutput.updatedInput.model, 'sonnet', 'the older tool name is routed too');

r = run({ ...base, tool_name: 'Agent', tool_input: { subagent_type: 'general-purpose', model: 'opus', prompt: 'p' } });
assert.strictEqual(JSON.parse(r.out).hookSpecificOutput.updatedInput.model, 'sonnet', 'the hook applies the opus rule');

console.log('dispatch-route.test.js: OK');
```

- [ ] **3. Run it: verify RED**

Run: `node tests/gates/dispatch-route.test.js`
Expected: FAIL, `Cannot find module '.../lib/dispatch-route'`.

- [ ] **4. Implement `lib/dispatch-route.js`** with `fx-tdd`: export `{ route }`. The general types are exactly `undefined`, `''`, `'general-purpose'`, `'claude'`, `'Plan'`. The reason test is `/^\s*Capable because:/m` on `prompt`. Return a new object (never mutate the input). Add a header comment in the style of `lib/lane-check.js` saying what it returns and why it never refuses.

- [ ] **5. Wire it into `hooks/fx-pretooluse.js`.** Next to the `laneCheck` require, load it fail open: `let route; try { ({ route } = require('../lib/dispatch-route')); } catch { route = () => null; }`. Before the final `process.exit(0)`, add a branch for `tool === 'Agent' || tool === 'Task'`: call `route(ti)` inside a try that maps a throw to `null`; when the result is an object, write `JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', updatedInput: result } })` to stdout and exit 0; otherwise exit 0 with no output. Add one line to the header comment: the routing branch is advice-class and fails open, like the lane check.

- [ ] **6. Run it: verify GREEN**

Run: `node tests/gates/dispatch-route.test.js`
Expected: `dispatch-route.test.js: OK`

- [ ] **7. Add the gate to `scripts/check-all`** after the `fix-loop-shape.test.js` line:

```
run dispatch-route.test.js node tests/gates/dispatch-route.test.js
```

- [ ] **8. Tell dispatch writers how to ask for the most capable tier.**

In `references/vocab/model-selection.md`, after the paragraph ending `Work that qualifies:` list (after `- The final whole-branch review.`), add:

```markdown
Write the reason as its own line in the dispatch prompt, starting
`Capable because:`, for example `Capable because: fix round 4`. On runtimes
that route dispatches, a most-capable dispatch without that line runs on the
standard tier, and a general dispatch that names no model runs on the
standard tier.
```

In `references/harnesses/claude-code.md` §"Model tiers", add after the table:

```markdown
`hooks/fx-pretooluse.js` routes every `Agent` call through `lib/dispatch-route.js`:
a general dispatch (no type, `general-purpose`, `claude`, `Plan`) with no
`model` runs on `sonnet`, and `model: opus` without a `Capable because:` line
in the prompt runs on `sonnet`. It never refuses a call. Codex and opencode
have no equivalent yet (ADR-0031).
```

In each of the four templates (`implementer-prompt.md`, `task-reviewer-prompt.md`, `re-review-prompt.md`, `fx-review/reviewer-prompt.md`), replace the two-line `model:` placeholder with:

```
  model: [MODEL, REQUIRED: default: standard tier. The most capable tier
         only with a first prompt line `Capable because: <reason>` (see
         model-selection.md); without it the dispatch runs on the standard tier.]
```

In `skills/fx-implement/SKILL.md` §"Model selection", replace `The most capable tier needs a one-line reason,\nwritten in the dispatch and in the ledger.` with `The most capable tier needs a one-line reason,\nwritten as the dispatch prompt's \`Capable because:\` line and in the ledger.` In §"The fix loop", `rounds 4 to 5 use\na fresh one on a more capable model.` becomes `rounds 4 to 5 use\na fresh one on a more capable model (\`Capable because: fix round <R>\`).` At the final review, `on the **most capable available model**.` becomes `on the **most capable available model** (\`Capable because: final branch review\`).`

In `skills/fx-implement/fix-loop.md`, wherever rounds 4 and 5 are described as a more capable model, add the same `Capable because: fix round <R>` note once.

In `skills/fx-review/SKILL.md`, where branch mode says `on the most capable available model` (§ around the broad reviewer dispatch), add `, with \`Capable because: final branch review\` as the prompt's first line`.

- [ ] **9. Write ADR-0031** at `docs/adr/0031-defaults-are-held-by-mechanism.md`. H1: `# Defaults are held by mechanism, not prose`. First section, "Model routing": the evidence (720+ subagents on advantage-backend, about half of implementers, fixes and reviews on Opus by explicit choice; the owner asked for routing repeatedly), the rule and the general-type list, why it rewrites instead of refusing (a hook cannot tell fx's dispatches from the user's, so refusing would block the user's own), fail open. Second section, "Codex and OpenCode deferred": neither takes a model per dispatch (a Codex role's `model` overrides the `spawn_agent` argument, `multi_agents_v2/spawn.rs:128-143` at `rust-v0.155.1`; OpenCode's `task` tool has no model argument and a subagent inherits the parent's, `tool/task.ts:43-60,181-184` at `v1.18.25`), so routing there needs tier-pinned roles per runtime; most OpenCode setups run one hosted model. Leave a third heading `## Standing rulings` with the line `Added by task 04.` for task 04 to replace.

- [ ] **10. Run the touched gates**

Run: `node tests/gates/dispatch-route.test.js && node tests/gates/return-contract.test.js && node tests/gates/fix-loop-shape.test.js && node tests/gates/no-runtime-addressing.test.js && scripts/check-tool-names && scripts/check-prose skills/fx-implement/SKILL.md skills/fx-implement/fix-loop.md skills/fx-implement/implementer-prompt.md skills/fx-implement/task-reviewer-prompt.md skills/fx-implement/re-review-prompt.md skills/fx-review/reviewer-prompt.md skills/fx-review/SKILL.md references/vocab/model-selection.md references/harnesses/claude-code.md docs/adr/0031-defaults-are-held-by-mechanism.md`
Expected: all pass.

- [ ] **11. Commit**

```
git add lib/dispatch-route.js hooks/fx-pretooluse.js tests/gates/dispatch-route.test.js scripts/check-all references/vocab/model-selection.md references/harnesses/claude-code.md skills/fx-implement/implementer-prompt.md skills/fx-implement/task-reviewer-prompt.md skills/fx-implement/re-review-prompt.md skills/fx-review/reviewer-prompt.md skills/fx-implement/SKILL.md skills/fx-implement/fix-loop.md skills/fx-review/SKILL.md docs/adr/0031-defaults-are-held-by-mechanism.md
git commit -m "feat(hooks): route Agent dispatches to the standard tier by default"
```
