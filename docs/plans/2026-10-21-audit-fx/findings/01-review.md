### Spec Compliance

- ✅ Spec compliant file by file: hook, build-cost, build-cost.test.js, SKILL.md, both gates, check-all, ADR 0040, four version fields all have hunks. Every acceptance bullet maps to a hunk (dispatch line in §1, cost step in §5, 0/i flag in §3, resume rule in §4, review cap in concurrency, two-redispatch cap in §2).
- ✅ Ledger rulings checked: regex `task:? <NN>` (scripts/build-cost taskLine), `.fx/transcript-path` ignore check (hooks/fx-context.js recordTranscriptPath), Ruling B behaviour (tests/gates/transcript-path.test.js cases c and d), versions 0.2.7 x4. All honoured; no violated ruling.
- ⚠️ Cannot verify from diff: release-version gate, preamble < 3,000 chars, review bench and lane-triggering counts, conformance. I ran only the two new gates: both print OK. No em/en dashes in added lines (grepped the diff).

### Strengths

- Test values match the contract exactly (700 tokens, 10 min, 2 dispatches, 1/1); the two unavailable forms are asserted verbatim.
- Hook swallows all failures in try/catch and emits the preamble regardless; recording is gated on `hook_event_name === 'SessionStart'`.
- Whole-build path untouched: the `--task` branch returns before `--json` parsing.
- ADR 0040 states the unit/fx-tdd extension and the three pipeline findings as required.

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

- skills/fx-implement/SKILL.md (§3 hunk "When the task's ledger cost line (step 5) shows `fx-tdd 0/<i>`") vs §5 (cost line appended after the review is clean) · the signal is read before it exists. The task reviewer is dispatched in §3; the cost line is produced in §5 after review. The controller can never pass `fx-tdd 0/<i>` on the first review, so the Important-finding rule never fires. Plan-mandated: the task file places both sentences this way. Fix: compute the cost line before dispatching the reviewer and reuse it in §5. Human decides.

#### Minor (Nice to Have)

- hooks/fx-context.js recordTranscriptPath · `spawnSync('git', ..., {timeout: 2000})` runs synchronously before the preamble on every SessionStart; a hung git delays it up to 2 s, against the task's "must never delay" risk. Typical cost is milliseconds. Consider an fs-only `.git` ancestor check.
- scripts/build-cost taskLine · `Math.max(...timestamps(records))` is -Infinity with no timestamps, printing a nonsense minutes value; invalid `--since` exits 2 (outside "always exits 0").
- tests/gates/ledger-lines.test.js · assertions are substring checks over flattened lane text; they pin wording, not that each rule sits in the section the task names.

### Assessment

**Task quality:** Approved
**Reasoning:** Every acceptance criterion and ledger ruling is met, with one plan-mandated ordering defect (cost line needed in §3 but produced in §5) that needs an owner decision.

## Ledger lines

Task 01: minor (deferred): hook runs git synchronously (2 s timeout) before the preamble; consider an fs-only .git check.
Task 01: minor (deferred): taskLine prints a nonsense minutes value when the controller file has no timestamps; invalid --since exits 2.
Task 01: minor (deferred): ledger-lines gate pins wording by substring, not section placement.
