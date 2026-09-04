# fx

One engineering plugin. Replaces superpowers, mattpocock-skills and ecc
and humanizer with a set that does not overlap.

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
  verification before any completion claim, then the git commands, printed.
  fx never commits for you and never pushes.
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

lib/git-guard.js -> PreToolUse on Bash -> every command, both runtimes
```

The guard is not advisory. On the main checkout every mutating git command is
refused. Inside a worktree you are free, except for the absolutes: force push,
pushing the base branch, `reset --hard`, `clean -f`, remote branch deletion,
and any commit message carrying an attribution trailer.

## Layout

```markdown
skills/       9 lanes: model-selectable, one per intent
agents/       review lenses + the devil's advocate: read-only
commands/     /fx:setup and friends
references/   loaded on demand by a lane, never selectable
hooks/        Claude Code: preamble injection + git guard
plugins/      opencode: the same two jobs, same shared lib
lib/          git-guard.js: one predicate, both runtimes
PREAMBLE.md   injected into every session AND every subagent
```

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

which writes `.fx.json` (commands, stacks) and generates `repo.md` (the
project's structure and patterns) for your review before it lands.

## The rules it enforces

The git guard is not advisory. On the main checkout every mutating git command
is refused; inside a worktree you are free. Attribution trailers
(`Co-Authored-By`, `Claude-Session`, "Generated with") are blocked in commit
messages everywhere: including inside a dispatched subagent, which reads
neither `CLAUDE.md` nor memory and would otherwise never see the rule.

## Tests

Three of the suites need a main checkout and a linked worktree to run against.
Build them first. `make-git-fixture` writes the worktree metadata directly,
because the obvious route (init, commit, add a worktree) is blocked at the
commit by fx's own guard: a scratch fixture repo is a main checkout like any
other, and the guard is right not to try to tell them apart.

```
FIX=$(scripts/make-git-fixture /tmp/fx-fixture)

node lib/git-guard.test.js   $FIX      # 87 assertions
node lib/base-branch.test.js $FIX      # 27
node lib/heredoc.test.js     $FIX      # 13
node lib/plan-state.test.js            # 17
```

Gates, all of which exit non-zero on a problem:

```
scripts/check-manifest           keys the installer accepts, and the two it rejects
scripts/check-paths              every reference citation resolves
scripts/check-reference-leaves   no reference links to another reference
scripts/check-prose              no dashes, no stock vocabulary, parens balanced
scripts/check-collisions         other installed skills contesting an fx lane
```

The nine skills themselves are **not** behaviourally tested yet: see `DEBT.md`.
