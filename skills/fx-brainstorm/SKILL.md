---
name: fx-brainstorm
description: >
  Entry point for any new work. Use BEFORE creating a feature, adding
  functionality, building a component, changing behavior, starting a project,
  or any request that would touch code whose design is not yet settled. Also on
  "let's build", "I want to add", "can we make", "new feature", "brainstorm",
  "design this", "grill me", "stress-test this", "what do you think about".
  NO code before this skill's approval gate passes.
---

# fx-brainstorm

Turn an idea into a fully formed design through collaborative dialogue.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project,
or take any implementation action until you have told your human partner what
you intend and they have approved it. **This applies to EVERY task on EVERY
path below — the ceremony scales with the task; the approval gate never does.**
</HARD-GATE>

## 1. Classify — say it out loud, before your first question

Announce the classification so it can be overridden: *"this looks bounded, so
I'll present a short design here rather than write a spec."*

- **Spike** — a feasibility question ("can we…", "is it possible…", "quick and
  dirty is fine") whose output is **an answer, not code you keep.** Present the
  question and the probe in 2–3 sentences, get a nod, then find out as cheaply
  as correctness allows. No design doc. Report findings as a recommendation;
  anything you built stays labeled throwaway.
- **Bounded** — a well-scoped change to code **that already exists in this
  repo**: a new flag, a small endpoint, a one-file fix. **Understanding the
  kind of app is not enough — bounded means the flow you are changing is
  already here to read. If there is no existing flow to change, the task is not
  bounded.** Ask the questions that matter, present a short design **in chat**,
  and STOP. Implementation starts only after an explicit yes — **a bounded
  task's approval is as hard a gate as an architectural one.** No design doc,
  no plan.
- **Architectural** — new projects, new subsystems, changes that restructure
  how components fit together or alter interfaces others depend on. Full path.

**When in doubt between two, take the heavier one.** The ratchet is one-way:
hidden complexity discovered mid-task **upgrades** the path — stop, say so, and
step up. **Nothing downgrades mid-task.**

Then **create a task for each item on your path** and complete them in order.

### Spike checklist
1. Explore project context — enough to frame the probe
2. Present the question + probe plan — 2–3 sentences
3. Get approval — a nod is enough
4. Investigate — as cheaply as correctness allows
5. Report findings — a recommendation; label anything built throwaway

### Bounded checklist
1. Explore project context — files, docs, recent commits
2. Ask the clarifying questions that matter
3. Present a short design in chat — approach, files touched, testing
4. **Get approval — STOP and wait for an explicit yes.** Presenting the design
   and starting in the same breath is skipping the gate
5. Implement through the normal workflow (`fx-tdd` applies). No plan document

### Architectural checklist
1. Explore project context — files, docs, recent commits
2. Show rather than tell when a question warrants it — visual companion, or
   `prototype` when the question needs something runnable (§4)
3. Interview in clustered rounds, maintaining the open-questions ledger (§3)
4. Propose 2–3 approaches with trade-offs and your recommendation (§5)
5. Present the design **in sections**, approval after each (§6)
6. Write the design doc (§7)
7. Self-review it (§8)
8. User reviews the written doc (§8)
9. Hand off to `fx-plan` (§9)

**Terminal states are path-bound.** Architectural: **the only skill you invoke
after this is `fx-plan`** — never `fx-tdd`, never `fx-implement`, never a
design or frontend skill. Bounded: implementation proceeds directly through the
normal workflow. Spike: the terminal state is a reported recommendation.

`prototype` is the one exception, and it is not a terminal state: it runs
**mid-interview** (§4), on any path, and hands back an answer rather than code
you keep. The architectural path still ends at `fx-plan`.

## 2. Explore project context first

Check the current state — files, docs, recent commits.

**Before asking detailed questions, assess scope.** If the request describes
multiple independent subsystems ("a platform with chat, file storage, billing
and analytics"), **flag it immediately.** Don't spend questions refining
details of a project that needs decomposing first.

Too large for one design? Help decompose into sub-projects: what are the
independent pieces, how do they relate, what order should they be built? Then
brainstorm the first one through the normal flow. **Each sub-project gets its
own design → plan → implementation cycle.**

## 3. Interview in clustered rounds

Map the design as a **tree**: every decision branches into the decisions that
hang off it. The **frontier** is every decision whose prerequisites are already
settled — the questions you can ask *now* without guessing at answers you
haven't heard yet.

**Ask 2–4 related questions per round — one topic per round.** Not one at a
time (loses the tree the moment an answer opens a new branch), not the whole
frontier (scattergun). **A question whose answer depends on another question
still open in this round belongs to a later round, not this one.**

Use the host's interactive question tool — `AskUserQuestion` in Claude Code
(max 4 questions × 4 options; recommendation first, labeled "(Recommended)";
`multiSelect` where choices aren't exclusive). No such tool (opencode) → fall
back to numbered text with a recommendation on each. **Prefer multiple choice
where it fits; open-ended is fine too.**

Each round's answers reshape the tree: settled decisions push the frontier
outward and unblock questions that depended on them. Recompute and ask again.

### Maintain the open-questions ledger — not optional

Keep an `## Open questions` block in the draft design from round one:

```markdown
## Open questions
- [x] <settled> → <the decision>
- [ ] <still open>          ← raised R2
- [ ] <newly raised>        ← raised R4, by the user's answer
```

Every round: mark what closed, append what the user's answer newly raised, and
**end the round by stating how many remain open.**

The user's tangents **add** to this list; they never silently remove from it.
Without the ledger, a detailed answer that opens a new branch quietly buries
every branch you hadn't reached yet — the most common way a design ships with
an unexplored area.

### Facts are your job; decisions are theirs

**Never ask for anything you could look up.** When a frontier question needs a
fact from the environment, dispatch `Explore` to find it. **Don't block on it:**
a running exploration is an unsettled prerequisite, so only the questions
downstream of it wait — ask the rest of the frontier now.

The **decisions** are the user's: put each to them and wait.

### Keep the domain model sharp as you go

Read `CONTEXT.md` (or `CONTEXT-MAP.md` → the relevant context) so your
vocabulary matches the project's, and respect the ADRs in the area.

When a term is fuzzy, conflicts with the glossary, or contradicts the code, use
`../../references/vocab/domain-modeling.md` — challenge it, sharpen it, and **update
`CONTEXT.md` inline the moment it resolves.** Never batch those updates.

Focus throughout on **purpose, constraints, success criteria.**

**Done when the ledger is empty** — every branch visited, nothing left silently
assumed. **Do not act on it until the user confirms you have reached a shared
understanding.**

## 4. Show, don't tell — visual companion, or a prototype

Two ways out of a question that talking is not settling. **A picture answers
"what would it look like"; only running code answers "would it actually
work".** Pick by which of those the question is.

### Visual companion — offer just-in-time

**Do NOT offer it upfront.** Wait until a question would genuinely be clearer
*shown* than told — a real mockup, layout, or diagram question, not merely a UI
*topic*. The first time that happens, offer it **as its own message, containing
nothing else**, then wait:

> "This next part might be easier if I show you — I can put together mockups,
> diagrams and comparisons in a browser tab as we go. It's still new and can be
> token-intensive. Want me to? I'll open it for you."

Accept → start the server with `--open`. Decline → continue text-only and
**don't offer again** unless they raise it. If no visual question ever arises,
never offer it.

**It is a tool, not a mode.** Accepting means it's available for questions that
benefit; it does **not** mean every question goes through the browser. Decide
**per question**: would the user understand this better by seeing it than
reading it?

- **Browser** — mockups, wireframes, layout comparisons, architecture diagrams,
  side-by-side visual designs, spatial relationships.
- **Terminal** — requirements and scope questions, conceptual A/B/C choices,
  trade-off lists, technical decisions.

**A question about a UI topic is not automatically a visual question.** "What
does personality mean here?" is conceptual — terminal. "Which of these wizard
layouts works better?" is visual — browser.

Everything stays local: the server runs on localhost and writes into the
project. Nothing is published.

Details: [visual-companion.md](./visual-companion.md).

### Prototype — when the answer has to be run

A mockup cannot tell you whether a state model survives the cases that are hard
to hold in your head, and a description of three layouts is not the same as
driving them. When a question is **behavioural** rather than pictorial —
"does this transition hold up when the two events race", "which of these flows
is actually less annoying to click through" — **invoke `prototype`** and let
the artifact answer it.

Propose it the way you propose anything else here: say what the prototype would
settle and what it would cost, then **wait for a yes.** The <HARD-GATE> covers
this too — a prototype is throwaway code, but it is still code.

**Bring the verdict back into the interview.** The prototype's output is an
answer to one open question: mark that question closed in the ledger (§3), fold
the decision into the draft design, and carry on. The prototype itself is never
part of the design — `prototype` says where it goes, and it is not main.

## 5. Explore approaches (architectural)

Propose **2–3 approaches with trade-offs.** Present them conversationally.
**Lead with your recommendation and explain why.**

**YAGNI ruthlessly** — remove unnecessary features from every approach and from
the design.

## 6. Present the design in sections

Once you believe you understand what you're building, present it — **in
sections, scaled to their complexity.** A few sentences if straightforward, up
to 200–300 words if nuanced. **Ask after each section whether it looks right so
far.**

Cover: **architecture · components · data flow · error handling · testing.**

Be ready to go back and clarify if something doesn't make sense.

### Design for isolation and clarity

Break the system into smaller units that each have **one clear purpose**,
communicate through **well-defined interfaces**, and can be **understood and
tested independently.**

For each unit you should be able to answer: **what does it do, how do you use
it, what does it depend on?**

Can someone understand what a unit does **without reading its internals**? Can
you change the internals **without breaking consumers**? If not, the boundaries
need work.

Smaller, well-bounded units are also easier to work with — you reason better
about code you can hold in context at once, and edits are more reliable when
files are focused. **When a file grows large, that's often a signal it's doing
too much.**

Vocabulary for depth, seams and interfaces:
`../../references/vocab/codebase-design.md`.

### Working in existing codebases

**Explore the current structure before proposing changes. Follow existing
patterns.**

Where existing code has problems that **affect the work** — a file that's grown
too large, unclear boundaries, tangled responsibilities — include targeted
improvements as part of the design, the way a good developer improves code
they're working in.

**Don't propose unrelated refactoring.** Stay focused on what serves the
current goal.

### Sketch the seams — and confirm them

Before writing the design, sketch **where this will be tested.** Prefer
existing seams to new ones. Use the **highest** seam possible; if new ones are
needed, propose them at the highest point you can. **The fewer seams across the
codebase the better — the ideal number is one.**

**Check with the user that the seams match their expectations.** `fx-tdd` will
refuse to write a test at an unconfirmed seam.

## 7. Write the design document

`docs/plans/YYYY-MM-DD-<slug>/design.md`, always a directory.
Template: `../../references/design-template.md`.

Use the domain glossary's vocabulary throughout and respect the ADRs in the
area you're touching.

**Never `.scratch/`. Never `docs/superpowers/`.** Do not commit it — the user
runs git.

## 8. Self-review, then the user's review

Fresh eyes on what you wrote:

1. **Placeholder scan** — any "TBD", "TODO", incomplete section, or vague
   requirement? Fix them.
2. **Internal consistency** — do any sections contradict each other? Does the
   architecture match the feature descriptions?
3. **Scope check** — focused enough for a single plan, or does it need
   decomposition?
4. **Ambiguity check** — could any requirement be read two different ways? Pick
   one and make it explicit.

Fix inline. No need to re-review — fix and move on.

Then:

> "Design written to `<path>`. Please review it and let me know if you want any
> changes before we break it into tickets."

**Wait for the response.** Changes requested → make them and re-run the
self-review. Proceed only once approved.

## 9. Handoff

Approved → **`fx-plan`. Do not invoke any other skill.**

## Red flags — these thoughts mean you are rationalizing

| Thought | Reality |
|---|---|
| "This is too simple to need a design" | Simple means a short design, not no design. Two sentences in chat, then approval. |
| "I'll call it bounded and skip the design doc" | Reaching for a label to skip work IS the doubt — take the heavier path. |
| "It's bounded and the design is obvious — I'll start while they read it" | The gate is the approval, not the design's length. Present, then stop until you hear yes. |
| "I understand this kind of app, so it's bounded" | Bounded measures the repo, not your familiarity. A new project has no existing flow — it is architectural. |
| "The spike works, so I'll keep the code" | A spike's output is an answer. Keeping the code is a new request — classify it. |
| "It grew, but I'm almost done — no need to re-classify" | Hidden complexity upgrades the path mid-task. Stop and say so. |
| "They approved the spike, so the follow-up is approved too" | Each task gets its own classification and its own approval. |
| "I'll ask them which test framework this uses" | Facts are your job. Go look. |
| "They moved on, so those earlier questions must be settled" | Check the ledger. A tangent adds; it never removes. |

**Anti-pattern: "too simple to need approval."** Every path ends with the user
approving your intent before implementation. A todo list, a single-function
utility, a config change — the design may be two sentences, but you MUST
present it and get approval. **"Simple" tasks are where unexamined assumptions
cause the most wasted work. What scales with simplicity is the artifact, never
the approval.**
