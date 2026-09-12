---
name: fx-audit
description: >
  Audit an existing system in four gated phases, ending in a design.md for fx-plan
disable-model-invocation: true
---

# /fx:fx-audit

```
/fx:fx-audit [<scope>] [--against <reference>] [<brief>]
```

- **`<scope>`**: the directory to audit, inside this repository. Omitted: the
  repository root.
- **`--against <reference>`**: an implementation to compare with, given as a
  filesystem path, a branch, a tag or a revision.
- **`<brief>`**: the rest of the invocation text. It carries the **stated
  targets**: what the user says the system must do or be. The user may instead
  point to a file that holds them.

A stated target is only ever something the user named, quoted as they wrote it.
The code under audit is the **scope**, and this skill calls it nothing else.

**This skill's own files.** Every path below that starts `../../` resolves from
the base directory this skill is given when it is invoked, never from the
user's repository. Each document's skeleton comes from
`../../references/audit-template.md`, and `design.md`'s standard sections from
`../../references/design-template.md`. The skill composes the two; follow each
template's own rules for what goes inside its sections, every count it states
included. The audit template also gives the form of every header field and
appended section this skill names.

---

## Boundary

- **It edits no code.** It writes the audit's documents into the slug
  directory, drafts and working files under `.fx/`, a reference worktree under
  `.worktrees/`, and entries in the repository's local exclude file, and
  nothing else.
- **It never commits.** It may be running on the user's base branch. Every
  file it writes stays untracked until the user commits it, and the last gate
  says so.
- **It hands off to `fx-plan` and stops.** No tasks, no implementation, no
  build worktree.
- **Phase 3 runs `fx:fx-lens-pipeline` and `fx-architecture`, and no other
  lens.** The database, security, accessibility and silent-failure lenses read
  a diff, and an audit has none.
- **`fx:fx-lens-pipeline` hunts all six queue groups on the audited file
  set**: unbounded enqueue outrunning consumers, head-of-line blocking
  between unlike workloads, redelivery with no idempotency check, poison
  messages that requeue forever, a lease shorter than the work it covers, and
  retries with no jitter. It cedes only a query issued per record and work
  enqueued inside a transaction to `fx-lens-database`, and a swallowed error
  to `fx-lens-silent-failure`.
- **The two HTML reports differ in what they fetch.** Phase 3's report is left
  as `fx-architecture` makes it, and it loads CDN scripts when opened. Phase
  4's report, which this skill writes, makes no request to any host.

## Files

The **scope** is normalized first: its path from the repository root, with no
leading `./` and no trailing `/`. An omitted scope, `.` and the root itself are
all `.`.

The **repository's name** is the name of the directory that holds its common
git directory,
`basename "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"`,
so it is the same from the main checkout and from any linked worktree.

The **slug directory** is `docs/plans/YYYY-MM-DD-audit-<name>/` at the
repository root. `<name>` is built so that two scopes never share one: the
repository's name for `.`, and for any other scope that name, a `+`, and the
scope with each `/` written as `+`. In both parts, first write every `%` as
`%25` and every `+` as `%2B`. In a repository named `shop`, the root gives
`shop` and `engines/core` gives `shop+engines+core`. `<slug>` below is the
slug directory's name.

| File | Written in | What it is |
|---|---|---|
| `01-current.md` | Phase 1 | Map of the system as it stands; its header records the scope and the reference |
| `02-reference.md` | Phase 2, only when a reference is recorded | Map of the reference |
| `03-gaps.md` | Phase 3 | Gap report, then the Phase 3 gate choice, then the sound verdict when Phase 4 returns one |
| `report-<timestamp>.html`, the one `03-gaps.md` names | Phase 3 | `fx-architecture`'s review of the code as it stands |
| `design.md` | Phase 4 | Target architecture, the file `fx-plan` reads |
| `report-<timestamp>.html`, the other one | Phase 4 | Rendering of `design.md` |

**A phase document enters the slug directory finished.** Each phase writes
its document, and Phase 4 its report, under `.fx/<slug>/draft/`, and moves it
into the slug directory only once that phase's **Done when** holds. A draft
left there by an interrupted run is unfinished: its phase starts again and
overwrites it.

**Before creating any path under `.fx/` or `.worktrees/`**, confirm that exact
path is git-ignored: `git check-ignore -q <path>`, which works before the path
exists. Not ignored: append the directory's entry (`.fx/` or `.worktrees/`) to
the repository's local exclude file, located with
`git rev-parse --path-format=absolute --git-path info/exclude`, never to
`.gitignore`, say that you did, and check again. Still not ignored: stop and
say which rule re-includes it.

## Resume

A run looks for its slug directory by name, whatever its date: every
`docs/plans/<date>-audit-<name>/` whose `<date>` is a `YYYY-MM-DD` date.

- **None:** create `docs/plans/<today>-audit-<name>/` and start at Phase 1.
- **One:** continue in it. One with no `01-current.md` holds a Phase 1 that was
  interrupted: start Phase 1 in it. The message opens with
  `Resumed at Phase N in <slug directory>` and goes straight on to that phase's
  own content.
- **More than one:** list them and ask which to continue. Pick none yourself.

A directory whose `01-current.md` records a scope other than this run's is
never continued: report it and stop.

**To start over**, the user moves the old slug directory out of `docs/plans/`
or deletes it, then runs the skill again.

The reference is the one `01-current.md` records, not this run's flags. A run
whose `--against` differs from the record keeps the recorded reference, and its
message says so: comparing against the new one means starting over with that
`--against`.

Inside the slug directory, the documents are the state. Act on the first of
these that holds:

1. `03-gaps.md` ends with a `## Phase 4 verdict: sound` section: report that
   verdict and stop.
2. `design.md`'s Status line no longer says draft: name the slug directory's
   documents, point to `fx-plan` on `design.md`, and stop.
3. `design.md` exists as a draft: write the Phase 4 report if it is missing,
   then present the Phase 4 gate again.
4. `03-gaps.md` exists and has no `## Phase 3 gate choice` section: when this
   run's invocation text answers the Phase 3 gate's question, that is the
   reply: append the section and continue at Phase 4. Otherwise ask the
   question again and stop.
5. Otherwise continue at the first phase whose document is missing from the
   slug directory. `02-reference.md` counts only when a reference is recorded.

An existing phase document is finished work: read it, never rewrite it. Three
writes are the exceptions: appending the Phase 3 gate choice and the sound
verdict to `03-gaps.md`, and setting `design.md`'s Status line on approval. A
user who wants a phase redone deletes its document and runs the skill again.

## Phase 1: map the current system

1. Split the scope into areas: the entry points and end-to-end flow, the
   domain model, and each top-level module or directory.
2. Dispatch one explorer per area, all in one message. **Each explorer must be
   able to create one file**, so dispatch an agent type that has a
   file-writing tool; a read-only agent type, one limited to searching and
   reading, cannot finish this step. Each gets this brief:
   - **Knowledge:** its area's paths, `CONTEXT.md` and `docs/adr/` when they
     exist, and the `01-current.md` headings of the audit template.
   - **Instruction:** read the area; write the findings, each claim with a file
     and line, to `.fx/<slug>/explore/01-<area>.md`. That file is its only
     write. Name every term by the code's own identifiers, comments and
     documentation, or by `CONTEXT.md` when it exists; a term that appears in
     none of those is not a term of this system.
   - **Output:** the file's path and a summary of five lines or fewer. Never
     the findings themselves.
3. An explorer that returns nothing, an empty file, or no findings is
   dispatched once more, with what the other explorers found about its area
   and the files that reference it. Nothing again: the area goes under
   **Areas not covered**, with the reason.
4. Write `.fx/<slug>/draft/01-current.md` from the findings files, its
   **Scope** and **Against** header fields included. Open each cited line
   before writing the claim that cites it. Every top-level entry of the scope
   that no explorer was assigned also goes under **Areas not covered**, with
   the reason.

**Done when** every heading and header field of the skeleton is written, and
every top-level entry of the scope is either mapped or listed under Areas not
covered. **Then** move `01-current.md` into the slug directory.

**Gate.** The summary, then the stated targets. If the brief named any, list
how many were read and from where. If it named none, ask the user to name
them or point to a file that holds them, or to answer `none`. Stop.

## Phase 2: map the reference

Runs only when `01-current.md` records a reference. Without one, the audit goes
from Phase 1 straight to Phase 3.

1. **Confirm a reference this run did not receive.** A reference read from
   `01-current.md` that this run's own invocation text did not give, and a
   filesystem path outside the repository however it was given, is shown to
   the user, and Phase 2 continues only on an explicit yes. Anything else:
   stop.
2. **Resolve the recorded reference exactly as given.**
   - It contains a single quote or a line break: stop and say so.
   - An existing filesystem path is read in place. Single-quote it in any
     shell command.
   - Otherwise run
     `git rev-parse --verify --quiet --end-of-options '<reference>^{commit}'`,
     the reference single-quoted so the shell expands nothing in it. It
     resolves: run the ignore check on `.worktrees/audit-<name>-reference`,
     then place the worktree there by what `git worktree list --porcelain`
     says of that path:
     - Listed at that commit: reuse it.
     - Listed at another commit, or as missing: `git worktree remove --force`
       it (for a missing one, `git worktree prune`), then add it.
     - Not listed and nothing on disk: add it.
     - Not listed, yet a directory is there: it is not this audit's worktree.
       Stop and name it.

     To add it: `git worktree add --detach .worktrees/audit-<name>-reference <commit>`,
     with the commit `rev-parse` printed.
   - It does not resolve: stop and ask what was meant. **Never try a nearby
     name**, such as another branch spelling or a remote prefix.
3. Map it with Phase 1's explorer dispatch, aimed at the reference tree and
   writing to `.fx/<slug>/explore/02-<area>.md`, then write
   `.fx/<slug>/draft/02-reference.md`.

**Done when** `02-reference.md` records the reference as given and the commit
actually read, and every heading of the skeleton is written. **Then** move it
into the slug directory.

**Gate.** Remove the worktree with `git worktree remove` when one was used, and
say so in the summary. Stop.

## Phase 3: report the gaps

1. **Stated targets.** Take them from the brief, from a file the user pointed
   to, or from the reply to the Phase 1 gate, which counts as invocation text.
   A run that holds none of these, for example one resumed in a new session,
   asks the Phase 1 gate's question now and stops. Quote each target verbatim
   with its source, in the one form the template's **Stated targets** field
   fixes. The user answered `none`: write that field's empty case.
2. **File set**, run from the repository root:
   `git ls-files --cached --others --exclude-standard <scope> ':(exclude)docs/plans/<slug>'`,
   so untracked files that are not ignored are read too, and the audit's own
   documents are not.
3. Dispatch both, in one message, each read-only toward the code:
   - `fx:fx-lens-pipeline` (`../../agents/fx-lens-pipeline.md`), by that
     addressable name, given the file set and no diff. Its output ends with an
     `Unread:` line.
   - A subagent that invokes the skill `fx:fx-architecture`, by that name, on
     the file set, with the stated targets as the requirements it anchors on.
     **Bound it in the brief:** its HTML report goes in this slug directory,
     which is the plan directory; it stops once the candidates are written,
     before asking which to explore; it returns the report's path and a
     summary of five lines or fewer.
4. Write `.fx/<slug>/draft/03-gaps.md`. Its skeleton is the **first**
   `markdown` fence of the template's `03-gaps.md` section; the two after it
   are worked examples. Under Lens findings, record both dispatches as that
   section asks. A dispatch that could not run, returned nothing usable, has
   no `Unread:` line, or whose `Unread:` line names a file in the file set is
   recorded as exactly that.
5. **Open every row's file at its line before writing the verdict.** A citation
   is a claim, not a check. A row in the reference tree is opened in place for
   a filesystem-path reference, and with `git show <the commit read>:<path>`
   for a branch, tag or revision, whose worktree is already removed. A line that
   does not show what the verdict says gets the line that does, or the row says
   it found none.
6. Order the table by impact, highest first.

**Done when** every count the template states holds, every row carries a file
and a line you opened, and both dispatches are recorded under Lens findings.
**Then** move `03-gaps.md` into the slug directory.

**Gate.** The summary names the architecture report by path, names any
dispatch that did not run, return, or cover the file set, and asks which of
the report's candidates, if any, Phase 4 should take up. Choosing among them
happens here, with the user, never inside the subagent. Stop. When the user
replies, or a later run's invocation text answers the question, append the
`## Phase 3 gate choice` section to the end of `03-gaps.md` before Phase 4
starts.

## Phase 4: the target architecture

1. **Decide whether the architecture is sound.** It is sound only when all
   four checks hold:
   - the verdict table has no high-impact row marked wrong, missing or
     over-engineered;
   - both Phase 3 dispatches ran and returned, the lens's output ends with an
     `Unread:` line, and that line names no file in the file set: a lens
     output with no `Unread:` line fails this check;
   - `fx:fx-lens-pipeline` reported nothing Critical or Important in any of
     the six groups;
   - `03-gaps.md`'s Phase 3 gate choice reads `none`.

   Sound is an outcome, not a failure to find work: append the
   `## Phase 4 verdict: sound` section to the end of `03-gaps.md`, write no
   `design.md` and no report, and go to the gate.
2. Otherwise write **`.fx/<slug>/draft/design.md`**, under exactly that name:
   the design template's sections, then the sections the audit template
   appends. Its Status line reads `draft, not approved` until the gate. The
   recommendation is argued from `03-gaps.md`'s rows. Each candidate the gate
   choice took up is argued under Implementation Decisions, and shows in the
   proposed folder tree and the per-module verdict.
3. **The Defeater names what would have to be true for the opposite
   recommendation to win**, as a condition someone can check. A recommendation
   whose defeater cannot be written is a preference; rewrite the
   recommendation until it has one.
4. Write the Phase 4 `report-<timestamp>.html` under `.fx/<slug>/draft/`: one
   file rendering `design.md`, with its styles inline and its diagrams as
   preformatted text or inline SVG, so opening it fetches nothing from any
   host.

**Done when** `design.md` holds every section of both templates, every count
the audit template states holds, and the report renders it. **Then** move
`design.md` and the report into the slug directory, open the report locally
with the platform's open command, print its absolute path, and never publish
it.

**Gate.** Name every document in the slug directory, and say they are untracked
until the user commits them.

- **Sound:** say so, and name the four checks with their results.
- **Otherwise:** when a Phase 3 dispatch did not run, return, or cover the file
  set, say first that this is why the system was not judged sound. Then the
  recommendation, its defeater, and a request to approve `design.md`. An
  explicit yes sets its Status line to the design template's value, and the
  next step is `fx-plan` on `design.md`. Anything short of a yes leaves it a
  draft: say that `fx-plan` requires an approved design, so it is not to be
  run on this draft.

Stop.

## Every gate

**The whole message is ten lines or fewer**, counting blank lines and the
resume line. It names the document the phase wrote by path, and speaks only of
the phases this audit runs: with no reference recorded, those are Phases 1, 3
and 4. Then stop and wait for the user;
the next phase starts only when they say so, or when they run the skill again.
