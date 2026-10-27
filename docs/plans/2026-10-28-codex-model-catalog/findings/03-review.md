### Spec Compliance

- ✅ Spec compliant. File by file against the brief: PREAMBLE.md has the single `{{ORDER}}` line; src/lib/preamble.ts and lib/preamble.js add `order` to `Addressing`, the three non-Codex values equal `ORDER_DEFAULT` (the old bytes, with the `\n`), Codex `order`, `skillTool` and `resolution` match the brief strings, `render()` substitutes `{{ORDER}}` with a function replacement; both test files and both `.js` twins are touched; the equivalence test normalises `fs.realpathSync(ROOT)` and `ROOT` to `<root>`; the two plan-state `render-codex-*` fixtures and four `hook-golden/codex-*` fixtures changed and nothing non-Codex did (diff stat in the package lists no other fixture).
- Ruling check: the bootstrap budget ruling (3,400 to 3,700) is applied at src/lib/preamble.test.ts (assert and comment), as the ruling states. The new `expected` fixture lines show only the ordering line, the `skillTool` wording and the resolution clause, with `<root>` paths; no other lines moved.
- ⚠️ Cannot verify from diff: the diff elides unchanged context, so `scripts/check-generated`, `check-types`, `no-runtime-addressing` and `codex-hook-output` results rest on the report only. Report says `scripts/check-prose` fails on a dash in `docs/plans/2026-10-28-codex-model-catalog/findings/01-review.md:27`, a file outside this task. The controller should fix that file and re-run check-prose.
- I ran nothing; no document with commands is in the diff.

### Strengths

- Non-Codex byte identity is protected twice: shared `ORDER_DEFAULT` constant (src/lib/preamble.ts) and untouched non-Codex fixtures. The test also asserts the exact old clause per non-Codex harness.
- The path assertion checks `path.isAbsolute` and `fs.existsSync` on the extracted path, which verifies real behaviour and not a copied string.
- Root normalisation is applied before both compare and `--record`, so a fixture never captures a machine path.
- `{{` leak check and first-line check run for every harness in `HARNESSES`.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

- src/lib/preamble.test.ts (new block after `console.log('preamble.test.js: OK')`) · the new Codex ordering and path assertions run after the "OK" line is printed, so a failure there prints OK first and then throws. Move the block above the OK line.
- src/lib/preamble.test.ts (budget assert) · the 3,700 cap now applies to all four harnesses, loosening the guard for Claude Code, opencode and opencode-v2, whose renders did not grow. Per-harness cap (3,400 non-Codex, 3,700 Codex) keeps the original guard.
- Report TDD evidence · the RED run stopped at the first failed assertion, so the new ordering and path assertions were never seen failing before the change (the brief expected them to fail in RED). They would fail against the old text by inspection (`before reading a single file` was present), so this is a process gap, not a correctness gap.
- src/lib/preamble.ts (Codex `resolution`) · the path is built at module load from `__dirname`, so it is correct for the installed root, but the 3,700 cap has little margin for a long install path (the report says so). Consider a note in the test that the cap assumes a short checkout path.

### Assessment

**Task quality:** Approved
**Reasoning:** The change matches the brief's exact text, keeps non-Codex output byte-identical, and the tests check rendered text and a real file on disk. Remaining points are test ordering, test-cap scope and RED evidence.

## Ledger lines

Task 03: minor (deferred): new Codex ordering and path assertions sit after the preamble.test.js OK log line; move above it.
Task 03: minor (deferred): the 3,700 bootstrap cap now loosens the guard for non-Codex harnesses; make it per harness.
Task 03: minor (deferred): RED run stopped at the first failing assertion, so the new ordering and path assertions were never seen failing.
Task 03: minor (deferred): Codex bootstrap cap has little margin for a long install path; note the assumption in the test.
