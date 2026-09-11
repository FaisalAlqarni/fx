# Task 08 review: `/fx:audit` (`25b24b8..46f0ab9`)

**Reviewed:** `commands/fx-audit.md` at `46f0ab9`, unchanged at HEAD. Line numbers
below are that file's unless another file is named.

**Gates re-run by the reviewer:** `python3 scripts/check-paths` OK, 55 citations,
exit 0. `python3 scripts/check-artifacts` OK, exit 0. `python3 scripts/check-prose
commands/fx-audit.md` OK, exit 0. `scripts/check-all` was not run, per instruction.

**Probe evidence read:** `run-red.json`, `run-green-1.json`, `run-green-2.json`,
`run-green-3.json`, `run-resume.json` and `01-current.sha256.before` in
`/home/faisal/.claude/jobs/6d844eaa/tmp/`, parsed event by event rather than
taken from the report.

## Spec Compliance

### Acceptance criteria

- ✅ Optional scope and optional `--against` accepting a path, branch, tag or revision: 9-15.
- ✅ A path is read in place; a ref resolves into `.worktrees/audit-<name>-reference`, removed at the Phase 2 gate: 139-142, 151-152.
- ✅ Never guesses a branch name; an unresolvable ref stops and asks: 143-144. The wording is "Never try a nearby name, such as another branch spelling or a remote prefix", and `git rev-parse --verify` at 140 does no remote DWIM, so the rule and the command agree.
- ✅ `.worktrees/` confirmed ignored first, fixed through the local exclude file and never `.gitignore`: 71-77, 141. Checked on this repository: `git check-ignore -v .worktrees/audit-x-reference` reports ignored while `.worktrees/` does not exist, so "works before the path exists" (72) holds.
- ❌ Phase 2 skipped silently: the text says so at 135-136, but the resume run on the committed text printed "Phase 2 is skipped since no `--against` was given". Minor M3.
- ✅ Every phase ends with ten lines or fewer and a stop: 129-131, 151-152, 184-186, 214-223, 225-229. Observed: GREEN 3's final message is 7 lines, the resume run's is 3.
- ✅ Resume at the first missing document, saying which phase: 81-101. Observed: "Resumed at Phase 3 in `docs/plans/2026-09-11-audit-fx-audit-probe/`".
- ❌ Phase 1 explorers each writing to `.fx/`: the brief is right (107-116) but names nothing an explorer needs to write, and on the committed text two of three explorers could not. Important I3.
- ✅ Empty explorer re-dispatched once with more context, then listed under Areas not covered: 117-120.
- ✅ Phase 3 dispatches `fx-lens-pipeline` and `fx-architecture` and no other lens: 35-37, 163-170.
- ❌ Every verdict's line opened before the claim: 176-178 says so, but reference rows cannot be opened once the Phase 2 gate removed the worktree. Important I5.
- ✅ `03-gaps.md` ordered by impact: 179.
- ✅ Phase 4 writes `design.md` under that name: 197.
- ✅ The recommendation names what would make the opposite win: 201-204.
- ✅ HTML report in the slug directory, no temp directory: 205-209; `check-artifacts` exit 0.
- ❌ A sound architecture as a stated outcome: 190-196 and 217 state it, but one of its three checks depends on a reply no document records. Important I4.
- ✅ Boundary: edits no code, hands off to `fx-plan`: 27-34.
- ✅ Does not restate the templates, lens or skill in substance. Two small restatements, Minor M9.
- ✅ `check-paths`: both citations anchored as `../references/...` and resolving, count 53 to 55.
- ✅ `check-artifacts` exit 0.
- ⚠️ `scripts/check-all` exit 0: not run by this review. `check-all-final.txt` on disk records ALL GREEN.

### Rulings and amendments

- ✅ **Ruling V, command half.** Targets come from the brief, a pointed-to file, or the reply to the Phase 1 gate, and are asked for when absent: 16-18, 129-131, 156-159. Quoted verbatim with source in the template's one form, with the empty case on `none`: 159-161. The codebase argument is `<scope>`, and 20-21 says it is called nothing else. The resume run asked again in a new session, as 158-159 directs. The second sense of "target", Minor M1.
- ✅ **Ruling AA.** 38-42 states that other queue behaviour is judged "only as far as Phase 3's own reading reaches, with no dedicated pass behind it", which is the ruling's clause. The bold lead reads the other way, Minor M2.
- ✅ **ADR 0014 lines 75 to 82.** The ADR says Phase 3 dispatches the lens and `fx-architecture` and neither of branch review's passes, so those defects are judged only as far as the phase's reading reaches. 35-42 matches.
- ✅ **Task 06 and 08 brief checks.** The probe project sat under the job directory, not `/var/tmp`: every tool path in the logs is `/home/faisal/.claude/jobs/6d844eaa/tmp/fx-audit-probe`.
- ⚠️ **Whether `fx-lens-pipeline` resolves by name.** No run reached Phase 3.
- ✅ **Probe run checked against the machine.** Every log's init event lists one fx plugin, path `/development/fx/.worktrees/fx-audit`, source `fx@inline`. ⚠️ `--max-turns` enforcement stays unconfirmed; no run hit its limit.
- ✅ **Design read against task 08.** `fx-architecture` is invoked through a subagent by `fx:fx-architecture`, bounded to stop before choosing, with the choice at the Phase 3 gate: 166-170, 184-186. The report locations and which is which: 58-64. The skeleton is the first of three `markdown` fences: 171-172, matching `references/audit-template.md` fences at 103, 149 and 159. The exclude-file precedent for `.worktrees/`: 71-77, 141.
- ✅ **Coverage item 1.** `disable-model-invocation: true` at 3, and a human one-liner at 2 per `skills/fx-authoring/SKILL.md:292-293`. ⚠️ The amendment's proof, absence from the model-facing listing, is not shown: the init event's `skills` array in `run-green-3.json` lists `fx:fx-audit`, and that array's meaning is unknown.
- ❌ **Coverage item 2.** The sound verdict is recorded (91-92, 194-196) and the slug directory is found by name, whatever its date (81-87). But the sound decision rests on an unrecorded reply (Important I4), and matching by basename both collides and cannot start a fresh audit (Minor M10).
- ✅ **Coverage item 6 (task 08's half).** Never commits; the last gate names the files as untracked: 30-32, 214-215.
- ✅ **Coverage item 9.** Status `draft, not approved` until an explicit yes sets the template's value, then `fx-plan`: 199, 218-221, with re-presentation on resume at 93-94. Consistent with `skills/fx-plan/SKILL.md:15-16`.
- ✅ **Coverage item 10.** Terms come from the code's identifiers or `CONTEXT.md` (112-114), present in all five explorer briefs in `run-green-3.json`. Unassigned top-level entries go under Areas not covered (122-124). A Phase 3 dispatch that could not run is stated (173-175).
- ✅ **Ruling AC.** The Phase 4 report has inline styles and diagrams as preformatted text or inline SVG, and fetches nothing: 205-209. The boundary says `fx-architecture`'s report loads CDN scripts: 43-45. `HTML-REPORT.md` is untouched; the diff holds one file.

### Probe evidence, verified from the logs

- ✅ **RED.** `run-red.json` init lists fx commands without `fx:fx-audit`; the result is `Unknown command: /fx:audit`. Its prompt could never have resolved (see I1), so the init list is the RED evidence that holds.
- ✅ **GREEN 3 gated.** Top-level tool calls: a heredoc writing `docs/plans/2026-09-11-audit-fx-audit-probe/01-current.md`, and no tool call naming `02-reference.md` or `03-gaps.md`. The three explorers went out in one message (`msg_011CexDXAAkc8FwieWypn1h5`). The final message is 7 lines.
- ✅ **Resume.** Two top-level tool calls, both read-only (`ls`, `find`, `cat`, `grep`), no Write or Edit. The message starts `Resumed at Phase 3`.
- ⚠️ **Checksum.** Only `01-current.sha256.before` is on disk (`5da2ee46...`). The after-hash appears only in the report, and the scratch project is deleted. The log's absence of any write is the stronger evidence anyway.
- ⚠️ **Which text GREEN 3 ran.** The command body is not in the stream log. The amended glossary sentence is in every explorer brief, so amendment 5 was present; byte identity with `46f0ab9` cannot be shown.

## Strengths

- **Documents are the state.** The resume rules at 89-101 are short and exact: an existing document is never rewritten, with two named exceptions, and a redo is a deletion by the user. The resume run obeyed them.
- **The `fx-architecture` bounding at 166-170 is precise.** It gives the report location, the stop point before the question the skill would otherwise ask (`skills/fx-architecture/SKILL.md:130-131`), and the return shape. The choice moves to a gate the user can answer.
- **Phase 2's guards are concrete commands rather than intentions:** `git rev-parse --verify --quiet "<ref>^{commit}"`, an ignore check on the exact path, `--detach`, and removal at the gate.
- **The ignore check works on paths that do not exist yet, and uses the local exclude file** (71-77), so a repository's tracked `.gitignore` is never edited and a re-include rule stops the run.
- **Ruling AC is honoured without touching a shipped skill,** and the boundary tells the reader the two reports differ in what they fetch.
- **The implementer's report was candid.** It flagged the wrong command name, the template hunt, the read-only explorers and the unproven listing absence as concerns rather than burying them, and every one of those checked out on disk.

## Issues

### Critical

None.

### Important

**I1. The name the command documents does not resolve. Plan-mandated.** 6 and 9.

The heading is `# /fx:audit` and the usage line tells the user to type `/fx:audit [<scope>] ...`. `run-red.json` and `run-green-1.json` both return `Unknown command: /fx:audit`, the second with `fx:fx-audit` present in the init `slash_commands`. A user following the command's own usage line gets an unknown command. The design (`design.md:48`) and the task title name it `/fx:audit`, and the task fixes the file as `commands/fx-audit.md`, which is why it resolves as `fx:fx-audit`. Fix within this file: the usage line shows `/fx:fx-audit`, whatever the heading keeps. The repository-wide choice between renaming files and renaming documented names is outside this task (see Observations).

**I2. The agent is given no way to open the templates it depends on in every phase. Plan-mandated in part.** 66-67, used at 109, 160, 171, 197-198.

A command body is injected without its plugin's base directory, so `../references/audit-template.md` is relative to nothing the agent knows. From the user's repository it could even resolve to an unrelated file.

- **Observed on the committed text.** GREEN 3 and the resume run each opened with `find / -name audit-template.md -path '*references*'`. GREEN 2 went further: it backgrounded and killed a `find /`, then read `~/.claude/plugins/installed_plugins.json`, grepped `~/.claude/settings.json`, and read `/proc/$PPID/cmdline` and `env` before finding the worktree copy.
- **Why it only worked here.** `audit-template.md` exists in exactly one place today; the search also returned a `/mnt/wslg/distro` mirror of the same path. `design-template.md`, which Phase 4 composes, already exists in eight fx copies on this machine: `~/.claude/plugins/cache/fx/fx/0.1.0` to `0.1.6` and `~/.claude/plugins/marketplaces/fx`, besides the worktree and the main checkout. After this branch ships, `audit-template.md` joins them.
- **The consequence.** A whole-filesystem search then returns many copies and the command gives no rule for choosing. A stale template changes the Stated targets form, the count anchors and the fence order that Phase 3 step 4 names by position.
- **Not a wording defect.** The constraint forbids an environment variable, and the `../references/...` form is required by the acceptance criterion. What is missing is any locating rule that works under those constraints. `/fx:critique` avoids the problem only because its agent resolves by name; `/fx:grill` has the same defect. This needs a decision from the controller, not a guess by the implementer.

**I3. Phase 1 does not say an explorer must be able to write its findings file, and the committed text's run showed the failure.** 107-120.

Step 2 requires each explorer to write `.fx/<slug>/explore/01-<area>.md`, "its only write", but names no agent type or capability. In `run-green-3.json` the session dispatched three `Explore` agents. Two returned "Unable to write file due to READ-ONLY mode constraint" and "I cannot write files in read-only mode". Both then printed their findings inline, breaking "Never the findings themselves" (115-116) and putting the text into the controller's context, which is the point the file handoff exists to prevent. The session spent step 3's single retry, meant for an area that yields nothing, on re-dispatching them as `general-purpose`. On a larger scope with more areas, most first dispatches can fail this way, and any area that is then genuinely hard gets no retry left. A runtime-neutral fix: the brief says the explorer must be able to create one file, and names a read-only agent type as unsuitable.

**I4. Phase 4's sound verdict depends on a reply no document records, and the verdict it produces is permanent.** 184-186, 190-196, 91-92.

The third soundness check is "the user took up no candidate at the Phase 3 gate". That reply lives only in the conversation: 03-gaps.md records the report path (63, 173) but not the choice. The command handles the same loss for stated targets (158-159, observed working in the resume run) but not for this one. A session resumed at Phase 4, which story 5 and 97-101 explicitly support, cannot know what the user chose. It either asks nothing and treats "no reply" as "no candidate", or invents one. If the other two checks pass, it appends `## Phase 4 verdict: sound` and 91-92 then makes that verdict final on every later run: exactly the outcome coverage item 2 was amended to prevent, arriving by another route. Separately, a candidate the user does take up changes only the soundness test: step 2 (197-200) argues the recommendation "from `03-gaps.md`'s rows" and never says to take the chosen candidate into `design.md`. Fix: record the choice in `03-gaps.md` at the gate, or ask again at Phase 4 when the session does not hold it, and say where the chosen candidate goes in `design.md`.

**I5. Phase 3 must open every row's line, but reference rows point into a worktree Phase 2 already removed. Plan-mandated in part.** 151-152 against 176-178.

The template counts `02-reference.md`'s features as rows (`references/audit-template.md:123-125`), and a feature present in the reference and missing in the scope can only cite the reference tree. When `--against` is a branch, tag or revision, the worktree is gone at the Phase 2 gate, as `design.md:183-185` and the acceptance criterion require. Step 5 then cannot be carried out for those rows, and nothing tells the agent what to do instead. The command already records "the commit actually read" (148-149). One clause closes it: open a reference row's line with `git show <that commit>:<path>`.

### Minor

**M1. "Target" still carries two senses.** 59, 60, 188. Ruling V's letter is met: the codebase argument is `<scope>`. But 20 defines a stated target as "only ever something the user named", and 60 then calls `design.md`'s content "the target". "Target architecture" at 59 and 188 is a fixed phrase from the design and hard to misread. The bare "the target" at 60 contradicts the definition ten lines after it. Fix: "Rendering of `design.md`".

**M2. The queue boundary's bold lead reads against Ruling AA.** 38. Ruling AA and ADR 0014:75 lead with "has no dedicated pass"; the command's bold lead says "Queue behaviour has one dedicated pass". The body then states the ruling's clause correctly, but a reader skimming the bold leads of the Boundary list takes away the opposite. The example list at 40-41 also differs from ADR 0014:76-77 (poison messages, lease timing and retry jitter there). Lead with the gap: "Queue behaviour beyond unbounded enqueue has no dedicated pass."

**M3. Phase 2 is not silent on resume, and `--against` does not survive one.** 95-96, 135-136. The resume run printed "Phase 2 is skipped since no `--against` was given", against the acceptance criterion. The Resume section decides from the flag given on this run, and no document records the flag from the first run. A user who started with `--against` and re-runs the bare command after the Phase 1 gate silently loses the comparison; only 03-gaps.md's "Compared against" line reveals it later. Record the reference in `01-current.md`'s header, or ask when `02-reference.md` is absent and the flag is too.

**M4. Phase 3's file set drops untracked code that Phase 1 mapped.** 162. `git ls-files <scope>` lists tracked files only. In the probe the only file, `src/sender.js`, was untracked: GREEN 3's own `01-current.md` notes "`git ls-files` returns nothing". So Phase 3 would hand both dispatches an empty set. The lens would then report nothing, which counts toward the soundness check at 192, on a scope whose one file is an unbounded enqueue. Include untracked, non-ignored files (`git ls-files --cached --others --exclude-standard <scope>`), or state the exclusion at the gate.

**M5. The stated targets are not passed to the `fx-architecture` subagent.** 166-170. The skill anchors requirements before judging complexity, and where the repository cannot say, it records an assumption (`skills/fx-architecture/SKILL.md:47-55`). The audit holds the user's own stated targets by that step and gives the subagent only the file set, so its candidates are judged against assumed requirements. Add the targets to the brief.

**M6. The Phase 4 gate's file list cannot fit the ten-line rule as written.** 214 against 227. "Name every file the audit wrote" includes every `.fx/<slug>/explore/*.md` working file, one per area per mapped phase, on top of the slug documents, both reports, the recommendation, the defeater, the approval request and the resume line. Say "every document in the slug directory"; the `.fx/` files are regenerable.

**M7. Two resume states have no rule.** 91-96. An approved `design.md` (Status no longer draft) with every document present falls through to "the first phase whose document is missing", and there is none. A `design.md` whose report was never written re-presents the gate with no report path to print. One line covers both: a finished, approved audit reports its paths and points to `fx-plan`, and a missing Phase 4 report is written before the gate.

**M8. The boundary says "and nothing else", then the command writes elsewhere.** 27-29 against 73-76. The local exclude file is outside the three places listed. Name it in the boundary.

**M9. Small restatements of what the templates own.** 181 restates the row-count rule at `references/audit-template.md:128-129`, and 211-212 restates the module count rule at `:190-193`. The distinction between the two HTML reports is stated three times: 43-45, 62-64, 205-209. The templates own the counts; "every count the template states holds" drifts less if the template changes.

**M10. Slug naming collides and cannot start over.** 49-51, 81-87. `<name>` is the scope directory's basename, so auditing `engines/core/app` after `engines/survey/app` resumes the first audit, including any permanent sound verdict. `01-current.md` has no scope field to catch the mismatch. And because any match resumes, a fresh audit of the same scope months later is impossible without deleting the old directory, which the command never says. Derive `<name>` from the scope path, record the scope in `01-current.md`, and say how to start over.

## Observations outside this task

- **Every command's documented name fails to resolve.** `README.md:104` and `:139`, and the headings of `commands/fx-critique.md`, `fx-grill.md`, `fx-handoff.md` and `fx-setup.md`, document `/fx:<name>`; Claude Code resolves `fx:fx-<name>`. This is a repository-wide decision, and I1 is this file's share of it.
- **`commands/fx-grill.md` cites `../references/vocab/grilling.md`** with the same unreachable-path defect as I2.
- **Eight fx copies sit in the plugin cache and marketplace directory** (0.1.0 to 0.1.6 plus `marketplaces/fx`), so any filesystem search for a fx reference is already ambiguous on this machine.
- **The `Explore` agent prints its findings inline when it cannot write.** Any fx lane that hands a read-only agent type a file to write inherits I3's context cost.
- **The description at 2 describes the phase shape.** The Global Constraint says a description "never summarises a workflow". For a user-invoked entry, `skills/fx-authoring/SKILL.md:292-293` asks for a human-facing one-liner instead, and the four sibling commands' descriptions do the same. The constraint's wording and the authoring table disagree for commands; worth one line in the completion report.
- **Ruling AC stays a holding position:** `skills/fx-architecture/HTML-REPORT.md:45-47` still loads two CDN scripts into the slug directory this command writes to.

## Assessment

**Task quality:** Needs fixes

**Reasoning:** Phase 1 gates and resumes as observed, and the rulings are carried in the text. But the typed name does not resolve, the templates cannot be located reliably, the explorer brief failed on the committed text, and Phases 3 and 4 each contain a step an agent cannot carry out (reference lines after the worktree is removed, a sound verdict built on an unrecorded reply).
