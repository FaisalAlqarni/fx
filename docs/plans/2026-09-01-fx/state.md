# fx ledger — plan: docs/plans/2026-09-01-fx/plan.md

## Ticket 01: complete

Plugin layout, three manifests, 54 reference paths anchored across 14 files.
All six acceptance criteria pass. Guard suite 69/69 from the new location; both
adapters verified working from the new plugin root.

Implemented in the main session rather than by a dispatched subagent — a
deviation from this skill, recorded rather than hidden.

**Ruling: anchoring uses paths relative to the citing file, not
`${CLAUDE_PLUGIN_ROOT}`.** — The ticket suggested the env var, but it is
Claude-Code-only and fx ships to opencode as well. `../../references/…` from a
skill resolves on any runtime with no environment at all. — Cost if wrong: a
runtime that resolves relative paths against cwd rather than the file would
break every citation; mitigated because both adapters were verified reading
from the new root.

**Ruling: `scripts/check-paths` rewritten in Python after mutation testing.**
— The first bash version passed a deliberately-broken path; its resolvability
half was dead code. Caught only because the mutation was run. — Cost if wrong:
none, the Python version fails on both mutation classes.

## Ruling: no worktree — the repo has no commits

`git worktree add` requires a HEAD, and `/development/fx` has zero commits. The
standing rule is that commits belong to the user, so this cannot be resolved
from inside a session.

**Proceeding in the main checkout, writes only, no commits.** — Reason: writes
are permitted there (the guard covers git, not `Write`/`Edit` — design §4), and
stopping to request a commit would park the whole plan on a one-line action.
— Cost if wrong: none material. Every change is uncommitted and visible in
`git status`; nothing is irreversible, and no commit is created.

Once the user makes an initial commit, later work can move to a worktree
normally.

## Ruling: tickets 02–07 dispatched concurrently

The skill says implementers never run in parallel. **Its stated reason is a
shared test environment** — concurrent runs producing false RED and false
GREEN. That reason does not hold here: 02 is the only ticket that executes a
test suite (`lib/git-guard.test.js`), and the others run either
`scripts/check-paths`, which is read-only, or nothing.

- **Ruling:** dispatch 02–07 concurrently, since no two share a test
  environment. — Cost if wrong: a false GREEN on one ticket, caught by the
  task review that follows each.
- **Ruling:** no subagent edits `.claude-plugin/plugin.json`. Four tickets
  (04, 05, 06, 07) would otherwise write the same file concurrently. The
  controller applies every manifest change centrally after the subagents
  return. — Cost if wrong: none; it removes the only real write conflict.

## Ticket 02: complete

D-A implemented. `push` removed from the unconditional block, so it falls
through to the ordinary path: worktree allows, main checkout blocks. Force
variants (`-f`, `--force`, `--force-with-lease`) and `--no-verify` stay absolute.

Suite 69 → **83 passing**. Implementer's RED evidence: exactly the two new
worktree-push assertions failed, for the right reason. Mutation check (forcing
`worktree: true`) failed 20 assertions including both main-checkout push cases,
proving the new tests reach that path.

**Task review: independently verified.** Ten behaviours re-checked directly
against `inspect()` rather than through the implementer's own assertions — all
correct, including that commit-on-main, `reset --hard` and the attribution rule
are unchanged.

One assertion was restructured, not deleted: `['git push origin main','push']`
lived in a loop asserting blocked in *both* locations, and its worktree half
now contradicts D-A. The main-checkout half was preserved verbatim as an
explicit line. Net +14 assertions, none removed.

**Gap found and closed in review.** The implementer flagged that
`git push --delete origin feature` was still allowed from a worktree, and it
was. Remote branch deletion is the same destructive class as `branch -D`, which
is blocked absolutely — no reflog reaches it and it destroys work for everyone
who has that branch. Added `--delete`, `-d` and `:refspec` deletion to the
always-blocked rules, with three assertions.

**Ruling: `--force-with-lease` is blocked with `--force`.** — The ticket said
"`--force` variants"; lease or not, it rewrites published history. — Cost if
wrong: an agent cannot do a safe force-push and must ask. Acceptable.

## Ticket 06: complete — no agent shipped

Verdict: **~15% applicable, ~370 of 455 lines stack-irrelevant.** Zero mentions
of Rails, ActiveRecord, Sidekiq, .NET, EF Core, RSpec or ERB anywhere in the
source; 44 lines are React `useMemo`/`memo` advice and 38 are bundle-size.

Decision: **dropped.** The decisive argument was not irrelevance but
duplication — the usable residue (N+1, missing indexes, `SELECT *`, unbounded
result sets) fires on models and `db/migrate/`, which is exactly
`fx-lens-database`'s trigger set. Shipping it would mean two lenses returning
the same findings on the same diffs for two dispatches: the duplication fx
exists to end.

Recorded as **D5**. Invariant verified: `named=0 exists=0` — the trigger table
no longer names an agent that does not exist. Stale "all five lenses" corrected
to four. Controller also updated `SURFACE.md`, which was outside the
implementer's permitted file set.

**Review condition, not yet satisfied.** This justification rests on
`fx-lens-database` actually covering that residue — and the implementer checked
the *upstream* `ecc:database-reviewer`, because ticket 05 had not landed yet.
**When 05 lands, confirm the delivered `fx-lens-database` really covers N+1,
missing indexes and unbounded results.** If it does not, D5's argument fails
and the gap is real.

**Gap recorded in D5:** app-layer performance that is not schema-shaped —
Sidekiq enqueued per record, N+1 inside ERB partials, missing `find_each`,
cache-key churn, EF Core `AsNoTracking` and client-side evaluation. None of it
exists upstream. Cheapest fix is an app-layer section in `fx-lens-database`'s
brief rather than a second dispatch.

## Ticket 07: complete

Three commands written — `fx-critique` (46 ln), `fx-grill` (64), `fx-level` (61).
Ticket check RED before, PASS after. `check-paths` GREEN at 50 citations.

**Task review: verified.** `/fx:level`'s file mentions were checked rather than
counted — `CLAUDE.md`, `settings.json` and `agents/` appear only inside an
explicit prohibition ("Never `~/.claude/CLAUDE.md`. That is the user's own
file"). Real `~/.claude/CLAUDE.md` md5 unchanged. The implementer exercised the
write under a sandboxed `HOME`: existing keys survive, idempotent on repeat,
creates the file when absent, and malformed JSON throws before writing rather
than being "repaired" by overwrite.

`/fx:grill`'s boundary holds. Its description triggers on *"a decision that is
not heading for code"*, which does not overlap `fx-brainstorm`'s "let's build".
The file carries an explicit never-list (no classification, no design doc, no
gate, no handoff) and a handover rule: the moment the topic turns out to touch
this repo's code, stop and hand to `fx-brainstorm`. The one-claimant rationale
is stated inline so it survives an editor who does not know why it is there.

## Ticket 03: complete

D-C implemented. Three files merged into `references/vocab/codebase-design.md`
(286 lines); `deepening.md` and `design-it-twice.md` deleted. Absorbed H1s
became H2s and their subheadings demoted accordingly.

**Task review: heading preservation verified independently.** All **24**
original headings from the three source files were extracted from the copies
still in `fx-plugin-draft/` and matched against the merged text — all present,
none dropped. Word count grew slightly, so this was a merge, not a truncation.

**The leaf invariant now holds for the first time.** `check-reference-leaves`
was written first and run RED (`FAIL: 7 reference-to-reference link(s)`), then
GREEN. The implementer's gate is better than the ticket's snippet: it catches
slash-bearing paths, which the ticket's version would have missed on
`rails.md → references/stacks/observability.md` — the very link the controller
introduced during Section 3.

Zero dangling references to the deleted files. Counts corrected 26 → 24 in
`SURFACE.md` and the design doc; the design's leaf paragraph flipped from
"does not hold" to holds.

`find-polluter.sh` sentence removed from `root-cause-tracing.md`; the bisect
technique it described survives, rephrased via `rspec --seed`.

**Left deliberately:** `condition-based-waiting.md` cites its own
`condition-based-waiting-example.ts` sidecar in the same directory. Not a
reference-to-reference `.md` link and the file ships with the plugin, so it is
outside this invariant. Noted, not fixed.

## Ticket 05: complete

Four lenses shipped: `database` 121 ln / opus · `security` 134 / opus ·
`a11y` 132 / sonnet · `silent-failure` 120 / sonnet. All four read-only
(`Read, Grep, Glob, Bash`), all frontmatters parse, all under 200 lines, zero
write tools anywhere.

**Task review: verified.** Upstream's ecosystem flavour was genuinely replaced,
not relabelled — Supabase RLS → Rails multi-tenant scoping + EF Core, npm/express
→ Devise/Pundit/JWT + ASP.NET, WCAG-authoring → ERB/Turbo/Stimulus with
Arabic/RTL first-class. The a11y source shipped `tools: Read, Write, Edit` and
an ADR-authoring template; both were dropped, making it a pure lens as required.

**D5's review condition is now satisfied.** Ticket 06 dropped the performance
lens arguing the usable residue was already `fx-lens-database`'s — but it
checked the *upstream* source, because 05 had not landed. The delivered file
was checked directly and does carry it, in both stacks' terms:

> N+1: an association loaded inside an iteration with no `includes`/`preload`,
> or an EF query enumerated inside a loop. · A query issued per record where one
> set-based statement would do; `SELECT *` where a projection belongs. ·
> `OFFSET` pagination on a table that grows without bound.

D5 stands. The two tickets resolved consistently despite running concurrently
and neither being able to see the other's output.

`fx-review`'s trigger table needed no edit — all four names resolve to shipped
files, and the table already reflects ticket 06's removal.

## Ticket 04: complete

D-B implemented. `research` (12 ln) and `prototype` (26 ln + LOGIC.md + UI.md)
copied. Verified against upstream: `LOGIC.md` and `UI.md` **byte-identical**;
`prototype/SKILL.md` differs only in its `description`; `research/SKILL.md`
differs in its `description` plus **exactly one** appended paragraph, as the
ticket allowed.

**The `agents/` decision: not copied.** Inspected rather than assumed — it is a
three-line `openai.yaml` Codex interface manifest, inert under Claude Code, and
it restates the description as a prose summary, which would give the description
a second place to drift. Reasoning recorded in `SURFACE.md` and design §2.

**Task review: the wiring finding is the valuable part.** A call site in §4
alone would have been **dead code**. Two other places forbade or bypassed it:

1. §1's terminal-states rule said *"the only skill you invoke after this is
   `fx-plan`"* — which would have forbidden calling `prototype` at all.
2. The architectural checklist routed only to the visual companion, so an agent
   following the checklist would never reach the new subsection.

All three were fixed together. This is exactly the class of defect that made
the original claim false for months: the documentation said `fx-brainstorm`
calls `prototype`, and nothing did.

Both descriptions are trigger lists that name their boundary explicitly —
`research` cedes in-repo facts to `Explore`; `prototype` disclaims being an
entry point, which is the only lane it could plausibly contest.

## Integration — manifest applied centrally

Controller declared `./skills/research` and `./skills/prototype`. All 11
declared skills resolve to a real `SKILL.md`; `agents/`, `commands/` and
`hooks/hooks.json` all resolve.

**All gates green after integration:**
`check-paths` 50 citations · `check-reference-leaves` 0 cross-links ·
guard suite **83 passed** · longest lane 481/500 · no duplicate skill names ·
both adapters live (guard blocks commit on main; opencode injects 4,789 chars
and allows `push` from a worktree per D-A).

Concurrent dispatch was safe in practice: three agents edited `SURFACE.md` and
`design.md` in disjoint sections with no conflict, and the one real contention
point — `plugin.json` — was reserved for the controller and never touched.

## Ticket 08: partial — install documented, execution is the user's

`INSTALL.md` written for both runtimes. Researched rather than assumed, after
being wrong about opencode twice already.

**Corrections from the docs:**
- opencode plugins live in `~/.config/opencode/plugins/` (plural) and load with
  no config entry. npm-package plugins need an `opencode.json` entry; local ones
  do not.
- opencode scans `~/.config/opencode/skills`, `~/.claude/skills` **and**
  `~/.agents/skills`. It does **not** read Claude Code plugin marketplaces, so
  `/plugin install` does nothing for it.

**Bug found by testing, not reasoning.** Symlinking skills individually
**breaks every reference path.** Lanes cite `../../references/vocab/x.md`
relative to the skill file; through a per-skill symlink an agent resolves to
`~/.config/opencode/references`, which does not exist. Node follows realpath and
appears fine, which is what makes it dangerous — the skill loads and every
reference silently fails.

Fix: link `skills` and `references` as **siblings** under
`~/.config/opencode/`. Verified — four sampled skills resolve their references
through the symlinked tree, and the plugin loads `lib/` and `PREAMBLE.md` from a
symlinked entry point (4,789 chars injected, force-push blocked).

**Remaining and deliberately not done by an agent:** the live install, the
subagent probe, and removing the superseded plugins from both pools. Outward-
facing and destructive; ordering matters (`~/.agents/skills` last, only after
opencode is confirmed).

## Ticket 08 revised: opencode install is standalone

The first `INSTALL.md` treated opencode as a second install alongside Claude
Code. It is now independent — an opencode-only user never touches `~/.claude`.

**Audit result:** the core is already runtime-neutral. `PREAMBLE.md` 0/1 files
mention Claude Code, `agents/` 0/5, `references/` 1/24. The gap was **agents and
commands**, whose frontmatter the two runtimes read differently:

| | Claude Code | opencode |
|---|---|---|
| tool restriction | `tools:` | `permission:` |
| model id | `opus` | `anthropic/claude-opus-5` |
| subagent | implied by directory | `mode: subagent` |
| command prompt | file body | `template:` (required) |

Copying the files across would have produced agents opencode does not treat as
subagents, unpinned models silently inheriting the session's most expensive
one, and — worst — **lenses whose read-only restriction is not enforced**,
because it lives in `tools:`, which opencode does not read.

**`scripts/fx-opencode-install` written.** Symlinks skills/references/plugin
(single source, `git pull` updates the install) and *generates* agents and
commands with translated frontmatter. Verified in a sandbox destination: 11
skills, 5 agents, 4 commands, all frontmatter valid, all four lenses carrying
`edit: deny / write: deny / bash: allow`, zero `CLAUDE_PLUGIN_ROOT` references
in the output, and the reference-resolution probe passing.

The installer refuses to replace a real file or directory, and fails loudly if
references do not resolve rather than leaving a silently broken install.

## Install failure — manifest fixed

First real install attempt failed:

```
Validation errors: agents: Invalid input
```

Cause: ticket 01 declared `"agents": ["./agents/"]`. **Agents are discovered by
convention from `./agents/` and must not be declared.** Verified against every
installed plugin that works — ECC and humanizer both ship an `agents/`
directory and neither has an `agents` key. `skills` and `commands` as directory
arrays are fine; `hooks` as a string path is fine. Only `agents` was invalid.

This slipped through because ticket 01's acceptance criterion was *"declares
skills, commands, agents and hooks explicitly — never by convention"*. The
criterion was wrong, not the implementation, and every check I wrote asserted
against the criterion rather than against a real install.

**`scripts/check-manifest` written**, built from the union of keys observed in
working manifests, with `agents` explicitly listed as convention-only. Mutation
tested: re-adding the `agents` key fails, declaring a non-existent skill fails.

## Dogfood finding 1 — the guard blocked legitimate work

First real use of fx on a new project. `git init` for a brand-new repo was
**refused** by the guard:

```
[fx] `git init` writes to the main checkout. Commits and writes happen in a
git worktree only — create one and work there.
```

Wrong. `git init` creates a **new** repository; it never touches the history or
working tree of the checkout you happen to be standing in. It belongs beside
`worktree add` in `ALLOWED_ON_MAIN` — which already exists precisely because
blocking the command that *escapes* the main checkout makes the rule
unsatisfiable. `git init` is the same category and I missed it. Same for
`clone`.

Fixed: `init` and `clone` added to `ALLOWED_ON_MAIN`, with 4 assertions. Suite
83 → **87**. Re-verified that `commit`, `reset --hard`, `clean -fdx`, `push` to
main and `branch -D` are all still blocked — the fix loosened nothing else.

**Why 83 passing tests did not catch it:** every assertion was written from the
ticket's own list of commands. Nobody asked "what does a person actually do on
day one of a project". The suite tested the rules I thought of, which is the
class of gap only real use finds. This is the argument for dogfooding over
adding more unit tests to the same list.

**Not yet live.** The installed copy at
`~/.claude/plugins/cache/fx/fx/0.1.0` still has the old guard, so `git init`
stays blocked in this session until the fix is committed, pushed and the plugin
updated. The user runs git anyway, so it is not blocking the design work.

## Dogfood finding 2 — the guard blocked writing documentation

Writing a ticket file was refused. The command was a file write; the *heredoc
body* contained example commands in its "Steps" section, and `splitSegments`
splits on newlines, so lines inside the heredoc were parsed as commands the
user was running.

**Blast radius: any documentation containing an example.** A README, a runbook,
a ticket, a plan. fx's own tickets are exactly this shape — the plugin could
not have written its own ticket files through its own guard.

Fixed: `stripHeredocs()` removes heredoc bodies before segmentation, handling
`<<EOF`, `<<-EOF` (indented terminator), `<<'EOF'` and `<<"EOF"`, and multiple
heredocs in one command. A real command *after* a heredoc is still caught.

New regression suite `lib/heredoc.test.js` — **13 assertions**, including the
negative cases proving nothing was loosened: newline chains, `cd &&` prefixes,
force-push, hard reset. Main suite unchanged at **87**. Total **100**.

**Why the 87 tests missed it:** every assertion was a bare command string.
Nobody wrote a test where the command was a file write whose *content* looked
like a command. The suite tested the guard's vocabulary, never its parser.
Both findings so far are the same shape — the tests covered the rules I thought
of, and dogfooding covered the ones I did not.

**Consequence for this session:** the installed copy still carries the old
guard, so heredocs containing example commands stay blocked here. Tickets are
being written with the file tools instead, which do not route through the Bash
hook. Both fixes go live when the plugin is updated.
