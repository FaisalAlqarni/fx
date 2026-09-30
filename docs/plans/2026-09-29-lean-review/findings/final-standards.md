Standards review of `68ba929..ee13f92`: no hard breach of a documented code standard. Two hard-ish conflicts with ADRs and two ADR-form nits. The rest is baseline smells. I did not read the skill/agent markdown hunks, the `docs/plans/2026-09-29-lean-review/` findings and ledger files, or `review-content.test.js` line by line. The 12 new dashes or attribution-trailer checks came back clean on grep.

**Documented-standard breaches**

- [Important] `lib/preamble.js` `companions()` and ADR-0032 hard-code `ponytail` and `caveman` in the shared preamble. ADR-0006 says cross-references between skills are pointers, never invocations. ADR-0006 also declined a mandatory `fx-humanize` call for coupling reasons. AGENTS.md says fx "operates independently of ponytail". The line is conditional ("skip silently any it lacks"), so it is arguably a pointer. But ADR-0032 never mentions ADR-0006, and the default names the owner's personal tools. That is a hard conflict to reconcile in the ADR, or the default should be off with `.fx.json` opt-in.
- [Important] ADR-0031 bundles two unrelated decisions (dispatch model routing and standing rulings). The ADR-per-feature memory says every decision gets its own record. Split it, or at least retitle it. Its title names only "defaults", and "Codex and OpenCode deferred" sits as a third section.
- [Minor] ADR-0032, ADR-0033 and ADR-0034 put `### Context` directly under the `#` title and skip `##`. ADR-0029 and ADR-0030 use `##`. Existing ADRs such as 0001 and 0022 are prose with a `## Consequences` section.
- [Minor] ADR-0032 has a filename/title mismatch: the file is `the-preamble-carries-a-companion-tools-line`, the H1 says "a conditional companion-tools line".
- [Minor] ADR-0012's added sentence and the ADR-0029 and ADR-0030 bodies are not hard-wrapped. Existing ADRs such as 0020 wrap near 80 columns.
- [Minor] ADR-0034 is time-bound. It says "(this task)" and "task 07 (commit 7634883)". The comment at the top of `tests/gates/lens-content.test.js` says "Task 09 adds...". Those refs rot and ADRs are meant to be timeless. The test `// ---- standing rulings: fix round 1 ----` in `lib/plan-state.test.js` is history-named too.

**Baseline smells (judgement calls)**

- [Minor] Primitive Obsession in `lib/plan-state.js` `standingRulings()`. It returns one string array that mixes rulings, an overflow line and read-failure notes. The only way to tell them apart is the missing `Ruling:` prefix, as the comment "Trailing entries without `Ruling:` are notes" admits. Return `{ rulings, notes }` instead.
- [Minor] Mysterious Name / density in `asRuling`. `raw.trim().replace(/^[-*]\s+/, '').replace(/^\*\*Ruling:\*\*/, '**Ruling:').replace(/^\*\*/, '')...` is a five-step regex chain whose intent is hard to read.
- [Minor] Duplicated Code in `hooks/fx-pretooluse.js`. `process.stderr.write(\`[fx] dispatch routing off: ${e.message}\n\`)` appears in both the module-load catch and the per-call catch. One small helper would do.
- [Minor] Speculative Generality / Divergent Change in `lib/preamble.js` `companions()`. It does file read, parse, validation, default composition and a user-facing warning in one function. The `.fx.json` override and the `unread` warning text are extra surface for a line used by one owner.
- [Minor] Duplicated Code in `tests/gates/tripwire-table.test.js`, `fix-loop-shape.test.js`, `lens-content.test.js` and `review-content.test.js`. Each repeats the `read = ... replace(/\s+/g, ' ')` helper, and each pins exact prose. Extract a shared helper only if more gates are expected.
- [Minor] Fragile test in `lib/plan-state.test.js`: it monkey-patches `path.relative` to force a throw. It restores it in `finally`, but it couples the test to the internals of `readText`.
