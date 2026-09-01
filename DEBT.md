# Known debt

Recorded rather than hidden. Each item says what it is, why it wasn't done, and
what closing it costs.

---

## 1. No skill has been tested — the Iron Law is violated across the board

**`fx-authoring`'s own Iron Law is `NO SKILL WITHOUT A FAILING TEST FIRST`, and
zero of the nine skills have had it applied.**

Not done for any of them:

- **RED** — pressure scenarios (3+ combined pressures) run *without* the skill,
  baseline behavior captured verbatim
- **GREEN** — the same scenarios re-run *with* the skill, verifying compliance
- **REFACTOR** — new rationalizations captured and countered until no new ones
  appear
- **Micro-tests** — wording checked against a no-guidance control, 5+ reps,
  every flagged match read manually

By the standard these skills themselves enforce, all nine are **untested code.**

**Why it wasn't done:** full RED-GREEN-REFACTOR on nine skills is a project in
its own right — upstream reports six iterations to bulletproof a *single*
discipline skill. Doing it inline would have stopped everything else.

**What it would cost:** substantial. Every scenario is a fresh-context subagent
dispatch, and discipline skills need several rounds each.

**The pragmatic middle**, if the full pass is never affordable: **micro-test the
descriptions only.** They are the highest-leverage text in the plugin, the
cheapest thing to test, and the one place with a documented failure mode to
check against — a workflow-summarizing description measurably caused an agent to
run one review where the skill specified two.

**Priority order if tested piecemeal:** `fx-tdd` and `fx-debug` first — both are
discipline skills whose whole value is resisting rationalization under
pressure, which is exactly what pressure scenarios measure. `fx-humanize` and
the reference files need no testing at all (no rule to violate).

**Now cheaper than when this was written.** `references/testing/` holds
`test-pressure-{1,2,3}.md` and `test-academic.md`, kept from superpowers'
`systematic-debugging` — four ready-made pressure scenarios for `fx-debug`,
one of the two first-priority skills. They need re-pointing at `fx-debug`, not
inventing. Kept deliberately: superpowers is being uninstalled, so this was the
last chance to take them.

---

## 2. ~~`references/stacks/` does not exist~~ — **CLOSED, Section 3**

The dead pointer is gone. The four callers no longer ask a stack profile for
commands at all — commands come from `.fx.json`, and a `stacks` entry with no
file is explicitly not an error, so a missing profile degrades instead of
failing.

Written: `rails.md` (213) · `dotnet.md` (199) · `docker.md` (143) ·
`observability.md` (233). `data.md` dropped (the standalone `postgres` skill
serves it); `frontend.md` dropped ("frontend" is not one ecosystem).

**One thing carried forward:** `observability.md` was written before the
three-layer rule and had project facts in it — six engines, `ENV['ENGINE']`,
Arabic default, the trace-topology decision. Those were removed and are parked
in `tasks/todo.md` to seed advantage-backend's `repo.md`. **Until `/fx:setup`
runs there, that project knowledge lives only in the todo file.**

---

## 3. Referenced but not yet built

| Referenced by | Missing |
|---|---|
| `fx-review` lens trigger table | `fx-lens-database`, `-security`, `-a11y`, `-silent-failure`, `-performance` — five agents |
| `fx-brainstorm` §4 | `visual-companion.md` and its 5 scripts (copy verbatim) |
| `fx-brainstorm`, `fx-plan`, `fx-review` | `/fx:setup` |
| `fx-plan` §7 | `/fx:critique` |
| `references/vocab/grilling.md` | `/fx:grill` |
| `fx-debug` Phase 1 | `scripts/hitl-loop.template.sh` (copy verbatim) |
| `fx-debug` supporting techniques | `references/vocab/condition-based-waiting.md` (copy verbatim) |
| every skill, via the preamble | `fx-context.js`, `fx-git-guard.js` |

---

## 4. `condition-based-waiting.md` marked copy-verbatim but never reviewed

115 lines, self-contained. Recorded as **unaudited** — no claim extraction was
run against it, so its coverage is asserted by the copy operation, not verified.

---

## 5. Coverage tables were never checked against upstream

The verification pass compared each `COVERAGE.md` against the fx files it
names. It **did not** re-read the upstream sources.

So a row that mis-describes what upstream actually said — extractor error, or
paraphrase drift in the table — passes clean. The counting errors that pass
found (7-term glossary that had 8, "all 4 bullets" that had 3) were the
detectable class; this is the undetectable one.

Worth one pass before shipping. Roughly the cost of the original audit.

---

## 6. `fx-humanize` carries one local modification

The frontmatter `name` was changed from `humanizer` to `fx-humanize` for naming
consistency. **Everything else is byte-identical to upstream 2.11.2.**

Upgrade procedure: `diff`, ignore the `name:` line, copy the rest wholesale.

Its `description` still opens with what the skill *does* rather than a pure
trigger list — an upstream choice, left unmodified to keep the diff at one
line. If `fx-humanize` proves hard to trigger in practice, that is the first
thing to change, and it costs the clean diff.
