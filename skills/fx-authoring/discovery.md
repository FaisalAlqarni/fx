### The description field

This is the highest-leverage text in the whole document.

- **Third person.** It is injected into the system prompt.
- **Start with "Use when…"**: triggering conditions.
- **Concrete triggers, symptoms, situations.** Error messages, symptom words,
  synonyms, tool and file-type names: what an agent would search for.
- Describe **the problem** ("race conditions, inconsistent behavior"), not
  language-specific symptoms ("setTimeout, sleep"): unless the skill really is
  technology-specific, in which case say so explicitly.
- **Under 500 characters** where possible; frontmatter max 1024.
- `name`: letters, numbers and hyphens only.

**NEVER summarize the skill's process or workflow.**

This is not style. Testing showed that when a description summarizes the
workflow, **the agent follows the description instead of reading the skill.** A
description reading "code review between tasks" caused an agent to run ONE
review when the skill's body specified TWO. Changing it to "Use when executing
implementation plans with independent tasks" (no workflow) made the agent
read the body and run both.

**The trap: a description that summarizes workflow creates a shortcut agents
take. The body becomes documentation they skip.**

| | |
|---|---|
| ❌ | `Use when executing plans - dispatches subagent per task with code review between tasks` |
| ❌ | `Use for TDD - write test first, watch it fail, write minimal code, refactor` |
| ✅ | `Use when executing implementation plans with independent tasks in the current session` |
| ✅ | `Use when implementing any feature or bugfix, before writing implementation code` |

### Widening a description, and when to stop

A lane may legitimately claim a second intent when the two are species of one
genus. `fx-architecture` owns code that is the wrong shape, and code there is
simply too much of is a wrong shape, so both belong to it.

**Widening is not free and the cost is invisible.** New triggers compete with
the existing ones for the same attention, so a lane can gain an intent and
quietly lose the one it already had. Nothing in the frontmatter shows this.

**So measure it, do not reason about it.** Keep a prompt per intent in
`tests/lane-triggering/prompts/`, named `<lane>.txt` and
`<lane>__<variant>.txt`, and require both to pass. When `fx-architecture` took
on over-engineering, the new prompt went 1/5 to 5/5 and the original held at
3/3. **The second number is the one that decides whether the widening was
allowed to stand.**

**Stop at two, and split instead when either is true:** a third intent wants in,
or the skill's name no longer describes what it claims. A name that has to be
explained is the tell that the lane became a bucket.

## Invocation

| | Model-invoked | User-invoked |
|---|---|---|
| Frontmatter | omit `disable-model-invocation` | `disable-model-invocation: true` |
| Description | model-facing, carries trigger branches | human-facing one-liner, triggers stripped |
| Reach | agent fires it; other skills can too; **you can still type its name** | only the human typing its name |
| Cost | **permanent context load**, every turn | zero context load; spends **cognitive load**: you are the index |

**Pick model-invocation only when the agent must reach it on its own, or
another skill must.** If it only ever fires by hand, make it user-invoked and
pay no context load.

Shared reference that two **user-invoked** skills both need can live in
neither: with no descriptions, neither can fire the other. Push it to a plain
file outside the skill system.

When user-invoked skills multiply past what you can remember, that cognitive
load is cured by a **router skill**: one user-invoked skill naming the others
and when to reach for each. It can only hint, never fire them.

## Cross-references

```
**REQUIRED SUB-SKILL:** Use fx-tdd
**REQUIRED BACKGROUND:** You MUST understand fx-debug
```

Name only, with an explicit requirement marker. **Never `@path/to/file`**: it
force-loads immediately, burning context before you need it. Never a bare
"See …", which leaves it unclear whether it's required.
