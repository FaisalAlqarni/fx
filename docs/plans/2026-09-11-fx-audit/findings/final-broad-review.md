# Final broad review: merge-base 8309b63 to a19e515, shipped paths

**Reviewer seat:** the broad reviewer, branch mode, read-only.
**Package:** `.fx/2026-09-11-fx-audit/review/final-shipped-8309b63..a19e515.diff`, read once in
full in three passes: inventory documents, lens and ADRs, template and gates;
then the audit skill; then the companion scripts and the fixture.
**Spec:** `design.md` as amended by Rulings A to AH in `state.md`. Where they
disagree, the ruling was taken as the requirement.
**Ruling B** was applied: nothing seeded in `tests/lens-pipeline/fixture/` is reported.

Every claim below was checked against the worktree, not taken from the ledger.
Two claims were measured in a scratch directory under the job's own temp
area, removed afterwards: the prose gate's blind spot, and its positive control.

---

## Strengths

- **The session key split (Ruling T) is done carefully.** `start-server.sh`
  puts mockups under `docs/plans/<slug>/companion/` and the key, PID, port and
  log under `.fx/<slug>/companion/`. It creates the state directory before the
  ignore check so a directory-only rule is seen as git will see it, checks every
  key-bearing file with `git check-ignore`, appends to the local exclude file
  rather than `.gitignore`, and fails closed when a `.gitignore` rule re-includes
  `.fx/`. It also refuses a `.git` entry that git will not answer for, rather than
  treating it as "not a repository". The slug is validated as one path segment,
  and the skill's own directory is refused as a project.
- **The third-party fetch is gone at its source.** The remote logo, the
  telemetry toggles and the outbound link are removed from `server.cjs`, and the
  Unsplash guidance in `visual-companion.md` is replaced with local assets or
  labelled placeholders. `server.cjs` refuses to start without both directories
  rather than defaulting to a temp path.
- **The lens measurement is honest.** A pre-registered keep and drop rule,
  applied as written; five of six groups dropped on the evidence; `KEY.md` rows
  1 to 5 preserved as the scored record instead of rewritten; and ADR 0014
  states the four qualifications and the provisional status in the record a
  future reader will find. The narrowed lens is category-general, as ADR 0013
  requires, pins `opus`, and carries read-only tools.
- **The prose gate's exemption is now declared, not inferred** (Ruling L), and
  a fence now ends a block, which fixes the line mapping `main()` relies on.
- **`scripts/check-artifacts` is small and fails loudly.** An at-site marker
  instead of an allowlist, consistent with ADR 0011, and no silent skip on an
  unreadable file.
- **The audit skill's state machine holds up on a read.** Scope normalization
  with `%` and `+` escaped before `/` becomes `+` gives collision-free names;
  resume states are ordered so a stopped Phase 1 does not ask the Phase 3
  question; a differing `--against` keeps the recorded reference; reference rows
  are opened with `git show <commit>:<path>` after the worktree is removed;
  stated targets are quoted verbatim into a field the row count anchors to; the
  skill never commits and says so at the last gate.
- **`check-all` validates the fixture's shape** before handing it to the suites,
  and its comment explains why `read` cannot catch a wrong token count.
- **Inventory counts match disk:** skills 13, agents 6, commands 4, references
  22 files, and every command name in `README.md` and `SURFACE.md` is the form
  that resolves.

---

## Issues

### Critical (Must Fix)

None.

### Important (Should Fix)

**I1. The audit can declare a system sound when the pipeline lens never ran.**
`skills/fx-audit/SKILL.md:199`, `:210`, `:233` and `:114`.

- What is wrong: Phase 3 dispatches the lens by its bare name, `fx-lens-pipeline`.
  Plugin agents are listed under the plugin prefix: this review's own session
  lists them as `fx:fx-lens-a11y`, `fx:fx-lens-database` and so on, and the
  preamble warns that a bare fx name may not resolve. Named dispatch of this lens
  has never been observed (carried "Never observed"). Line 210 handles the failure
  by stating it under Lens findings. Line 233's soundness check is then "the lens
  reported nothing Critical or Important", which a lens that never ran satisfies.
  Line 114 makes a written sound verdict final on every later run.
- Why it matters: a dispatch failure turns into a permanent "sound, no design
  written" outcome, which is design story 16's guarantee inverted. Phases 3 and
  4 have never run live, so no probe has exercised this path.
- Fix: dispatch `fx:fx-lens-pipeline`; make the check "the lens ran and reported
  nothing Critical or Important"; a lens that could not run blocks the sound
  verdict and says so at the gate.

**I2. The pipeline lens is told to read an entire file set in full.**
`agents/fx-lens-pipeline.md:36-38`.

- What is wrong: "Given a file set with no diff ... treat every file in the set
  as the change under review and read each one in full." The audit hands it
  `git ls-files` of the scope (`skills/fx-audit/SKILL.md:195`), which at root
  scope is the whole repository. The lens's own Method (`:89`) starts from enqueue
  and schedule sites found by search, which contradicts reading everything.
- Why it matters: on a real system the instruction cannot be executed. An agent
  either fills its context before it reaches the Method, or skips files without
  saying which, on the most expensive model tier, in the audit's only lens.
- Fix: on a file set, find every entry point by the Method's search, then read in
  full each file on those paths and on the callers and schedulers behind them;
  list any file the search matched but was not read.

**I3. Test fixtures accumulate in the OS temp directory, and one gate key only leaks.**
`scripts/check-all:37`, `.fx.json:3` and `.fx.json:6`. This is carried item 1.

- What is wrong: `check-all` builds `/tmp/fx-fixture-check-all-$$` and never
  removes it; `test_one` does the same per call. `setup` builds
  `/tmp/fx-fixture-setup-$$` at a path no later command can know, since `$$` is the
  inner shell's PID, and neither `test_one` nor `check-all` reads it. So `setup`
  now produces nothing but a leftover directory. Before `64f8103` it overwrote
  one fixed path, which was just as unused but did not accumulate.
- Why it matters: a regression this branch made, one directory per gate run and
  per TDD cycle, against the constraint the user was most emphatic about. The plan's
  scaffolding exemption covered `scripts/` and `tests/`; `.fx.json` is machine facts
  that `fx-tdd` and `fx-implement` execute, and it sat outside every check.
- Fix: `make-git-fixture` puts both directories under its argument, so removal is
  safe. In `check-all`, `trap 'rm -rf "$FIXTURE_DIR"' EXIT` after the assignment. In
  `test_one`, capture the node exit code, remove the base, exit with the code. Make
  `setup` build and remove a fixture, which keeps Ruling G's intent of proving the
  suites can run without leaving anything behind.

**I4. Review worktrees land in the reviewed checkout with no ignore check and no removal.**
`skills/fx-review/reviewer-prompt.md:58`. This is carried item 2.

- What is wrong: `git worktree add .worktrees/review-[SHA] [SHA]` is relative to
  the reviewer's working directory, is not checked against ignore rules, and is
  never removed. The same prompt tells the reviewer it is read-only on this
  checkout.
- Why it matters: before this branch the worktree sat outside the working tree.
  Now, in a repository that does not ignore `.worktrees/`, it shows as untracked
  content in the user's checkout, and a `git add -A` records it as an embedded
  repository. Registered worktrees also pile up in the shared `.git`. The audit skill
  in this same branch already has the right pattern (`skills/fx-audit/SKILL.md`,
  Files section).
- Fix: build the path from `git rev-parse --show-toplevel`; run `git check-ignore -q`
  first and fall back to the local exclude file as the audit does; end with
  `git worktree remove`.

**I5. The plugin version is not bumped.**
`.claude-plugin/plugin.json:3`, still `0.1.6`.

- What is wrong: every earlier release commit on `main` bumps this field, and the
  plan's own risk list says nothing here is live until it is bumped. No task
  bumps it.
- Why it matters: the install cache is keyed by version, so after merge an
  existing user keeps the old companion, the old report paths and no audit. A
  fresh install gets the new tree under the same number, so "0.1.6" would name two
  different behaviours, which undermines measuring against a bumped version as the
  global constraints and ADR 0010 require.
- Fix: bump to `0.1.7` in the merge or in a release commit right after it. Which
  of the two is the user's call.

### Minor (Nice to Have)

**M1. Two command names that do not resolve were written by this branch.**
`references/audit-template.md:3` says "Written by `/fx:audit`", and
`skills/fx-brainstorm/visual-companion.md:60`, a line this branch rewrote, says
`/fx:setup`. Under Ruling AD both should be `/fx:fx-audit` and `/fx:fx-setup`.
Older occurrences are out of scope, but see the Ruling AD comment below for the one
that matters most.

**M2. The reference skeleton miscounts its own headings.**
`references/audit-template.md:94` says "Same six headings as `01-current.md`";
there are seven. The note also sits as body text under `## Areas not covered`
inside the skeleton, so an agent that copies the skeleton puts it into that
section. The skill tells agents to honour every count a template states.

**M3. The target-architecture template names one domain's extension point.**
`references/audit-template.md:199`, "Add-a-new-provider walkthrough". A system with
no providers forces a made-up walkthrough. This is a plan issue: design story 14
came from one engine. Fix: "Add-a-new-<extension point> walkthrough", naming the
system's own extension point, or saying it has none.

**M4. `fx-review` still describes four lenses.** `skills/fx-review/SKILL.md:271`
reads "Firing all four lenses", and the aggregate template at `:191-195` shows
database and security only. The five-row table above it is correct.

**M5. The prose gate does not read the prose after a `markdown` fence closes, measured.**
`scripts/check-prose:136` and `:190`: `infence = code_fence(line) if not infence else False`
treats the untagged closer of a `markdown` fence as a code opener, so everything up to
the next fence is skipped. In a scratch copy, an em dash and a banned word inserted
at `references/audit-template.md:68`, between two fences, passed with exit 0. The same
insertion before the first fence failed with exit 1, so the gate does read the file.
A pairing pass over the shipped Markdown finds 1,876 unread prose lines, including
30 in `agents/fx-lens-pipeline.md` and 28 in `references/audit-template.md`. No
violation is hiding in them today. The ledger lists this outside every task. It is
Minor because nothing is hidden, but this branch's "prose gate exit 0" evidence for
its new files covers less than it appears to. Fix: track "inside any fence"
separately from "inside a code fence".

**M6. The preamble now teaches every agent how to switch off the vocabulary check.**
`PREAMBLE.md:176` injects `(prose-gate: quoting)` into every session and subagent,
and the gate's failure message at `scripts/check-prose:218` offers it. That is
Ruling L's accepted design. Its cost is that an agent chasing a green gate has the
suppression string in front of it. Worth a review-time search for newly added
markers in a diff.

**M7. `check-artifacts` misses common temp forms.** `scripts/check-artifacts:19` has
no `mktemp` (which defaults to the temp directory), Python `tempfile`, `$TEMP`, `$TMP`
or `GetTempPath`. None occurs in the scanned areas today. ADR 0015 says the gate
fails on a temp directory "as a write target", but it fails on any mention. That is
the safer behaviour; the ADR's wording should match it.

**M8. This branch adds non-plan directories to a scanner capped at 20.**
`lib/plan-state.js:26` and `:35` take the first 20 entries of an unsorted
`readdirSync` before filtering for task directories. This branch adds three new
kinds of directory under `docs/plans/`: standalone architecture reviews
(`skills/fx-architecture/SKILL.md:80`), audits, and `_companion-unfiled`. Each one
uses up a slot, so an unfinished plan drops out of the session-start notice sooner.
Fix: filter first, then cap.

**M9. The audit slug depends on the checkout's directory name.**
`skills/fx-audit/SKILL.md:65` uses "the repository directory's name". A linked
worktree's top-level directory is named differently from the main checkout's,
so an audit started in one and resumed in the other does not find its directory
and starts again.

---

## Carried findings triage

### Flagged to triage before merge

| Item | Triage | Reason |
|---|---|---|
| 1. Fixtures accumulate in the temp directory | **must-fix-before-merge** | A regression of this branch, fixed by a trap and two `.fx.json` edits; `setup` currently does nothing except leak (I3) |
| 2. Review worktrees with no ignore check or removal | **must-fix-before-merge** | Moves a worktree into the user's working tree, where `git add -A` can record it; a two-sentence prompt edit the audit skill already models (I4) |

### Deferred Minors

| Item | Triage | Reason |
|---|---|---|
| CSP is only `frame-ancestors 'none'` | confirmed deferred | The known remote fetches are removed; a real `default-src` policy needs a run against the helper's WebSocket and inline script, which no task measured. Recommended as the next companion change |
| `--slug` as last argument hangs on `shift 2` | confirmed deferred | Same pre-existing shape for every flag; the caller is an agent that always passes a value |
| Refusal message names one cause of two | confirmed deferred | Message text only; it fails closed |
| Footer reads "Superpowers vunknown" | confirmed deferred | Cosmetic, no request made |
| Stop script given the old path leaves a server running | confirmed deferred | Only sessions started before merge; the idle timeout ends them |
| `lib/plan-state.js` 20-directory cap | confirmed deferred | Predates the branch, but the branch makes it bite sooner (M8); fix soon |
| Em dashes in shell and JS | confirmed deferred | Predate the branch; the gate does not read those files |
| `start-server.sh:172` merges git's stderr, `GIT_TRACE` refused | confirmed deferred | Fails closed, rare environment |
| `server-instance-id`, `events`, `server-stopped` not checked one by one | confirmed deferred | None holds the key; they sit in the directory whose key files are checked |
| Empty `.git` above a non-repository is refused | confirmed deferred | Fails closed |
| Refused start leaves the exclude line and an empty state directory | confirmed deferred | The exclude line is idempotent and harmless; `.fx/` is ignored |
| `fx-review` performance paragraph reads as exhaustive | confirmed deferred | `skills/fx-review/SKILL.md:101` names bundle size and rendering as uncovered but not ADR 0008's list; one clause, no behaviour change |
| Lens triggers miss diffs that slow consumers | confirmed deferred | Widening a trigger is a measured change; the lens is provisional |
| Critical tier fits most scheduled producers | confirmed deferred | Severity calibration is unmeasured; revisit with the missing control run |
| README and KEY regression signal reads two ways | confirmed deferred | `tests/lens-pipeline/README.md` "Regression signal" states three unambiguous conditions; only `KEY.md` keeps the older wording |
| Lens cedes to `fx-lens-database`, which does not fire on worker-only diffs | confirmed deferred | The hunt exists at `agents/fx-lens-database.md:78-79`; only the trigger is missing, and branch review's correctness passes see the same diff |
| `fx-implement:450-451` lists four names instead of reading Mode | confirmed deferred | Correct today; a sixth lens would need both edits |
| ADR 0008 note has no blank line | confirmed deferred | Rendering only |
| Worked examples show the field as a bare label | confirmed deferred | The skill points at the first fence as the skeleton, so an agent copies the right form |
| Root scope reads other audits' documents | confirmed deferred | Broader than stated: `--cached` also reads every committed plan and prior audit, which can colour a gap report but not what it writes; worth an exclude of `docs/plans` at root scope later |
| Round 1 slug directories not found by round 2's rule | confirmed deferred | Round 1's rule never shipped outside probes |
| `SURFACE.md` Lines column, `/fx:help`, `/fx:stack`, `/fx:upgrade`, cut lens named | confirmed deferred | Pre-existing stale-document sweep the design puts out of scope |

### Parked for the user: consequence only

- **Ruling AA.** The soundness check in Phase 4 reads only the pipeline lens's
  severities, so a queue-heavy system whose defects are all in the five ceded
  groups can reach "sound" if Phase 3's own reading misses them. The boundary
  discloses it, so it does not block merge. It does make I1 matter more.
- **Ruling AC.** ADR 0015 makes Phase 3's `fx-architecture` report a committed
  file, so its two CDN fetches now happen for anyone who opens it later, not only
  in the session that wrote it. Disclosed in the audit's boundary; no merge impact.
- **Ruling AD.** The branch corrected `README.md` and `SURFACE.md`, but
  `INSTALL.md:105`, which the README sends new users to, still says `/fx:setup`, the
  first command a new user types, and it returns "Unknown command". Either decision
  on renaming should also fix that line.
- **Rulings AF and AG.** After merge an opencode install gets the audit as a skill
  the model may select, with a one-line description that summarises a workflow
  instead of naming triggers. It is a weak trigger and a per-turn cost there.
  No effect on Claude Code.
- **`fx-authoring` not pointing at ADR 0013**, and **the four older commands**:
  small, pre-existing, no merge impact.

---

## Issues with the plan itself

- **The gate's scoping rule left `.fx.json` outside every check.** It exempted
  `scripts/` and `tests/` as scaffolding, but `.fx.json` holds commands an agent
  executes on every TDD cycle. The temp leak (I3) lived exactly there.
- **The only behavioural test of the audit is "does it stop after Phase 1".** The
  soundness path, the lens dispatch and the Phase 4 report have no probe, which is
  how I1 survived three review rounds.
- **No task bumps the version** (I5), although the plan's risk list names it.
- **Design story 14 wrote one domain into a general template** (M3).

---

## Recommendations

1. Fix I1, I3 and I4 before merge; they are small and each is a regression or a
   silent wrong outcome.
2. Fix I2 and bump the version (I5) in the same pass or the release commit.
3. Correct M1 and M2 while in those files; they are one line each.
4. Schedule the prose gate's fence-pairing fix (M5) and plan-state's filter-then-cap
   (M8) as their own small changes.
5. When the provisional lens gets its full control run, run one audit through
   Phases 3 and 4 on a scratch repository in the same session, so the dispatch name
   and the soundness path are observed once.

---

## Assessment

**Ready to merge?** With fixes

**Reasoning:** No Critical defects, and the companion's key handling, the
measurement record and the gates are sound. However, three small defects must
close first: the audit can permanently mark a system sound when its lens failed
to dispatch, and the branch leaks fixtures into the temp directory and puts
unignored review worktrees into the user's checkout.

**Counts:** 0 Critical, 5 Important, 9 Minor.
