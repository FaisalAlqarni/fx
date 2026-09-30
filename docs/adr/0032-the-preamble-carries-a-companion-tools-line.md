# The preamble carries a companion tools line

## Context

Subagents read neither `CLAUDE.md` nor memory. The owner asked for the same thing ten times between Sep 21 and Sep 26: use repowise before reading files, run ponytail and caveman at full, run fx-humanize on prose. Each ask reached the session that heard it and no subagent.

## Decision

`render()` in `lib/preamble.js` appends one line after the `repo.md` note and before the plans block, for sessions and subagents on all three runtimes. The default text, with the lane named the way the runtime addresses it:

> Companion tools. Use each one this runtime has, and skip silently any it lacks: repowise for codebase questions before reading or searching files; the ponytail skill at full; the caveman skill at full; `fx:fx-humanize` on prose written for people.

The wording is conditional so a runtime without a tool skips it instead of failing.

A repository overrides the line with a `companions` key in `.fx.json`. A string replaces the default and is framed as repo content, not as fx's own text: `This repository's .fx.json adds: <text>`, cut to 300 characters with an ellipsis. The line reaches every subagent, so a committed file must not be able to pose as the plugin. An empty string turns the line off. A missing file, a missing key or a non-string value means the default. An unreadable or unparseable file means the default plus a note naming the error class only (`not valid JSON`, or a code such as `EACCES`), never the parser's message, which can quote file content. Reading the file never throws.

The line sits outside the 3,000-character bootstrap (design.md section 5c). The bootstrap budget is measured with companions off. The line counts toward the 9,000-character worst case instead.

## Relation to ADR-0006

ADR-0006 says cross-references between skills are pointers, never invocations, and declined a mandatory `fx-humanize` call for coupling reasons. The companions line is a conditional pointer: each tool is named "if this runtime has it", and a missing tool is skipped silently. It invokes nothing and does not make fx depend on ponytail or caveman. The default names the owner's own tools; the owner chose that on 2026-09-30. A repository that does not want it sets `companions: ""` in `.fx.json`.

## Consequences

`plugins/fx-opencode-v1.js` renders once at construction, so an opencode session picks up a changed `.fx.json` on its next start.
