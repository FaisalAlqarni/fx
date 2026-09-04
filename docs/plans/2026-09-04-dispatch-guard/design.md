# Dispatch guard: making the lane's guarantees checkable

**Status:** implemented and verified live. Steps 1 to 6 complete.

All four verdicts confirmed against a running guard, after the cache was synced:

```
deny   malformed role=implementer   -> REFUSED, naming all four missing clauses
allow  well-formed role=implementer -> dispatched
adhoc  role=adhoc reason=...        -> dispatched
warn   no marker, plan present      -> dispatched with a warning
```

The payload assumption in Risks below is **confirmed true**: PreToolUse fires
for `Agent` and `tool_input.prompt` and `subagent_type` both reach the hook. It
was twice reported false first, against a stale version-keyed cache. See
DEBT #67.

## The problem, measured

Over one twelve-task build with a controller actively trying to follow the lane:

| | |
|---|---|
| `Skill` calls in the controller session | 2 (`fx:fx-plan`, `fx:fx-implement`) |
| `Skill` calls across 111 subagent transcripts | **0** |
| `fx-tdd` SKILL body loaded, anywhere | **never** |
| Agent dispatches | 77 |
| ...using fx lens agents | 35 |
| ...`general-purpose` with hand-written prompts | **26 of 26 writers and reviewers** |

The lenses fired. The hooks fired: `PREAMBLE.md` reached the subagents (three
dashes in 15,459 inserted lines), and the guard blocked two attribution trailers
and four writes into the main checkout. The chain fired at the top. Below that,
the guarantees were carried by whichever sentences the controller happened to
write.

Four DEBT entries were lost the same way and none is fixed by the paragraph it
received, because each went into a template nobody is required to use: #52 the
ledger handoff, #53 refusing a bad instruction, #60 the reviewer's no-subagent
rule, #61 the findings file. #65 is their parent.

**The failure is not ignorance.** The controller referenced `fx-tdd` 298 times
in the same session it never dispatched it. The failure is reconstruction under
time pressure dropping whichever clause is not currently in mind.

## Two facts that shape the design

**The template's own instruction is probably broken.** `implementer-prompt.md:46`
says ``Invoke `fx-tdd` before writing any code``, unprefixed. Plugin skills
address as `plugin:skill`; the two calls that worked this session were
`fx:fx-plan` and `fx:fx-implement`. A perfectly compliant implementer may have
failed to resolve it. **Fix this regardless of the rest of this design.**

**The hook already sees every dispatch and ignores it.** `hooks.json` matches
`*`; `fx-pretooluse.js:51` reads `input.tool_name` and branches on `Bash` and
`Write/Edit/MultiEdit/NotebookEdit` only. All 77 dispatches went past it. This
is the only component in fx that has ever stopped a controller doing the wrong
thing, and it is one branch away from seeing dispatches.

## What this design does not do

It does not inline `fx-tdd` into the implementer prompt. `fx-tdd` is also a
standalone lane, two copies drift, and this build ruled three times that one
rule gets one definition. Inlining is that defect at plugin scale.

It does not add a skills-and-agents directory to `fx-implement`. Discovery was
never the gap. The one useful piece of that idea, **addressable names**, is
folded in below.

## Design

### 1. The dispatch file

`fx-implement` writes the filled prompt to disk before dispatching, and the
controller sends its contents.

```
.fx/dispatch/<NN>-<role>.md          implementer, task-reviewer, re-review
.fx/dispatch/branch-review.md        the whole-branch pass
.fx/dispatch/fix-wave.md
```

`.fx/` is git-ignored and that is correct here. DEBT #43's lesson was that a
**disclosure** in a git-ignored directory is lost; a dispatch is working state
whose purpose is served at dispatch time. The durable record stays the ledger.

Format: a marker line, then the filled template verbatim.

```markdown
<!-- fx-dispatch: role=implementer task=07 template=implementer-prompt.md -->

You are implementing task 07: ...
```

The marker is the first line so the hook can read it without parsing the body.

### 2. What the hook checks

The naive check is provenance: does this prompt match a file on disk. **Reject
that.** It is brittle against adaptation, and adaptation was valuable in this
run: the briefs that carried ledger rulings, prior findings and named risks are
why several defects were caught.

Check **clauses, not provenance.** What was lost was clauses. A hand-written
dispatch that carries them is fine; a file-derived one that drops them is not.

New branch in `fx-pretooluse.js`:

```
tool === 'Agent'
  → read tool_input.prompt and tool_input.subagent_type
  → find the role marker in the prompt
  → look up that role's required tokens
  → compare
```

Per-role required tokens, each traceable to a measured loss:

| Role | Required in the prompt | Why |
|---|---|---|
| `implementer` | `fx:fx-tdd` · `RED` · attribution prohibition · report path · "did not do as instructed" | #65, #53 |
| `task-reviewer` | ledger path · findings path · no-subagent rule · "do not trust the report" | #52, #60, #61 |
| `re-review` | findings path · `ADDRESSED` | #61 |
| `branch-review` | findings path · no-subagent rule · deferred-minors triage | #60, #61 |

The exact token list belongs in one exported table in `lib/`, shared by the hook
and its tests, so a rule added to a template and not to the table is visible as
a table with no test.

### 3. Refuse versus warn

This is the load-bearing decision and it is where a guard like this usually goes
wrong. #46 and #47 already record a guard that misfires being routed around
rather than fixed.

**REFUSE a contradiction.** The prompt declares `role=implementer` and omits
required tokens. The controller stated what this dispatch is and then did not
make it that. Unambiguous, cheap to comply with, and it cannot fire on anything
that was not already claiming to be a lane dispatch.

**WARN on an omission.** A `general-purpose` Agent dispatch, in a repository
with `docs/plans/*/tasks/` present, carrying no role marker at all. That is
probably a lane dispatch that skipped the file, and it is sometimes a legitimate
one-off. A warning is delivered and the dispatch proceeds.

**IGNORE everything else.** Lens agents, `Explore`, any dispatch in a repository
with no active plan. fx's five agents carry `tools: Read, Grep, Glob, Bash` and
cannot invoke skills at all, correctly, so they are outside this entirely.

**Escape hatch, and it is required.** `<!-- fx-dispatch: role=adhoc reason=... -->`
passes silently. A guard with no escape is a guard people route around, which is
#46's actual lesson. The reason is required so the escape is legible.

### 4. The `fx:fx-tdd` prefix fix

Independent of all the above and worth doing first: correct the unprefixed skill
name in `implementer-prompt.md`, and audit every other skill reference in every
template for the same bug.

## Risks

**The payload shape is an assumption.** This design needs `tool_input.prompt`
and `tool_input.subagent_type` to reach a `PreToolUse` hook for the `Agent`
tool. That is not verified. **Implementation step one is a probe through the
real harness**, not a crafted stdin: piping invented JSON at the hook is exactly
the wrong-context verification DEBT #16 records five times, once by this
controller against this same hook.

**Refusing a dispatch is higher blast radius than refusing a command.** A
blocked `Bash` call costs a retry. A blocked dispatch can strand a plan mid-run
if the rule misfires. The refuse case is deliberately narrowed to a
self-contradiction for this reason.

**Token matching is shallow.** A prompt containing the literal string `fx:fx-tdd`
passes whether or not it tells the implementer to invoke it. This buys the
clause being present, not the clause being meant. That is still strictly more
than today, where twelve dispatches carried the summary the template calls "not
a substitute", but it should not be described as more than it is.

**It does not make the implementer comply.** The prompt will say to invoke
`fx:fx-tdd`; whether the subagent does is not observable from here. Measuring
that needs a `SubagentStop`-style check or a report field, and is out of scope.

## Verification

`lib/dispatch-check.test.js`, alongside the three existing guard suites, run the
way they are run (`scripts/make-git-fixture`, two directory arguments).

Cases, each one a real shape from this build:

1. implementer prompt with every token → allow
2. the same minus `fx:fx-tdd` → **refuse** (the measured failure, twelve times)
3. task-reviewer without a ledger path → refuse (#52)
4. branch-review without the no-subagent rule → refuse (#60)
5. any role without a findings path → refuse (#61)
6. `general-purpose`, no marker, plan present → warn, allow
7. `general-purpose`, no marker, no plan present → silent
8. lens agent, no marker → silent
9. `role=adhoc` with a reason → silent
10. `role=adhoc` with no reason → warn

Plus the mutation discipline this build settled on: each case must fail if its
token is removed from the shared table, and reverting must restore a
byte-identical file. Copy the file back; never `git checkout` the path.

## Measured before landing

The refuse case was validated by replaying this build's own dispatches through
the check, which is stronger evidence than the "run one build in warn-only mode"
the ordering below asks for, and available immediately.

79 dispatches from the controller transcript, replayed at the controller's real
cwd:

```
allow 35    warn 42    DENY 2
```

Both denials are the two deliberate probes, which declared `role=implementer`
and carried no clauses. **Zero false refusals across the 77 real dispatches**,
which is the property the refuse case was narrowed to guarantee: it cannot fire
on anything that did not first claim to be a lane dispatch.

What it would have caught, classifying each dispatch by its real role:

```
classifiable as a lane role:                38
  missing at least one required clause:     33

  12  implementer: the `fx:fx-tdd` invocation      <- one per task
  10  task-reviewer: the no-subagent rule
   9  implementer: the deviation disclosure
   7  task-reviewer: the ledger path
   7  re-review: per-finding verdicts
   3  task-reviewer: a findings path
   2  branch-review: the no-subagent rule
```

The top row is DEBT #65 exactly: twelve tasks, twelve dispatches, the skill
never invoked once.

## Blocked on the plugin being reinstalled

Steps 2 and 6 cannot complete in the session that wrote them. `CLAUDE_PLUGIN_ROOT`
is `~/.claude/plugins/marketplaces/fx`, a clone of the GitHub remote, so the
running hook is the last **commit** and every change here is uncommitted. A
probe dispatched against the new branch was not refused, and that measured the
old hook rather than the assumption. See DEBT #66.

To finish: commit the tree, update the marketplace clone, then re-run the probe.
Both of those are the user's to initiate.

## What lands, in order

1. The `fx:fx-tdd` prefix fix and a sweep for its siblings. Independent, no risk.
2. The probe: confirm the `Agent` payload shape through the harness.
3. `lib/dispatch-tokens.js`, the shared table, plus its test suite red first.
4. The `Agent` branch in `fx-pretooluse.js`, warn-only at first.
5. `fx-implement` writes the dispatch file and dispatches its contents.
6. Turn on the refuse case only after a full run has produced zero false
   refusals in warn-only mode.

Step 6 is the point of the ordering. A guard that fails open on a hard rule is
the concern that deferred #46 and #47, and the cheapest way to earn confidence
is to run it silent for one build first.
