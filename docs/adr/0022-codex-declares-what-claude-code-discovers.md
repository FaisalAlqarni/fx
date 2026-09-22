# Codex declares what Claude Code discovers

`.codex-plugin/plugin.json` carries `"hooks": "./hooks.json"`. `.claude-plugin/plugin.json`
carries no `hooks` key at all, and `scripts/check-manifest` reads only
`.claude-plugin/plugin.json`, so ADR 0009's convention rule is enforced on that
one manifest and nowhere else.

fx's first Codex plugin commit (`8aed061`, 2026-09-21 03:31) shipped a root
`hooks.json` undeclared, on the same convention ADR 0009 states for Claude
Code. Codex never loaded it. `research/codex.md` records that Codex reads the
manifest's `hooks` key when it is present and otherwise falls back to
`hooks/hooks.json`, Claude Code's own nested path, never to an undeclared file
at the repository root. So for roughly the first thirteen hours after that commit, fx's Codex
plugin had no role planting, no read only enforcement and no patch lane check:
every hook body existed and none of it ran. The gap was closed the same day,
by `af56f8c` (2026-09-21 17:20), which added the `hooks` key to
`.codex-plugin/plugin.json`. Neither state ever reached `main`; both commits
sit inside this unreleased branch, under fourteen hours apart on the same day.

The root `hooks.json` wires `SessionStart`, `SubagentStart` and `PreToolUse` to
one dispatcher, `hooks/fx-codex.js`. That file plants fx's read only review
roles into `$CODEX_HOME` through `lib/plant-roles.js`'s `plantRoles()`, called
at `SessionStart` (`hooks/fx-codex.js:223`), and enforces the read only guard
at `PreToolUse` by reading `input.agent_id` (`hooks/fx-codex.js:108`) and
looking up the role `SubagentStart` recorded for it (`lookupAgentIdentity`,
`hooks/fx-codex.js:121` to `124`).

ADR 0009's rule is scoped to Claude Code: it names `agents/` and
`hooks/hooks.json` as Claude Code's own convention paths, and
`scripts/check-manifest` only ever opens `.claude-plugin/plugin.json`. Read on
its own, ADR 0009 reads as a blanket rule against declaring `hooks` in any
manifest. It is not one. A maintainer who applies it to
`.codex-plugin/plugin.json` and drops the key to "clean up" the manifest
silently reintroduces this exact bug: the hooks stay in the tree, still
readable, still tested in isolation, and Codex stops calling any of them.

## Consequences

- `.codex-plugin/plugin.json` keeps the `hooks` key permanently. Removing it
  is a regression, not a simplification, however consistent it looks next to
  `.claude-plugin/plugin.json`.
- `scripts/check-manifest` staying scoped to the Claude Code manifest is
  deliberate: extending it to enforce ADR 0009 against `.codex-plugin/plugin.json`
  would make the gate itself reintroduce the bug it should catch.
- A future runtime gets its own manifest and its own answer to "declare or
  discover," decided from what that runtime's loader actually does, never
  copied from either existing manifest by default.
