---
description: Audit an existing system in four gated phases, ending in a design.md for fx-plan
disable-model-invocation: true
---

# /fx:audit

```
/fx:audit [<scope>] [--against <reference>] [<brief>]
```

- **`<scope>`**: the directory to audit, inside this repository. Omitted: the
  repository root.
- **`--against <reference>`**: an implementation to compare with, given as a
  filesystem path, a branch, a tag or a revision.
- **`<brief>`**: the rest of the invocation text. It carries the **stated
  targets**: what the user says the system must do or be. The user may instead
  point to a file that holds them.

A stated target is only ever something the user named, quoted as they wrote it.
The code under audit is the **scope**, and this command calls it nothing else.

---

## Boundary

- **It edits no code.** It writes the audit's documents into the slug
  directory, working files under `.fx/`, and a reference worktree under
  `.worktrees/`, and nothing else.
- **It never commits.** It may be running on the user's base branch. Every
  file it writes stays untracked until the user commits it, and the last gate
  says so.
- **It hands off to `fx-plan` and stops.** No tasks, no implementation, no
  build worktree.
- **Phase 3 runs `fx-lens-pipeline` and `fx-architecture`, and no other lens.**
  The database, security, accessibility and silent-failure lenses read a diff,
  and an audit has none.
- **Queue behaviour has one dedicated pass, and it is narrow.**
  `fx-lens-pipeline` hunts unbounded enqueue only. The gap report judges any
  other queue behaviour, such as head-of-line blocking, redelivery, retries or
  dead letters, only as far as Phase 3's own reading reaches, with no dedicated
  pass behind it.
- **The two HTML reports differ in what they fetch.** Phase 3's report is left
  as `fx-architecture` makes it, and it loads CDN scripts when opened. Phase
  4's report, which this command writes, makes no request to any host.

## Files

The **slug directory** is `docs/plans/YYYY-MM-DD-audit-<name>/` at the
repository root, where `<name>` is the scope directory's name, or the
repository's when no scope was given. `<slug>` below is that directory's name.

| File | Written in | What it is |
|---|---|---|
| `01-current.md` | Phase 1 | Map of the system as it stands |
| `02-reference.md` | Phase 2, only with `--against` | Map of the reference |
| `03-gaps.md` | Phase 3 | Gap report, plus the sound verdict when Phase 4 returns one |
| `report-<timestamp>.html`, the earlier | Phase 3 | `fx-architecture`'s review of the code as it stands |
| `design.md` | Phase 4 | Target architecture, the file `fx-plan` reads |
| `report-<timestamp>.html`, the later | Phase 4 | Rendering of the target in `design.md` |

The two HTML reports share one name shape, so **name each by its full path and
its phase** wherever either is mentioned: `03-gaps.md` records Phase 3's path,
and the Phase 4 gate prints Phase 4's.

Every document's skeleton comes from `../references/audit-template.md`, and
`design.md`'s standard sections from `../references/design-template.md`. The
command composes the two; follow each template's own rules for what goes
inside its sections.

**Before creating any path under `.fx/` or `.worktrees/`**, confirm that exact
path is git-ignored: `git check-ignore -q <path>`, which works before the path
exists. Not ignored: append the directory's entry (`.fx/` or `.worktrees/`) to
the repository's local exclude file, located with
`git rev-parse --path-format=absolute --git-path info/exclude`, never to
`.gitignore`, say that you did, and check again. Still not ignored: stop and
say which rule re-includes it.

## Resume

A run finds its slug directory by name, whatever its date: every directory
matching `docs/plans/*-audit-<name>/`.

- **None:** create `docs/plans/<today>-audit-<name>/` and start at Phase 1.
- **One:** continue in it. The gate message starts with
  `Resumed at Phase N in <slug directory>`.
- **More than one:** list them and ask which to continue. Pick none yourself.

Inside the slug directory, the documents are the state:

- `03-gaps.md` ends with a `## Phase 4 verdict: sound` section: report that
  verdict and stop. Phase 4 does not run again.
- `design.md` exists and its Status line still says draft: present the Phase 4
  gate again, from the document as written.
- Otherwise continue at the first phase whose document is missing. Phase 2's
  document counts only when `--against` is given.

An existing phase document is finished work: read it, never rewrite it. Two
writes are the exceptions: appending the sound verdict to `03-gaps.md`, and
setting `design.md`'s Status line on approval. A user who wants a phase redone
deletes its document and runs the command again.

## Phase 1: map the current system

1. Split the scope into areas: the entry points and end-to-end flow, the
   domain model, and each top-level module or directory.
2. Dispatch one explorer per area, all in one message, each with this brief:
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
4. Write `01-current.md` from the findings files. Open each cited line before
   writing the claim that cites it. Every top-level entry of the scope that no
   explorer was assigned also goes under **Areas not covered**, with the
   reason.

**Done when** every heading of the skeleton is written, and every top-level
entry of the scope is either mapped or listed under Areas not covered.

**Gate.** The summary, then the stated targets. If the brief named any, list
how many were read and from where. If it named none, ask the user to name
them or point to a file that holds them, or to answer `none`. Stop.

## Phase 2: map the reference

Runs only when `--against` is given. Without it, go straight to Phase 3 and do
not mention Phase 2.

1. **Resolve the reference exactly as given.**
   - An existing filesystem path is read in place.
   - Otherwise run `git rev-parse --verify --quiet "<reference>^{commit}"`. It
     resolves: run the ignore check on `.worktrees/audit-<name>-reference`,
     then `git worktree add --detach` it there at that commit.
   - It does not resolve: stop and ask what was meant. **Never try a nearby
     name**, such as another branch spelling or a remote prefix.
2. Map it with Phase 1's explorer dispatch, aimed at the reference tree and
   writing to `.fx/<slug>/explore/02-<area>.md`, then write `02-reference.md`.

**Done when** `02-reference.md` records the reference as given and the commit
actually read, and every heading of the skeleton is written.

**Gate.** Remove the worktree with `git worktree remove` when one was created,
and say so in the summary. Stop.

## Phase 3: report the gaps

1. **Stated targets.** Take them from the brief, from a file the user pointed
   to, or from the reply to the Phase 1 gate, which counts as invocation text.
   A run that holds none of these, for example one resumed in a new session,
   asks the Phase 1 gate's question now and stops. Quote each target verbatim
   with its source, in the one form the template's **Stated targets** field
   fixes. The user answered `none`: write that field's empty case.
2. **File set:** `git ls-files <scope>`.
3. Dispatch both, in one message, each read-only toward the code:
   - `fx-lens-pipeline` (`../agents/fx-lens-pipeline.md`), given the file set
     and no diff.
   - A subagent that invokes the skill `fx:fx-architecture`, by that name, on
     the file set. **Bound it in the brief:** its HTML report goes in this slug
     directory, which is the plan directory; it stops once the candidates are
     written, before asking which to explore; it returns the report's path and
     a summary of five lines or fewer.
4. Write `03-gaps.md`. Its skeleton is the **first** `markdown` fence of the
   template's `03-gaps.md` section; the two after it are worked examples. The
   lens findings and the architecture report's path go under Lens findings. A
   dispatch that could not run, such as the lens not resolving by name, is
   stated there too.
5. **Open every row's file at its line before writing the verdict.** A citation
   is a claim, not a check. A line that does not show what the verdict says
   gets the line that does, or the row says it found none.
6. Order the table by impact, highest first.

**Done when** the row count equals the feature count plus the target count, and
every row carries a file and a line you opened.

**Gate.** The summary names the architecture report by path and asks which of
its candidates, if any, Phase 4 should take up. Choosing among them happens
here, with the user, never inside the subagent. Stop.

## Phase 4: the target architecture

1. **Decide whether the architecture is sound.** It is sound when the verdict
   table has no high-impact row marked wrong, missing or over-engineered,
   `fx-lens-pipeline` reported nothing Critical or Important, and the user took
   up no candidate at the Phase 3 gate. Sound is an outcome, not a failure to
   find work: append a `## Phase 4 verdict: sound` section to the end of
   `03-gaps.md` naming each of those three checks with its result, write no
   `design.md` and no report, and go to the gate.
2. Otherwise write **`design.md`**, under exactly that name: the design
   template's sections, then the sections the audit template appends. Its
   Status line reads `draft, not approved` until the gate. The recommendation
   is argued from `03-gaps.md`'s rows.
3. **The Defeater names what would have to be true for the opposite
   recommendation to win**, as a condition someone can check. A recommendation
   whose defeater cannot be written is a preference; rewrite the
   recommendation until it has one.
4. Write the later `report-<timestamp>.html` into the slug directory: one file
   rendering `design.md`, with its styles inline and its diagrams as
   preformatted text or inline SVG, so opening it fetches nothing from any
   host. Open it locally with the platform's open command, print its absolute
   path, and never publish it.

**Done when** `design.md` holds every section of both templates, its
per-module row count matches its module count, and the report path is printed.

**Gate.** Name every file the audit wrote, and say they are untracked until the
user commits them.

- **Sound:** say so, and name the three checks with their results.
- **Otherwise:** the recommendation, its defeater, and a request to approve
  `design.md`. An explicit yes sets its Status line to the design template's
  value, and the next step is `fx-plan` on `design.md`. Anything short of a yes
  leaves it a draft, and say that `fx-plan` refuses a draft.

Stop.

## Every gate

**The whole message is ten lines or fewer**, the resume line included. It
names the document the phase wrote by path. Then stop and wait for the user;
the next phase starts only when they say so, or when they run the command again.
