# fx

One engineering plugin for coding agents. It takes a piece of work from an
idea to a reviewed branch through one pipeline: design, plan, build test-first,
review. Exactly one skill claims each intent, so the model never has to choose
between two skills that both say "TDD".

fx runs on four harnesses: Claude Code, Codex, opencode 1.x and opencode 2.x.

## How the pipeline runs

Architectural work takes the path below, with two approval gates. A bounded
change gets one approval in chat and goes straight to code. A spike ends in a
recommendation.

```
  you: "let's build X"
        |
        v
  fx-brainstorm ........ classify (spike | bounded | architectural)
        |                question rounds, then one message: what made it
        |                95% sure, a 2-line plan, every output the design
        |                names with its answer, 2 or 3 approaches
        |                (recommendation first); wait for go
        |                design doc -> docs/plans/YYYY-MM-DD-slug/design.md
        |
     [ GATE ] you review the file once and approve it
        |
        v
  fx-plan .............. vertical slice tasks, one file each
        |                exact interfaces, blocking edges, global constraints
        |                offers a red-team pass (fx-devils-advocate)
        |
     [ GATE ] implement | red-team | keep discussing | save for later
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
        +--> coverage audit, then branch review: a broad pass on
        |      cross-task seams, at most four lenses, and an unprimed
        |      adversarial pass
        |
        +--> the full test suite, once, and the repository's own CI
        |      commands, each exit code read
        |
        v
  four options: merge | push and open a PR | leave it | discard.
  Nothing merges or leaves the machine until you choose.
```

## What a build costs

Measured on fx 0.2.9 with Opus sessions on 2026-10-22, one row per phase of
the pipeline above.

| Phase | Tokens | Wall clock | Measured on |
|---|---|---|---|
| Brainstorm: the interview, up to the confidence check | 0.50M to 0.56M | 3.4 to 3.6 min | 2 runs, below |
| Design: design.md written and approved | 0.24M to 0.32M | 0.9 to 1.3 min | the same 2 runs |
| Plan: plan.md and the task files | 0.50M to 0.98M | 3.6 to 4.5 min | the same 2 runs, 6 and 7 tasks |
| Implement and review: every task built and reviewed, then the branch review | 11.3M | 18.7 min | median of 3 builds of a 6-task plan |
| **Total: idea to reviewed branch** | **12.5M to 13.1M** | **26.8 to 27.9 min** | each of the 2 runs' phases plus the build median |

- Brainstorm, design and plan ran on one feature: invoice approval in a small
  Rails app, with 13 requirements, a migration with a backfill and an
  authorization rule. A Haiku model played the user from a fixed brief. Both
  plans carried all 13 requirements; the two designs carried 12 and 13. The
  times include the simulated user's replies, so a person answering takes
  longer.
- Implement and review is the median of three fixture builds
  (`tests/fixture-build/`). Its tokens split into 8.1M for the controller
  (dispatch, ledger, coordination), 1.3M for the implementers, 1.3M for task
  reviews, lenses and the coverage audit, and 0.6M for other agents. The wall
  clock is not split between implementing and reviewing.
- Run files: `docs/plans/2026-10-21-audit-fx/checkpoints.md` and
  `docs/plans/2026-10-21-audit-fx/plan-phase-runs.md`.

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

You type five more skills yourself: four are generated from `commands/`,
`fx-audit` is its own skill. The model never picks them.

| Command | Does |
|---|---|
| `fx-setup` | per repository: writes `.fx.json`, `repo.md` and `CONTEXT.md` for your review |
| `fx-audit` | audits an existing system in four gated phases, ending in a design for `fx-plan` |
| `fx-critique` | red-teams a design or plan |
| `fx-grill` | a stress-test interview for a decision not heading to code |
| `fx-handoff` | prints a block to paste into another session |

How you type them: `/fx:fx-<name>` on Claude Code, `/fx-<name>` on opencode,
`$fx:fx-<name>` on Codex.

## What the lenses are, and when they fire

fx has six read-only agents: five lenses and a devil's advocate. None of them
can write, on any harness. Each costs a full subagent, so per task only three
lenses fire, each on a narrow tripwire. At the branch review, at most four
lenses fire alongside `fx-devils-advocate`: each on its broad trigger, and only
if it did not already cover those files per task. A standalone review of a
branch or PR runs every lens whose trigger matches. `/fx:fx-audit` also runs
`fx-lens-pipeline`. The cells below are shortened; the full trigger table is in
`skills/fx-review/SKILL.md`.

| Lens | Per task (tripwire) | Branch review: fires when the diff touches |
|---|---|---|
| `fx-lens-database` | a migration, schema change, index or constraint change, backfill | migrations, `*.sql`, `structure.sql`, models, ClickHouse queries, EF migrations |
| `fx-lens-security` | auth code (`[Authorize]`, token issue or verify), credentials, a new endpoint, a record fetched by a request parameter, a user-supplied URL, string-built SQL or shell | auth paths, params, credentials, any new endpoint |
| `fx-lens-a11y` | no | `.erb`, `.css`, view partials, Compose `.kt`, SwiftUI `.swift`, user-facing strings |
| `fx-lens-silent-failure` | a swallowing handler, `retry_on`, `discard_on`, a job, consumer or webhook receiver, a loop past a failed record | `rescue`, `catch`, `except`, Sidekiq workers, broker consumers, attribution code, retry paths |
| `fx-lens-pipeline` | no | code that enqueues, publishes, schedules or fans out work; code that governs queue depth, admission or producer flow control |

## What runs in every session

```
                 lib/preamble.js renders PREAMBLE.md for each runtime
                        |                 |                  |
Claude Code   hooks/fx-context.js   Codex   hooks/fx-codex.js   opencode 1.x   plugins/fx-opencode-v1.js
              SessionStart                  SessionStart                   system transform
              SubagentStart                 SubagentStart                  (sessions and child
                                                                            sessions alike)
                                                                opencode 2.x   plugins/fx-opencode-v2.js
                                                                               session.hook('context')
                 (subagents read neither CLAUDE.md nor memory:
                  this is the only channel that reaches them)

guard and lane check, one shared lib on every runtime:
   hooks/fx-pretooluse.js    Claude Code, PreToolUse, every tool
   hooks/fx-codex.js         Codex, PreToolUse, every tool, plus read-only enforcement
   plugins/fx-opencode-v1.js opencode 1.x, tool.execute.before
   plugins/fx-opencode-v2.js opencode 2.x, permission.evaluate, plus installed policies
      + lib/git-guard.js     shell: the absolutes, fail closed
      + lib/shell-guard.js   shell: hard rules and a read-only allowlist; the rest runs and is logged
      + lib/lane-check.js    file writes: two once-per-session nudges, source with no design.md and a test
                             written after its implementation, fail open
      + lib/edit-rules.js    file writes: three built-in rules, refuse on a breach

turn hooks:
   hooks/fx-turn.js          Claude Code: prompts, tool results, Stop and SubagentStop
   hooks/fx-codex.js         Codex: the same checks
   plugins/fx-opencode-v1.js, plugins/fx-opencode-v2.js   opencode: the same checks
      + lib/stop-check.js    Stop: blocks once when edits went unverified (a reminder on opencode)
      + lib/loop-tracker.js  a nudge when a command fails repeatedly, edits pile up unchecked, or the turn stalls

dispatch routing, Claude Code only:
   hooks/fx-pretooluse.js    Agent calls: no model on a general-purpose, claude or Plan
      + lib/dispatch-route.js    dispatch -> sonnet; any model above sonnet without a leading
                             "Capable because:" line -> sonnet; forks untouched; never refuses
```

`PREAMBLE.md` is a bootstrap of about 3.2K characters (the budget is 3,400) that tells the model to
invoke a skill before it acts. Each skill's description says when to use it.

After the bootstrap, `lib/preamble.js` appends one companions line to every
session and subagent. It names semble for code search (repowise or another
search tool as the fallback), ponytail and caveman at full, and
`fx-humanize` for prose, and tells the agent to skip any tool its runtime
lacks. Set `companions` in `.fx.json` to replace the line (300 characters at
most, shown as "This repository's .fx.json adds: ..."), or to `""` to turn it
off. An unreadable `.fx.json` adds a note that the default applied.

If `repo.md` exists, the preamble points the model to it. Sessions (not
subagents) also get a block listing the plans in `docs/plans` with open work,
and up to 10 carried rulings of at most 160 characters each.

The guard does not check which branch you are on. `fx-implement` does its
work in a worktree, and at the end it asks you how to integrate.

The guard refuses these anywhere, because each one is irreversible or leaves
the machine: force push, pushing the base branch, a bare `push` that names no
target, deleting a remote branch, `--no-verify`, `reset --hard`, `clean -f`,
`branch -D`, `stash drop`, `checkout .`, `tag -d`, and any commit carrying an
attribution trailer. Wrapping a command in `sh -c` does not get it past the
guard. A `grep` for one of those strings is treated as data and runs.

### Hooks

The shell guard refuses a short list of destructive commands (recursive `rm`
on `/` or a home directory, `mkfs`, `curl` piped into a shell, `shutdown` and
similar) with no override, allows a fixed set of read-only commands and the
repository's own `.fx.json` commands silently (the latter are logged), and runs
the rest, logging each one. The Stop check blocks once on Claude Code and Codex
when a turn edited code and no check passed afterwards; on opencode it is a
reminder at the next request. The nudges tell the agent when the same command
keeps failing, after 10 edits since the last passing check, or when 12 reads in a
row bring no edit.

Each file edit through the harness's edit tools, inside the repository, is
checked against three built-in edit rules: no em or en dash in Markdown (`.md` and `.mdx`), no
secret, no merge-conflict marker. A breach refuses the write.

`hooks` in `.fx.json` has three switches for one repository: `stop_check`,
`loop_nudge` and `edit_rules`. `edit_rules: false` turns off all three
built-in rules, `no-secrets` included. The git guard and the shell guard's hard
rules stay on. An agent can edit `.fx.json`; fx shows a notice when its hook
switches change during a session and does not stop the change. Claude Code
shows the notice at session start and at the next Stop. opencode 1.x prints it
on stderr and also queues it for the model. On Codex the notice is shown at
session start and goes to stderr at Stop; whether Codex shows a Stop hook's stderr to the user is not measured.
opencode 2.x shows no notice.

## Layout

```
skills/       17: 10 lanes, prototype and research, and 5 you invoke yourself:
              fx-audit, plus fx-setup, fx-critique, fx-grill and fx-handoff,
              generated from commands/
agents/       6: 5 review lenses plus the devil's advocate, all read-only
codex/agents/ the same 6 as Codex role files, generated
commands/     4: fx-setup, fx-critique, fx-grill, fx-handoff
references/   loaded on demand by a lane, never selectable
hooks/        Claude Code: hooks.json, fx-context.js, fx-pretooluse.js, fx-turn.js
              Codex: fx-codex.js, wired by the root hooks.json
plugins/      opencode: fx-opencode-v1.js (1.x), fx-opencode-v2.js (2.x)
lib/          generated from src/lib, shared by all four harnesses: the preamble
              renderer, the git and shell guards, edit rules, Stop check, loop
              tracker, journal and decision log, lane check, plan state, role
              planting and the opencode helpers; dispatch-route.js is Claude
              Code only
src/          TypeScript sources; scripts/build writes the committed hooks/,
              plugins/, lib/, index.js and the node scripts from them
scripts/      fx-opencode-install, build, check-all and the gates it runs
tests/        conformance, install, gates, lane-triggering, lens-pipeline,
              companion, fixture-build, review-bench
docs/         adr/ (decisions) and plans/ (designs and plans)
INSTALL.md    full install steps; SURFACE.md lists what fx exposes
PREAMBLE.md   the bootstrap, injected into every session AND every subagent
```

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

Run `npm ci` once; edit `src/`, then `scripts/build` (see INSTALL.md,
"Changing fx itself"). `scripts/check-all` runs every gate and test suite. The live conformance rows
spend model calls and run by hand: see `tests/conformance/README.md`. The
decisions behind fx's shape are in `docs/adr/`.
