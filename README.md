# fx

One engineering plugin for coding agents. It takes a piece of work from an
idea to a reviewed branch through one pipeline: design, plan, build test-first,
review. Exactly one skill claims each intent, so the model never has to choose
between two skills that both say "TDD".

fx runs on four harnesses: Claude Code, Codex, opencode 1.x and opencode 2.x.

## How the pipeline runs

One path, two approval gates. Nothing skips a gate because the work looks
small: the artifact scales with the work, the approval does not.

```
  you: "let's build X"
        |
        v
  fx-brainstorm ........ classify (spike | bounded | architectural)
        |                question rounds, then a confidence check:
        |                what made it 95% sure, a 2-line plan, wait for go
        |                2 or 3 approaches, recommendation first
        |                design doc -> docs/plans/YYYY-MM-DD-slug/design.md
        |
     [ GATE ] you approve the design
        |
        v
  fx-plan .............. vertical slice tasks, one file each
        |                exact interfaces, blocking edges, global constraints
        |                offers a red-team pass (fx-devils-advocate)
        |
     [ GATE ] implement | red-team | keep discussing | park
        |
        v
  fx-implement ......... a worktree, and a ledger that survives compaction
        |
        +--> per task: a fresh subagent
        |      fx-tdd ........... failing test first, then the code
        |      task review ...... spec compliance and code quality
        |      tripwire lenses .. security, database, silent-failure,
        |                         only when the diff matches their trigger
        |      fix loop ......... at most 5 rounds
        |
        +--> branch review: every axis, every lens, plus an unprimed
        |      adversarial pass
        |
        +--> the full test suite, once
        |
        v
  four options: merge | push and open a PR | leave it | discard.
  Nothing merges or leaves the machine until you choose.
```

## The skills

Ten of the twelve work on their own, with no plan: only `fx-plan` and
`fx-implement` need an artifact to start from.

| Skill | Use when |
|---|---|
| `fx-brainstorm` | any new work: classify, interview, design, gate |
| `fx-plan` | a design is approved and needs breaking into tasks |
| `fx-implement` | `docs/plans/<slug>/tasks/` exists and needs building |
| `fx-tdd` | writing or changing code with logic, in any language |
| `fx-review` | a diff, branch or PR needs checking |
| `fx-architecture` | the structure of existing code is the problem |
| `fx-design` | a screen or component, and how it looks |
| `fx-debug` | a bug, a test failure, anything unexpected |
| `fx-humanize` | prose reads like a brochure |
| `fx-authoring` | editing a SKILL.md, CLAUDE.md, or a dispatch prompt |
| `prototype` | a question needs something runnable to settle it |
| `research` | the answer lives outside this repository |

## The commands

Five more skills are typed by you and never picked by the model.

| Command | Does |
|---|---|
| `fx-setup` | per repository: writes `.fx.json`, `repo.md` and `CONTEXT.md` for your review |
| `fx-audit` | audits an existing system in four gated phases, ending in a design for `fx-plan` |
| `fx-critique` | red-teams a design or plan |
| `fx-grill` | a stress-test interview for a decision not heading to code |
| `fx-handoff` | prints a block to paste into another session |

How you type them: `/fx:fx-<name>` on Claude Code, `/fx-<name>` on opencode,
`$fx:fx-<name>` on Codex.

## Review agents

Six read-only agents: five lenses and a devil's advocate. They cannot write on
any harness.

| Agent | Looks for |
|---|---|
| `fx-lens-database` | migrations, schema and index changes, query shape |
| `fx-lens-security` | auth, credentials, new endpoints, string-built SQL or shell |
| `fx-lens-a11y` | templates, styles, user-facing strings |
| `fx-lens-silent-failure` | swallowed errors, retries, jobs and consumers |
| `fx-lens-pipeline` | work that is enqueued or fanned out with no backpressure |
| `fx-devils-advocate` | anything a directed review would not think to ask |

## What runs underneath

- **A bootstrap in every session and every subagent.** `PREAMBLE.md`, about
  3K characters, tells the model to invoke a skill before it acts. Subagents
  read neither `CLAUDE.md` nor memory, so this is the one channel that reaches
  them.
- **A git guard.** Refuses force push, pushing the base branch, a bare `push`,
  deleting a remote branch, `--no-verify`, `reset --hard`, `clean -f`,
  `branch -D`, `stash drop`, `checkout .`, `tag -d`, and any commit with an
  attribution trailer. A `sh -c` wrapper does not get past it.
- **A lane check.** Refuses the first source-file write in a repository that
  has no design, and says why.
- **A companions line.** Tells the agent to use repowise, ponytail, caveman and
  `fx-humanize` when they are installed. Set `companions` in `.fx.json` to
  change it, or to `""` to turn it off.

## Install

Each harness installs on its own. Short form:

| Harness | Install |
|---|---|
| Claude Code | `/plugin marketplace add FaisalAlqarni/fx`, then `/plugin install fx@fx` |
| Codex | `codex plugin marketplace add FaisalAlqarni/fx`, then `codex plugin add fx@fx`, trust the hooks in `/hooks`, restart once |
| opencode 1.x | clone, then `./scripts/fx-opencode-install --major 1` |
| opencode 2.x | clone, then `./scripts/fx-opencode-install --major 2` |

Then run `fx-setup` once in each repository you work in.

Full steps, updating, removing and per-harness limits:
[`INSTALL.md`](INSTALL.md).

## Development

`scripts/check-all` runs every gate and test suite. The live conformance rows
spend model calls and run by hand: see `tests/conformance/README.md`. The
decisions behind fx's shape are in `docs/adr/`.
