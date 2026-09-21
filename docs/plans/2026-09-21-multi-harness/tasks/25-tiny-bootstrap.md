# 25: A tiny bootstrap, with routing in the descriptions

**Status:** ready-for-agent
**Blocked by:** 24 (whose commit removed the split machinery this task keeps)
**Phase:** Amendment 2

**What to build:** fx's always-on text becomes a bootstrap of about 2.5KB, on
the superpowers model. It makes the model invoke the right lane. It no longer
carries the rules. Every rule the router preamble held moves to the lane that
applies it, and nothing is lost. Lane routing is carried by sharpened skill
descriptions, the native mechanism on Claude Code, Codex and opencode. Design
amendment 2, decisions B1 to B5.

The spike measured this design (`research/bootstrap-spike.md`). Variant S3
routed:
- Claude Code: 9 of 9 lane prompts, and row 04 5 of 5;
- opencode: 9 of 9 lane prompts, and row 04 at least 7 of 7.

It beat the best router cut (Y, row 04 8 of 10 on opencode). The same
bootstrap without description changes scored 2 of 5, so the descriptions do
the work.

**Prior art:** superpowers' `skills/using-superpowers/SKILL.md` (3.1KB) plus
native skill descriptions. caveman's pointer-only `AGENTS.md`. ponytail's
per-mode emission filter. See `research/prior-art-multi-harness.md`. Copy the
superpowers shape. Do not copy its `<SUBAGENT-STOP>` opt-out, because fx's
rules must reach subagents (ADR 0002).

**Inputs, in the plan directory:**
- `bootstrap-candidate/PREAMBLE.S3.md`: the measured bootstrap, used verbatim.
- `bootstrap-candidate/fx-tdd.description.diff`, `fx-brainstorm.description.diff`
  and `fx-humanize.description.diff`: the measured description changes, used
  verbatim.
- The pre-trim preamble, `git show d7aae89:PREAMBLE.md`, and the current one at
  HEAD. These are the source of every rule that must move.
- `preamble-trim-proposal.md`, section 4: moves already mapped and applied by
  task 24. Reuse those destinations.

**Files:**
- Modify: `PREAMBLE.md`, replaced by the S3 bootstrap
- Modify: `skills/*/SKILL.md` descriptions (the three measured diffs, plus any
  disambiguating clause the overlap audit requires) and bodies (the moved
  rules)
- Modify or create: `references/vocab/*.md`, for any moved rule that more than
  one lane cites
- Create: `docs/plans/2026-09-21-multi-harness/bootstrap-no-loss-audit.md`
- Create: `docs/adr/00NN-the-bootstrap-invokes-lanes-the-lanes-carry-rules.md`,
  partly superseding ADR 0002 (B4). Use the next free ADR number
- Modify: `lib/preamble.test.js`
- Create: `tests/gates/description-overlap.test.js`, and register it in
  `scripts/check-all`
- Modify: `design.md` and `plan.md`, the global constraint wording from B5
- Modify: generated files whose sources change. Regenerate them, and
  `scripts/check-generated` must pass

**Interfaces:**
- Produces: `render({ harness, cwd })` returns the bootstrap, repo.md note and
  plan-state block. It is under 4,000 characters in the worst-case fixture on
  every harness.
- Produces: `bootstrap-no-loss-audit.md` has one row per sentence or table row
  of the pre-trim preamble. Each row gives the new home (file and heading), or
  "kept in bootstrap", with the reason.
- Produces: `description-overlap.test.js` fails when two skill descriptions
  share a trigger phrase and neither description names the other lane.

**Seam:** unit tests for size, content and overlap. Live rows 01, 02, 04 and 16,
plus the lane-triggering prompts, on Claude Code and opencode.

**Risks:**
- HIGH: a rule moved to a lane that does not load it when it matters. The no-loss
  audit names, for each moved rule, the lane that loads it at that moment. The
  reviewer checks every row.
- HIGH: rules that must hold with no lane loaded, such as "no attribution
  trailers in commits". The guard enforces that one, and it was also a
  non-negotiable. Keep each such rule in the bootstrap only if a lane cannot
  carry it, and name why.
- MEDIUM: quota. Claude Code's session limit was hit repeatedly. On exhaustion,
  report `GAP: not run`, never a pass. Codex is task 22 part B.

**Idempotency:** file edits and generators. The tests are deterministic.

**Testing:** unit and gate tests, then the live gate below.

## Acceptance criteria
- [ ] `PREAMBLE.md` equals `bootstrap-candidate/PREAMBLE.S3.md`, except for edits the audit justifies
- [ ] The three measured description diffs are applied, and the overlap audit's further clauses are added
- [ ] `description-overlap.test.js` passes, and it fails when the fx-tdd clause naming fx-brainstorm is removed
- [ ] The no-loss audit maps every sentence and table row of the pre-trim preamble, and nothing is unmapped
- [ ] The worst-case render is under 4,000 characters on all three harnesses, and a test pins it
- [ ] The intro is the only text above the imperative, and a test pins it
- [ ] The new ADR records B4 and cites the spike
- [ ] Live on Claude Code: rows 01, 02 and 16 PASS, row 04 passes 5 of 5, and the lane-triggering prompts hit at least as often as S3 did
- [ ] Live on opencode: rows 01, 02 and 16 PASS, row 04 passes at least 8 of 10, and the lane-triggering prompts hit at least as often as S3 did
- [ ] `HOME="$(mktemp -d)" scripts/check-all` is ALL GREEN

## Steps

- [ ] **1. Write the failing tests.** Add the size, intro-position and marker assertions to `lib/preamble.test.js`, and write the overlap gate. Watch them fail against HEAD.
- [ ] **2. Build the no-loss audit first.** Map every rule to its destination before moving anything.
- [ ] **3. Apply.** Put in the bootstrap and the description diffs, then move each rule per the audit, and write the ADR. No code of your own beyond what the audit requires.
- [ ] **4. GREEN.** Run the unit tests, `scripts/check-generated` and the full gate.
- [ ] **5. Live gate.** Run it from the worktree, launched as tracked background commands, with `HOME="$(mktemp -d)" FX_REAL_HOME=<real home>`.
- [ ] **6. Commit by path.** No attribution trailers. Then continue to the next task: never stop and wait.
