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

Task 04: review package scoped e3f1bfa..8aed061, not ce60ef2..8aed061. My own
        ledger commit e3f1bfa sat between again. The rule from last turn caught
        it this time: re-read the log before packaging, never reuse the BASE
        recorded at dispatch once the controller has committed.

Task 04: complete (commits e3f1bfa..8aed061, review clean).
        Spec 11/11 PASS, quality PASS, zero findings. Files:
        .codex-plugin/plugin.json, .agents/plugins/marketplace.json, hooks.json,
        hooks/fx-codex.js, tests/gates/codex-manifest.test.js, scripts/check-all.
        Guarantee: fx installs on Codex from its own marketplace, and the
        preamble reaches both a session and a subagent with Codex addressing.
        Verified twice independently, by the controller and by the reviewer, each
        with its own live install into a throwaway CODEX_HOME.

Waiting on the task 05 implementer. Task 07's blockers (02 and 04) are both
        satisfied, so it is ready, but implementers run serially and 05 and 07
        both append to `scripts/check-all`. 06 blocks on 05. Deliberate wait.

Task 05: implementer reported DONE_WITH_CONCERNS, commit 314ee08. It wired
        `apply_patch` to the lane check and said plainly that the field name was
        unverified and might be inert. It was right.

## Measurements

Codex `apply_patch` payload shape, measured 2026-09-21 against Codex CLI
0.155.1 with a live `codex exec` and a stdin-dumping PreToolUse hook:

```
tool_name='apply_patch'  tool_input keys=['command']
    command = '*** Begin Patch\n*** Update File: target.js\n@@\n-const b = 2;\n+const b = 3;\n*** End Patch'
```

Two consequences.

1. **There is no `file_path` and no `path`.** The shipped wiring reads
   `tool_input.file_path || tool_input.path`, so it is inert: the lane check
   never fires on Codex today. Paths live inside the patch text, on
   `*** Update File:`, `*** Add File:` and `*** Delete File:` lines.
2. **`apply_patch` uses the key `command`, the same key `Bash` uses.** Routing
   must stay keyed on `tool_name`. A hook that dispatched on the presence of
   `tool_input.command` would hand raw patch text to the git guard, which
   inspects it as a shell command. Nothing does that today; it is a trap for
   the next person to touch this file.

Task 05: fix round 1 dispatched, resuming the original implementer. One item:
        parse the affected paths out of the patch text on `*** Update File:`,
        `*** Add File:` and `*** Delete File:` lines, check every path a patch
        names rather than the first, keep the check fail-open so a parser bug
        cannot wedge a session, and comment the measured format so nobody
        re-derives it from a live session again. Plus a comment noting that the
        `tool_name` check is load-bearing because `apply_patch` and `Bash` share
        the `command` key.
        Task 07 stays queued: a fix round is a writer, and this one is live.

Task 05: fix round 1 landed, commit d100493. Verified fresh by the controller
        against the real measured payload shape, not the test's fixtures:
        an `apply_patch` payload carrying `*** Update File: lib/thing.js` exits 2
        with the genuine `laneCheck` reason text; a malformed patch exits 0,
        fail-open; `git branch -D x` exits 2 with the guard's reason on stderr;
        `git status` exits 0. `scripts/check-all` -> `ALL GREEN`.
        **The lane check now genuinely fires on Codex.** It was inert before.

Ruling: my own first guard measurement in that check was wrong and I caught it.
        I piped the hook through `head -1` and then read `$?`, which belonged to
        `head`, not to the hook, and reported `guard exit=0` for a hook that had
        in fact exited 2. ADR 0010 names this exact shape: "an exit code read
        through a pipe belongs to `head`". Re-measured without the pipe: exit 2,
        reason on stderr.
        Why it matters: I would have opened a fix round against working code, and
        the implementer would have been sent to repair a guard that was already
        correct.
        Cost if wrong: wasted round, and worse, a "fix" to code that did not need
        one. Caught by re-reading the output rather than the exit code, which is
        the habit that ADR exists to install.

Task 05: complete (commits 8aed061..d100493, 1 fix round, re-review clean).
        Spec 10/10 PASS, quality PASS. Files: hooks/fx-codex.js, hooks.json,
        tests/gates/codex-manifest.test.js.
        Guarantee: on Codex the git guard refuses irreversible commands and fails
        closed, and the lane check follows `apply_patch` and fails open. Both
        proven by forcing the underlying calls to throw, from outside the
        repository, rather than by reading the branches.

Ruling: seven stale cross-references repointed. The red-team split the old
        conformance task 10 into task 11 (runner and free rows) and task 12
        (behavioural rows), and shifted documentation to 13, but every pointer
        to "task 10" stayed. The task 05 reviewer found one; I scanned and found
        seven, across tasks 04, 05, 06, 07, 08, 09 and 13.
        Why: task 10 is now "Setup reports what did not land". An implementer
        following any of those pointers would have landed on an unrelated task
        and concluded its own guarantee was somebody else's problem.
        Cost if wrong: a guarantee everyone believes is asserted elsewhere, and
        nowhere actually asserts it. That is the precise failure the conformance
        matrix exists to prevent, arriving through the plan's own prose. Caught
        here; nothing downstream would have.

Task 07: implementer reported DONE_WITH_CONCERNS, commit a01fc2a.
        Verified fresh: `scripts/check-all` -> `ALL GREEN`; all five
        user-invoked lanes carry `disable-model-invocation: true` **and**
        `allow_implicit_invocation: false`, so each is hidden on both runtimes;
        exactly five skills carry the Claude Code flag and no others.

        **The investigation earned its place.** Codex's auto-migration of
        commands is non-deterministic: `fx-handoff` migrated 3 times out of 3
        from the real repository, but controlled probes on near-identical
        content gave 2 of 2 and then 0 of 4. And when it does fire, the result
        lands outside `skills/` and is **unhidden**. So the generator is not
        redundant, which is the opposite of what I suspected when I told the
        implementer to check. Had it built blind, it would have shipped either a
        redundant generator or a gap; had it skipped the check, it would never
        have known which.

Ruling: the `disable-model-invocation` conflict is resolved by keeping `true` on
        all five and accepting the Codex lint failure. The implementer verified
        the lint is cosmetic and not the ingestion path, and never set the field
        `false`, which was the forbidden escape.
        Why: Claude Code's guarantee is real behaviour and Codex's complaint is a
        scaffolding script. Trading a working guarantee for a clean lint would
        have made the model auto-select the audit lane on Claude Code, the exact
        thing the task exists to prevent.
        Cost if wrong: fx ships a plugin that fails the official lint. Caught by
        task 13, which must document it, and it is documented in the report.

Ruling: task 07's edit to `scripts/fx-opencode-install` stands, though that file
        belongs to task 09. Verified by reading the diff: two lines of guard plus
        a comment explaining it. Without it the installer converts a
        generated skill a second time and crashes `convert_skill_command` on a
        template citation like `../../references/stacks/<name>.md`, which names
        no real file.
        Why: the alternative was leaving `scripts/check-all` red at the end of a
        task, which is worse than a scoped edit to a neighbouring file. The
        implementer flagged it rather than hiding it.
        Cost if wrong: task 09 reworks that installer and may conflict. Mitigated
        by the pointer now carried into task 09's dispatch, telling it to read
        this diff first. Caught by the task 09 review.

Task 07: minor (deferred): the implementer fixed a broken regex in the
        task-supplied `tests/gates/user-invoked.test.js`, which falsely flagged
        correctly-deepened two-level citations. Another defect in test code I
        wrote and never executed.

Task 07: review returned spec 9/10 PASS (criterion 10 deliberately unmet per
        adjudication), quality PASS, no Critical or Important findings.

**Controller found an Important defect the review declined to check.**
        The reviewer marked the live model-visible check CANNOT-VERIFY rather
        than running it. It is free and local. I ran it: install into a throwaway
        CODEX_HOME, then `codex debug prompt-input`.

        Four of the five hidden lanes are genuinely absent. **`fx-handoff` is
        visible**, as `fx:source-command-fx-handoff`. Codex auto-migrated
        `commands/fx-handoff.md` into its own generated skill, which carries no
        `agents/openai.yaml` and therefore no hiding. `fx-tdd`, which should be
        visible, is visible, so the probe discriminates.

        So the lane is hidden under its own name and exposed under Codex's
        generated one. This is the exact failure shape task 07 exists to prevent,
        and it arrives through the very mechanism the implementer investigated
        and correctly described as producing "unhidden results outside skills/".
        The investigation found the hazard; nothing closed it.

        Also recorded: the Codex validator now reports **five** failures rather
        than one, one per hidden lane. Task 13 must document that count, not the
        old one.

Task 07: fix round 1 QUEUED, not dispatched. Task 06's implementer is live, and
        a fix round is a writer. This is the rule I broke once already and it
        costs nothing to honour here: the defect is recorded, the evidence is
        durable, and the round goes out the moment 06 reports.

Task 06: implementer reported DONE_WITH_CONCERNS, commits 018e8ed and b914732.
        It disclosed that during development an existing task-04 test with no
        `CODEX_HOME` set invoked its new `plantRoles()` and wrote fx's six role
        files into **this machine's real `~/.codex/agents/`**. It caught that,
        cleaned up, and fixed the test harness to isolate `CODEX_HOME`.

        Verified by the controller, because a claim about the user's machine is
        the last claim to take on trust: `~/.codex/agents` is empty, no
        `fx-*.toml` exists anywhere under `~/.codex`, no `hooks.json` is present,
        and `config.toml` holds only the one pre-existing project entry. The
        empty `agents/` directory itself was a leftover and has been removed, so
        the Codex home is byte-for-byte as this session found it.

        Also checked the other two runtime homes. `~/.config/opencode/skills`
        exists with 215 entries dated 28 August, zero of them `fx-*` and none of
        them symlinks: a prior unrelated install, untouched by this work.

Correction: earlier in this session I recorded that `~/.config/opencode` had no
        `skills/` directory. That was wrong. I had truncated the `ls` output at
        160 characters and the entry fell off the end. The directory has existed
        since August. Nothing downstream depended on the claim, but it was mine
        and it was stated as fact.

        **This is the near-miss worth naming.** The disclosure is what made it
        recoverable. An implementer that quietly cleaned up would have left a
        correct-looking report and an unexplained mutation of the user's home
        directory. The template asks for exactly this and it paid.

Task 07: fix round 1 landed, commit 660b10a. Verified fresh by the controller
        with its own throwaway install: all five lanes hidden, three controls
        (`fx-tdd`, `fx-brainstorm`, `fx-review`) still visible, and no
        `migrated-command-skills` directory created at all.

        **The trigger, isolated by a dozen live installs varying one factor at a
        time:** Codex's command-to-skill migrator parses each command's
        frontmatter as strict YAML and silently skips any command whose
        frontmatter fails to parse. Three of fx's four commands were already
        failing that parse **by accident**, an unquoted colon in the description.
        `fx-handoff`'s parsed cleanly, so only it migrated.

Ruling: the fix stands, and its fragility is recorded rather than smoothed over.
        The fix gives `fx-handoff` a description that also contains an unquoted
        colon. It reads as natural prose, so nothing gratuitous was introduced,
        but **the defence is a YAML parse failure in undocumented behaviour, not
        a contract.**
        The accompanying unit test pins that all four descriptions still contain
        the colon. That is worth having: it catches a careless prose edit
        reopening the hole. **It is not a guarantee.** If a future Codex release
        fixes its parser, the unit test keeps passing and every hidden lane
        silently reappears. The test pins our behaviour, not Codex's.
        Why accept it: the alternative is not shipping `commands/` to Codex at
        all, and Codex copies the plugin tree wholesale with no ignore mechanism
        I could find. No better lever exists today.
        Cost if wrong: five user-invoked lanes become model-selectable on Codex,
        silently. Caught by task 12's conformance row 13, which I have now
        strengthened to assert all five are hidden, to require visible controls
        so a broken probe cannot read as a pass, and to assert the
        `migrated-command-skills` directory is absent. Task 13 documents it as a
        known fragility.

Note: review packages scoped 084bfc6..b914732 (task 06) and 9eaac90..660b10a
        (task 07 fix). Both first attempts swallowed a controller ledger commit.
        This is the fourth time; the standing rule is to read `git log` and take
        the commit immediately before the implementer's, never a recorded BASE.

Task 07: complete (commits 4059996..660b10a, 1 fix round, re-review clean).
        Spec 9/10 PASS with criterion 10 deliberately unmet, quality PASS.
        Files: scripts/gen-command-skills, scripts/check-all,
        scripts/fx-opencode-install, tests/gates/user-invoked.test.js,
        skills/fx-audit/agents/openai.yaml, and SKILL.md plus openai.yaml for
        fx-critique, fx-grill, fx-handoff and fx-setup.
        Guarantee: all five user-invoked lanes are hidden from the model on both
        runtimes and remain user-invocable. Verified live by the controller with
        visible controls proving the probe discriminates.
        Sidecar filenames confirmed `openai.yaml`, matching OpenAI's own bundled
        `review-agent`: a reviewer's prose said `openapi.yaml` and a wrong
        filename there would have silently disabled the hiding on all five.

Task 06: review returned **spec FAIL, quality FAIL**, one Critical finding and
        two Important. The Critical is a reproducible write bypass in the lens
        detector.

        Reproduced by the controller independently, with a lens identity
        recorded through `SubagentStart` and `CODEX_HOME` isolated:

        | command | exit |
        |---|---|
        | `echo pwned > evidence.txt` | 2, caught |
        | `bash -c "echo pwned > evidence.txt"` | **0, bypass** |
        | `sh -c "echo pwned > evidence.txt"` | **0, bypass** |
        | `python3 -c "..."` | **0, bypass** |
        | `node -e "..."` | **0, bypass** |
        | `bash -c "rm evidence.txt"` | 2, caught |
        | `git status` | 0, correct |

        Root cause: `REDIRECT` is tested once against the raw command and never
        re-applied to the segments unwrapped from `bash -c`. The `rm` case
        proves the segment machinery itself works.

        The sharpest detail is the reviewer's: **`lib/git-guard.js` was already
        hardened for this class**, and `lib/git-guard.test.js` carries
        `bash -c 'git push origin main'` as a required-blocked case. The pattern
        existed one file over and was not carried across. That is precisely the
        "when you fix one, look for its mirror" failure the dispatch template
        warns about.

Ruling: the lens write-detector changes from a denylist to an **allowlist**, with
        the denylist kept behind it as defence in depth.
        Why: a denylist over shell commands is unwinnable. One probe session
        found four trivial bypasses, and the reviewer listed five more it did not
        need to try (`curl -o`, `wget`, `eval`, command substitution, `node -e`).
        Every future interpreter is another hole. A read-only agent, by contrast,
        runs a small and knowable set of commands: search, read, list, inspect
        history. Enumerating what a lens may do is finite; enumerating what it
        must not do is not.
        The safe direction is over-refusal: a lens blocked from a read it needed
        reports a refusal a human can see, while a lens permitted a write nobody
        expected is the silent failure this task exists to prevent.
        Cost if wrong: a lens cannot run a command it legitimately needs, and a
        review returns thin. Visible, recoverable, and caught by task 12's
        conformance row 12 plus any lens actually running.

Task 06: fix round 1 landed, commit 3e8c46c. The detector is now an allowlist.
        A lens may run: cat, head, tail, wc, nl, grep/egrep/fgrep/rg, find, ls,
        tree, git (subcommand-gated: log/diff/show/blame/status yes,
        commit/checkout/push no), diff, pwd, file, basename, dirname, realpath,
        stat, echo/printf (refused if redirected). Nothing else, anywhere,
        including inside `bash -c`, `$(...)` and backticks, recursively.

        Verified by the controller with an adversarial probe that deliberately
        went beyond the cases the implementer tested:

        | probe | exit |
        |---|---|
        | `bash -c` redirect, `python3 -c`, `node -e` | 2 |
        | `/bin/bash -c "echo x > f"` (absolute path) | 2 |
        | `/usr/bin/env bash -c`, `command bash -c` | 2 |
        | `bash -c "bash -c \"echo x > f\""` (nested) | 2 |
        | `cat f > out` (allowlisted binary, redirected) | 2 |
        | `awk '{print > "f"}'`, `xargs -I{} cp {} /tmp/x` | 2 |
        | `git status`, `grep -rn TODO .`, `git log`, `cat README.md` | 0 |

        The absolute-path, `env`, `command` and nesting cases are the ones a
        denylist would have kept leaking on. They pass because the allowlist is
        applied per unwrapped segment, which is what closes the class rather than
        the instances.

        The implementer also took the file-permission fix (0700 dir, 0600 file)
        and left `process.ppid` scoping as ruled, with a comment saying plainly
        that it fails closed if `ppid` proves unstable. Task 12 measures it live.

Task 06: fix round 1 re-review returned **Fix verified: NO. Critical bypasses
        remain**, one level down from the ones it closed.

        The outer gate was inverted to an allowlist and holds: every interpreter,
        chaining, process-substitution, obfuscation and indirection case the
        reviewer tried is refused. But two allowlisted binaries carry a
        *denylist* inside them, and both are provably incomplete.

        Reproduced by the controller:

        | probe | exit | writes? |
        |---|---|---|
        | `git config user.name pwned` | 0 | yes |
        | `git clone /tmp/x /tmp/pwned` | 0 | yes |
        | `git archive --output=/tmp/o.tar HEAD` | 0 | **wrote 10240 bytes** |
        | `git worktree add /tmp/wt HEAD` | 0 | yes |
        | `find . -fprint /tmp/o.txt` | 0 | **wrote 44 lines** |
        | `find . -delete` | 2 | caught |
        | `git log` | 0 | correct |

        The reviewer ran the git and find writes for real in a scratch repo to
        confirm they touch disk rather than reasoning about them. It also listed
        the ones it did not need to try: `git gc`, `reflog expire`,
        `update-ref`, `symbolic-ref`, `notes`, `replace`, `commit-tree`,
        `hash-object -w`, `submodule add`, `credential store`, `filter-branch`,
        `sparse-checkout`, `maintenance`, plus `find -fls` and `tree -o`.

        **This is round 1's flaw at the next level.** I ruled that a denylist
        over shell commands is unwinnable and had the outer gate inverted. The
        same argument applies to a denylist over `git` subcommands, and I did not
        follow it down. `git` alone has well over a hundred subcommands and any
        enumeration of the writing ones will be incomplete the day it is written.

        Good news the review also established: **the allowlist is not too tight.**
        It read all six agent definitions and found no command a lens is
        instructed to use that is now refused. Refusal messages name the agent,
        the tool and the reason, so a missing entry is distinguishable from a
        real attempt. Identity permissions are 0700/0600 as claimed. Fail-closed,
        controller-path, devils-advocate and anti-prefix checks all hold.

Task 06: fix round 2 QUEUED, not dispatched. Task 08's implementer is live and a
        fix round is a writer. The evidence is durable and the round goes out the
        moment 08 reports.

Task 08: implementer reported DONE, commit 29b7cab. Verified fresh by the
        controller: `scripts/check-all` -> `ALL GREEN`; the plugin registers
        exactly `config`, `experimental.chat.system.transform` and
        `tool.execute.before`, and **does not register `permission.ask`**, the
        hook that is declared, documented and never triggered in 1.18.25; agent
        registration is driven by `READ_ONLY_AGENTS` and not a prefix; all six
        read-only agents register including `fx-devils-advocate`;
        `subagent_depth` is raised to 2 so an implementer can dispatch a
        reviewer; and the broad `*` rule is first in `permission.skill`, which is
        what makes last-match-wins behave.
        Measured and recorded by the implementer:
        `experimental.chat.system.transform(input, output)`, two arguments, with
        `system` on the output object, confirmed at both `trigger()` call sites
        in the shipped binary, one of which never sets `sessionID`. The shipped
        `plugins/fx.js` had destructured a single argument.
        Lane check now covers all three opencode write paths: `edit` and `write`
        via `filePath`, and `apply_patch` via `patchText`.

Task 08: minor (deferred): two more defects in task-supplied test code, an empty
        `tasks/` directory that made the plan-state assertion unwinnable, and a
        lane-check call against `README.md` that never touched a refusing path.
        That is five plan-authored test defects across the build, every one
        caught by an implementer running the code rather than reading it.

Task 06: fix round 2 dispatched now that task 08's implementer has reported.

Task 06: fix round 2 landed, commit 9636720. The git and find gates are now
        allowlists: `log diff show blame status rev-parse ls-files ls-tree
        cat-file describe shortlog grep for-each-ref merge-base name-rev
        rev-list`, and find actions limited to matching and printing. `tree` was
        dropped rather than gated. Every round-2 bypass now exits 2, verified,
        and the reviewer's untried list too.

**Controller found a third level.** `git diff --output=/tmp/pwned.diff` exits 0
        and writes 83 bytes. The subcommand is legitimately read-only; the
        **flag** writes.

Ruling: stop the arms race and name the ceiling. Three rounds have now found the
        same flaw at three granularities: binaries, then subcommands, then flags.
        A fourth would find it at argument values. **A shell-parsing gate cannot
        be made complete, and pretending otherwise is the actual risk**, because
        each round makes the guarantee look stronger than it is.

        Round 3 does two things and then stops:
        1. Refuse arguments that name an output file (`--output`, `--output=`,
           `-o` where it takes a path, `--out`). That catches the realistic
           accident: a lens writing a diff to a file so it can read it back.
        2. **Write the ceiling into the code and into ADR 0019.**

        The ceiling, stated honestly: this gate prevents **accidents, not an
        adversary**. The threat model is a well-behaved lens that writes because
        nothing told it not to, which is what the implementer identified in round
        1 and what every real finding since has been. It is not a sandbox. A
        determined prompt-injection through a reviewed diff is not in scope, and
        claiming otherwise would be the kind of guarantee-by-assertion this plan
        exists to remove.

        Why fx cannot do better on Codex today: `sandbox_mode` in a role file
        does not enforce, measured; Codex offers no per-subagent tool
        restriction; and the only discriminator that reaches a hook is identity.
        Claude Code and opencode both enforce declaratively and are genuinely
        stronger. **ADR 0019 must say the three mechanisms are not equal**, which
        it currently implies they are.
        Cost if wrong: someone reads "read-only" on Codex as equivalent to
        Claude Code's hard allowlist. Caught by ADR 0019 and task 13's
        documentation, both now required to state the asymmetry.

Task 08: review returned spec PASS (21/21) and quality PASS, with one Important
        finding. The review ran **seven mutations**, each confirmed genuinely
        red, which is the strongest verification in this build so far:
        reverting the arity fix produced `TypeError: Cannot read properties of
        undefined (reading 'push')`, proving that fix load-bearing rather than
        decorative; swapping `READ_ONLY_AGENTS` for a `fx-lens-` prefix filter
        failed on exactly `fx-devils-advocate`; hardcoding `subagent_depth = 2`
        failed the never-lower assertion; and reverting the implementer's fixture
        fix made the plan-state criterion permanently unwinnable again, proving
        that task-supplied bug was real.

        It also measured the hook arity independently from the shipped binary and
        found both call sites, one of which passes no `sessionID` key at all.
        Confirms the previously shipped single-argument destructure would have
        pushed nothing at either site: **the preamble never reached an opencode
        session, and nothing reported it.** That is the defect this plan was
        started to find.

Task 08: **Important**: `tests/gates/opencode-plugin.test.js` calls
        `tool.execute.before` only with `tool: 'edit'`. There is no `'write'` and
        no `'apply_patch'` case. The implementation wires all three and the
        reviewer verified each independently, but two of three write paths carry
        no regression coverage, so a typo in a tool-name match or a broken
        `extractPatchPaths` would ship silently. That is the exact class this
        plan exists to prevent, and the brief asked for it: "a lane check wired
        to one of three is not wired".

Correction: an earlier ruling of mine in this ledger says task 06 creates
        `lib/agent-dialects.js` carrying both the read-only set and the Codex
        conversion, with task 08 adding only the opencode conversion. **That is
        wrong and the reviewer caught it.** What exists: `lib/agent-dialects.js`
        is new in task 08; the read-only set lives in `lib/plant-roles.js`; the
        Codex converter is `scripts/gen-codex-agents`, a separate Python script.
        Task 08's own task file said this unambiguously and the implementation
        matches it. The stale prose was mine, written during the pre-flight scan
        before those files existed. Nothing depended on it, but the ledger is the
        artifact later reviewers check provenance against, so it gets corrected
        rather than left.

Task 08: minor (deferred): `extractPatchPaths` parses `*** Move to:`, but the
        shipped opencode binary refuses any apply_patch containing a move
        ("apply_patch moves are not supported yet"), so that branch cannot see
        live traffic. Harmless, worth knowing.

Task 08: fix round 1 QUEUED, not dispatched. Task 06's round 3 implementer is
        live and a fix round is a writer.

Task 06: fix round 3 landed, commit c0024ec, and it is the last round by ruling.
        Verified fresh: `git diff --output=<path>` and its space form both exit 2,
        `git show --output=` exits 2, while `git log --oneline -5`,
        `git diff HEAD~1` and `grep -rn TODO .` all stay exit 0.
        `scripts/check-all` -> `ALL GREEN`.

        **ADR 0019 corrected.** It now carries a section headed "Codex is not
        equivalent", opening: "The table above used to read as though the three
        mechanisms were peers." The table row for Codex now says **strictly
        weaker: a heuristic gate in fx's own hook, not a harness-enforced
        boundary**, and the three-round leak history is recorded as the evidence.

        That correction matters more than the flag fix. An ADR recording a
        guarantee as uniform when it is not is the same failure ADR 0018 exists
        to correct, and committing the inverse two ADRs later would have been
        poor form.

        The ceiling is now written at the top of the detector: accidents not an
        adversary, not a sandbox, why fx cannot do better on Codex today, and the
        rule for extending it, which is that every gate is an allowlist and a
        surface too large to enumerate gets dropped rather than gated.

Task 08: fix round 1 dispatched now that task 06's round 3 has reported.

Task 06: final re-review returned **fix verified, no blocking findings.**
        Two mutations both went genuinely red, including one proving the
        space-form assertion is not redundant with the `=` form.
        The ceiling comment was judged "a rule, not an apology", and the ADR
        table row was judged self-contained: a reader who only reads the table
        comes away knowing Codex is not a peer.

**The bounded fourth-level probe found one, and that is the point.**
        `git -c diff.external=<program> diff` is allowed and **invokes an
        arbitrary program**. The reviewer demonstrated it for real in a scratch
        repo: the external program ran and wrote a file. `parseGit` in
        `lib/git-guard.js` consumes `-c key=value` as an opaque global option and
        never inspects the value, so `gitMustBeRefused`, which checks only
        post-subcommand tokens, cannot see it.

Ruling: log it, do not fix it. This is the ceiling working exactly as written.
        Three rounds closed binaries, subcommands and flags, and the fourth level
        was reachable in one bounded probe. Patching it would close one instance
        of a class and leave `-c core.pager=`, `-c` anything-else, and whatever
        comes after.
        The module's own policy already says this: "the next gap found here gets
        logged and weighed against dropping the affected binary/subcommand, not
        automatically patched".
        **What makes this acceptable is that it is written down.** An unrecorded
        bypass is a false guarantee; a recorded one is a known limit. Task 13 now
        carries two criteria: record the instance in ADR 0019, and comment it
        beside the git gate so nobody rediscovers it and assumes it is news.
        Cost if wrong: someone treats the Codex lens gate as a security boundary.
        Caught by ADR 0019's "Codex is not equivalent" section, the ceiling
        comment, and now this specific instance being named.

Task 06: complete (commits 084bfc6..c0024ec, 3 fix rounds, re-review clean).
        Spec PASS, quality PASS, no blocking findings. Files:
        scripts/gen-codex-agents, codex/agents/*.toml, lib/plant-roles.js,
        lib/plant-roles.test.js, scripts/check-generated, hooks/fx-codex.js,
        tests/gates/codex-manifest.test.js, scripts/check-all,
        docs/adr/0019-read-only-is-three-mechanisms-and-one-guarantee.md.
        Guarantee, stated at its real strength: on Codex a read-only agent is
        prevented from writing **by accident**, by a heuristic gate in fx's own
        hook that fails closed on unclassifiable identity. It is not a sandbox
        and is strictly weaker than Claude Code's and opencode's harness-enforced
        allowlists. That asymmetry is now in ADR 0019 rather than implied away.

