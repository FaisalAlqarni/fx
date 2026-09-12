# fx-audit follow-ups: offline reports, both runtimes, and the user's decisions

**Date:** 2026-09-12
**Status:** ready-for-agent
**Glossary:** fx has no `CONTEXT.md`; this design uses the vocabulary of
`docs/plans/2026-09-11-fx-audit/design.md` and the ADRs. No terms were added.

## Problem Statement

The fx-audit branch merged into `main` with seven decisions left to the user.
Reports built by `fx-architecture` load Tailwind and Mermaid from the internet,
so with no connection they open unstyled and with no diagrams. The documents
and command headings disagree about what a user types: some say `/fx:setup`,
which Claude Code answers with "Unknown command". The audit works on Claude Code
because it is a skill that knows its own location, but on opencode the installer
gives it no typed command, the model can select it, and every fx command there
most likely sends an empty prompt, because the installer writes the prompt into a
frontmatter field markdown commands do not read. Inside an audit, queue problems
other than unbounded enqueue have no dedicated reader. The visual companion
still writes to the repository's local exclude file, a step `.fx/.gitignore` has
made redundant, and which can refuse a safe start. Small defects the final review
parked are still open. The plugin version has not moved, so installed users get
none of it.

## Solution

Reports work with no internet: pinned copies of both libraries ship inside the
plugin and are copied once into each project, and every report loads them from
there. Every document states the command names that actually work, with the
`fx-` prefix kept on both runtimes. On opencode, fx commands carry their prompt
where opencode reads it, and the audit becomes a command you type there too,
kept out of the model's reach and pointed at its templates by absolute path. When
the pipeline lens reads an audit's files, it hunts all six queue problems it was
measured on; in branch review it stays narrow. The companion stops writing to the
exclude file. The parked defects are fixed, and the version becomes 0.1.7.

## User Stories

1. As an engineer on a train with no connection, I want an architecture report to
   open fully styled, so that I can read it wherever I am.
2. As an engineer, I want a report's diagrams to render with no connection, so that
   the dependency and flow pictures are not replaced by raw diagram text.
3. As an engineer who clones a repository on another machine, I want its committed
   reports to render there with no network, so that the machine I generated them on
   stops mattering.
4. As an engineer, I want the two libraries stored once per project rather than
   once per report, so that my repository does not grow by megabytes per plan.
5. As an engineer who upgrades fx, I want reports written with older library
   versions to keep working, so that an upgrade never breaks a report I already
   committed.
6. As an engineer, I want a report step that cannot find a library to stop and say
   which file is missing, so that I never get a report that quietly needs the
   internet.
7. As an engineer who edited a library copy in my project, I want fx to leave it
   alone and tell me, so that my change is not overwritten.
8. As an engineer, I want the audit's own final report to look like the
   architecture report, with real diagrams, so that the two documents read as one
   family.
9. As a maintainer of fx, I want a gate that fails when any skill, agent, command or
   reference loads a remote script, so that a report cannot drift back online.
10. As a maintainer, I want the vendored libraries' versions, sources, checksums and
    licences recorded beside them, so that anyone can verify or update them.
11. As a Claude Code user, I want every document to show the command names that
    resolve, `/fx:fx-<name>`, so that what I copy is what works.
12. As an opencode user, I want every document to show `/fx-<name>`, so that the
    name matches on both runtimes apart from the plugin separator.
13. As an opencode user, I want every fx command to send its full prompt, so that
    `/fx-critique` and the rest actually do something.
14. As an opencode user, I want to type `/fx-audit`, so that I can run the audit the
    same way I do on Claude Code.
15. As an opencode user, I want the model never to select the audit on its own, so
    that it costs nothing on turns where I did not ask for it.
16. As an opencode user, I want the audit to find its templates without searching
    my disk, so that it reads nothing it should not.
17. As an opencode user with other tools' skills installed, I want the fx installer
    to leave their entries untouched, so that installing fx breaks nothing else.
18. As an opencode user upgrading from an earlier fx install, I want the installer to
    replace its old links cleanly, so that no stale skill lingers.
19. As an engineer running an audit, I want the pipeline lens to report head-of-line
    blocking, redelivery, poison messages, lease timing, retry jitter and unbounded
    enqueue, so that an audit covers the queue problems it was measured to find.
20. As a reviewer of a branch, I want the pipeline lens to stay narrow, so that
    branch review does not report twice what its other passes already find.
21. As an engineer, I want the audit to call a system sound only when the lens said
    which files it could not read, so that a missing coverage line is never taken
    as full coverage.
22. As an engineer starting the visual companion, I want it not to write to my
    repository's local exclude file, so that fx changes nothing of mine it does not
    need to.
23. As an engineer whose `.git` cannot be written, I want the companion to start when
    its session files are safely ignored, so that a redundant step does not refuse
    a safe start.
24. As an engineer, I want the companion still to refuse when a session file would be
    committable, so that removing the step never weakens the guarantee.
25. As an engineer whose audit reference worktree was deleted by hand, I want the
    audit to recognise that and recreate it, so that a stale entry does not break
    Phase 2.
26. As an engineer, I want a worktree removal to succeed even when a stray file was
    left inside, so that the audit and branch review do not stop on a throwaway
    checkout.
27. As a maintainer, I want the prose gate to read a file I name explicitly even when
    its path contains `.worktrees/`, so that a check I ask for is never skipped.
28. As a maintainer, I want the companion's start script to describe `--slug` as the
    dated plan directory, so that its comments match its documentation.
29. As an installed fx user, I want the version to change, so that my installation
    picks up this work.

## Implementation Decisions

### Offline report libraries

- Tailwind's version 3 Play CDN script and Mermaid 11's single-file browser build
  (the IIFE build, which exposes a global `mermaid` and needs no module imports or
  chunks) are downloaded once, pinned, and shipped inside the plugin among its
  references, with their MIT licences and a record of each version, source URL and
  checksum. That one download is the only network use in this change set, at the
  user's request.
- A report step copies each library into the project's `docs/plans/_assets/` when a
  file of that versioned name is not already there, and the report loads them by a
  relative path. Filenames carry the version, so an upgrade adds files and never
  replaces one an older report uses.
- A missing vendored file stops the report step, naming the file. There is no
  fallback to a CDN.
- A file already in `_assets` whose checksum differs from the record is left
  untouched, and the step says so.
- Both `fx-architecture`'s report guidance and the audit's Phase 4 report use this.
  The audit report's inline, text-diagram rule is replaced.
- The artifact gate gains a check that fails on a remote script source in skills,
  agents, commands and references. This settles Ruling AC: CDN libraries are
  acceptable to the user, and serving them locally also meets the global constraint
  that nothing fx renders requests a third-party host.
- `docs/plans/_assets/` is not a plan: the plan scanner counts a directory as a plan
  only when it holds tasks.

### Command names

- The `fx-` prefix stays on both runtimes, for consistency, reversing the earlier
  request to shorten names. Claude Code resolves `/fx:fx-<name>`; opencode generates
  `/fx-<name>`.
- Every place that still shows a short form is corrected: the four commands' own
  headings, `fx-plan`, `fx-review`, the grilling reference, ADR 0003 and the
  coverage records that name commands.

### opencode

- The installer writes each command in opencode's documented markdown form:
  frontmatter holds the description, and the body is the prompt, with `$ARGUMENTS`
  appended. Today the prompt goes into a `template` frontmatter field, which
  opencode's documentation defines only for commands in its JSON configuration.
- The installer generates an opencode command from every skill marked
  `disable-model-invocation: true`, today only the audit. Its relative citations of
  references and agents are rewritten to absolute paths under the install, and each
  rewritten path is checked to exist; a missing one fails the install, naming it.
- The installer links skills one at a time instead of linking the whole skills
  folder, and leaves user-invoked skills out, so opencode never lists the audit to
  the model. This is the file-level equivalent of opencode's documented `deny` skill
  permission, without editing the user's `opencode.json`.
- It touches only entries it created: links pointing into fx's skills. It removes its
  stale links, for a skill that is gone or now user-invoked, and replaces an old
  whole-folder link from an earlier install with a real folder of links.
- The installation guide's counts and verification step are corrected.
- Resulting behaviour on both runtimes: typed by the user only, never selected by the
  model, and able to reach its templates without a search.

### The pipeline lens in audits

- The lens chooses its hunt from its input. Given a diff, it hunts unbounded enqueue
  only and cedes the other queue groups to branch review's passes, unchanged. Given a
  file set, it hunts all six groups measured in task 05, and cedes only database and
  silent-failure defects.
- The fixture's key and README state the expected result for each mode. ADR 0014
  records the change and its measured basis: the lens found all six groups in 5 of 5
  runs when it hunted them.
- The audit's soundness check counts Critical and Important findings across all six
  groups, and a lens output without an `Unread:` line fails it.

### The companion

- The step that appends `.fx/` to the repository's local exclude file is removed,
  with its refusals and its documentation. The start order becomes: refuse symbolic
  links in the state path, write `.fx/.gitignore`, then in a git repository confirm
  every session file is ignored and refuse, naming the cause, when one is not.
  Ruling AK is closed.

### Parked fixes taken in

- The audit's reference worktree: an entry git reports as prunable is pruned before
  the worktree is added again.
- Worktree removal in the audit and in the branch review prompt uses a forced removal,
  since both are throwaway checkouts, and says what to do if it still fails.
- The prose gate reads a file named explicitly on its command line even when its path
  contains `.worktrees/`; the exemption applies only to the directory walk.
- The companion's start script comments describe `--slug` as the dated plan
  directory name.

### Version

- The plugin version becomes 0.1.7.

## Testing Decisions

The confirmed seams, each observing external behaviour only:

1. **`scripts/check-all`.** The remote-script rule is driven from a failing check
   first; every existing gate and suite stays green.
2. **A report opened as a user opens it.** A sample report is written into a scratch
   project with its libraries copied into `_assets`, then opened in a local headless
   browser with the network switched off. It passes when the Tailwind styles apply,
   the Mermaid diagram renders to SVG, and the console shows no failed request.
3. **The opencode installer, run for real into a scratch destination** seeded with a
   foreign skill, an old whole-folder link and a stale fx link. It passes when fx
   skills are linked one by one without the audit, the foreign skill is untouched, the
   stale entries are gone, commands carry their prompt in the body, and every
   absolute path in the generated audit command exists. This becomes a test
   `check-all` runs, cleaning up after itself. Listing the commands with the installed
   opencode binary is attempted, and its result reported either way.
4. **The pipeline lens, two blind smoke runs** on the unchanged fixture and key: read
   as a file set it finds rows 1 to 6 and says nothing about `schema.sql`; read as a
   diff adding the same files it finds row 6 only.
5. **The audit through all four phases, live for the first time,** on a scratch
   project, one nested session per phase with the gate answers passed in the
   invocation text. It covers named dispatch of the lens and `fx-architecture`, the
   soundness check, the Phase 4 report with offline libraries, and resume after each
   gate.
6. **The companion, in scratch repositories:** no `.git` then `git init && git add -A`
   stages nothing; a re-include rule; git missing; a symbolic link; a normal restart;
   and nothing written to the exclude file.
7. **Names and version:** a search showing no short-form fx command name remains, and
   `check-manifest` passing on 0.1.7.

**Prior art:** the Node guard suites and `make-git-fixture` for scratch repositories;
task 04's companion probes; task 05's blind smoke runs and the fixture key; task 08's
nested-session probes with containment checks.

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

## Out of Scope

- Shortening command names, reversed by the user in favour of consistency.
- Lane skill names, which keep the `fx-` prefix.
- The four older commands' missing `disable-model-invocation`, and
  `commands/fx-grill.md` citing a reference a command cannot locate.
- Agents named by their bare name in `fx-review`, `fx-implement` and `/fx:fx-critique`.
- The prose gate's other blind spots: a missing path, code files on a walk, prose
  after a `markdown` fence closer, a number and closing parenthesis at a line start,
  and a paragraph naming its quoting marker.
- One audit per scope, and the plan scanner's 20-directory limit.
- The companion's session key in `sessionStorage` and its missing content security
  policy.
- Removing the 66 leftover `/tmp` fixtures, which the user chose to keep.
- Widening the pipeline lens in branch review.
- Publishing a release, tagging, or pushing.

## Open Questions

None. Every decision was put to the user and answered.

## Further Notes

- The user's own uncommitted edits in the main checkout were committed to `main` at
  their request before this design, as `be4cf7f`, so the build branch includes them.
- This design is written in the main checkout and not committed. At the last merge,
  untracked plan files identical to the branch's copies blocked the fast-forward, so
  the plan step carries this directory into the build branch and leaves no untracked
  copy behind in `main`.
- The measurement behind the lens's six groups is in
  `docs/plans/2026-09-11-fx-audit/measurement-task05.md`, including its disclosure
  that the control omitted the broad reviewer.
