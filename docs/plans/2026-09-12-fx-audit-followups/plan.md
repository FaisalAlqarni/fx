# fx-audit follow-ups: implementation plan

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
**Goal:** reports that render with no internet, command names stated consistently, an audit that works the same way on Claude Code and opencode, a pipeline lens that covers all six measured queue groups inside an audit, a companion that no longer writes to the exclude file, the parked fixes, and version 0.1.7.
**Architecture:** Pinned library files ship under the plugin's references and a new shared reference tells both report writers how to copy them into a project and load them locally. The opencode installer links skills one at a time, generates commands in opencode's documented form, and turns user-invoked skills into commands with absolute paths. The lens picks its hunt from its input: a file set gets all six groups, a diff stays narrow.
**Stack:** Markdown skills, agents and references; Bash and Python scripts; Node guard suites; the opencode installer; nested Claude Code sessions for the live audit run.
**Complexity:** Medium
**Risks:**
- HIGH: the opencode installer removes and replaces entries in a user's configuration directory: it touches only symbolic links that point into fx's own skills, refuses a real entry with an fx skill's name, and its test seeds a foreign skill that must survive untouched.
- MEDIUM: a library download fails or serves something other than the script: task 01 checks every response and stops rather than trying another address.
- MEDIUM: opencode cannot run here without a model provider: task 05's test proves the files the installer writes, and the task tries the installed binary and reports what it could and could not show.
- MEDIUM: the pipeline lens is a measured document: task 03 leaves its diff-mode behaviour unchanged, never edits the fixture or the six key rows, and runs one blind smoke run per mode without tuning to the result.
- LOW: the audit's Phases 3 and 4 have never run live: task 09 runs all four phases.
**Testing:** Unit: gate tests for `check-artifacts`' remote rule and `check-prose`'s explicit path, and the installer test, all run by `scripts/check-all` · Integration: the companion probe in scratch repositories, two blind lens smoke runs, an offline render in a headless browser · E2E: a live four-phase audit run in nested sessions.

**Carrying this plan into the build branch.** This directory is untracked in the
main checkout. When `fx-implement` creates the build worktree, the controller
moves `docs/plans/2026-09-12-fx-audit-followups/` into the worktree, commits it
there as the branch's first commit, and confirms no copy remains in the main
checkout. At the previous merge, identical untracked plan files blocked the
fast-forward.

## Global Constraints

- No em dashes or en dashes anywhere, including inside prose fenced blocks.
- No stock vocabulary: the prose gate holds the list.
- A prose fenced block is tagged `markdown`; an untagged fence is code.
- A skill body stays under 500 lines. References sit exactly one level from the file
  that cites them, and no reference links to another reference.
- Every reference citation is anchored relative to the citing file, never bare and
  never through an environment variable.
- Agents and hooks are discovered by convention and are never declared in the plugin
  manifest.
- Every agent pins a model explicitly. An omitted model inherits the session's.
- Review lenses carry read-only tools and cannot write.
- A description carries triggers and stakes and never summarises a workflow.
- A stakes clause names machinery, never quality.
- Nothing fx creates is written to the OS temp directory.
- Artifacts a user returns to live in `docs/plans/<slug>/`. Throwaway worktrees live
  in `.worktrees/`. Regenerable working files live in the ephemeral workspace.
- Nothing leaves the machine. No publishing, uploading or posting, and no request to a
  third-party host from anything fx renders. The one exception is the one-time
  download of the two pinned library files, made while building this change.
- No attribution trailers in any commit message.
- Behaviour is measured against the working tree through the plugin directory flag,
  or against a bumped version. The cache is keyed by version, not by file contents.
- Claude Code command names are `/fx:fx-<name>`; opencode command names are
  `/fx-<name>`.
- The installer never edits `opencode.json` and never touches an entry it did not
  create.
- The plugin version is 0.1.7.

**The scoping rule that still holds:** `scripts/check-artifacts`' temp-directory
rule scans `skills/`, `agents/` and `commands/` only; `scripts/` and `tests/` are
test scaffolding and may build fixtures under a temp directory, removed on exit.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Offline report libraries and the remote-script gate | none | Vendored Tailwind and Mermaid, `references/report-assets.md`, `fx-architecture` reports that render offline, a gate against remote scripts | Core |
| 02 | The audit's Phase 4 report uses the offline libraries | 01 | The audit skill's report step and boundary follow the shared reference | Core |
| 03 | The pipeline lens hunts all six groups in a file set | none | File-set mode in the lens, its key and README per mode, ADR 0014, the audit's soundness check | Core |
| 04 | The companion stops writing to the exclude file | none | The exclude-file step removed, a probe of every ignore guarantee | Core |
| 05 | The opencode installer: documented commands, per-skill links, the audit as a command | none | A corrected installer, its test in `check-all`, a corrected install guide | Core |
| 06 | Command names stated with their prefix everywhere | none | No short-form fx command name left in the plugin | Core |
| 07 | The parked fixes | none | `check-prose` reads an explicitly named file, worktree steps cope with stray and hand-deleted worktrees, start script comments name the dated slug | Core |
| 08 | Version 0.1.7 and the inventory counts | 01, 04, 05, 07 | The bumped version, SURFACE's references count, README's tests block | Core |
| 09 | A live four-phase audit run | 01, 02, 03, 04, 05, 06, 07, 08 | The first end-to-end run of `/fx:fx-audit`, recorded | Core |
