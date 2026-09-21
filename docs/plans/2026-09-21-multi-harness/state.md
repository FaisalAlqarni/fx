# fx ledger: plan: docs/plans/2026-09-21-multi-harness/plan.md

## Setup

Worktree: `/development/fx/.worktrees/multi-harness` on branch `multi-harness`,
created from `f92c970`. The plan directory and ADRs 0016-0020 were uncommitted
on main and were copied in, so the branch's first commit carries them.

Baseline, run before task 01: `scripts/check-all` -> `ALL GREEN`.
`.fx.json` has `test_scope: null`, so **every per-task gate uses `test_all`**
(`scripts/check-all`). `stacks` is empty, so no stack traps file applies.

## Pre-flight conflict scan

### Pairs sharing a file or an interface

| A | B | Shared | Produces / Consumes | Found |
|---|---|---|---|---|
| 01 | 04 | `lib/preamble.js` | 01 produces `render`, 04 consumes | clean, edge exists |
| 01 | 08 | `lib/preamble.js` | 01 produces `render`, 08 consumes | clean, edge exists |
| 04 | 05 | `hooks/fx-codex.js`, `hooks.json`, `tests/gates/codex-manifest.test.js` | 04 creates, 05 extends | clean, edge exists |
| 04 | 06 | `hooks/fx-codex.js`, `tests/gates/codex-manifest.test.js` | 04 creates, 06 extends | clean, edge exists |
| 05 | 06 | `hooks/fx-codex.js`, `tests/gates/codex-manifest.test.js` | 05 extends, 06 extends | clean, edge exists |
| 06 | 08 | `READ_ONLY_AGENTS` | 06 produces, **08 consumes** | **CONFLICT: no edge.** Ruling below |
| 06 | 09 | `plantRoles` | 06 produces, 09 consumes | clean, edge exists |
| 06 | 10 | `lib/plant-roles.js`, `lib/plant-roles.test.js` | 06 creates, 10 extends | clean, edge exists |
| 08 | 09 | `lib/agent-dialects.js` | 08 produces, 09 consumes | clean, edge exists |
| 07 | 10 | `skills/fx-setup/SKILL.md`, `scripts/gen-command-skills` | 07 creates, 10 regenerates | clean, edge exists |
| 07 | 09 | `skills/fx-setup/` | 07 creates, 09 no longer touches it | clean after the red-team split |
| 11 | 12 | `tests/conformance/` | 11 creates runner + free rows, 12 adds live rows | clean, edge exists |
| 03 | 12 | `state.md` | 03 appends, 12 appends | clean: append-only, different sections |
| 03 | 04 | `scripts/check-manifest` | 03 modifies; 04 lists it with no step | **DEFECT: phantom entry.** Ruling below |
| 01,02,03,04,05,06,07,08,09,10,11,12,13 | each other | `scripts/check-all` | every task appends one `run` line | clean: append-only, distinct lines, no reordering |

### Per-task self-consistency

| Task | Tests specified vs code specified | Files created vs later touched | Found |
|---|---|---|---|
| 01 | `lib/preamble.test.js` covers `render` and `HARNESSES` | `lib/preamble.js` consumed by 04, 08 | clean |
| 02 | gate is the test; fixture exercises both directions | harness files cited by nothing yet | clean |
| 03 | two gates, each with a fixture and a repo run | `check-interpreters` consumed by nobody | clean |
| 04 | `codex-manifest.test.js` asserts manifest, hooks shape, render | extended by 05, 06 | clean |
| 05 | appends guard cases to 04's test file | extended by 06 | clean |
| 06 | `plant-roles.test.js` plus hook-contract cases | `plantRoles` consumed by 09, 10 | clean |
| 07 | `user-invoked.test.js` asserts both hiding mechanisms | `skills/fx-setup` consumed by 10 | clean |
| 08 | `opencode-plugin.test.js` calls the plugin directly | `lib/agent-dialects.js` consumed by 09 | clean |
| 09 | install test per harness, file-reading only | `tests/install/` consumed by nobody | clean |
| 10 | `auditRoles` cases appended to 06's test file | reporting consumed by nobody | clean |
| 11 | runner verified by a broken-tree run | row contract consumed by 12 | clean |
| 12 | eleven live rows, verified against a broken tree | results consumed by 13 | clean |
| 13 | prose gates plus a claim-to-row walk | terminal | clean |

### Rulings from the scan

Ruling: `READ_ONLY_AGENTS` and the dialect converters live in one module,
        `lib/agent-dialects.js`. Task 06 creates it with the read-only set and
        the Codex conversion; task 08 adds the opencode conversion. Task 08
        gains a blocking edge on 06.
        Why: task 08's test requires `READ_ONLY_AGENTS` from `lib/plant-roles.js`,
        which task 06 produces, and no edge said so. Splitting the set across two
        modules would give the repository two answers to "which agents are
        read-only", which is the drift ADR 0019 exists to prevent.
        Cost if wrong: opencode work serialises behind Codex work, costing wall
        clock but no correctness. Caught by the task 08 review, which checks its
        Consumes block against what exists.

Ruling: Task 04 stops listing `scripts/check-manifest` as a modified file.
        Why: it names the file and stages it but has no step changing it. Task 03
        owns that change. A staged file no step edits is how an unrelated diff
        enters a task's review scope.
        Cost if wrong: nothing; if 04 turns out to need a manifest change, it adds
        the step then. Caught by the task 04 review, which reads Files against the
        diff.

Ruling: Every per-task gate runs `scripts/check-all` in full.
        Why: `.fx.json` sets `test_scope: null`, so the repository declares no safe
        partition. The suite is seconds, not tens of minutes, so the usual cost
        argument does not apply here.
        Cost if wrong: slower per-task gates. Caught by nothing, and nothing needs
        to: the failure mode is time, not correctness.

## Progress

Ruling: `plan.md`'s Global Constraints block was corrected before any dispatch
        copied it: the runtime-home constraint still said "fx's own name prefix"
        where the design, after the red-team pass, says an explicit generated
        list. The warn-not-refuse constraint was missing entirely.
        Why: the constraints block is handed verbatim to every reviewer as its
        attention lens. A stale constraint becomes a false rule for an agent with
        no context to doubt it.
        Cost if wrong: a reviewer enforces the wrong rule on a lens-naming or
        install-collision finding. Caught by the task 06 and task 09 reviews,
        which read the design directly.

Task 01: dispatched (sonnet). BASE f92c970.
        Waiting on the task 01 implementer. The frontier holds 02 and 03, both
        unblocked, but implementers run serially: `.fx.json` does not set
        `isolated_test_execution`, and 01, 02 and 03 all append to
        `scripts/check-all`. Nothing else is runnable until 01 reports, so ending
        the turn here is a deliberate wait, not a stall.

Task 01: implementer reported DONE_WITH_CONCERNS, commit 64bc6b2.
        Verified fresh by the controller, not taken on report: `node
        lib/preamble.test.js` -> `preamble.test.js: OK`; `scripts/check-all` ->
        `ALL GREEN`; commit body carries no attribution trailer; rendered
        opencode output contains neither `fx:fx-tdd` nor `{{`; `PREAMBLE.md:4`
        now reads "on every runtime"; the lane imperative is still the first
        `##` heading, at line 12.

Ruling: The task 01 file's `{{RESOLUTION}}` table was defective and the
        implementer was right to depart from it. The opencode cell read "so
        `fx:fx-tdd` is what will not resolve", which contains the exact substring
        the same task's test forbids in opencode output. The implementer
        paraphrased instead of copying verbatim.
        Why: a table cell and a test in one task contradicted each other. The
        test encodes the requirement; the prose was illustrating it and got it
        wrong. I wrote that table, and the loop caught it.
        Cost if wrong: none; the assertion is stronger than the prose. Caught by
        the task 01 review, which reads acceptance criteria against the diff.

Ruling: opencode receives five raw `{{...}}` placeholders from task 01 until
        task 08 rewires `plugins/fx.js`. Accepted as an intermediate state.
        Verified, not assumed: `plugins/fx.js:27` reads `PREAMBLE.md` with
        `readFileSync` and never calls the renderer, and the raw file now holds
        `{{SKILL_TOOL}}`, `{{LANE:fx-tdd}}`, `{{LANE:fx-implement}}`,
        `{{LANE:fx-review}}` and `{{RESOLUTION}}`.
        Why: task 08 owns that file, and splitting the rewire out would mean two
        tasks editing one file for no gain. The branch is not merged mid-plan.
        Cost if wrong: **this branch must not merge before task 08 completes**,
        or opencode ships worse than it is today. Caught by conformance row 3
        ("no placeholder survives") in task 11, which runs on all three runtimes,
        and by the task 08 review.

Task 01: review dispatched (sonnet) against .fx/01/review/f92c970..64bc6b2.diff,
        findings to docs/plans/2026-09-21-multi-harness/findings-01.md.
Task 02: dispatched (sonnet). BASE 64bc6b2. Running alongside the task 01
        review: reviews and implementers may overlap, implementers may not.
        The dispatch carries the measured fact that a bare-word tool gate
        produces 19 hits in this repository, all English verbs, so the
        implementer builds the tool-shaped gate and does not rewrite lane prose.

Task 02: implementer reported DONE, commit 58322e9.
        Verified fresh by the controller: `scripts/check-tool-names` exits 0
        against the repository; on a fixture it reports exactly one hit, "the
        Grep tool", and ignores both "Read the plan, once" and a fenced
        occurrence; all three files named by `HARNESSES` exist under
        `references/harnesses/`; `scripts/check-all` -> `ALL GREEN`.
        The tool-shaped gate produced 0 hits where the bare-word version
        produced 19, which is the outcome the dispatch predicted.
Task 02: minor (deferred): `check-tool-names` is not listed in README.md's gate
        table. Documentation drift only; task 13 owns the README.
Task 02: review dispatched (sonnet) against .fx/02/review/64bc6b2..58322e9.diff,
        findings to docs/plans/2026-09-21-multi-harness/findings-02.md.
Task 03: dispatched (sonnet). BASE 58322e9.

Task 01: complete (commits f92c970..64bc6b2, review clean).
        Spec 11/11 PASS, quality PASS. Files: lib/preamble.js,
        lib/preamble.test.js, PREAMBLE.md, hooks/fx-context.js, scripts/check-all.
        Guarantee: the preamble renders per harness, verified by RED
        (`Cannot find module './preamble'`) then GREEN (`preamble.test.js: OK`).
Task 01: minor (deferred): acceptance bullet 1's negative is looser than the
        test that encodes it. Task-template wording.
Task 01: minor (deferred): `{{SKILL_TOOL}}` renders "the `Skill` tool" where the
        file previously read bare "`Skill`" at one usage, outside the imperative.

Ruling: reviewers return findings as text and the controller writes the findings
        file. The task 01 reviewer was blocked by a harness constraint
        ("Subagents should return findings as text, not write report files") and
        its findings existed only in one message.
        Why: a review's findings must outlive the message that carried them, and
        the subagent cannot put them on disk. Writing them myself is the only
        durable channel.
        Cost if wrong: a review's findings are lost when its message ages out.
        Caught by nothing downstream, which is exactly why the write happens in
        the same turn the findings arrive.

## Measurements

Lane check on Claude Code, measured 2026-09-21: fires.

Task 02: review returned spec 9/9 PASS, quality PASS, one Important finding.
Task 02: fix round 1 dispatched, resuming the original implementer. The gate's
        `TOOLS` list omits `Bash`, `Write` and `Edit`. Verified first-hand before
        dispatch: a fixture using "the Bash tool", backticked `Write` and
        backticked `Edit` returns `check-tool-names: OK`, exit 0, while
        `references/harnesses/claude-code.md:10` documents all six names.
        The defect came from the task file's own code block, which I wrote, not
        from the implementer.
Task 02: minor (deferred): the implementer's self-review overstated the pattern
        as correct, when it was correct only against current repository content.
Task 02: minor (deferred): the harness files carry CLI version numbers the task
        did not request; the reviewer could not verify them from the repository.
        I measured those three versions myself during design, so they are right.

Ruling: I broke the serial-implementer rule and got away with it. Task 03 was
        dispatched, then task 02's implementer was resumed for fix round 1, so
        two writers were live in one worktree at once. A fix round is a writer;
        I had been counting only fresh dispatches.
        Verified no damage: `git show --stat 5e005d4` touched exactly one file,
        `scripts/check-tool-names`, and task 03's in-flight edits to
        `hooks/fx-pretooluse.js`, `scripts/check-manifest`, `scripts/check-all`
        and the new `scripts/check-interpreters` were still uncommitted and
        unmodified by it. Staging by explicit path is what saved it.
        Why it was safe here: both writers touch disjoint files and the gates are
        file-reading, so there is no shared database to poison.
        Cost if wrong: a fix round commits another task's half-finished work into
        its own diff, and the task review is scoped to the wrong change. Caught
        by the task review reading Files against the diff, but only if the
        reviewer looks: cheaper to not do it again.
        **From here: a fix round waits for any in-flight implementer, or the
        in-flight implementer waits for it. Never both at once.**

Ruling: the controller commits `docs/plans/<slug>/` and the five new ADRs itself.
        They were copied into the worktree at setup and were still untracked
        after two tasks, because each implementer correctly staged only its own
        files.
        Why: the ledger is the record that survives compaction, and an untracked
        ledger dies with the worktree. The skill requires it to be committed with
        the work, and no implementer owns it.
        Cost if wrong: nothing. It is bookkeeping, staged by explicit path so it
        cannot sweep an in-flight task's edits. Caught by nothing, and needs
        nothing: the failure mode is losing the record, not corrupting the code.

Task 02: complete (commits 64bc6b2..5e005d4, 1 fix round, re-review clean).
        Spec 9/9 PASS, quality PASS. Files: references/harnesses/claude-code.md,
        references/harnesses/opencode.md, references/harnesses/codex.md,
        scripts/check-tool-names, scripts/check-all.
        Guarantee: a skill body naming a runtime tool fails a gate. Verified by
        RED on a fixture (one hit, "the Grep tool") then GREEN against the
        repository (0 hits), and after the fix round by three hits on the
        widened fixture with the English verb and fenced code still passing.
        Re-review confirmed scope: one file, one line, no bleed from the
        concurrent task 03 edits.

Waiting on the task 03 implementer. The frontier holds 04, whose only blocker
        is task 01 and which is therefore ready, but implementers run serially
        and 03 is still writing to `scripts/check-all`, which 04 also appends to.
        Nothing else is runnable, so ending the turn here is a deliberate wait.

Task 03: implementer reported DONE, commit ad6ed6c.
        **Lane check on Claude Code: FIRES.** Verified evidence in the report,
        not just the one-line claim: a live session with `--plugin-dir` pointed
        at this worktree, told to call the Write tool on a plain `.js` file;
        `probe.js` was never created, the lane marker was, and the stream's
        tool_result carried `is_error: true` with the exact `laneCheck` reason
        text. Per ADR 0010 the run used `--plugin-dir`, so it measured this tree
        and not a cached copy keyed by version.
        Consequence: the check has been working the whole time. Only the comment
        denying it was wrong, and DEBT #30 is confirmed stale. Task 08 can port
        it to opencode on a measured basis rather than a hopeful one.

Ruling: the two stale-belief sites the task 03 implementer found outside its own
        files are assigned to task 13, and its acceptance criteria now carry
        them. Verified both first-hand: `lib/plan-state.js:15` reads "PreToolUse
        does not fire for Write or Edit at all, DEBT #30", and `SURFACE.md:114`
        cites "DEBT #30/#48" as a live justification.
        Why: no task's Files block owned either, so both would have survived the
        whole plan. A false belief left in a comment is what ADR 0018 exists to
        stop, and it reads as fresh evidence every time someone opens the file.
        Cost if wrong: task 13 is documentation-only and late, so a code change
        hidden in it would be reviewed thinly. Mitigated by restricting
        `lib/plan-state.js` to a comment change with no code touched, which is
        now written into the task. Caught by the task 13 review.

Ruling: task 03's review package is scoped b856d06..ad6ed6c, not 5e005d4..ad6ed6c.
        My own plan-docs commit b856d06 landed between task 02's last commit and
        task 03's, so the recorded BASE was stale and the first package was
        185KB carrying 3527 lines of plan documents into a gate review.
        Why: a review scoped to the wrong range is the failure the skill warns
        about with `HEAD~1`, reached by a different route: the controller
        committing between tasks. Recording BASE before dispatch is not enough
        if the controller then commits.
        Cost if wrong: the reviewer reads the wrong diff and its verdict is about
        a different change. Caught by nothing downstream, which is why it is
        fixed here.
        **From here: re-read HEAD immediately before packaging, never reuse the
        BASE recorded at dispatch if the controller has committed since.**

Task 03: complete (commits b856d06..ad6ed6c, review clean).
        Spec 10/10 PASS, quality PASS, zero findings. Files:
        scripts/check-manifest, hooks/fx-pretooluse.js, scripts/check-interpreters,
        scripts/check-all.
        Guarantees: a manifest declaring a component key passes and an orphaned
        default scan fails, both exercised with fixtures; a script invocation
        without an interpreter fails and a mention does not; the false
        one-group-per-plugin claim is gone with no code changed alongside it.
        The reviewer independently confirmed no third stale-belief site exists.

Waiting on the task 04 implementer. Nothing is dispatchable: 05 blocks on 04,
        06 on 04 and 05, 07 on 04, 08 on 06. 03 is complete and reviewed, so the
        frontier is genuinely empty until 04 reports. Deliberate wait.

Task 04: implementer reported DONE_WITH_CONCERNS, commit 8aed061.

Ruling: Codex's bundled validator is a lint, not the ingestion path, and task
        04's criterion 1 is amended to say so. Verified first-hand, not taken
        from the report: `validate_plugin.py` fails with `skill \`fx-audit\`
        frontmatter field \`disable-model-invocation\` must be false`, while a
        live `codex plugin marketplace add` plus `codex plugin add` into a
        throwaway CODEX_HOME installed successfully and shipped all 13 skills
        including `fx-audit`, both hook files, and **zero symlinks** in the cache.
        Why: the criterion as written could never be met by task 04, because the
        offending line is in `skills/fx-audit/SKILL.md`, which pre-dates this
        plan and belongs to task 07. Holding task 04 against it would park a
        finished task on someone else's file.
        Cost if wrong: fx ships a plugin that fails the official lint, which
        looks bad in a marketplace even though it installs. Caught by task 07,
        which now carries the decision explicitly, and by task 13, which must
        document whatever task 07 decides.

Ruling: task 07 is amended with two facts measured after it was written.
        First, the `disable-model-invocation` conflict above: Codex demands the
        field be false or absent, Claude Code demands true, and one file cannot
        satisfy both. Task 07 must decide deliberately and is explicitly
        forbidden from setting it false, which would make Claude Code auto-select
        the audit lane, the exact behaviour the task exists to prevent.
        Second, **Codex already migrates commands into skills by itself**: the
        live install produced
        `.codex-plugin/migrated-command-skills/source-command-fx-handoff/SKILL.md`
        unprompted. Only one of four commands migrated and the reason is unknown.
        Task 07 must investigate before building its generator, because if Codex
        covers all four the command-to-skill half of that task is redundant.
        Why: both were unknowable when the plan was written and both change what
        task 07 should build. A task that builds a generator Codex makes
        unnecessary is waste nobody would notice.
        Cost if wrong: task 07 builds more than it needs, or ships a skill set
        that duplicates Codex's own migration. Caught by the task 07 review,
        which now has the facts to check against.

