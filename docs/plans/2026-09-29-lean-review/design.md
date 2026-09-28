# Lean review: fewer agents per task, review in bulk at the end, defaults that stick

**Date:** 2026-09-29
**Status:** draft, awaiting owner review
**Supersedes:** the "per-task review stays exactly as it is" clause of
`docs/plans/2026-09-23-lean-build/design.md` (lines 34 to 40 and 59 to 60), and
ADR-0012 in part (motion; see §8).
**Glossary:** no `CONTEXT.md`. Terms as the skills use them: lane, controller,
ledger, task review, lens, tripwire, fix round, re-review, branch review.

## Problem

The owner ran fx-implement on `advantage-backend` from 2026-09-21 to 2026-09-28
and found it slow and costly. Two things were measured.

**Where the agent time went.** 728 subagent transcripts from the two steering
sessions (`3ea3f51e`, `e3b16772`), classified by `fx-cost.py` (kept as evidence
at `docs/plans/2026-09-29-lean-review/measure/fx-cost.py`):

| Role | Agents | Agent-minutes | Share of minutes | Share of output tokens |
|---|---|---|---|---|
| implementer | 146 | 7079 | 57.5% | 37.6% |
| fix round | 74 | 1639 | 13.3% | 12.7% |
| task review | 155 | 1058 | 8.6% | 13.5% |
| re-review | 76 | 365 | 3.0% | 5.4% |
| all five lenses | 121 | 402 | 3.3% | 6.1% |
| devil's advocate | 21 | 133 | 1.1% | 2.5% |
| other (plan, audit, fork) | 135 | 1639 | 13.3% | 22.3% |

Agent-minutes run first to last timestamp, so idle waits count and parallel
agents overlap: these are upper bounds, not wall-clock. Of the 620 agents with
an explicit model, about half of implementers, fixes and reviews ran on Opus.
Test scoping held: 6 full-suite runs against about 3,300 targeted or directory
runs. One session's `/usage` report: $383.95, of which Opus $374.94;
`general-purpose` subagents 54% of usage.

**Why the owner had to steer it by hand.** The same pipeline instructions were
given about seven times between 2026-09-21 and 2026-09-26: scoped tests, skip
untriggered lenses, controller re-review of one-line fixes, "one reviewer plus
the most relevant lens" (decision 38), then no per-task lenses at all with one
combined pass at the end. Caveman, ponytail and repowise in subagents were asked
for ten times. Three causes, each confirmed in this repo:

1. The rules are prose in an 850-line skill plus three templates. After a
   compaction, `hooks/fx-context.js` re-injects only the preamble, so the
   controller works from a summary that drops them.
2. Owner rulings live in chat and in one plan's ledger. A new plan starts a new
   ledger, so a ruling is lost at the plan boundary. Decision 38 survived only
   because the agent wrote it into each ledger's line 5.
3. Nothing checks a dispatch. `model` is "REQUIRED" in the templates' text; no
   hook reads it, and on advantage-backend about half of implementers, fixes
   and reviews ran on Opus where standard tier was the rule.

## What this design does and does not change

It changes review shape (about 7% of agent-minutes directly, plus the fix
rounds per-task lenses trigger), the fix loop's re-review, the baseline test
run, and the mechanisms that keep defaults in force. It does **not** touch
implementer duration, the largest cost at 57.5%, or controller context size.
Those are the next design's subject. Expected gain here is fewer agents per
task and fewer fix rounds; no wall-clock percentage is claimed until a build is
measured (§11).

## Decisions (owner, this session)

- R1. Per task: the task reviewer, plus a narrow security or database
  tripwire. Everything else, including devil's advocate, runs once at the end.
- R2. The end pass is fx-review branch mode, which already exists.
- R3. Tests: `test_scope` per task, `test_all` once after all tasks.
- R4. Defaults are held by mechanism, not prose, on all three runtimes.
- R5. A built-in, conditional companion-tools line in the preamble,
  overridable per repo in `.fx.json`.
- R6. fx-brainstorm gains a confidence check before approaches or design.
- R7. Four review items from `akkie76/code-review-skills` go into existing
  prompts.
- R8. Content from `cloudflare/security-audit-skill`, `emil-design-eng` and
  `better-ui` goes into existing lenses and a new stack reference. firecrawl,
  seo-audit and ai-seo are not adopted.
- R9. README gets the measured data above, with method and caveats.

## 1. Per-task review

Each task gets:

- **The task reviewer** (spec plus quality), standard tier. Unchanged except §6.
- **The security tripwire**, `fx-lens-security` (pinned Opus), only when the
  task's diff adds or changes any of: authentication or authorization code
  (login, session, token issue or verify, policies, `authenticate` filters and
  their skips, `[Authorize]`/`[AllowAnonymous]`); credentials, secrets or key
  material; a new route or endpoint; code that fetches, redirects to or stores a
  user-supplied URL or host; string-built SQL or shell.
- **The database tripwire**, `fx-lens-database` (pinned Sonnet), only when the
  diff contains a migration, a schema file change, a new or changed index,
  uniqueness or null constraint, or a backfill or table rewrite.

Nothing else fires per task: not a11y, silent-failure or pipeline, not
security or database on the broad triggers (any model, any params), and not
devil's advocate.

**Where the rule lives.** One place: the lens table in
`skills/fx-review/SKILL.md` §2 gains a "per task" column that holds the
tripwire text for security and database and "no" for the other three.
`fx-implement` keeps pointing at that table, as it does now. The conflicting
task-mode blurb (`fx-review/SKILL.md:18-24`, "lenses off unless auth, payment
or a migration") is rewritten to match. The agent descriptions keep their
broad triggers, since those now govern the branch pass.

**Trade-off, stated.** P1 on advantage-backend had per-task Criticals that
later tasks built on. The tripwire still catches two of the three that
compounded: `HostGuard.pin!` (task 06, user-supplied-host code) and the
`is_deleted` and `lock_timeout` gaps (task 01, a migration). The third, task
12's claim predicate not using task 10's partial index, was a query change
with no migration: under this design the branch pass catches it, later.

## 2. The end pass

After the coverage audit, `fx-implement` invokes fx-review in branch mode, as
now: the broad reviewer, every lens whose broad trigger matches the branch
diff, and devil's advocate in code mode, dispatched in parallel on the most
capable tier where each prompt already says so. One fix subagent takes all
findings, then one scoped re-review. No second fix wave, as now.

Additions: the branch reviewer gets the doc-drift check (§6) and the security
lens gets its two whole-feature checks (§8).

**Risk.** More findings now land in one fix wave. If a wave's findings span
more than one lens, the controller may split them into serial fixers grouped by
file, one re-review each. No other change.

## 3. Fix loop

A fix round's re-review is done by the controller reading the fix diff,
instead of a dispatched agent, when all hold:

- the fix diff is 20 changed lines or fewer;
- it touches only files already in the task's diff;
- the finding came from the task reviewer, not a tripwire lens;
- the finding is not Critical.

Otherwise the dispatched scoped re-review runs as now. The controller still
never writes a fix; it only reads. Ledger line:
`Task NN: fix round R: controller re-review (L lines): clean|<finding>`.
This is the one sanctioned exception to "the controller never reads diffs",
and the 20-line cap is what keeps it one.

## 4. Tests

- Per task and per fix round: unchanged (`test_scope` on touched paths,
  covering tests on a fix).
- **Baseline `test_all` is dropped.** It cost 35 to 45 minutes per run on
  advantage-backend.
- Exit gate: `test_all` once, plus the repository's own CI commands, as now.
  Each failing test is then run alone with `test_one` on the branch and on the
  merge base, which classifies it: fails on both is pre-existing, fails only on
  the branch is introduced, passes alone on the branch is order-dependent.
  Ledger records each. This replaces what the baseline was for, at the cost of
  a few single-test runs.
- The implementer's report already lists commands run. The controller rejects
  a report whose test command is `test_all`, and ledgers it.

## 5. Defaults that stick

### 5a. Model check on dispatch

**Claude Code.** `hooks/fx-pretooluse.js` gains a branch for the dispatch tool
(`Agent`, and `Task` for older versions):

- no `model` and a `subagent_type` that does not pin one in frontmatter (fx's
  six agents pin theirs) → deny: "set model explicitly (haiku, sonnet or opus;
  see model-selection)".
- `model: opus` and the prompt carries no line starting `Opus because:` →
  deny, naming the qualifying reasons from `references/vocab/model-selection.md`.
- Hook error → allow. This is advice-class, like the lane check: fail open.

It applies to every dispatch in a session with fx installed, which matches the
owner's standing rule to route models explicitly.

**Codex.** Hooks see `spawn_agent` but its contents are encrypted
(`references/harnesses/codex.md:16-22`), so no check is possible. The plan
includes one research task: does a Codex role TOML accept a model key? If yes,
`scripts/gen-codex-agents` carries each agent's pinned model through; if no,
`references/harnesses/codex.md` states the gap in a "Model tiers" section.

**OpenCode.** `plugins/fx.js`'s `tool.execute.before` sees `task` calls. The
same research task settles whether `task` args carry a model and whether
`toOpencodeAgent` can carry frontmatter `model`. Enforce what the runtime
exposes; state the rest in `references/harnesses/opencode.md`.

### 5b. Standing rulings

- New repo-level file `docs/plans/rulings.md`: one `Ruling:` line per standing
  owner ruling, in the existing format (`Ruling: … Why: … Cost if wrong: …`).
- `fx-implement` copies it into each new ledger under `## Standing rulings`,
  after the header line.
- When the owner gives a ruling mid-run, the controller asks one question:
  this plan only, or every plan? "Every plan" appends it to `rulings.md` too.
- `lib/plan-state.js` already injects a block naming unfinished plans into
  every session start, including after compaction. For a plan with a ledger it
  now adds that ledger's standing rulings (at most 15 lines) and one
  instruction: invoke fx-implement before the next dispatch. Re-invoking the
  lane reloads the full rules; the block does not copy them.

### 5c. Companion tools line

`lib/preamble.js` appends, after the bootstrap and for sessions and subagents
alike, this default:

> Companion tools. Use each one this runtime has, and skip silently any it
> lacks: repowise for codebase questions before reading or searching files;
> the ponytail skill at full; the caveman skill at full; fx-humanize on prose
> written for people.

(`fx-humanize` renders through `{{LANE:…}}` per runtime.) `.fx.json` key
`companions`: a string replaces the default, `""` turns it off. This is the
first code that reads `.fx.json`: a missing or unparseable file means the
default, never a crash. The line sits outside the bootstrap, whose 3,000
character budget is nearly spent; it counts toward the 9,000 total.

## 6. Review content (R7)

- Task reviewer, quality part: (a) when the diff changes a shared contract,
  check unchanged callers and every variant a shared handler touches; two new
  equivalent paths must agree on precedence, validation and error mapping.
  (b) Before reporting, re-read every cited supporting fact (a line, a caller
  count, a precedent) at its source; drop what does not hold. (c) Test
  constants copied from the implementation, which would drift from the spec.
- Devil's advocate, code mode: (a).
- Branch reviewer (`fx-review/reviewer-prompt.md`): docs, runbooks and
  examples the diff has made stale.

## 7. fx-brainstorm confidence check (R6)

§3's closing paragraph ("Done when the ledger is empty…") is replaced by:

```markdown
### Close the interview with a confidence check

Keep asking rounds until you are 95% confident you understand exactly what
the user is asking for: the ledger is empty and no decision rests on a guess.
Then, in one message:

1. **What made you confident**: the answers and looked-up facts that settled
   it, each tied to the decision it settled. Name any assumption still standing.
2. **What you will do**, in two lines.

Then stop. Nothing happens until the user gives an explicit go: no file
written, no approach proposed, no lane invoked.
```

Checklists: Bounded gains step 3 "Confidence check, then stop until go" before
the short design; Architectural gains step 4 before "Propose approaches".
Red-flag row: "I'm confident, I'll show approaches in the same message" → the
check is its own message; approaches wait for go.

## 8. External content (R8)

**`agents/fx-lens-security.md`, hunt list, any diff:** search, filter, sort or
export path with no tenant scope; export or import path with no authorization;
soft delete or revoke still honoured by a cache, index or job; JWT verify with
no audience or issuer binding; no session reset on login; user-set webhook or
callback URL; log or analytics reader ignoring tenant; different errors for
"missing" and "forbidden". **Branch pass only:** stored-then-reused data in a
new context, and re-authorization on restore.

**New `references/stacks/web-polish.md`** (CSS only, about 35 lines, headed as
heuristics from two unmeasured sources), loaded by `fx-design` §5 and §7:
motion gate by frequency (none on keyboard-triggered or 100+/day actions);
`ease-out` default, `ease-in` banned for UI; UI transitions under 300 ms, exit
shorter than enter; name transitioned properties, never `transition: all`;
transitions over keyframes for interruptible UI; animate transform and opacity
only; press scale 0.97; never from `scale(0)`; popover origin at the trigger;
hover effects under `@media (hover: hover)`; no transitions during a theme
switch; concentric radius (outer = inner + padding); optical alignment of icon
buttons; layered shadow for depth, borders for dividers; 10% black or white
image outline; icon stroke matched to text weight, `currentColor`.

**`agents/fx-lens-a11y.md`:** animation as the only signal of a state change;
the RTL icon flip and don't-flip table.

**`skills/fx-design/SKILL.md` §3:** the "same soft shadow under each card" tell
gets one clause: it is about uniform hierarchy, not layered shadows.

**Not adopted, recorded in ADR:** firecrawl-search (paid, sends per-search
feedback off the machine, second claimant for research); seo-audit and ai-seo
(marketing scope, need a live site; a user may install seo-audit alongside
fx). None becomes a lane: each would be a second claimant for an intent fx
owns.

## 9. README (R9)

- Pipeline diagram: per task shows reviewer plus tripwire; the branch step
  shows every lens and devil's advocate; baseline `test_all` gone.
- Lens table: a "per task" column matching §1.
- New section "What a build costs": the §Problem table, the method, the
  caveats verbatim in substance, and the plain statement that the new defaults
  are not yet measured. Figures come only from `fx-cost.py` output and the
  `/usage` report, each cited.
- "Always on": the model check and the companions line, with the Codex and
  OpenCode limits as settled by §5a's research task.

## 10. ADRs

| No. | Title |
|---|---|
| 0029 | Per-task review is the reviewer plus a tripwire; lenses and devil's advocate run at the end |
| 0030 | Small fixes are re-reviewed by the controller; the baseline suite is dropped |
| 0031 | Defaults are held by mechanism: the dispatch model check and standing rulings |
| 0032 | The preamble carries a conditional companion-tools line |
| 0033 | fx-brainstorm ends its interview with a confidence check |
| 0034 | External review, security and design content absorbed; ADR-0012 amended |

0029 supersedes the lean-build clause; 0034 marks ADR-0012's motion paragraph
superseded and adds SEO and paid web search to its no's.

## 11. Verification

- Gates: `scripts/check-all` once at the end. Touched suites while building.
- New tests: the dispatch model check (deny without model, deny Opus without a
  reason, allow pinned fx agents, allow on hook error); `lib/preamble.test.js`
  for the companions line (default, override, `""`, bad JSON) and the size
  budgets; `lib/plan-state.test.js` for standing rulings in the block.
- Existing text gates that pin phrases: `tests/gates/return-contract.test.js`
  (`one coverage audit`, `**Lens dispatch.**` through `The reviewer gets three
  paths`, `your Write tool`, `confirmed ⚠️:`). Edits keep these strings.
- Agent edits are followed by `scripts/gen-codex-agents`, then
  `scripts/check-generated`.
- **Build measurement.** The next real fx-implement build is measured with
  `fx-cost.py` and compared with the table above. Targets: non-tripwire tasks
  run exactly two agents (implementer, reviewer) plus fix rounds; zero
  dispatches without a model on Claude Code; no ruling repeated by the owner.
  The README section is updated with the result, whatever it is.

## Open questions

- [x] Which lanes run per task → reviewer plus tripwire (R1)
- [x] Where the end pass runs → fx-review branch mode (R2)
- [x] Tests → scoped per task, full once at the end (R3)
- [x] Keep defaults in force → mechanism on three runtimes (R4)
- [x] Companion tools → built-in, conditional, overridable (R5)
- [x] External skills → absorb content, no new lanes (R7, R8)
- [ ] Codex and OpenCode model enforcement → settled by the plan's research task
- [ ] Press scale: 0.97 chosen over 0.96; owner may overrule at review
