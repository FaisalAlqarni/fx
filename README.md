# fx

One engineering plugin. Replaces superpowers, mattpocock-skills, ecc and
humanizer with a set that does not overlap. Defers to `ponytail` where it is
installed.

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

### Always on, underneath all of it

```
PREAMBLE.md ---> SessionStart  ---> every session
            \--> SubagentStart ---> every dispatched subagent
                 (subagents read neither CLAUDE.md nor memory:
                  this is the only channel that reaches them)

hooks/fx-pretooluse.js -> PreToolUse, every tool
   + lib/git-guard.js   -> Bash: the absolutes, fail closed
   + lib/lane-check.js  -> Write/Edit: one nudge per session, fail open
```

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
skills/       11: 9 lanes plus prototype and research
agents/       4 review lenses + the devil's advocate: read-only
commands/     3: /fx:setup, /fx:critique, /fx:grill
references/   loaded on demand by a lane, never selectable
hooks/        Claude Code: preamble injection, git guard, lane check
plugins/      opencode: preamble and guard, same shared lib
lib/          git-guard.js, lane-check.js, plan-state.js
tests/        lane-triggering: does a naive prompt reach the lane
PREAMBLE.md   injected into every session AND every subagent
```

## The skills

Model-selectable. Nine lanes own an intent; two are procedures a lane calls.
**Nine of the eleven work standalone**, with no plan and no pipeline: only
`fx-plan` and `fx-implement` need an artifact to start from.

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

| Command | Does |
|---|---|
| `/fx:setup` | per repository: reads the machine facts, asks what the repo cannot tell it, writes `.fx.json`, `repo.md`, and `CONTEXT.md` if terms resolved |
| `/fx:critique` | red-teams a design or plan through `fx-devils-advocate` |
| `/fx:grill` | the stress-test interview alone, for a decision not heading to code |
| `/fx:handoff` | prints a block you paste into another session, on this machine or any other |

## Install

The two installs are **independent**: neither runtime requires the other.

**opencode**: `./scripts/fx-opencode-install`. Nothing reads `~/.claude`.

**Claude Code**: `/plugin marketplace add FaisalAlqarni/fx` then
`/plugin install fx@fx`.

Full steps for both: [`INSTALL.md`](INSTALL.md).

Then, in each repository you work in:

```
/fx:setup
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

node lib/git-guard.test.js   $FIX      # 80 assertions
node lib/base-branch.test.js $FIX      # 27
node lib/heredoc.test.js     $FIX      # 13
node lib/plan-state.test.js            # 17
```

And the one test that measures behaviour rather than files: does a naive
prompt actually make the model invoke the lane? It runs `claude -p` against
`--plugin-dir`, so it tests the working tree and not the installed copy, which
is the distinction that cost this project two false conclusions.

```
tests/lane-triggering/run-all.sh              # 6 lanes, one run each
tests/lane-triggering/run-reps.sh fx-tdd prompts/fx-tdd.txt 5
```

Gates, all of which exit non-zero on a problem:

```
scripts/check-manifest           keys the installer accepts, and the two it rejects
scripts/check-paths              every reference citation resolves
scripts/check-reference-leaves   no reference links to another reference
scripts/check-prose              no dashes, no stock vocabulary, parens balanced
scripts/check-collisions         other installed skills contesting an fx lane
```

`fx-plan` and `fx-implement` are absent from the lane suite on purpose: their
triggers need repository state a scratch directory cannot supply.

The decisions behind fx's shape are in `docs/adr/`.
