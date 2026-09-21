# 24: The preamble fits one hook

**Status:** ready-for-agent
**Blocked by:** 15, 23 (23 only because both use the single-slot local model live)
**Phase:** Amendment

**What to build:** On every runtime, and in every session and subagent, the
fx preamble arrives as one piece of under 9,000 characters with the opening
imperative first. Task 21 measured that Claude Code runs the two preamble
hooks in unstable order. Part 2 landed above part 1 in 3 of 7 sessions and in
2 of 2 subagents, which breaks "nothing above the opening imperative" (PD3).

The user approved the trim proposal as written:
`docs/plans/2026-09-21-multi-harness/preamble-trim-proposal.md`. **It is your
requirements.** Section 6 is the exact new `PREAMBLE.md` and the exact changes
to each destination file. Section 7 is the exact constraint wording. Apply them
verbatim. If something cannot be applied as written, stop and report it. Do
not improvise a different cut.

**Prior art:** ponytail keeps its always-on text to one 6.6KB file and filters
it per mode at emission time. caveman keeps a 7.1KB file, and its AGENTS.md
holds only pointers to skills that load on demand. This task copies caveman's
move-to-the-lane pattern. Ponytail's filtering saves little here, as proposal
section 3 measured. See `research/prior-art-multi-harness.md`.

**Files:**
- Modify: `PREAMBLE.md`
- Modify: the destination skill and reference files named in proposal section
  4, which are at least `skills/fx-tdd/SKILL.md`,
  `skills/fx-humanize/SKILL.md` and `skills/fx-debug/SKILL.md`
- Modify: `lib/plan-state.js`, the shortened block from proposal section 5
- Modify: `lib/preamble.test.js`, the two assertions the proposal names
- Modify: `lib/preamble.js`, `hooks/fx-context.js` and `hooks/hooks.json`.
  These go back to one context handler per event on Claude Code. The
  `renderParts` split machinery becomes dead code: delete it, and keep a test
  that the single render is under 9,000 characters with plan state at its
  worst measured size
- Modify: `docs/plans/2026-09-21-multi-harness/design.md` and `plan.md`, the
  global constraint only, with section 7's wording
- Modify: any generated file whose source changed. Regenerate with its
  generator, and `scripts/check-generated` must pass

**Interfaces:**
- Produces: `render({ harness, cwd })` returns fewer than 9,000 characters for
  every harness, with `repo.md` present and three plans with ledgers
- Produces: `hooks/hooks.json` has one `fx-context.js` handler on SessionStart
  and one on SubagentStart
- Removes: `renderParts`, `partForHandler` and `--part`. Check nothing else
  calls them before deleting

**Seam:** `lib/preamble.test.js` for size and content, and live rows 01, 02,
04 and 16.

**Risks:**
- HIGH: lanes stop firing because the rationalizations table is shorter. Live
  row 04 is the proof: run it five times per runtime and report every result.
  A drop from the previous row 04 pass rate is a FAIL to report, not a PASS.
- MEDIUM: a moved block lands in a lane that does not load it when it is
  needed. The proposal names the lane for each move. Check each destination is
  read at that moment.
- MEDIUM: quota. Claude Code's session limit was hit repeatedly, and Codex's
  quota is exhausted until 2026-10-21. Codex live rows are task 22's. On quota
  exhaustion, report `GAP: not run`, never a pass.

**Idempotency:** file edits. The test is deterministic.

**Testing:** unit tests, the free gate, then live rows 01, 02 and 16 on Claude
Code and opencode, and row 04 five times on each.

## Acceptance criteria
- [ ] `PREAMBLE.md` matches proposal section 6 exactly, and every moved block is in its named destination
- [ ] `render()` is under 9,000 characters for all three harnesses in the proposal's worst case, and a test pins it
- [ ] Claude Code has one context handler per event, and the split machinery is gone
- [ ] The opening imperative is the first section of the render on every harness, and a test pins it
- [ ] `fx:fx-humanize` on the old line 195 renders through the placeholder, so opencode and Codex get their own addressing
- [ ] The global constraint in `design.md` and `plan.md` reads as proposal section 7 wrote it
- [ ] Live rows 01, 02 and 16 PASS on Claude Code and opencode
- [ ] Live row 04 runs five times on Claude Code and five times on opencode, with every result reported, and `fx-tdd` fires in at least as many runs as before
- [ ] `HOME="$(mktemp -d)" scripts/check-all` is ALL GREEN

## Steps

- [ ] **1. Write the failing tests**

In `lib/preamble.test.js`, assert:
- the single render is under 9,000 characters for each harness in the
  worst-case fixture, using `repo.md` and three plans with task files and
  ledgers;
- the opening imperative's heading is the first `##` heading;
- the old intro sentence is absent;
- `fx:` appears nowhere in the opencode and Codex renders.

Watch them fail against today's `PREAMBLE.md`.

- [ ] **2. Apply the proposal verbatim**

Apply sections 4 to 7. No code of your own here beyond what the proposal
names.

- [ ] **3. Remove the split and verify GREEN**

Delete `renderParts` and `partForHandler`, and `--part` in the hook. Go back
to one handler per event. Run the unit tests and `scripts/check-generated`.

- [ ] **4. Verify live**

Launch each as a tracked background command, with `HOME` set to a fresh
`mktemp -d` and `FX_REAL_HOME` set explicitly:
- rows 01, 02 and 16 on Claude Code, then on opencode;
- row 04 five times on each.

- [ ] **5. Run the full gate, then commit**

Stage every file you changed by its path. No attribution trailers. Then
continue to the next task: never stop and wait.
