# Notes: implementation plan

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
**Goal:** a command-line notebook that adds, shows, exports and searches notes stored as files.
**Architecture:** `lib/store.js` owns the notes directory and is the only module that touches it. `lib/export.js` and `lib/search.js` read through the store, and `cli.js` maps four commands onto the three modules.
**Stack:** Node, CommonJS, `node --test`, no dependencies.
**Complexity:** Low
**Risks:**
- LOW: the notes directory does not exist before the first save: the store creates it.
- MEDIUM: two tasks edit `cli.js`: they are ordered by a blocking edge, and each keeps its own test file.
**Testing:** Unit: each module's exports under `node --test` with a temporary `NOTES_DIR` · Integration: `node cli.js` run as a child process · E2E: none

## Global Constraints

- CommonJS, synchronous APIs, no dependencies.
- Notes live under `process.env.NOTES_DIR`, default `./notes`.
- Locale: English output only, no localization.

## Tasks

| # | Title | Blocked by | Delivers | Phase |
|---|-------|-----------|----------|-------|
| 01 | Note store | none | `lib/store.js`: save, load, list | MVP |
| 02 | CLI add and show | 01 | `node cli.js add` and `node cli.js show` | MVP |
| 03 | README usage section | 02 | a usage section a new user can follow | MVP |
| 04 | Export | 01 | `lib/export.js`: every note as one Markdown document | MVP |
| 05 | Search | 01 | `lib/search.js`: note names whose text matches a query | MVP |
| 06 | CLI export and search | 02, 04 | `node cli.js export` and `node cli.js search` | MVP |
