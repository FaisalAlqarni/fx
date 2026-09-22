# fx

One engineering plugin. Replaces superpowers, mattpocock-skills, ecc and
humanizer with a set that does not overlap. It does not replace `ponytail`,
which is a separate plugin fx absorbed nothing from.

**Exactly one claimant per intent.** Four skills claiming "TDD" is why skill
selection was effectively random; the fix is that only one ever claims it.

## How the pipeline runs

One path, two hard gates. Nothing skips a gate because the work looks small:
what scales with simplicity is the artifact, never the approval.

```
  you: "let's build X"
        |
        v
  fx-brainstorm ........ classify (spike | bounded | architectural)
        |                clustered question rounds + open-questions ledger
        |                approaches, 2 or 3, recommendation first
        |                seams sketched and CONFIRMED
        |                design doc -> docs/plans/YYYY-MM-DD-slug/design.md
        |                self-review: placeholders, consistency, scope, ambiguity
        |
     [ GATE ] you approve the design
        |
        v
  fx-plan .............. vertical slice tasks, one file each
        |                Consumes / Produces with exact signatures
        |                blocking edges -> the frontier fx-implement works
        |                Global Constraints copied verbatim from the design
        |                self-review: spec coverage, placeholders, type consistency
        |                offers fx-devils-advocate (plan mode)
        |
     [ GATE ] four ways out: implement | red-team | keep discussing | park
        |
        v
  fx-implement ......... worktree (controller creates it, stays outside)
        |                ledger at docs/plans/slug/state.md, survives compaction
        |                pre-flight conflict scan, written down as a table
        |
        +--> per task, serial, fresh subagent each time
        |      |
        |      +--> fx-tdd .......... Iron Law, RED verified, GREEN, commit
        |      |
        |      +--> task review ..... spec compliance + code quality
        |      +--> lenses .......... only those the diff triggers
        |      |
        |      +--> fix loop ........ Important+ only, max 5 rounds,
        |                             every round ends in a scoped re-review
        |
        +--> final: fx-review (branch mode)
        |      all axes, every triggered lens, reviewer-prompt.md
        |      plus fx-devils-advocate (code mode), unprimed, once per branch
        |
        v
  verification before any completion claim, then four options and a stop:
  merge | push and open a PR | leave it | discard. The base branch moves
  when you say which, and not before.
```

### What the lenses are, and when they fire

Read-only agents. They fire on file patterns in the diff, not on every task,
because each one costs a full subagent.

| Lens | Fires when the diff touches |
|---|---|
| `fx-lens-database` | migrations, `*.sql`, models, query chains |
| `fx-lens-security` | auth paths, params, credentials, any new endpoint |
| `fx-lens-a11y` | `.erb`, `.css`, view partials, user-facing strings |
| `fx-lens-silent-failure` | `rescue`, `catch`, workers, retry paths |
| `fx-lens-pipeline` | code that enqueues, publishes, schedules or fans out work; code that governs queue depth, admission or producer flow control |

The first four fire per task and on the branch review. `fx-lens-pipeline` fires
on branch reviews only, never per task; `/fx:fx-audit` also runs it.

### Always on, underneath all of it

```
                 lib/preamble.js renders PREAMBLE.md for each runtime
                        |                 |                  |
Claude Code   hooks/fx-context.js   Codex   hooks/fx-codex.js   opencode   plugins/fx.js
              SessionStart                  SessionStart                   system transform
              SubagentStart                 SubagentStart                  (sessions and child
                                                                            sessions alike)
                 (subagents read neither CLAUDE.md nor memory:
                  this is the only channel that reaches them)

guard and lane check, one shared lib on every runtime:
   hooks/fx-pretooluse.js   Claude Code, PreToolUse, every tool
   hooks/fx-codex.js        Codex, PreToolUse, every tool, plus read-only enforcement
   plugins/fx.js            opencode, tool.execute.before
      + lib/git-guard.js    shell: the absolutes, fail closed
      + lib/lane-check.js   file writes: one nudge per session, fail open
```

`PREAMBLE.md` is a small bootstrap, about 2.9K characters. Routing lives in
each skill's own description (`docs/adr/0021`).

**The guard does not police where you are.** Which branch you commit on is the
workflow's business: work happens in a worktree because `fx-implement` sets one
up, and integration is a question you get asked rather than a wall you hit.

What it does refuse, anywhere, because each is irreversible or leaves the
machine: force push, pushing the base branch, a bare `push` that names no
target, deleting a remote branch, `--no-verify`, `reset --hard`, `clean -f`,
`branch -D`, `stash drop`, `checkout .`, `tag -d`, and any commit carrying an
attribution trailer. A `sh -c` wrapper does not get you past it; a `grep` for
one of those strings is data and does.

## Layout

```markdown
skills/       17: 10 lanes, prototype and research, and 5 you invoke yourself:
              fx-audit, plus fx-setup, fx-critique, fx-grill and fx-handoff,
              generated from commands/
agents/       6: 5 review lenses plus the devil's advocate, all read-only
codex/agents/ the same 6 as Codex role files, generated
commands/     4: /fx:fx-setup, /fx:fx-critique, /fx:fx-grill, /fx:fx-handoff
references/   loaded on demand by a lane, never selectable
hooks/        Claude Code: hooks.json, fx-context.js, fx-pretooluse.js
              Codex: fx-codex.js, wired by the root hooks.json
plugins/      opencode: fx.js
lib/          shared by all three: preamble.js (the renderer), git-guard.js,
              lane-check.js, plan-state.js, plant-roles.js, agent-dialects.js,
              opencode-commands.js
tests/        conformance: the live and free rows, per runtime
              install: the install test for all three runtimes
              gates: the node gate tests check-all runs
              lane-triggering: does a naive prompt reach the lane
              lens-pipeline: the fixture fx-lens-pipeline is run against
PREAMBLE.md   the bootstrap, injected into every session AND every subagent
```

## The skills

Model-selectable. Ten lanes own an intent; two are procedures a lane calls.
**Ten of the twelve work standalone**, with no plan and no pipeline: only
`fx-plan` and `fx-implement` need an artifact to start from. The other five
skills are not model-selectable and are not in this table: you type them, as
the next section shows.

| Skill | Use when |
|---|---|
| `fx-brainstorm` | any new work. Classify, interview, design, gate |
| `fx-plan` | a design is approved and needs breaking into tasks |
| `fx-implement` | `docs/plans/<slug>/tasks/` exists and needs building |
| `fx-tdd` | writing or changing code with logic, in any language |
| `fx-review` | a diff, branch or PR needs checking |
| `fx-architecture` | the structure of existing code is the problem |
| `fx-design` | a screen or component, and how it looks. Any template language |
| `fx-debug` | a bug, a test failure, anything unexpected |
| `fx-humanize` | prose reads like a brochure. 35 patterns, upstream verbatim |
| `fx-authoring` | editing a SKILL.md, CLAUDE.md, or a dispatch prompt |
| `prototype` | a question needs something runnable to settle it |
| `research` | the answer lives outside this repository |

## The commands

Every command is typed with its `fx-` name: `/fx:fx-<name>` on Claude Code,
which adds the plugin prefix, `/fx-<name>` on opencode, and `$fx-<name>` on
Codex, where each command ships as a skill generated from `commands/`. The
table shows the Claude Code form.

| Command | Does |
|---|---|
| `/fx:fx-setup` | per repository: reads the machine facts, asks what the repo cannot tell it, writes `.fx.json`, `repo.md`, and `CONTEXT.md` if terms resolved |
| `/fx:fx-critique` | red-teams a design or plan through `fx-devils-advocate` |
| `/fx:fx-grill` | the stress-test interview alone, for a decision not heading to code |
| `/fx:fx-handoff` | prints a block you paste into another session, on this machine or any other |

`/fx:fx-audit` is typed the same way but is a user-invoked skill, not a
command: `skills/fx-audit/`, with `disable-model-invocation: true`, so the
model never selects it. It audits an existing system in four gated phases,
ending in a `design.md` for `fx-plan`.

All five are hidden from the model on every runtime and stay typeable: by
`disable-model-invocation` on Claude Code, by `agents/openai.yaml` on Codex,
and on opencode by a `deny` in `permission.skill` plus a generated command.
The Codex hiding has a known fragility, described in `INSTALL.md`. On
Claude Code and Codex no live row checks this yet: conformance rows 13 and 14
are GAP there (`INSTALL.md`, "Stated limitations"), and the frontmatter flags
are pinned by a gate test instead.

## Install

The three installs are **independent**: no runtime requires another.

**Claude Code**: `/plugin marketplace add FaisalAlqarni/fx` then
`/plugin install fx@fx`.

**Codex**: `codex plugin marketplace add FaisalAlqarni/fx` then
`codex plugin add fx@fx`, then trust fx's hooks in `/hooks` and restart Codex
once after the first session.

**opencode**: add `plugins/fx.js` from a clone to your `opencode.json`, or run
`./scripts/fx-opencode-install`. Nothing reads `~/.claude`.

Full steps, refreshing an install, and what each runtime has been proven to
do: [`INSTALL.md`](INSTALL.md).

Then, in each repository you work in:

```
/fx:fx-setup     # Claude Code
/fx-setup        # opencode
$fx-setup        # Codex
```

which reads the machine facts, then asks two short rounds about what the code
cannot tell it (the domain vocabulary, what "done" means here), and writes
`.fx.json`, `repo.md` and `CONTEXT.md` for your review before any of it lands.

## Tests

Three of the suites need a main checkout and a linked worktree to run against.
Build them first. `make-git-fixture` writes the worktree metadata directly,
because the obvious route (init, commit, add a worktree) is blocked at the
commit by fx's own guard: a scratch fixture repo is a main checkout like any
other, and the guard is right not to try to tell them apart.

```
FIX=$(scripts/make-git-fixture /tmp/fx-fixture)

node lib/git-guard.test.js   $FIX      # 85 assertions
node lib/base-branch.test.js $FIX      # 27
node lib/heredoc.test.js     $FIX      # 25
node lib/plan-state.test.js            # 17
```

And the one test that measures behaviour rather than files: does a naive
prompt actually make the model invoke the lane? It runs `claude -p` against
`--plugin-dir`, so it tests the working tree and not the installed copy, which
is the distinction that cost this project two false conclusions.

```
tests/lane-triggering/run-all.sh              # 7 lanes, 9 prompts, one run each
tests/lane-triggering/run-reps.sh fx-tdd prompts/fx-tdd.txt 5
```

The one behavioural check on `fx-lens-pipeline` is the fixture under
`tests/lens-pipeline/`. It is not a script: an agent reads the lens through a
brief and reviews the fixture. What counts as a regression is stated in
`tests/lens-pipeline/README.md`.

Gates, all of which exit non-zero on a problem. `scripts/check-all` runs all
of these except `check-collisions`, which is run by hand because it reads
skill directories on this machine, not this repository:

```
scripts/check-manifest                     manifest keys, declared paths, and convention-discovered directories
scripts/check-paths                        every reference citation resolves
scripts/check-reference-leaves             no reference links to another reference
scripts/check-prose                        no dashes, no stock vocabulary, parens balanced
scripts/check-tool-names                   no skill body names a runtime's tool
scripts/check-interpreters                 every script invocation in a skill names its interpreter
tests/gates/check-prose-explicit-path.sh   check-prose reads a path named explicitly even under .worktrees/
scripts/check-artifacts                    nothing in skills/, agents/ or commands/ names the OS temp directory
tests/gates/check-artifacts-remote.sh      the remote-asset rule in check-artifacts, proven against scratch trees
scripts/check-generated                    generated files match their sources
tests/gates/agent-model.test.js            every agent pins a model
scripts/check-collisions                   other installed skills contesting an fx lane
```

After the four node suites above, `scripts/check-all` also runs:

```
lib/preamble.test.js                         the bootstrap renders per runtime, within its size budgets
tests/gates/codex-manifest.test.js           the Codex manifest and hook wiring
tests/gates/codex-hook-output.test.js        Codex hook output uses only keys Codex accepts
tests/gates/user-invoked.test.js             the five user-invoked lanes stay hidden from the model
tests/gates/fx-setup-root-check.test.js      fx-setup loads code only from a verified fx root
lib/plant-roles.test.js                      Codex role planting and the read-only classifier
tests/gates/opencode-plugin.test.js          the opencode plugin's config, guard and lane check
tests/gates/description-overlap.test.js      two lanes claiming one trigger name each other
tests/install/run.sh                         the install test, once per runtime
tests/install/home-untouched.test.sh         the gates write nothing into HOME
tests/conformance/runner-isolation.test.sh   the conformance runner never writes to a real home
tests/conformance/plant-codex-roles.test.sh  the runner plants Codex roles into its scratch home
tests/conformance/merge-opencode-provider.test.sh  the runner's opencode provider merge
tests/conformance/run.sh <runtime> --free    the free conformance rows, once per runtime
tests/gates/ci-pins.test.js                  the nightly workflow's pins and permissions
```

`tests/companion/ignore-guarantees.sh`, the visual companion's ignore
guarantees, is run by hand instead: it starts real servers. The live
conformance rows are run by hand too, because they spend model quota:
`tests/conformance/README.md` says how.

`fx-plan` and `fx-implement` are absent from the lane suite on purpose: their
triggers need repository state a scratch directory cannot supply.

A lane with two intents keeps a prompt for each: `<lane>.txt` and
`<lane>__<variant>.txt`, both required to pass. That is the regression net for
widening a description, which can add one trigger and silently cost another.
A lane needing a subject on disk gets `fixtures/<lane>.sh`.

The decisions behind fx's shape are in `docs/adr/`.
