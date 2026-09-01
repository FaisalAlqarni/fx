# fx

One engineering plugin. Replaces superpowers, mattpocock-skills, ecc, ponytail
and humanizer with a set that does not overlap.

**Exactly one claimant per intent.** Four skills claiming "TDD" is why skill
selection was effectively random; the fix is that only one ever claims it.

## Layout

```
skills/       9 lanes — model-selectable, one per intent
agents/       review lenses + the devil's advocate — read-only
commands/     /fx:setup and friends
references/   loaded on demand by a lane, never selectable
hooks/        Claude Code: preamble injection + git guard
plugins/      opencode: the same two jobs, same shared lib
lib/          git-guard.js — one predicate, both runtimes
PREAMBLE.md   injected into every session AND every subagent
```

## Install

**Claude Code** — `/plugin marketplace add FaisalAlqarni/fx` then
`/plugin install fx@fx`.

**opencode** — three symlinks; it does not read Claude Code marketplaces.

Full steps, and why the `references` symlink is not optional:
[`INSTALL.md`](INSTALL.md).

Then, in each repository you work in:

```
/fx:setup
```

which writes `.fx.json` (commands, stacks) and generates `repo.md` — the
project's structure and patterns — for your review before it lands.

## The rules it enforces

The git guard is not advisory. On the main checkout every mutating git command
is refused; inside a worktree you are free. Attribution trailers
(`Co-Authored-By`, `Claude-Session`, "Generated with") are blocked in commit
messages everywhere — including inside a dispatched subagent, which reads
neither `CLAUDE.md` nor memory and would otherwise never see the rule.

## Tests

```
node lib/git-guard.test.js <main-checkout> <worktree>
scripts/check-paths
```

The nine skills themselves are **not** behaviourally tested yet — see `DEBT.md`.
