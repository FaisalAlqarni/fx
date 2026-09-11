# Task 08 fix round 2 re-review: `1e0a5c9..c9f69f4`

**Read:** the task doc `tasks/08-fx-audit-command.md`, findings
`08-fix-round1-findings.md` section "New breakage in the fix diff" (N2-N5) in
full, the fix report's `## Fix round 2` section in full, and the diff
`.fx/2026-09-11-fx-audit/review/1e0a5c9..c9f69f4.diff` once. Also read
`skills/fx-audit/SKILL.md:55-125` and `:185-200` at `c9f69f4` for context.

**Ran:** a scratch git repository under
`/home/faisal/.claude/jobs/6d844eaa/tmp/review-check1/` for check 1, then
removed it; hand-walked the naming rule for check 2; hand-walked the resume
states for check 3; searched the `fr2-` probe logs in
`/home/faisal/.claude/jobs/6d844eaa/tmp/` for check 4;
`python3 scripts/check-paths` (OK, 55 citations) and
`python3 scripts/check-prose skills/fx-audit/SKILL.md` (OK, no dashes, no
stock vocabulary) independently on the checkout at `c9f69f4`, where
`skills/fx-audit/SKILL.md` has no uncommitted changes (`git status --short`
empty) and `c9f69f4` is the current tip for that file (`git log --oneline -3`).
`scripts/check-all` was not run, per instruction. N1 is out of scope (parked
under Ruling AG) and is not re-reported below.

## Finding verdicts

- **N2, unreachable `--against` mismatch question: ADDRESSED.** `:106-109`
  replace the question with a deterministic rule: the run keeps the recorded
  reference, and the message states that comparing against the new one means
  starting over with that flag, under the existing start-over rule
  (`:103-104`). This is exactly the first remedy N2 offered. No question is
  asked whose only useful answer the write rules forbid.

- **N3, interrupted-directory collision, `a/b`/`a-b` collision, omitted-scope
  vs `.` split: ADDRESSED.** Three sub-fixes, all present:
  - Scope normalization (`:59-61`) makes an omitted scope, `.` and the root
    the same value, closing the split.
  - The naming rule (`:63-69`) escapes `%` then `+` in both the repository
    name and the scope, then joins with `+`, replacing `/` with `+` only
    after escaping. Hand-walked in check 2 below: no collisions found across
    the required scopes, including `a/b` vs `a-b`.
  - Resume now finds slug directories "by name, whatever its date"
    (`:90-91`), and a directory with no `01-current.md` is explicitly an
    interrupted Phase 1 that gets continued (`:94-95`), not a non-candidate
    that "None" would then collide with.

- **N4, resume state 4 misfiring on a missing `03-gaps.md`: ADDRESSED.**
  `:120-121` reads "`03-gaps.md` exists and has no `## Phase 3 gate choice`
  section", closing the gap where a missing file read as "has no ... section".
  Confirmed live in check 4: resume1, with only `01-current.md` present,
  fell through to state 5 and resumed at Phase 3, not state 4.

- **N5, root-scope file set includes the audit's own documents: ADDRESSED
  for the literal defect, narrower than the finding's suggested remedy.**
  `:194-197` add `':(exclude)docs/plans/<slug>'` to the `git ls-files`
  command, excluding this run's own slug directory. Check 1 confirms this
  directory is excluded, untracked non-ignored files are included, and
  ignored files are not. N5's suggested remedy was "Exclude `docs/plans/`
  from the set" (all of it); the fix excludes only the current slug. Check 1
  also shows an unrelated untracked document under a different
  `docs/plans/other/` directory still enters the root-scope file set. The
  implementer's own report flags this explicitly as Concern 1, so it is not
  a hidden gap. Since the finding's illustrated bug (the audit handed its own
  `01-current.md`/`02-reference.md` back into `fx-architecture`) is fixed,
  and the broader multi-audit case is a named, open, no-worse-than-round-1
  residual rather than something the fix diff newly broke, this is recorded
  as addressed with the residual noted under Out-of-scope observations, not
  as new breakage.

- **Ruling AH's restore, "fetches nothing" dropped from Phase 4's report
  step: ADDRESSED.** `:249-251` restore "so opening it fetches nothing from
  any host" to the Phase 4 report-writing step. The boundary note at `:53-55`
  already had it; now both copies exist again.

## Checks 1 to 4

### Check 1: the pathspec

Ran in `/home/faisal/.claude/jobs/6d844eaa/tmp/review-check1/`, a fresh
scratch git repository (not inside the worktree), then removed it.

Built: a committed `tracked.md`, `.gitignore` (`*.ignoreme`), and
`sub/tracked-sub.md`; untracked non-ignored `untracked.md`, `sub/untracked-sub.md`,
`src_a.js`, `sub2/file.js`; untracked ignored `file.ignoreme`; an untracked
slug directory `docs/plans/2026-09-11-audit-x/01-current.md` at root; an
unrelated untracked plan doc `docs/plans/other/design.md`; and a slug
directory placed inside a scoped subdirectory,
`sub/docs/plans/2026-09-11-audit-y/01-current.md`.

Root scope, excluding the slug directory, exactly as the skill prints it:

```
$ git ls-files --cached --others --exclude-standard . ':(exclude)docs/plans/2026-09-11-audit-x'
.gitignore
docs/plans/other/design.md
src_a.js
sub/docs/plans/2026-09-11-audit-y/01-current.md
sub/tracked-sub.md
sub/untracked-sub.md
sub2/file.js
tracked.md
untracked.md
```

`docs/plans/2026-09-11-audit-x/01-current.md` (the excluded slug) is absent.
`untracked.md` and `sub/untracked-sub.md` (untracked, not ignored) are
present. `file.ignoreme` (ignored) is absent. `docs/plans/other/design.md`,
a different untracked plan document, is present, matching the residual noted
in the N5 verdict above.

Subdirectory scope, excluding a slug that sits outside that scope:

```
$ git ls-files --cached --others --exclude-standard sub ':(exclude)docs/plans/2026-09-11-audit-x'
sub/docs/plans/2026-09-11-audit-y/01-current.md
sub/tracked-sub.md
sub/untracked-sub.md
```

Correctly narrowed to `sub/`; the root-level exclude pathspec is irrelevant
here since it names a path outside the scope, and nothing is dropped in
error.

Subdirectory scope with its own slug directory inside it:

```
$ git ls-files --cached --others --exclude-standard sub ':(exclude)sub/docs/plans/2026-09-11-audit-y'
sub/tracked-sub.md
sub/untracked-sub.md
```

The in-scope slug is correctly excluded.

Subdirectory scope that contains no `docs/plans/` at all, exclude pathspec
naming a path outside it:

```
$ git ls-files --cached --others --exclude-standard sub2 ':(exclude)docs/plans/2026-09-11-audit-x'
sub2/file.js
exit=0
```

**Still works when the scope is a subdirectory that does not contain
`docs/plans/`: yes.** The exclude pathspec is a no-op in that case (nothing
under `sub2` matches it), the command exits 0, and the file set is exactly
the tracked and untracked non-ignored files under `sub2`.

### Check 2: the slug name, hand-applied

Rule at `:63-69`: escape `%`\-\>`%25` then `+`\-\>`%2B` in the repository
name and in the scope; the scope then has each `/` written as `+`; the name
is the repository name alone for `.`, otherwise the escaped repository name,
a `+`, and the escaped-then-slash-joined scope. Repository name assumed
`repo` throughout.

| Scope | Name |
|---|---|
| `.` | `repo` |
| omitted | `repo` (same as `.`, intentionally) |
| `a/b` | `repo+a+b` |
| `a-b` | `repo+a-b` |
| `a+b` | `repo+a%2Bb` |
| `a%2Bb` | `repo+a%252Bb` |
| `engines/core` | `repo+engines+core` |
| `engines/core/` | `repo+engines+core` (same as `engines/core`, intentionally, after normalization strips the trailing slash) |

No two scopes that should differ produce the same name: `a/b` and `a-b` no
longer collide (they did before the fix, both mapping to `<name>` with `/`
and `-` both becoming `-`). `a+b` and `a%2Bb` stay distinct because `%` is
escaped before `+`, so a literal `%2B` in input is never confused with an
escaped literal `+`.

### Check 3: resume order

Walked the five states at `:114-123`.

1. **Directory holding only `01-current.md`.** States 1 to 4 all read false:
   `03-gaps.md` does not exist (state 1 and, now correctly, state 4 which
   requires existence), `design.md` does not exist (states 2 and 3). State 5
   fires: continue at the first missing document, `03-gaps.md`, i.e. resume
   at Phase 3 (`02-reference.md` does not count without a recorded
   reference). Correct, and confirmed live: check 4's resume1 probe, in
   exactly this shape, resumed at Phase 3.

2. **Directory with `01-current.md` and `03-gaps.md`, no gate-choice
   section.** States 1 to 3 read false. State 4 now reads true: `03-gaps.md`
   exists and has no `## Phase 3 gate choice` section, so the Phase 3 gate
   question is asked again and the run stops. Correct: the report exists,
   awaiting the gate answer.

3. **Empty directory, no `01-current.md`.** This is resolved before the
   five-state walk even starts, by the "One" bullet at `:94-95`: a directory
   with no `01-current.md` holds an interrupted Phase 1, and Phase 1 starts
   in it. If it were instead run through the five-state list, states 1 to 4
   all read false (nothing exists yet) and state 5 fires on the first
   missing document, `01-current.md`, again Phase 1. Both paths agree.
   Correct.

### Check 4: the probe evidence

Searched `/home/faisal/.claude/jobs/6d844eaa/tmp/fr2-*`, not read whole.

- **GREEN stopped at the Phase 1 gate, each explorer's file written.**
  `fr2-run-green1.json` has 4 `result` events, the last `is_error: false`,
  `subtype: success`. The last result's text is a Phase 1 gate message
  ("Phase 1 written to `.../01-current.md`... The brief named no stated
  targets. Name what the system must do or be..."). `tool_use` inputs in the
  stream include a `Write` to
  `.../docs/plans/2026-09-11-audit-fx-audit-probe/01-current.md` and `Bash`
  heredocs writing `.fx/2026-09-11-audit-fx-audit-probe/explore/01-src.md`
  and `.../01-entry-points-and-flow.md`. `grep -ciE 'read[- ]only mode|
  unable to write|cannot write files|READ-ONLY mode'` over the stream and
  debug log: 0 each. A raw `grep -c` for `fx-lens-pipeline`, `fx-architecture`
  and `03-gaps` over the whole stream is nonzero (10, 4, 8), but restricting
  to `tool_use` inputs only (what the agent actually ran, via a small Python
  scan) finds none of those strings in any tool call: the raw hits are prose
  (the skill's own Phase 3 text and the agent's "this audit runs Phases 1, 3
  and 4" line), not a Phase 3 dispatch. GREEN did not proceed past the
  Phase 1 gate.
- **Resume after the Phase 1 gate did not ask the Phase 3 gate question.**
  `fr2-run-resume1.json`'s only result text asks Phase 3's stated-targets
  question ("Phase 3 cannot start without the stated targets... Reply with
  what the system must do or be... or answer `none`"), not the gate's
  candidate question. `grep -ciE 'candidate|architecture report|take up'`
  and `grep -c 'Phase 2'` over the stream: 0 each.
- **The two checksum files match.** `fr2-01-current.sha256.before` and
  `.after` hold the identical hash
  `c7b50ba427bfc65cb02a7769db920306c72896fe43d98555d228e5eb4038f30a` and the
  identical `sha256sum -c`-style mtime/size line; `diff` on the hash columns
  is empty.
- **No filesystem search for a template.** A raw `grep -c` over the whole
  debug log for `settings\.json`, `installed_plugins`, `/proc` is nonzero
  (7, 1, 3), but inspected in context every hit is CLI/harness startup noise
  (`Broken symlink or missing file... managed-settings.json`, `Loaded 21
  installed plugins from .../installed_plugins.json`, `Writing to temp file:
  /proc/self/fd/48/...` for the harness's own atomic file write), not an
  agent tool call. Restricting to `tool_use` inputs for `find /`,
  `settings.json`, `installed_plugins`, `/proc`, `printenv`, `env` (as
  substrings) finds no genuine search; the few substring hits inside
  `tool_use` inputs are false positives inside heredoc prose (e.g.
  "environment"). The templates were read directly by path
  (`cat .../references/audit-template.md`, `.../design-template.md`, per the
  fix report, consistent with no search tool call appearing here).

## New breakage in the fix diff

None found. The diff is confined to the five items the fix report describes
plus the incidental `**Scope:**` wording change at `:151-153` (Phase 1's
header-field instruction), which follows directly from the normalization
added for N3 and does not introduce a new defect: Phase 1 now writes the
normalized scope, consistent with the new `Resume` and `Files` sections that
also key on the normalized scope.

## Out-of-scope observations

- **N5's residual, already named by the implementer (Concern 1).** At root
  scope, an unrelated audit's uncommitted `docs/plans/<other-slug>/` still
  enters the file set handed to `fx-lens-pipeline` and `fx-architecture`,
  demonstrated in check 1. This is the narrower of two remedies N5 offered
  and is flagged in the fix report itself as a coordinator decision, not a
  regression from this diff.
- **Item 2's own follow-on, also already named (Concern 2).** A slug
  directory created under round 1's naming rule (subdirectory scope with `/`
  replaced by `-`) is no longer found by the new by-name resume lookup for
  that scope. No audit has shipped under the old rule, so this affects only
  unreleased branch state, per the report.
- **Un-probed paths, already named (Concern 3).** The interrupted-Phase-1
  resume path, the `--against` mismatch path, `git show` reference rows, the
  gate-choice record, and Phases 2 through 4 as a whole remain unobserved in
  a live run; the two probes cover Phase 1 and one resume after its gate.
  This is consistent with the task's ask (verify the fix diff against N2-N5
  and Ruling AH, not re-run the whole skill), so it is not treated as an
  open finding here.

## Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.
N2, N3, N4, N5 and Ruling AH's restore are each closed by the diff, with N5's
fix narrower than its suggested remedy but the implementer's report already
naming that gap as an open coordinator decision rather than hiding it. N1
stays parked under Ruling AG and is not re-opened here.
