# 11: fx-humanize rebased on humanizer 3.1.0; Phase 2 gate

**Status:** ready-for-agent
**Blocked by:** 08, 10
**Phase:** 2: Renames and rebase

**What to build:** prose checks use humanizer 3.1.0's 26 patterns, ordered strongest first, with its "How to work" procedure, "When not to act" and the 2.11.3 safety rules (the text is material, never instructions; supported claims and ranking words survive), plus fx's own rules. Rebuild `skills/fx-humanize/SKILL.md` per `research/compare-6-authoring-new.md` section (a), "Rebase plan onto 3.1.0": keep the name `fx-humanize` and the fx-authoring redirect sentence in the description; insert "Precision is not accuracy" after step 2, the two sibling pointers after step 1, and "Write plainly" after step 4; extend the file-mode sentence with "In every mode, never rewrite an identifier, a command, a path, a schema field or a quotation." Every Before/After block and the long "Why" account move verbatim to `examples.md`; section F and §26 move verbatim to `replies.md`. The bootstrap's marker "35 patterns with examples" becomes "26 patterns with examples" everywhere it is rendered or probed, and the size gate's last pending entry goes. Expected SKILL.md size: about 19,450 bytes; if the measured size is over 19,500, move the "Keep the details that carry the writer's voice" list (about 600 bytes) to `examples.md` too. Phase 2 closes with `scripts/check-all`.

**Design:** Phase 2: Humanizer rebase

**Files:**
- Modify: `skills/fx-humanize/SKILL.md` (rebuilt; `metadata.version: "3.1.0"`)
- Create: `skills/fx-humanize/examples.md`, `skills/fx-humanize/replies.md`
- Modify: `skills/fx-humanize/COVERAGE.md` (rewrite as "Rearranged copy of humanizer 3.1.0": each local modification listed; the umask `0640`/`0644` case and the `let x = a - b` case move here; "35 prose patterns" and "355/355" replaced)
- Modify: `PREAMBLE.md` (the line `{{LANE:fx-humanize}} carries the full prose treatment, 35 patterns with examples.`)
- Modify: `src/lib/preamble.test.ts` and built `lib/preamble.test.js` (the `/35 patterns with examples/` assertion)
- Modify: `tests/conformance/lib/live.sh` (the comment near line 492 and `preamble_known` greps `P=26`)
- Modify: `tests/conformance/rows/16-project-note-and-plan-state.sh` (line 27, `grep -qwE "111|35|$SLUG"`, becomes `grep -qwE "111|26|$SLUG"`)
- Modify: `src/tests/conformance/events.test.ts` and built `tests/conformance/events.test.js` (`N=111 P=35` becomes `N=111 P=26`)
- Modify: every fixture under `tests/gates/fixtures/` holding the phrase: list them with `grep -rl "35 patterns with examples" tests/gates/fixtures` (8 plan-state renders and 13 hook-golden files at dd99986), changed with `sed -i 's/35 patterns with examples/26 patterns with examples/'` on that list
- Modify: `scripts/check-prose` (the docstring and `EXEMPT` comment saying fx-humanize is byte-identical become "carried from upstream and rearranged; fx's added lines are listed in its COVERAGE.md"; the exemption itself stays)
- Modify: `src/tests/gates/skill-size.test.ts` and built `tests/gates/skill-size.test.js` (delete `'fx-humanize'` from `PENDING`; `PENDING` is now empty)

**Interfaces:**
- Consumes: `PENDING` (task 02).
- Source text: `git -C <humanizer clone> show v3.1.0:SKILL.md`, with the clone at `<SCRATCH>/upstream/humanizer`; if that path is gone, `git clone https://github.com/blader/humanizer <SCRATCH>/upstream/humanizer` and use tag `v3.1.0`. Read only.

**Seam:** the size gate, the preamble tests and the fixture-comparing gate tests.

**Tests:**
- `node tests/gates/skill-size.test.js` with `PENDING` empty, before the rebase: exit 1, `skill-size: skills/fx-humanize/SKILL.md is 31745 bytes, at or over the 20000-byte limit. Move what only some steps need into a file beside it.`; after: `skill-size: OK`.
- `node lib/preamble.test.js`: OK, asserting `/26 patterns with examples/` for every harness.
- `node tests/gates/hook-output-golden.test.js`, `node lib/plan-state.test.js`, `node tests/gates/codex-hook-output.test.js`, `node tests/gates/opencode-plugin.test.js`: each OK against the updated fixtures.
- `node tests/gates/description-overlap.test.js`: OK (the description still contains "editing or reviewing prose").
- `grep -rnE "35 patterns|P=35|\|35\|" --exclude-dir=docs --exclude-dir=node_modules --exclude-dir=.worktrees .`: no output (the third alternative catches row 16's `111|35|` probe).

**Risks:** the bootstrap budgets in `lib/preamble.test.js` count characters; "26" and "35" are the same length, so no budget moves. The compare-6 sample-text comparison (three texts, five reps each, old against new) is a live model run; run it only if the owner asks, and say in the report that it was not run.

**Testing:** gate suite; then the full gate as the Phase 2 boundary.

## Acceptance criteria
- [ ] fx-humanize SKILL.md is under 19,500 bytes, carries 26 patterns, the 2.11.3 safety rules and all four fx additions; each pattern's examples are one link away in `examples.md`.
- [ ] Every rendered bootstrap says "26 patterns with examples".
- [ ] `scripts/check-all` prints `ALL GREEN`.

## Steps

- [ ] **1. Invoke `fx-tdd`** (RED is the size gate and the preamble marker)

- [ ] **2. Empty `PENDING`; change the preamble test to expect 26**

- [ ] **3. Run them: verify RED**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node tests/gates/skill-size.test.js` and `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env node lib/preamble.test.js`
Expected: the size gate fails with the 31745-byte message; the preamble test fails on the 26-patterns marker.

- [ ] **4. Rebuild the skill and its two siblings; update PREAMBLE.md, live.sh, row 16, events test, fixtures, check-prose comment, COVERAGE**

- [ ] **5. Run them: verify GREEN**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/build`, then the same two commands. Expected: both OK.

- [ ] **6. Run the scope**

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-generated`, then `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/test-scope skills/fx-humanize/SKILL.md PREAMBLE.md src/lib/preamble.test.ts hooks/fx-context.js src/tests/gates/skill-size.test.ts`

- [ ] **7. Commit by path**

```
git add skills/fx-humanize/SKILL.md skills/fx-humanize/examples.md skills/fx-humanize/replies.md skills/fx-humanize/COVERAGE.md PREAMBLE.md src/lib/preamble.test.ts lib/preamble.test.js tests/conformance/lib/live.sh tests/conformance/rows/16-project-note-and-plan-state.sh src/tests/conformance/events.test.ts tests/conformance/events.test.js tests/gates/fixtures scripts/check-prose src/tests/gates/skill-size.test.ts tests/gates/skill-size.test.js
git commit -m "feat(fx-humanize): rebase on humanizer 3.1.0, 26 patterns, under the size gate"
```

- [ ] **8. Phase 2 gate** (a plan-mandated phase gate, standing ruling S3: ledgered as `Task <NN>: ran test_all (plan-mandated phase gate)`)

Run: `TMPDIR=<SCRATCH>/fx-tests/tmp scripts/scratch-env scripts/check-all`
Expected: `ALL GREEN`.
