# The preamble carries a conditional companion-tools line

### Context

Subagents read neither `CLAUDE.md` nor memory. The owner asked for the same thing ten times between Sep 21 and Sep 26: use repowise before reading files, run ponytail and caveman at full, run fx-humanize on prose. Each ask reached the session that heard it and no subagent.

### Decision

`render()` in `lib/preamble.js` appends one line after the `repo.md` note and before the plans block, for sessions and subagents on all three runtimes. The default text, with the lane named the way the runtime addresses it:

> Companion tools. Use each one this runtime has, and skip silently any it lacks: repowise for codebase questions before reading or searching files; the ponytail skill at full; the caveman skill at full; `fx:fx-humanize` on prose written for people.

The wording is conditional so a runtime without a tool skips it instead of failing.

A repository overrides the line with a `companions` key in `.fx.json`. A string replaces the default. An empty string turns the line off. A missing file, a missing key, a non-string value or an unparseable file means the default. Reading the file never throws.

The line sits outside the 3,000-character bootstrap (design.md section 5c). The bootstrap budget is measured with companions off. The line counts toward the 9,000-character worst case instead.

### Consequences

`plugins/fx.js` renders once at construction, so an opencode session picks up a changed `.fx.json` on its next start.
