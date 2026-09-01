# fx — design

One personal plugin replacing superpowers, mattpocock-skills, ecc, ponytail and
humanizer.

**Status:** all five sections approved 2026-09-01. Self-reviewed (§ Review).

Sections: architecture · components · data flow · error handling · testing.

Supporting material: `SURFACE.md` (inventory) · `OPEN-DECISIONS.md` (D1–D5) ·
`DEBT.md` (known gaps) · `tasks/todo.md` (build state).

---

## 1. Architecture

### The problem being solved

Five plugins each claimed the same intents. Four skills claimed "TDD", four
claimed "code review", four claimed "design", four claimed "simplify". Selection
among identical claims is effectively random, so the same request produced a
different methodology on each run. The plugins were not individually bad; the
**overlap** was.

The measured mechanism: subagents receive the full skill listing (~450–500
entries), and ECC's appear as **bare names with no descriptions** — nothing to
select on but the name.

### The organising rule

**Exactly one claimant per intent.** Everything else follows from it.

Three tiers, distinguished by whether the model may select them:

| Tier | Selectable | Count | Rule |
|---|---|---|---|
| **Lanes** | yes | 9 | One per intent. Descriptions are pure trigger lists — never a workflow summary |
| **Procedures** | yes | **2** | `research` and `prototype` — copied verbatim, descriptions rewritten as trigger lists. Called by a lane, never an entry point |
| **References** | **no** | 24 | Loaded on demand by a lane. Cannot enter a selection contest at all |

The reference tier is what makes the rule affordable. Depth grows **downward**
into `references/`, never sideways into sibling skills — so covering more
ground never adds another claimant.

A documented failure keeps the description discipline honest: a description
that summarised a workflow ("code review between tasks") caused an agent to run
**one** review where the skill specified **two**.

### Knowledge is layered by lifetime, not by topic

| Layer | Owns | Lives | Lifetime |
|---|---|---|---|
| Ecosystem | Rails / .NET / Docker knowledge, true anywhere | `references/stacks/*.md` | ships with fx |
| Repo | *this* project's structure and patterns | `repo.md` | regenerated when the project moves |
| Machine | commands, stack list, coverage | `.fx.json` | changes with tooling |

**Sole ownership per fact** — no fact appears in two layers, so nothing can
drift out of agreement. The required layer is `.fx.json`; an ecosystem profile
is optional enrichment, which is what makes fx work on a stack nobody has
written a profile for.

### Delivery is one text, two adapters

`PREAMBLE.md` is injected into every session **and every dispatched subagent**,
because a subagent reads neither `CLAUDE.md` nor memory. Claude Code needs two
events (`SessionStart`, `SubagentStart`); opencode needs one, since its
subagents are child sessions. The guard predicate is a **shared module**, not
two implementations.

### fx is a fork, not a downstream

Absorbed once, owned here. No upstream tracking (withdrawn deliberately). The
`COVERAGE.md` files remain as the record of *why* each upstream claim was kept,
superseded or dropped.

---

## 2. Components

Every unit answers three questions: what it does, how you invoke it, what it
depends on. Anything a lane cannot be understood without is inline; everything
else is a reference it pulls.

### Lanes — 9 built, 1 deferred

Selectable. Exactly one claimant per intent. All ≤ 500 lines.

| Lane | Does | Invoked by | Depends on |
|---|---|---|---|
| `fx-brainstorm` | Classify → clustered rounds → sectioned design → gate | new feature, "let's build" | `grilling`, `domain-modeling`, `design-template`, `visual-companion` |
| `fx-plan` | Vertical tracer tasks, blocking edges, Consumes/Produces | an approved design exists | `fx-devils-advocate`, `/fx:critique` |
| `fx-implement` | Works the frontier: worktree, fresh subagent per task, rulings not stalls | tasks exist | 4 prompt files, `review-package`, `worktree-setup`, `model-selection`, `verification` |
| `fx-tdd` | Iron Law, verify-RED (runtime **and** compile-time), confirmed seams | writing code with logic | `good-tests`, `codebase-design`, `.fx.json` |
| `fx-review` | Two axes reported separately + triggered risk lenses | review a diff or branch | `reviewer-prompt`, 5 lens agents, `fowler-smells`, `receiving-review` |
| `fx-architecture` | Deepening opportunities in existing code, local HTML report | structure is the problem | `HTML-REPORT.md`, `codebase-design` |
| `fx-debug` | Feedback loop first, 3-fix circuit breaker, correct-seam rule | bug, test failure | `root-cause-tracing`, `defense-in-depth`, `condition-based-waiting`, `hitl-loop` |
| `fx-humanize` | Prose de-slopification | a document needs fixing | none — verbatim upstream, one line changed |
| `fx-authoring` | Writing skills, agents, dispatch prompts, `CLAUDE.md` | editing a `SKILL.md` | `persuasion-principles`, `skill-testing`, `anthropic-best-practices` |
| `fx-design` | **Deferred — D1.** Nothing owns visual work in the interim | — | — |

### Agents — 1 built, 5 pending

All read-only (`Read, Grep, Glob, Bash`); tool restriction is enforced by the
harness, so a lens physically cannot write.

`fx-devils-advocate` (built) — adversarial review of a design or plan.
Five review lenses pending: `database`, `security`, `a11y`, `silent-failure`,
`performance`. Each pins its model explicitly; `security` and `database` at top
tier because they fire only on migrations and auth paths, so **simple diffs pay
nothing.**

### Procedures — 2 built

`research` and `prototype` are copied verbatim from the upstream mattpocock
plugin. The bodies are untouched; only the `description` frontmatter is
rewritten into a trigger list, since an upstream description summarises what a
skill *does* and would put the procedure into a selection contest with a lane.
`research` carries exactly one added paragraph: **query terms may not carry
module names, file paths or internal service names**, because a search leaves
this machine.

`prototype` is invoked by `fx-brainstorm` §4, alongside the visual companion —
a picture answers *what would it look like*, a prototype answers *would it
work*. §1's terminal-state rule names it as the one mid-interview exception,
so calling it does not read as a forbidden handoff. A grep for `prototype` in
`fx-brainstorm/SKILL.md` is the standing assertion that the wiring is real;
its absence is what let the false claim survive before.

Neither ships upstream's `agents/openai.yaml`: it is a Codex interface
manifest for a runtime fx does not target, and it duplicates the description
we just rewrote — a second place for it to drift.

### Commands — 1 built, 3 pending

| Command | Does |
|---|---|
| `/fx:setup` ✅ | Writes `.fx.json`, generates `repo.md` behind a review gate, creates directories, wires `CLAUDE.md`/`AGENTS.md` |
| `/fx:critique` | Dispatches `fx-devils-advocate` at a design or plan |
| `/fx:grill` | The interview technique standalone, for decisions not heading for code |
| `/fx:level` | Writes `lite\|full\|ultra` |

### Delivery — built

`PREAMBLE.md` (~1,173 tok) · `lib/git-guard.js` (shared predicate, 69 tests) ·
`hooks/fx-context.js` · `hooks/fx-git-guard.js` · `plugins/fx.js`.

The guard is one module behind two adapters **specifically so the two runtimes
cannot enforce different rules.**

### References — 24, none selectable

`vocab/` 15 · `stacks/` 4 · `testing/` 4 · `design-template.md`.

**The leaf property holds.** It was recorded as "verified" in `SURFACE.md`
before it was true — seven references linked to another, and three formed a
cycle:

```
codebase-design ⇄ deepening ⇄ design-it-twice     (cycle)
defense-in-depth ─► root-cause-tracing
rails ─► observability
```

Following those links, a lane pulled three files where the design claims one.
The cycle was the symptom that `codebase-design`, `deepening` and
`design-it-twice` are one topic split across three files; D-C merged them into
`codebase-design.md` and removed the two stray links. Zero cross-links remain,
enforced by `scripts/check-reference-leaves`.

`root-cause-tracing.md` also pointed at `find-polluter.sh` "in the upstream
skill directory", which stops existing once superpowers is uninstalled — that
sentence is gone.

---

## 3. Data flow

Four channels carry state. Each is the **only** carrier for what it holds,
which is why each one is load-bearing rather than convenient.

| Channel | Carries | Why nothing else can |
|---|---|---|
| `PREAMBLE.md` via hook | ladder, routing, non-negotiables, prose rule | **A subagent reads neither `CLAUDE.md` nor memory.** This is the sole path to it |
| `.fx.json` | test/setup/lint commands, `stacks`, coverage | The only place a command is allowed to come from. Guessing is prohibited everywhere else |
| `repo.md` | project structure, patterns, local decisions | Loaded on demand — too large for always-on context |
| `state.md` (ledger) | which tasks are done, every ruling | **Conversation memory does not survive compaction.** This does |

### A cold start, traced

```
session opens
  └─ hook reads PREAMBLE.md ─────────────► ~1,173 tok injected
     └─ hook checks cwd for repo.md ─────► one-line pointer if present

"implement the login feature"
  └─ routing table (in preamble) ────────► fx-brainstorm      [deterministic]
     └─ design approved ─────────────────► docs/plans/<slug>/design.md
        └─ fx-plan ─────────────────────► tasks/NN-*.md
           └─ fx-implement
              ├─ reads .fx.json ─────────► setup + test_all, run once
              ├─ reads stacks/<n>.md ────► per entry in `stacks`; missing = fine
              ├─ reads repo.md ──────────► structure and patterns
              ├─ creates worktree ───────► guard permits `worktree add` on main
              └─ per task:
                   dispatch subagent ────► task + PREAMBLE (via SubagentStart)
                                           NOT the session history
                   ← report ────────────► .fx/<slug>/reports/     [ephemeral]
                   append ruling ───────► docs/plans/<slug>/state.md [durable]
```

### Two routing paths, deliberately

**Deterministic** — the routing table sits in the preamble, so it is in context
before any skill is selected, and a subagent gets the same copy. It does not
depend on description matching.

**Model-selected** — descriptions as trigger lists, one claimant per intent.

The table is the fallback that makes the second path's failure cheap. This is
the direct answer to the selection randomness fx was built to end.

### What a subagent receives, exactly

Its task · the preamble · explicit instructions the controller composed.
**Not** the session history — that is the point of dispatching one. The
controller therefore has to put everything needed *into* the brief, and the
non-negotiables arrive by hook rather than by hope.

### State splits by lifetime

- **`docs/plans/<slug>/`** — design, plan, tasks, `state.md`. Committed. The
  record of what was decided and what happened.
- **`.fx/<slug>/`** — reports, review packages. Git-ignored, verified with
  `check-ignore` before anything writes there. Verbose and regenerable.

Another slug's directory is never read or written.

### Every Bash call passes the guard

Session or subagent, Claude Code or opencode, the same module decides. The
attribution rule in particular **only** survives into a subagent through this
path — a subagent that never read `CLAUDE.md` is still stopped from writing a
`Co-Authored-By` trailer.

### Nothing flows outward

No telemetry, no upload, no publish. `push` is blocked. Reports are local files
opened in a local browser.

---

## 4. Error handling

The design assumption is that **the agent is the unreliable component.** Not
the network, not the disk — the thing composing the commands. Every mechanism
below exists because an agent will confidently do the wrong thing.

### Fail closed, including at load time

| Failure | Behaviour | Verified |
|---|---|---|
| git guard denies a real violation | exit 2, reason to the model | ✅ |
| `lib/git-guard.js` **missing** | deny **everything**, say the plugin is broken | ✅ |
| `lib/git-guard.js` **corrupt** | same | ✅ |
| `inspect()` throws mid-evaluation | deny that command | ✅ |
| unknown git subcommand | treated as mutating | ✅ |
| malformed hook input | exit 0, no interference | ✅ |
| `PREAMBLE.md` unreadable | session says rules are NOT loaded, do not commit | ✅ |

**This section found a live bug.** The guard originally wrapped only the
`inspect()` call, so a missing module crashed the hook with exit 1 — which
Claude Code treats as a *non-blocking* error, and **the git command ran.** The
guard failed open, silently, in exactly the situation where it mattered. Now
the `require` is wrapped too and any load failure denies everything.

### No override, and that is the design

There is no unlock command and no expiring token. A false positive is resolved
by the user running the command themselves in their own terminal — which keeps
the human in the loop instead of teaching the agent a bypass.

### Known gap — the guard only sees Bash

`Write` and `Edit` do not pass through it. An agent can therefore **edit files
in the main checkout**; it simply cannot commit them.

Judged acceptable, not overlooked: uncommitted edits are visible in
`git status` and reversible, while the irreversible steps — commit, push,
`reset --hard`, `clean -f` — are all blocked. Extending the guard to `Write`
would also have to permit `/fx:setup` writing `repo.md`, `.fx.json` and
`docs/plans/` on the main checkout, which is most of the exceptions it would
need.

### Agent-level failures

| Failure | Mechanism |
|---|---|
| Wrong lane selected | Routing table in the preamble, ahead of description matching; each lane declares what it does *not* own |
| Subagent claims success falsely | Task review per task in a separate context; "evidence before claims"; RED output pasted into `state.md` as proof |
| Fix loop thrashing | 3-fix circuit breaker, then stop and report |
| Context compaction mid-run | Ledger is authoritative over recollection — `state.md` plus `git log`, never memory |
| Command not derivable | Write `null` and **ask**. Never infer a test command from the file tree |
| Baseline suite already failing | Report and ask before task 01 — a dirty baseline makes every later failure ambiguous |
| Missing stack profile | Not an error. Degrade — traps are lost, function is not |
| Missing reference file | Proceed, and say which one was missing |

### Open gaps, recorded rather than smoothed over

1. **`repo.md` staleness has no signal.** The review gate catches a bad
   generation once. Nothing detects it aging as the project moves, and every
   agent afterwards treats it as fact. A recorded git sha plus a distance
   warning would close it. Not built.
2. **Nothing checks the reviewer.** A task-review subagent that rubber-stamps
   is indistinguishable from one that verified.
3. **The leakage check is a manual grep.** Nothing stops the next stack profile
   from smuggling project facts into a portable file — which already happened
   once, in `observability.md`.

---

## 5. Testing

### Testing a skill is not testing code

A skill is a prompt. Its test is a **behavioural experiment**: dispatch a
fresh-context subagent into a scenario built to make the wrong choice
attractive, and read what it actually does. There is no assertion — the output
is a transcript, judged.

`references/vocab/skill-testing.md` carries the method, mapped onto TDD:

| Phase | For a skill |
|---|---|
| **RED** | Run the scenario **without** the skill. Capture the baseline failure verbatim. No baseline, no evidence the skill changed anything |
| **GREEN** | Re-run **with** the skill. Did it comply? |
| **REFACTOR** | Collect the rationalizations it invented, counter each one, re-run until no new ones appear |

Pressure comes from combining forces: time, money, authority, sunk cost. The
four scenarios in `references/testing/` do exactly this — one opens with a
production outage at "$15,000/minute" and a manager demanding an immediate fix,
which is precisely the situation where systematic debugging gets abandoned.

### What is tested

| Component | Coverage |
|---|---|
| `lib/git-guard.js` | 69 assertions against a **real** main checkout and worktree, plus 3 mutations (worktree detection → 18 failures, attribution check → 1, compound splitting → 3) |
| `hooks/fx-git-guard.js` | 6 failure modes end to end, including load-time failure |
| `hooks/fx-context.js` | output shape, subagent event, missing-preamble fallback |
| `plugins/fx.js` | injection, block on main, allow in worktree, non-bash passthrough |

Mutation testing is the part that matters: a suite that passes on first run
proves nothing until you have watched it fail.

### What is not tested — all nine skills

**`fx-authoring`'s own Iron Law is `NO SKILL WITHOUT A FAILING TEST FIRST`, and
zero of the nine have had it applied.** By the standard these skills enforce on
everything else, all nine are untested code.

The risk is inverted: **the deterministic parts are tested and the
probabilistic parts are not** — and the probabilistic parts are where both the
value and the failure modes live.

This is not hypothetical. A description that summarised a workflow instead of
listing triggers caused an agent to run **one** review where the skill
specified **two**. That is the class of defect only behavioural testing finds,
and it was found by accident.

### Definition of done

fx is "tested" when:

1. Every lane has a **baseline** transcript — the scenario run without it
2. Every discipline lane (`fx-tdd`, `fx-debug`, `fx-implement`) survives 3+
   combined-pressure scenarios with no new rationalization
3. Every `description` is micro-tested against a no-guidance control, 5+ reps,
   every flagged match read by hand

### Cost, and the affordable middle

The full pass is a project in its own right — upstream reports six iterations
to harden a *single* discipline skill, and every scenario is a fresh subagent
dispatch.

**If the full pass is never affordable, micro-test the descriptions only.**
They are the highest-leverage text in the plugin, the cheapest to test, and the
one place with a documented failure to check against.

**Priority:** `fx-tdd` and `fx-debug` first — both are discipline skills whose
entire value is resisting rationalization under pressure, which is exactly what
these scenarios measure. `fx-debug`'s four scenarios are already written and
need one line re-pointed each. `fx-humanize` and the references need no testing
at all: no rule to violate.

---

## Review

Self-review per `fx-brainstorm` §8. Four checks; three found real defects, all
fixed inline except where noted.

### 1. Placeholder scan — clean

No TBD/TODO/FIXME. Every count in the document was checked against the
filesystem: 9 lanes, 24 references (15 vocab · 4 stacks · 4 testing · 1
template), 1 agent, 1 command, 69 guard assertions, longest lane 481 lines
(cap 500). All correct.

### 2. Internal consistency — 3 defects

**a. §1 said 20 references, §2 said 26.** Fixed to 26; now 24 after D-C.

**b. The Procedures tier was described but empty.** §1 declared a tier of 2;
§2 never listed it; neither file exists; and **no lane references either one** —
`fx-brainstorm` does not call `prototype`, contradicting `SURFACE.md`'s claim
that it does. Both documents now say so. **Decided 2026-09-01: copy and wire.** Copy both verbatim from the installed
mattpocock plugin, add the one `research` paragraph, and wire `prototype` into
`fx-brainstorm` §4 so the claim becomes true.

**c. "Every reference is a leaf — verified" was false, and had been since
Section 1.** Seven cross-links, three forming a cycle. That claim was the
justification for the load-cost bound in §1, so the architecture rested on an
invariant nobody had checked. Corrected in both documents.

### 3. Scope — decompose into two plans

The remaining work is not one plan. **Build** (5 lens agents, 3 commands,
procedures decision, repo/install) is mechanical and bounded. **Testing** (§5)
is open-ended behavioural work with a different unit of progress. Cutting them
as one plan would let the cheap half hide the expensive half.

### 4. Ambiguity — 2 unresolved, both the user's call

**a. "No write commit at all" on the main checkout.** Read as *no commits*
(enforced) or *no file writes either* (not enforced — `Write`/`Edit` bypass the
guard). Currently implemented as the former; §4 records why.

**b. `push`.** Blocked everywhere, including inside a worktree, on the offline
rule — but "within a worktree do whatever you like" and the memory line "never
push **to the base branch** without explicit say-so" both read as permitting a
push from a feature branch. **Open since Section 1, flagged three times, still
unanswered.** One line in `lib/git-guard.js` changes it.


---

## Decisions closing the review

Taken 2026-09-01, after the self-review. Each becomes work in the plan.

**D-A · `push` is allowed from a worktree.** Blocked on the main checkout,
allowed on a feature branch inside a worktree. This matches "within a worktree
do whatever you like" and the standing rule "never push to the base branch
without explicit say-so". The main-checkout block already prevents pushing the
base branch, because you cannot commit to it in the first place. One change in
`lib/git-guard.js`, plus test coverage for both sides.

**D-B · The Procedures tier is built, not deleted.** `research` and `prototype`
copied verbatim; `prototype` wired into `fx-brainstorm` §4. The tier stops being
described-but-absent.

**D-C · The reference cycle is merged.** `codebase-design`, `deepening` and
`design-it-twice` become one file — the cycle was the symptom that they are one
topic. The two remaining stray links are removed afterwards, restoring the leaf
invariant that §1's load-cost bound depends on.

**D-D · Unchanged, on the record:** `Write`/`Edit` on the main checkout stay
unguarded (§4 gives the reasoning); the preamble stays at 1,173 tokens.
