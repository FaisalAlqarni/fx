# fx-audit, the pipeline lens, and the artifact sweep: implementation plan

> **Build this with `fx-implement`. Do not execute the tasks directly.**
>
> The tasks below are deliberately detailed. That makes them easy to follow and
> it is exactly why the lane gets skipped: nothing looks missing. What is
> missing is everything a task file cannot hold, and it is what `fx-implement`
> supplies: a worktree so the main checkout is never written to, a ledger that
> survives compaction, a fresh subagent per task, a review while each diff is
> still small, and lens dispatch on what the diff actually touched.
>
> Steps use `- [ ]` checkboxes.

**Design:** `./design.md`
**Goal:** Give fx a phased read-only whole-system audit, a review lens for
pipeline behaviour, and one rule about where the artifacts it creates are kept.
**Architecture:** A user-invoked command drives four gated phases and writes
its documents into the plan directory, ending at the file `fx-plan` already
consumes. A fifth read-only lens covers queue and worker behaviour and is
dispatched by the audit and by whole-branch reviews. A new gate makes the
artifact-location rule checkable instead of believed.
**Stack:** Markdown skill and agent definitions, POSIX shell, Python 3 gate
scripts, Node for the companion server. No package manager, no framework.
**Complexity:** Medium
**Risks:**
- MEDIUM: the artifact gate stays red across three tasks by design. An
  implementer that expects green at the end of its own task will chase a green
  that cannot exist. Mitigation: every affected task states its expected gate
  state, with the failure count.
- MEDIUM: the visual companion is the only executable change, and its scripts
  bind a port and spawn a server. Mitigation: task 04 verifies by running
  start and stop, not by reading them.
- MEDIUM: a new lens whose triggers overlap an existing one buys two reports
  of one finding. Mitigation: the ceding rules are written into the lens body,
  and task 05's fixture asserts the lens stays silent on a schema-only change.
- LOW: this plugin runs from a version-keyed cache, so nothing here is live
  until the version is bumped and the plugin reinstalled. Mitigation: no task
  claims a behaviour verified against the installed copy.

**Testing:** Unit: the four Node guard suites, unchanged, as a regression net ·
Integration: five gate scripts plus the new sixth, each exiting non-zero on a
problem · Behavioural: a fixture-and-control run for the lens, and a gate-stop
check for the command.

## Global Constraints

Copied verbatim from `design.md`.

- No em dashes or en dashes anywhere, including inside prose fenced blocks.
- No stock vocabulary: the prose gate holds the list.
- A prose fenced block is tagged `markdown`; an untagged fence is code.
- A skill body stays under 500 lines. References sit exactly one level from the
  file that cites them, and no reference links to another reference.
- Every reference citation is anchored relative to the citing file, never bare
  and never through an environment variable.
- Agents and hooks are discovered by convention and are never declared in the
  plugin manifest.
- Every agent pins a model explicitly. An omitted model inherits the session's.
- Review lenses carry read-only tools and cannot write.
- A description carries triggers and stakes and never summarises a workflow.
- A stakes clause names machinery, never quality.
- Nothing fx creates is written to the OS temp directory.
- Artifacts a user returns to live in `docs/plans/<slug>/`. Throwaway worktrees
  live in `.worktrees/`. Regenerable working files live in the ephemeral
  workspace.
- Nothing leaves the machine. No publishing, uploading or posting, and no
  request to a third-party host from anything fx renders.
- No attribution trailers in any commit message.
- Behaviour is measured against the working tree through the plugin directory
  flag, or against a bumped version. The cache is keyed by version, not by file
  contents.

**One scoping rule the gate depends on**, stated here because three tasks need
it: `scripts/check-artifacts` scans `skills/`, `agents/` and `commands/` only.
`scripts/` and `tests/` are exempt, because a throwaway git fixture and a
triggering-suite log are test scaffolding rather than artifacts a user returns
to, and the existing suites legitimately build them under a temp directory.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Machine facts: `.fx.json` and `scripts/check-all` | none | Every later task has a real verify command instead of a guess | MVP |
| 02 | The artifact gate, red, plus ADR 0015 | 01 | `scripts/check-artifacts` failing on the real violations, and the record that justifies moving them | MVP |
| 03 | Move the architecture report into the plan directory | 02 | `fx-architecture` writes where a user can return to it | MVP |
| 04 | Move the companion session directory, and cut the remote logo | 02 | Mockups persist, `.superpowers/` retires, nothing is fetched from a third-party host | MVP |
| 05 | `fx-lens-pipeline`, with its fixture and control run | 01 | A lens that finds queue and delivery defects a control misses | Core |
| 06 | ADR 0013 and ADR 0014, and the line on ADR 0008 | 05 | The category rule and the reason this lens exists rather than a section | Core |
| 07 | `references/audit-template.md` | 01 | The shape of every document the audit writes | Core |
| 08 | `/fx:audit` | 02, 05, 07 | The four-phase audit, gating after phase one | Core |
| 09 | README and SURFACE: counts, tables, and the ones already wrong | 05, 08 | The inventory matches what is on disk | Polish |

**Frontier after 01:** tasks 02, 05 and 07 are all unblocked and share no
file. Task 03 and task 04 are unblocked together by 02 and share no file
either.

**Phase boundaries.** MVP (01 to 04) merges alone and delivers the artifact
rule with its gate. Core splits in two independently mergeable halves: the lens
(05, 06) and the audit (07, 08). Polish (09) is last because it counts what the
earlier phases produced.

**The gate is red on purpose from 02 to 04.** Task 02 creates a gate that fails
against the tree as it stands. Task 03 reduces the failures and **leaves it
red**. Only task 04 turns it green. Each of those tasks names the exact count it
expects, so a red gate at the end of 02 or 03 is the intended signal and not a
defect to chase.
