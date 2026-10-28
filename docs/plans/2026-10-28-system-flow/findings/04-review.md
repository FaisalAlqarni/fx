# Task 04 review

### Spec Compliance
- ✅ Spec compliant. Rulings 4, 5, 6 and 7 hold: one-pass Mermaid escape (src/lib/sf-markdown.ts:19-20), table test splits on unescaped pipes (system-flow-build.test.ts, table-cell block), b2 carries only verified.guide via planStamps (src/lib/sf-model.ts), `& < >` escaped in prose and cells with a `<script>` test.
- ⚠️ Cannot verify from diff: I read the diff and did not run the tests; "second build changes no byte" rests on the test reading.

### Strengths
- Stamp order is right: check in build mode, stamps applied in memory, Markdown, README and model written, `stampVerified` last (src/lib/sf-build.ts:93-96); a throw from any write skips it. `planStamps` and `stampVerified` both refuse to overwrite an existing value, so reruns are byte-stable.
- docs-index change is small. `Stale['reason']` is only a type union; no caller switches on reason, so adding `other-root` breaks nobody. Mixed claims are judged on host paths.
- `check` and `build` share `checkModel`, no duplicated pipeline.

### Issues
#### Critical (Must Fix)
None.
#### Important (Should Fix)
- TDD: the build test was written after the code (report admits it). The retroactive RED ran against the old CLI and only proves the first assertion (`build exits 0`, got 2). The escape, stamp-order, collision and marker assertions were never seen failing. Process violation of the fx-tdd lane; accept only with that noted, or have the escape and stamp-last assertions mutation-checked once (for example drop the `html` call, swap stamp before write) and show them failing.
#### Minor (Nice to Have)
- src/lib/sf-model.ts `stampVerified`: writes fragment files one by one; a failure on the second leaves the first stamped. Rare, but "fragments change only on success" is not atomic.
- src/lib/sf-markdown.ts:9-15: prose escapes only `& < >`; backticks, `[`, leading `#` or `- ` in model text can still alter Markdown structure. Ruling 7 only asks for HTML, so within spec.
- src/lib/sf-markdown.ts sequenceBlock: participant ids and message from/to go into Mermaid unescaped; safe only because ids match `^[a-z0-9][a-z0-9-]*$`; an id such as `end` would still break Mermaid.
- src/lib/doc-index.ts: any host path starting with `@` (for example `@types/...`) is now skipped as other-root.
- rules-in-force.md and coverage.md not produced (design lists them; this task's file list does not).

### Assessment
**Task quality:** Approved
**Reasoning:** Behavior, escaping, stamp-last ordering and the docs-index change are correct and well covered by process tests; the only substantive gap is the after-the-fact test, which weakens evidence but not the code.

## Ledger
Task 04: minor (deferred): stampVerified writes fragments one by one, not atomically.
Task 04: minor (deferred): prose escapes only ampersand, angle brackets; backticks and leading list or heading markers pass through.
Task 04: minor (deferred): Mermaid participant ids and from/to are unescaped, an id like end would break the diagram.
Task 04: minor (deferred): docs-index skips any host path starting with at-sign as other-root.
Task 04: minor (deferred): rules-in-force.md and coverage.md are not generated yet.
