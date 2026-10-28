# 03: Codex render: ORDER slot and absolute lane paths

**Status:** ready-for-agent
**Blocked by:** None: can start immediately
**Phase:** MVP

**What to build:** the Codex render of the preamble tells the model that reading a lane's `SKILL.md` is how it invokes the lane and is the first file it reads, and names the absolute path of each lane's file under the installed plugin root. Claude Code, opencode and opencode-v2 renders do not change by a byte. This is the wording the spike measured in runs `a3-haiku-1..3` (`research/experiments.md`, Q5), carried from the throwaway patch at `/tmp/claude-1000/fx-codex/spike/fx-a3/lib/preamble.js` and `/tmp/claude-1000/fx-codex/spike/fx-a3/PREAMBLE.md` into the TypeScript source.

**Design:** Implementation Decisions; Testing Decisions; Global Constraints

**Files:**
- Modify: `PREAMBLE.md`
- Modify: `src/lib/preamble.ts` and `lib/preamble.js`
- Modify: `src/lib/preamble.test.ts` and `lib/preamble.test.js`
- Modify: `src/lib/preamble-equivalence.test.ts` and `lib/preamble-equivalence.test.js`
- Modify (re-recorded): `tests/gates/fixtures/plan-state/expected/render-codex-session.txt`, `tests/gates/fixtures/plan-state/expected/render-codex-subagent.txt`
- Modify (re-recorded): the `tests/gates/fixtures/hook-golden/codex-*.expected.txt` files whose content holds the preamble (at least `codex-session-start`, `codex-subagent-start`, and any other `codex-*` case `--record` changes)

**Exact text.**
- `PREAMBLE.md`: the two lines `MUST invoke it with {{SKILL_TOOL}} **before any response**, including before` / `a clarifying question and before reading a single file.` become the one line `MUST invoke it with {{SKILL_TOOL}} **before any response**, {{ORDER}}`.
- `Addressing` gains `order: string`. For `claude-code`, `opencode` and `opencode-v2`: `'including before\na clarifying question and before reading a single file.'` (this restores their bytes exactly).
- `codex.order`: `'including before\na clarifying question. That `SKILL.md` is the first file you read, before any\nfile in the repository.'` (backticks around SKILL.md are literal).
- `codex.skillTool`: `'your shell, by reading the lane\'s `SKILL.md` in full'`.
- `codex.resolution`: built at module load from the plugin root `ROOT = path.resolve(__dirname, '..')`: ``'Each lane\'s file is `' + path.join(ROOT, 'skills') + '/<lane>/SKILL.md`, for example `' + path.join(ROOT, 'skills', 'fx-brainstorm', 'SKILL.md') + '`. The user types a lane as `$fx:fx-tdd`; you read its file'`` (the template adds the closing period).
- `render()` substitutes `{{ORDER}}` with a function replacement, like the other slots.
- Update the WHY comment at the top of `src/lib/preamble.ts`: the ordering clause is now a per-runtime slot (ADR 0065, written in task 06), nothing goes above the imperative, and the first line is unchanged.

**Fixture normalisation.** The Codex render now holds an absolute path, so `src/lib/preamble-equivalence.test.ts` replaces the plugin root (both `path.resolve(__dirname, '..')` and its `fs.realpathSync`) with `<root>` before comparing and before `--record` writes, the way `src/tests/gates/hook-output-golden.test.ts` `normalise` already does. Non-Codex renders contain no root path, so normalising leaves them unchanged.

**Interfaces:**
- Produces: `render({ harness: 'codex' })` text as above. `laneAddress` and `HARNESSES` unchanged.

**Seam:** `preamble.render`, the existing seam in `preamble.test.ts` (design Testing Decisions, seam 2).

**Tests:**
- Non-Codex byte identity: `node lib/preamble-equivalence.test.js` passes with `render-claude-code-*`, `render-opencode-*` and `render-opencode-v2-*` fixtures unchanged. `git diff --stat -- tests/gates/fixtures/plan-state/expected` after re-recording lists only the two `render-codex-*` files, and `git diff --stat -- tests/gates/fixtures/hook-golden` lists only `codex-*` files.
- Codex ordering: `render({ harness: 'codex' })` does not contain `before reading a single file`, and contains `That \`SKILL.md\` is the first file you read, before any\nfile in the repository.`
- Codex path: the first match of ``/`([^`]*\/skills\/fx-brainstorm\/SKILL\.md)`/`` in the Codex render is an absolute path (`path.isAbsolute` true) and `fs.existsSync` is true for it.
- Codex keeps the user syntax: the render contains `` `$fx:fx-tdd` `` and contains `The user types a lane as`.
- Codex is told to read: the render matches `/by reading the lane's `SKILL\.md` in full/` (replace the assertion at the old `/read the lane's `SKILL\.md` in full/`). The existing `!/Never\s+`?Read`?.../` check stays.
- First line: for every harness in `HARNESSES`, the render's first line is `# fx`.
- No unrendered slot: no render for any harness contains `{{`.
- Existing grammar checks (doubled punctuation, lower-case after the bold lead) keep passing for every harness.

**Risks:** a missing `\n` in an `order` value shifts every Claude Code byte; the equivalence fixtures catch it. Do not re-record non-Codex fixtures to make a test pass.

**Testing:** unit (`preamble.test.js`), golden (`preamble-equivalence.test.js`, `tests/gates/hook-output-golden.test.js`).

## Acceptance criteria
- [ ] Every Tests entry passes.
- [ ] Only Codex fixtures changed; the diff of each shows the new ordering line and resolution and nothing else.
- [ ] `scripts/check-generated`, `scripts/check-types`, `scripts/check-prose`, `node tests/gates/no-runtime-addressing.test.js` and `node tests/gates/codex-hook-output.test.js` pass.

## Steps

- [ ] **1. Invoke `fx-tdd`**

- [ ] **2. Write each test the Tests field names** in `src/lib/preamble.test.ts`, and add the normalisation to `src/lib/preamble-equivalence.test.ts`

- [ ] **3. Run them: verify RED**

Run: `scripts/build`, then `node lib/preamble.test.js`, each prefixed by the scratch-env line from Global Constraints.
Expected: the Codex ordering and path assertions fail.

- [ ] **4. Implement the minimum that passes** (`PREAMBLE.md`, `src/lib/preamble.ts`)

- [ ] **5. Run them: verify GREEN**

- [ ] **6. Re-record the Codex fixtures**: `node lib/preamble-equivalence.test.js --record` and `node tests/gates/hook-output-golden.test.js --record`, then confirm with `git diff --stat` that only Codex fixtures moved, then run both without `--record`.

- [ ] **7. Run the scope**: `scripts/check-generated`, `scripts/check-types`, `scripts/check-prose`, `node lib/preamble.test.js`, `node lib/preamble-equivalence.test.js`, `node tests/gates/hook-output-golden.test.js`, `node tests/gates/codex-hook-output.test.js`, `node tests/gates/no-runtime-addressing.test.js`

- [ ] **8. Commit by path**

```
git add PREAMBLE.md src/lib/preamble.ts lib/preamble.js src/lib/preamble.test.ts lib/preamble.test.js src/lib/preamble-equivalence.test.ts lib/preamble-equivalence.test.js tests/gates/fixtures/plan-state/expected/render-codex-session.txt tests/gates/fixtures/plan-state/expected/render-codex-subagent.txt
git add <each re-recorded tests/gates/fixtures/hook-golden/codex-*.expected.txt, by name>
git commit -m "feat(preamble): render the Codex ordering clause and absolute lane paths"
```
